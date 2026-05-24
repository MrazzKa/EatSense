import { describe, it, expect, beforeEach } from '@jest/globals';
import { SecurityManager } from '../../../core/security';

describe('SecurityManager', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = new SecurityManager();
  });

  describe('Password Validation', () => {
    it('should validate password correctly', () => {
      const result = securityManager.validatePassword('Password123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = securityManager.validatePassword('Pass1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = securityManager.validatePassword('password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = securityManager.validatePassword('PASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without numbers', () => {
      const result = securityManager.validatePassword('Password');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });

  describe('Login Attempts', () => {
    it('should record successful login', () => {
      const result = securityManager.recordLoginAttempt('user1', true);
      expect(result).toBe(true);
      expect(securityManager.isAccountLocked('user1')).toBe(false);
    });

    it('should record failed login', () => {
      const result = securityManager.recordLoginAttempt('user1', false);
      expect(result).toBe(true);
      expect(securityManager.isAccountLocked('user1')).toBe(false);
    });

    it('should lock account after max attempts', () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        securityManager.recordLoginAttempt('user1', false);
      }
      
      expect(securityManager.isAccountLocked('user1')).toBe(true);
    });

    it('should unlock account after lockout duration', () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        securityManager.recordLoginAttempt('user1', false);
      }
      
      expect(securityManager.isAccountLocked('user1')).toBe(true);
      
      // Wait for lockout to expire
      setTimeout(() => {
        expect(securityManager.isAccountLocked('user1')).toBe(false);
      }, 1000);
    });

    it('should get remaining lockout time', () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        securityManager.recordLoginAttempt('user1', false);
      }
      
      const remainingTime = securityManager.getRemainingLockoutTime('user1');
      expect(remainingTime).toBeGreaterThan(0);
    });
  });

  describe('Token Generation', () => {
    it('should generate secure token', () => {
      const token = securityManager.generateSecureToken(32);
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate different tokens', () => {
      const token1 = securityManager.generateSecureToken(32);
      const token2 = securityManager.generateSecureToken(32);
      expect(token1).not.toBe(token2);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password', () => {
      const password = 'Password123';
      const hash = securityManager.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
    });

    it('should generate different hashes for different passwords', () => {
      const hash1 = securityManager.hashPassword('Password123');
      const hash2 = securityManager.hashPassword('Password456');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize input', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const sanitized = securityManager.sanitizeInput(input);
      expect(sanitized).toBe('Hello World');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const sanitized = securityManager.sanitizeInput(input);
      expect(sanitized).toBe('');
    });

    it('should remove event handlers', () => {
      const input = 'onclick="alert(\'xss\')"Hello World';
      const sanitized = securityManager.sanitizeInput(input);
      expect(sanitized).toBe('Hello World');
    });
  });

  describe('Input Validation', () => {
    it('should validate safe input', () => {
      const input = 'Hello World';
      const isValid = securityManager.validateInput(input);
      expect(isValid).toBe(true);
    });

    it('should reject input with script tags', () => {
      const input = '<script>alert("xss")</script>';
      const isValid = securityManager.validateInput(input);
      expect(isValid).toBe(false);
    });

    it('should reject input with javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const isValid = securityManager.validateInput(input);
      expect(isValid).toBe(false);
    });

    it('should reject input with event handlers', () => {
      const input = 'onclick="alert(\'xss\')"';
      const isValid = securityManager.validateInput(input);
      expect(isValid).toBe(false);
    });

    it('should reject input with iframe tags', () => {
      const input = '<iframe src="malicious.com"></iframe>';
      const isValid = securityManager.validateInput(input);
      expect(isValid).toBe(false);
    });

    it('should reject input with object tags', () => {
      const input = '<object data="malicious.swf"></object>';
      const isValid = securityManager.validateInput(input);
      expect(isValid).toBe(false);
    });

    it('should reject input with embed tags', () => {
      const input = '<embed src="malicious.swf"></embed>';
      const isValid = securityManager.validateInput(input);
      expect(isValid).toBe(false);
    });

    it('should reject input that is too long', () => {
      const input = 'a'.repeat(1001);
      const isValid = securityManager.validateInput(input);
      expect(isValid).toBe(false);
    });
  });
});
