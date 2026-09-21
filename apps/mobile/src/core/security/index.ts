export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  sessionTimeout: number;
  refreshTokenExpiry: number;
}

export const defaultSecurityConfig: SecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSymbols: false,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  refreshTokenExpiry: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export class SecurityManager {
  private config: SecurityConfig;
  private loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();
  private lockedAccounts = new Set<string>();

  constructor(config: SecurityConfig = defaultSecurityConfig) {
    this.config = config;
  }

  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < this.config.passwordMinLength) {
      errors.push(`Password must be at least ${this.config.passwordMinLength} characters long`);
    }
    
    if (this.config.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (this.config.passwordRequireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (this.config.passwordRequireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (this.config.passwordRequireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one symbol');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  recordLoginAttempt(identifier: string, success: boolean): boolean {
    if (success) {
      this.loginAttempts.delete(identifier);
      this.lockedAccounts.delete(identifier);
      return true;
    }
    
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: new Date() };
    attempts.count++;
    attempts.lastAttempt = new Date();
    this.loginAttempts.set(identifier, attempts);
    
    if (attempts.count >= this.config.maxLoginAttempts) {
      this.lockedAccounts.add(identifier);
      return false;
    }
    
    return true;
  }

  isAccountLocked(identifier: string): boolean {
    if (!this.lockedAccounts.has(identifier)) {
      return false;
    }
    
    const attempts = this.loginAttempts.get(identifier);
    if (!attempts) {
      this.lockedAccounts.delete(identifier);
      return false;
    }
    
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    if (timeSinceLastAttempt > this.config.lockoutDuration) {
      this.lockedAccounts.delete(identifier);
      this.loginAttempts.delete(identifier);
      return false;
    }
    
    return true;
  }

  getRemainingLockoutTime(identifier: string): number {
    if (!this.isAccountLocked(identifier)) {
      return 0;
    }
    
    const attempts = this.loginAttempts.get(identifier);
    if (!attempts) {
      return 0;
    }
    
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    return Math.max(0, this.config.lockoutDuration - timeSinceLastAttempt);
  }

  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  hashPassword(password: string): string {
    // Simple hash for demo purposes - in production, use bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Strips markup and executable URL schemes out of untrusted text.
   *
   * The previous version deleted the angle brackets and the literal
   * "javascript:" and called it done, which is the classic mistake: it turned
   * `<script>alert(1)</script>Hello` into `scriptalert(1)/scriptHello` and
   * `javascript:alert(1)` into `alert(1)` — the payload survived in both cases,
   * only lightly rearranged.
   *
   * What it does now:
   *  1. drops `<script>` / `<style>` blocks *with their contents*, since the
   *     content is the payload;
   *  2. drops every remaining tag;
   *  3. drops event-handler attributes together with their quoted value;
   *  4. returns an empty string if an executable scheme survives — a value whose
   *     point was `javascript:` has no safe remainder to keep.
   *
   * Scheme detection ignores whitespace and control characters inside the
   * scheme, because `java\tscript:` is a standard way round a naive filter.
   *
   * This is a sanitiser for values that may end up in a URL or in markup. It is
   * deliberately blunt and is not meant for prose.
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';

    const stripped = input
      .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      // An unclosed <script ...> would otherwise leave its payload behind.
      .replace(/<\s*(script|style)\b[^>]*>[\s\S]*$/gi, '')
      .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .trim();

    // Collapse anything that could hide inside the scheme before testing it.
    const collapsed = stripped.replace(/[\s\u0000-\u001F]/g, '').toLowerCase();
    if (/(javascript|vbscript|data):/.test(collapsed)) return '';

    return stripped;
  }

  validateInput(input: string, maxLength: number = 1000): boolean {
    if (!input || input.length > maxLength) return false;
    
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(input));
  }
}

export const securityManager = new SecurityManager();
