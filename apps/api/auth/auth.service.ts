import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { OtpService } from './otp.service';
import { RedisService } from '../redis/redis.service';
import { MailerService } from '../mailer/mailer.service';
import {
  LoginDto,
  RegisterDto,
  VerifyOtpDto,
  RefreshTokenDto,
  RequestOtpDto,
  RequestMagicLinkDto,
  AppleSignInDto,
  GoogleSignInDto,
  ExpertLoginDto,
  ChangePasswordDto,
} from './dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jose from 'jose';
import { OAuth2Client } from 'google-auth-library';

const OTP_TTL_SECONDS = 10 * 60;
const OTP_EMAIL_COOLDOWN_SECONDS = 60;
const OTP_EMAIL_HOURLY_LIMIT = 5;
const OTP_IP_HOURLY_LIMIT = 40;
const MAGIC_LINK_HOURLY_LIMIT = 5;
const MAGIC_LINK_TTL_MINUTES = 15;
const REFRESH_TOKEN_TTL_DAYS = Number.parseInt(process.env.JWT_REFRESH_TTL_DAYS || '365', 10);

function refreshTokenTtlDays(): number {
  return Number.isFinite(REFRESH_TOKEN_TTL_DAYS) && REFRESH_TOKEN_TTL_DAYS > 0
    ? REFRESH_TOKEN_TTL_DAYS
    : 365;
}

/** Base URL of the expert portal (Next.js app). Magic links and welcome emails point here. */
function expertPortalUrl(): string {
  return (process.env.EXPERT_PORTAL_URL || 'https://experts.eatsense.ch').replace(/\/+$/, '');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private applePublicKeys: jose.JWTVerifyGetKey | null = null;
  private googleClient: OAuth2Client | null = null;

  /**
   * Per-process in-memory fallback for rate-limit counters when Redis is down.
   * Prevents fail-open OTP/magic-link flooding during Redis outages.
   * Note: this is per-instance (won't share state across multiple Railway replicas),
   * but it bounds the damage and is much better than the previous silent fail-open.
   */
  private readonly fallbackCounters = new Map<string, { count: number; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
  ) { }

  private async getApplePublicKeys(): Promise<jose.JWTVerifyGetKey> {
    if (!this.applePublicKeys) {
      const JWKS = jose.createRemoteJWKSet(
        new URL('https://appleid.apple.com/auth/keys')
      );
      this.applePublicKeys = JWKS;
    }
    return this.applePublicKeys;
  }

  private getGoogleClient(): OAuth2Client {
    if (!this.googleClient) {
      // Use GOOGLE_CLIENT_ID if provided, otherwise fallback to GOOGLE_WEB_CLIENT_ID
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID;
      if (!clientId) {
        throw new Error('GOOGLE_CLIENT_ID or GOOGLE_WEB_CLIENT_ID must be set in environment variables');
      }
      this.googleClient = new OAuth2Client({
        clientId,
      });
    }
    return this.googleClient;
  }

  /**
   * Fixed credentials for app-store reviewers (Google Play / App Store).
   * OTP login is one-time and email-delivered, so a reviewer cannot receive the
   * code. This grants a single whitelisted email a static, reusable code,
   * configured via env (REVIEWER_TEST_EMAIL + REVIEWER_TEST_OTP). Disabled unless
   * both are set. Only affects that exact email — every other user is unchanged.
   */
  private getReviewerCredentials(): { email: string; code: string } | null {
    const email = (process.env.REVIEWER_TEST_EMAIL || '').trim().toLowerCase();
    const code = (process.env.REVIEWER_TEST_OTP || '').trim();
    if (!email || !code) return null;
    return { email, code };
  }

  /**
   * True when `email` is the reviewer test account. When `code` is provided it
   * must also match the fixed reviewer OTP; pass no code to check the email only
   * (used by requestOtp to skip email dispatch).
   */
  private isReviewerLogin(email: string, code?: string): boolean {
    const creds = this.getReviewerCredentials();
    if (!creds) return false;
    if (this.normalizeEmail(email) !== creds.email) return false;
    if (code === undefined) return true;
    return code.trim().toUpperCase() === creds.code.toUpperCase();
  }

  /**
   * Idempotently grant the reviewer account an active Pro subscription so paid
   * sections are reviewable without any purchase. Never throws — a failure here
   * must not block login.
   */
  private async ensureReviewerPro(userId: string): Promise<void> {
    try {
      const active = await this.prisma.userSubscription.findFirst({
        where: { userId, status: 'ACTIVE', endDate: { gt: new Date() } },
      });
      if (active) return;

      const plan =
        (await this.prisma.subscriptionPlan.findFirst({ where: { name: 'yearly' } })) ||
        (await this.prisma.subscriptionPlan.findFirst({
          where: { isActive: true },
          orderBy: { durationDays: 'desc' },
        }));
      if (!plan) {
        this.logger.warn('[AuthService] ensureReviewerPro: no subscription plan found, skipping grant');
        return;
      }

      const endDate = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000); // ~10 years
      await this.prisma.userSubscription.create({
        data: {
          userId,
          planId: plan.id,
          currency: 'USD',
          pricePaid: 0,
          status: 'ACTIVE',
          endDate,
          autoRenew: false,
        },
      });
      this.logger.log(`[AuthService] ensureReviewerPro: granted Pro (${plan.name}) to reviewer ${userId}`);
    } catch (error) {
      this.logger.error(`[AuthService] ensureReviewerPro failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  async register(_: RegisterDto) {
    throw new BadRequestException('Password registration is disabled. Use email code login.');
  }

  async validateUser(): Promise<any> {
    return null;
  }

  async login(_: LoginDto) {
    throw new BadRequestException('Password login is disabled. Use email code login.');
  }

  /**
   * Expert portal password login. Scoped to EXPERT accounts only — regular app
   * users continue to use OTP / magic-link. Returns the same token shape as
   * verifyOtp plus a `mustChangePassword` flag so the portal can force a reset.
   */
  async expertLogin(dto: ExpertLoginDto, clientIp?: string) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const sanitizedIp = this.sanitizeIp(clientIp);

    // Reuse the magic-link rate limiter to throttle password guessing.
    await this.enforceMagicLinkRateLimits(normalizedEmail, sanitizedIp);

    const invalid = () =>
      new UnauthorizedException({ message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });

    if (!user || user.expertsRole !== 'EXPERT' || !user.password) {
      // Same generic error regardless of which check failed (no account enumeration).
      throw invalid();
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw invalid();

    const tokens = await this.generateTokens(user.id, user.email);
    const profile = await this.prisma.userProfile.findUnique({ where: { userId: user.id } });

    this.logger.log(`[AuthService] Expert password login for ${this.maskEmail(user.email)}`);

    return {
      message: 'Signed in successfully.',
      user: { id: user.id, email: user.email },
      profile,
      mustChangePassword: (user as any).mustChangePassword === true,
      ...tokens,
    };
  }

  /**
   * Change the current user's password. When `currentPassword` is provided it is
   * verified; first-login resets (mustChangePassword=true) may omit it. Clears
   * the mustChangePassword flag on success.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const mustChange = (user as any).mustChangePassword === true;

    // If the account is not in a forced-reset state, require the current password.
    if (!mustChange) {
      if (!dto.currentPassword) {
        throw new BadRequestException({ message: 'Current password is required.', code: 'CURRENT_PASSWORD_REQUIRED' });
      }
      const ok = user.password ? await bcrypt.compare(dto.currentPassword, user.password) : false;
      if (!ok) {
        throw new BadRequestException({ message: 'Current password is incorrect.', code: 'CURRENT_PASSWORD_INVALID' });
      }
    }

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash, mustChangePassword: false } as any,
    });

    this.logger.log(`[AuthService] Password changed for ${this.maskEmail(user.email)}`);
    return { success: true };
  }

  /**
   * Admin-triggered: set a freshly generated temporary password on an expert
   * account and flag it for change on first login. Returns the plaintext so the
   * caller can email it / show it to the admin once. Never logs the plaintext.
   */
  async provisionExpertPassword(userId: string): Promise<{ tempPassword: string }> {
    const tempPassword = this.generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash, mustChangePassword: true } as any,
    });
    return { tempPassword };
  }

  /**
   * Admin-triggered after expert creation: generate a temp password, store it,
   * and email the expert a welcome message with portal URL + credentials.
   * Returns the plaintext password so the admin panel can display it once.
   */
  async sendExpertWelcome(userId: string): Promise<{ sent: boolean; tempPassword?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, expertsRole: true },
    });
    if (!user || user.expertsRole !== 'EXPERT') return { sent: false };

    const { tempPassword } = await this.provisionExpertPassword(user.id);
    try {
      await this.mailerService.sendExpertWelcomeEmail(user.email, {
        portalUrl: expertPortalUrl(),
        tempPassword,
      });
      this.logger.log(`[AuthService] Expert welcome email sent to ${this.maskEmail(user.email)}`);
      return { sent: true, tempPassword };
    } catch (err: any) {
      this.logger.warn(`[AuthService] Expert welcome email failed: ${err?.message}`);
      // Password is still set; admin can share it manually via the returned value.
      return { sent: false, tempPassword };
    }
  }

  /** Human-friendly temporary password: e.g. "Leaf-7K3p-92" — easy to read/type once. */
  private generateTempPassword(): string {
    const words = ['Leaf', 'Apple', 'Berry', 'Olive', 'Mango', 'Lemon', 'Basil', 'Cocoa', 'Honey', 'Maple'];
    const word = words[crypto.randomInt(0, words.length)];
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I/l
    let mid = '';
    for (let i = 0; i < 4; i++) mid += alphabet[crypto.randomInt(0, alphabet.length)];
    const num = crypto.randomInt(10, 100);
    return `${word}-${mid}-${num}`;
  }

  /**
   * Load-test only: bypass OTP, find-or-create user by email, return tokens.
   * Caller (controller) must verify LOAD_TEST_MODE env flag before invoking.
   */
  async mintLoadTestToken(email: string) {
    const user = await this.findOrCreateUser(this.normalizeEmail(email));
    const tokens = await this.generateTokens(user.id, user.email);
    return { user: { id: user.id, email: user.email }, ...tokens };
  }

  async requestOtp(requestOtpDto: RequestOtpDto, clientIp?: string) {
    const normalizedEmail = this.normalizeEmail(requestOtpDto.email);
    const sanitizedIp = this.sanitizeIp(clientIp);

    // Reviewer test account uses a fixed code — no email to send, no rate limit.
    if (this.isReviewerLogin(normalizedEmail)) {
      this.logger.log(`[AuthService] Reviewer test login requested for ${this.maskEmail(normalizedEmail)} - skipping email dispatch`);
      return {
        message: 'If this email is registered, we just sent a 6-digit code.',
        retryAfter: OTP_EMAIL_COOLDOWN_SECONDS,
        expiresIn: OTP_TTL_SECONDS,
      };
    }

    await this.enforceOtpRateLimits(normalizedEmail, sanitizedIp);

    const otpCode = this.otpService.generateOtp();
    await this.otpService.saveOtp(normalizedEmail, otpCode);

    try {
      await this.mailerService.sendOtpEmail(normalizedEmail, otpCode);
    } catch (error) {
      this.logger.error(`[AuthService] Failed to dispatch OTP email for ${this.maskEmail(normalizedEmail)}`);
      // Check if we should ignore mail errors (for development/testing)
      const ignoreMailErrors = (process.env.AUTH_DEV_IGNORE_MAIL_ERRORS || 'false').toLowerCase() === 'true';
      if (ignoreMailErrors) {
        this.logger.warn(`[AuthService] Ignoring OTP email error due to AUTH_DEV_IGNORE_MAIL_ERRORS=true. OTP code: ${otpCode}`);
        // Continue without throwing - OTP is still saved and can be used
      } else {
        throw new ServiceUnavailableException('We could not send the verification email. Please try again later.');
      }
    }

    const retryAfter = await this.redisService.ttl(this.cooldownKey(normalizedEmail));
    const otpTtl = await this.otpService.getOtpTtl(normalizedEmail);

    this.logger.log(`[AuthService] OTP requested for ${this.maskEmail(normalizedEmail)}`);

    return {
      message: 'If this email is registered, we just sent a 6-digit code.',
      retryAfter: retryAfter > 0 ? retryAfter : OTP_EMAIL_COOLDOWN_SECONDS,
      expiresIn: otpTtl > 0 ? otpTtl : OTP_TTL_SECONDS,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    this.logger.log(`[AuthService] verifyOtp() called for email: ${this.maskEmail(verifyOtpDto.email)}`);

    const normalizedEmail = this.normalizeEmail(verifyOtpDto.email);
    this.logger.log(`[AuthService] verifyOtp() - normalized email: ${this.maskEmail(normalizedEmail)}`);

    // Reviewer test account: accept the fixed code without touching Redis/OTP store.
    const isReviewerLogin = this.isReviewerLogin(normalizedEmail, verifyOtpDto.code);
    if (isReviewerLogin) {
      this.logger.log(`[AuthService] verifyOtp() - reviewer test bypass accepted for ${this.maskEmail(normalizedEmail)}`);
    } else {
      this.logger.log(`[AuthService] verifyOtp() - verifying OTP code...`);
      const status = await this.otpService.verifyOtp(normalizedEmail, verifyOtpDto.code);
      this.logger.log(`[AuthService] verifyOtp() - OTP verification status: ${status}`);

      if (status === 'expired') {
        this.logger.warn(`[AuthService] verifyOtp() - OTP expired for ${this.maskEmail(normalizedEmail)}`);
        throw new BadRequestException({ message: 'Verification code expired. Request a new one.', code: 'OTP_EXPIRED' });
      }
      if (status === 'invalid') {
        this.logger.warn(`[AuthService] verifyOtp() - OTP invalid for ${this.maskEmail(normalizedEmail)}`);
        throw new BadRequestException({ message: 'Incorrect verification code. Check the email and try again.', code: 'OTP_INVALID' });
      }
    }

    this.logger.log(`[AuthService] verifyOtp() - OTP valid, calling findOrCreateUser()...`);
    const user = await this.findOrCreateUser(normalizedEmail);
    this.logger.log(`[AuthService] verifyOtp() - user found/created: id=${user.id}, email=${this.maskEmail(user.email)}`);

    // Give the reviewer account full (paid) access so every section is reviewable.
    if (isReviewerLogin) {
      await this.ensureReviewerPro(user.id);
    }

    this.logger.log(`[AuthService] verifyOtp() - calling generateTokens()...`);
    const tokens = await this.generateTokens(user.id, user.email);
    this.logger.log(`[AuthService] verifyOtp() - tokens generated successfully, hasAccessToken=${!!tokens.accessToken}, hasRefreshToken=${!!tokens.refreshToken}`);

    // Fetch full profile to return with auth response
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    this.logger.log(`[AuthService] OTP verified for ${this.maskEmail(normalizedEmail)}`);

    const response = {
      message: 'Signed in successfully.',
      user: {
        id: user.id,
        email: user.email,
      },
      profile, // optimizations: return profile directly
      ...tokens,
    };
    this.logger.log(`[AuthService] verifyOtp() - returning response with tokens`);
    return response;
  }

  async requestMagicLink(requestMagicLinkDto: RequestMagicLinkDto, clientIp?: string) {
    const normalizedEmail = this.normalizeEmail(requestMagicLinkDto.email);
    const sanitizedIp = this.sanitizeIp(clientIp);

    await this.enforceMagicLinkRateLimits(normalizedEmail, sanitizedIp);

    const user = await this.findOrCreateUser(normalizedEmail);
    await this.sendMagicLinkForUser(user, requestMagicLinkDto.redirectUrl);

    this.logger.log(`[AuthService] Magic link requested for ${this.maskEmail(user.email)}`);

    return {
      message: 'If this email is registered, we sent a magic link to your inbox.',
    };
  }

  async requestExpertMagicLink(requestMagicLinkDto: RequestMagicLinkDto, clientIp?: string) {
    const normalizedEmail = this.normalizeEmail(requestMagicLinkDto.email);
    const sanitizedIp = this.sanitizeIp(clientIp);

    await this.enforceMagicLinkRateLimits(normalizedEmail, sanitizedIp);

    // Case-insensitive findFirst+orderBy in case duplicate / mixed-case rows
    // exist (see findOrCreateUser).
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      include: { expertProfile: true },
    });

    const response = {
      message: 'If this email belongs to an expert account, we sent a sign-in link to your inbox.',
    };

    if (!user || user.expertsRole !== 'EXPERT' || !user.expertProfile) {
      this.logger.warn(`[AuthService] Expert portal magic link skipped for ineligible email ${this.maskEmail(normalizedEmail)}`);
      return response;
    }

    await this.sendMagicLinkForUser(user, requestMagicLinkDto.redirectUrl);

    this.logger.log(`[AuthService] Expert portal magic link requested for ${this.maskEmail(user.email)}`);

    return response;
  }

  /**
   * Admin-triggered: send an initial magic-link to a newly-created expert without
   * rate-limiting. Used after `POST /admin/experts` so the expert receives a
   * welcome email with portal access automatically.
   */
  async sendInitialExpertMagicLink(userId: string): Promise<{ sent: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, expertsRole: true },
    });
    if (!user || user.expertsRole !== 'EXPERT') return { sent: false };
    try {
      // Must point at the portal callback (not the bare API endpoint, which
      // would render raw JSON in the browser — see bug report screenshot 1).
      await this.sendMagicLinkForUser(user, `${expertPortalUrl()}/auth/callback`);
      this.logger.log(`[AuthService] Initial expert magic link sent to ${this.maskEmail(user.email)}`);
      return { sent: true };
    } catch (err: any) {
      this.logger.warn(`[AuthService] Initial expert magic link failed: ${err?.message}`);
      return { sent: false };
    }
  }

  private async sendMagicLinkForUser(user: { id: string; email: string }, redirectUrl?: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

    await this.prisma.magicLink.create({
      data: {
        userId: user.id,
        email: user.email,
        token,
        expiresAt,
      },
    });

    let magicLinkUrl: string;
    if (redirectUrl) {
      const sep = redirectUrl.includes('?') ? '&' : '?';
      magicLinkUrl = `${redirectUrl}${sep}token=${token}`;
    } else {
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      magicLinkUrl = `${baseUrl}/auth/magic-link?token=${token}`;
    }

    try {
      await this.mailerService.sendMagicLinkEmail(user.email, magicLinkUrl);
    } catch (error) {
      this.logger.error(`[AuthService] Failed to dispatch magic link for ${this.maskEmail(user.email)}`);
      throw new ServiceUnavailableException('We could not send the magic link. Please try again later.');
    }
  }

  async consumeMagicLink(token: string) {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink) {
      throw new BadRequestException('Invalid magic link');
    }

    if (magicLink.used) {
      throw new BadRequestException('Magic link already used');
    }

    if (magicLink.expiresAt < new Date()) {
      throw new BadRequestException('Magic link expired');
    }

    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { used: true },
    });

    const tokens = await this.generateTokens(magicLink.user.id, magicLink.user.email);

    // Fetch full profile
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: magicLink.user.id },
    });

    this.logger.log(`[AuthService] Magic link consumed for ${this.maskEmail(magicLink.user.email)}`);

    return {
      message: 'Signed in successfully.',
      user: {
        id: magicLink.user.id,
        email: magicLink.user.email,
      },
      profile,
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    // Early validation - empty token check
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      this.logger.warn('[AuthService] Refresh token is empty or invalid type');
      throw new UnauthorizedException('Refresh token required');
    }

    this.logger.debug(`[AuthService] refreshToken() called`);

    try {
      // 1. Check if token is blacklisted in Redis (fast path rejection)
      const blacklistKey = `${process.env.REDIS_BLACKLIST_PREFIX || 'auth:refresh:blacklist:'}${refreshToken}`;
      const isBlacklisted = await this.redisService.exists(blacklistKey);

      if (isBlacklisted) {
        this.logger.warn(`[AuthService] Token is blacklisted (already rotated)`);
        throw new UnauthorizedException('Token has been revoked');
      }

      // 2. Verify JWT signature and expiry with detailed error handling
      let payload: any;
      try {
        payload = this.jwtService.verify(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        });
      } catch (jwtError: any) {
        if (jwtError.name === 'TokenExpiredError') {
          this.logger.warn('[AuthService] Refresh token expired');
          throw new UnauthorizedException('Refresh token expired');
        }
        if (jwtError.name === 'JsonWebTokenError') {
          this.logger.warn('[AuthService] Invalid JWT signature', { error: jwtError.message });
          throw new UnauthorizedException('Invalid refresh token signature');
        }
        this.logger.warn('[AuthService] JWT verification failed', { error: jwtError.message });
        throw new UnauthorizedException('Invalid refresh token');
      }

      const jti = (payload as any).jti;
      const tokenLookupKey = jti || refreshToken;

      // Use Redis lock to prevent concurrent refresh for the same token
      // This prevents race conditions when multiple 401s trigger concurrent refreshes
      const lockKey = `auth:refresh:lock:${tokenLookupKey}`;
      const lockAcquired = await this.redisService.setNx(lockKey, '1', 30); // 30 second lock

      if (!lockAcquired) {
        // Another refresh is in progress for this token
        // Wait briefly for it to complete (with exponential backoff)
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));

          // Check if the old token is now blacklisted (meaning refresh succeeded)
          const nowBlacklisted = await this.redisService.exists(blacklistKey);
          if (nowBlacklisted) {
            // The concurrent refresh succeeded - return the new token
            // This prevents "Token already refreshed" 401 errors
            const userId = (payload as any).sub;
            const latestActiveToken = await this.prisma.refreshToken.findFirst({
              where: {
                userId,
                revoked: false,
              },
              orderBy: { createdAt: 'desc' },
              include: { user: true },
            });

            if (latestActiveToken) {
              this.logger.log(`[AuthService] Concurrent refresh handled for user ${this.maskEmail(latestActiveToken.user.email)}`);
              const accessToken = this.jwtService.sign(
                { sub: userId, email: latestActiveToken.user.email, jti: latestActiveToken.jti },
                { expiresIn: '45m' }
              );
              return {
                message: 'Token refreshed successfully',
                accessToken,
                refreshToken: latestActiveToken.token,
              };
            }
          }

          // Check if lock is released
          const lockExists = await this.redisService.exists(lockKey);
          if (!lockExists) {
            break; // Lock released, we can try to acquire it
          }
        }

        // After waiting, try to proceed (lock may be released or we'll get it)
      }

      try {
        // Atomic token rotation: lookup, validate, revoke, and create in one transaction
        const result = await this.prisma.$transaction(async (tx) => {
          // Lookup token inside transaction for consistency
          let tokenRecord;
          if (jti) {
            tokenRecord = await tx.refreshToken.findUnique({
              where: { jti },
              include: { user: true },
            });
          } else {
            // Fallback for old tokens without jti
            tokenRecord = await tx.refreshToken.findUnique({
              where: { token: refreshToken },
              include: { user: true },
            });
          }

          if (!tokenRecord) {
            this.logger.warn('[AuthService] Token not found in database');
            throw new UnauthorizedException('Token not found');
          }

          // Check if already revoked (by a concurrent request)
          if (tokenRecord.revoked) {
            // GRACE PERIOD: Handle "Lost Response" scenario
            // If client uses revoked token shortly after rotation, return the new token
            const latestActiveToken = await tx.refreshToken.findFirst({
              where: {
                userId: tokenRecord.userId,
                revoked: false,
              },
              orderBy: { createdAt: 'desc' },
            });

            const GRACE_PERIOD_MS = 45 * 1000; // 45 seconds
            if (latestActiveToken) {
              const timeSinceRotation = Date.now() - latestActiveToken.createdAt.getTime();
              if (timeSinceRotation < GRACE_PERIOD_MS) {
                this.logger.warn(`[AuthService] Grace recovery for user ${this.maskEmail(tokenRecord.user.email)}`);
                // Return existing valid token (the one client missed)
                const accessToken = this.jwtService.sign(
                  { sub: tokenRecord.userId, email: tokenRecord.user.email, jti: latestActiveToken.jti },
                  { expiresIn: '45m' }
                );
                return {
                  tokens: { accessToken, refreshToken: latestActiveToken.token },
                  user: tokenRecord.user,
                  expiresAt: latestActiveToken.expiresAt,
                  isGraceRecovery: true,
                };
              }
            }
            throw new UnauthorizedException('Token already used');
          }

          // Revoke old token
          await tx.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { revoked: true },
          });

          // Generate new tokens
          const newTokens = await this.generateTokensInTransaction(tx, tokenRecord.user.id, tokenRecord.user.email);

          return { tokens: newTokens, user: tokenRecord.user, expiresAt: tokenRecord.expiresAt };
        });

        // REMOVED: Do not blacklist immediately to allow Grace Period (45s) to work.
        // The DB 'revoked' check handles security and allows returning the new valid token
        // if the client retries with the old token due to network issues.
        /*
        const oldTokenTtl = Math.max(0, Math.floor((result.expiresAt.getTime() - Date.now()) / 1000));
        if (oldTokenTtl > 0) {
          await this.redisService.set(blacklistKey, '1', oldTokenTtl);
        }
        */

        // Fetch full profile
        const profile = await this.prisma.userProfile.findUnique({
          where: { userId: result.user.id },
        });

        this.logger.log(`[AuthService] Token refreshed for user ${this.maskEmail(result.user.email)}`);

        return {
          message: 'Token refreshed successfully',
          ...result.tokens,
          user: {
            id: result.user.id,
            email: result.user.email,
            expertsRole: result.user.expertsRole,
          },
          profile,
        };
      } finally {
        // Always release the lock
        await this.redisService.del(lockKey);
      }
    } catch (error) {
      // Re-throw UnauthorizedException as-is (already properly formatted)
      if (error instanceof UnauthorizedException) {
        this.logger.warn(`[AuthService] Refresh failed: ${error.message}`);
        throw error;
      }
      this.logger.error(`[AuthService] Unexpected refresh error: ${error.message || error}`);
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  // Helper method for generating tokens within a transaction
  private async generateTokensInTransaction(tx: any, userId: string, email: string): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = crypto.randomUUID();

    const payload = { sub: userId, email, jti };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '45m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      expiresIn: `${refreshTokenTtlDays()}d`,
    });

    // Use findFirst + create/update to handle race conditions
    // This works even with partial unique indexes (WHERE jti IS NOT NULL)
    const expiresAt = new Date(Date.now() + refreshTokenTtlDays() * 24 * 60 * 60 * 1000);

    // Try to find existing token by jti
    const existingToken = await tx.refreshToken.findFirst({
      where: { jti },
    });

    if (existingToken) {
      // Update existing token
      await tx.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          token: refreshToken,
          expiresAt,
          revoked: false,
        },
      });
    } else {
      // Create new token
      try {
        await tx.refreshToken.create({
          data: {
            token: refreshToken,
            jti,
            userId,
            expiresAt,
          },
        });
      } catch (createError: any) {
        // If token (not jti) collision occurs, retry with new jti (extremely rare)
        if (createError.code === 'P2002' && createError.meta?.target?.includes('token')) {
          this.logger.warn(`[AuthService] Token collision detected during create in transaction, retrying with new jti...`);
          return this.generateTokensInTransaction(tx, userId, email); // Recursive retry
        }
        throw createError;
      }
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string) {
    // Get all active refresh tokens for the user
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: { userId, revoked: false },
    });

    // Add all active tokens to Redis blacklist
    const blacklistPrefix = process.env.REDIS_BLACKLIST_PREFIX || 'auth:refresh:blacklist:';
    for (const token of refreshTokens) {
      const blacklistKey = `${blacklistPrefix}${token.token}`;
      const ttl = Math.max(0, Math.floor((token.expiresAt.getTime() - Date.now()) / 1000));
      if (ttl > 0) {
        await this.redisService.set(blacklistKey, '1', ttl);
      }
    }

    // Revoke all refresh tokens in database
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    this.logger.log(`[AuthService] User ${userId} logged out, ${refreshTokens.length} tokens revoked`);

    return { message: 'Logout successful' };
  }

  async signInWithApple(appleSignInDto: AppleSignInDto) {
    try {
      const { identityToken, fullName } = appleSignInDto;

      if (!identityToken) {
        throw new BadRequestException('Identity token is required');
      }

      const bundleId = process.env.APPLE_BUNDLE_ID || 'ch.eatsense.app';

      console.log('[AuthService] Apple Sign In attempt:', {
        hasIdentityToken: !!identityToken,
        tokenLength: identityToken?.length,
        bundleId: bundleId,
        envBundleId: process.env.APPLE_BUNDLE_ID,
      });

      const JWKS = await this.getApplePublicKeys();

      let payload: jose.JWTPayload;
      try {
        // First, decode the token without verification to see what audience it has
        const decoded = jose.decodeJwt(identityToken);
        const tokenAudience = decoded.aud as string | string[] | undefined;

        console.log('[AuthService] Decoded token (before verification):', {
          aud: tokenAudience,
          iss: decoded.iss,
          sub: decoded.sub,
        });

        // Apple Sign In tokens can have different audience formats
        // Try to verify with the actual audience from the token, or fallback to bundleId
        const verifyOptions: jose.JWTVerifyOptions = {
          issuer: 'https://appleid.apple.com',
        };

        // If token has a specific audience, use it; otherwise use bundleId
        if (tokenAudience) {
          if (typeof tokenAudience === 'string') {
            verifyOptions.audience = tokenAudience;
          } else if (Array.isArray(tokenAudience) && tokenAudience.length > 0) {
            verifyOptions.audience = tokenAudience[0];
          } else {
            verifyOptions.audience = bundleId;
          }
        } else {
          verifyOptions.audience = bundleId;
        }

        console.log('[AuthService] Verifying with audience:', verifyOptions.audience);

        const { payload: verifiedPayload } = await jose.jwtVerify(identityToken, JWKS, verifyOptions);
        payload = verifiedPayload;

        console.log('[AuthService] Apple token verified successfully:', {
          sub: payload.sub,
          email: payload.email,
          aud: payload.aud,
        });
      } catch (jwtError: any) {
        console.error('[AuthService] Apple token verification failed:', {
          error: jwtError.message,
          bundleId: bundleId,
          expectedAudience: bundleId,
          tokenAudience: jwtError.audience || 'unknown',
          errorCode: jwtError.code,
        });

        // Provide more helpful error message
        if (jwtError.message?.includes('aud')) {
          throw new UnauthorizedException(
            `Apple Sign In failed: Audience mismatch. Expected: ${bundleId}, Got: ${jwtError.audience || 'unknown'}. ` +
            'Please check APPLE_BUNDLE_ID in .env matches your Apple Developer configuration.'
          );
        }

        throw new UnauthorizedException('Invalid Apple identity token');
      }

      const tokenEmail = payload.email as string | undefined;
      const tokenSub = payload.sub as string;

      let email = tokenEmail;

      if (!email) {
        const existingUser = await this.prisma.user.findFirst({
          where: { appleUserId: tokenSub },
        });

        if (existingUser) {
          email = existingUser.email;
        } else {
          this.logger.error('[AuthService] Apple Sign In: no email in token and no existing user');
          throw new BadRequestException('Email is required for first Apple Sign In');
        }
      }

      const normalizedEmail = this.normalizeEmail(email);

      let user_ = await this.prisma.user.findFirst({
        where: { appleUserId: tokenSub },
        orderBy: { createdAt: 'asc' },
      });

      if (!user_) {
        // Case-insensitive findMany+orderBy to survive duplicate-email rows
        // and mixed-case legacy data in prod (see findOrCreateUser comment).
        const byEmail = await this.prisma.user.findMany({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
          orderBy: { createdAt: 'asc' },
        });
        if (byEmail.length > 1) {
          this.logger.error(
            `[AuthService] Apple Sign In: duplicate users for email=${this.maskEmail(normalizedEmail)}: ${byEmail.map((u) => u.id).join(', ')}. Pinning to oldest.`,
          );
        }
        user_ = byEmail[0] || null;
      }

      if (!user_) {
        const password = await this.generateRandomPasswordHash();
        user_ = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            password,
            appleUserId: tokenSub,
          },
        });
      } else {
        // Backfill appleUserId for legacy users and refresh the relay email if Apple
        // rotated it (happens when the user revokes & re-grants access — same Apple ID,
        // new private-relay address). Without this the user's profile keeps a stale
        // email and password resets / magic links go to a dead inbox.
        const patch: { appleUserId?: string; email?: string } = {};
        if (!user_.appleUserId) patch.appleUserId = tokenSub;
        if (normalizedEmail && user_.email !== normalizedEmail) {
          // Only auto-rotate to a private-relay address — never override a real email
          // a user typed in OTP/magic-link flow with a relay alias.
          const isRelay = normalizedEmail.endsWith('@privaterelay.appleid.com');
          const wasRelay = (user_.email || '').endsWith('@privaterelay.appleid.com');
          if (isRelay && wasRelay) {
            patch.email = normalizedEmail;
          }
        }
        if (Object.keys(patch).length > 0) {
          user_ = await this.prisma.user.update({
            where: { id: user_.id },
            data: patch,
          });
        }
      }

      if (fullName && (fullName.givenName || fullName.familyName)) {
        await this.prisma.userProfile.upsert({
          where: { userId: user_.id },
          update: {
            firstName: fullName.givenName || undefined,
            lastName: fullName.familyName || undefined,
          },
          create: {
            userId: user_.id,
            firstName: fullName.givenName || undefined,
            lastName: fullName.familyName || undefined,
          },
        });
      }

      const tokens = await this.generateTokens(user_.id, user_.email);

      // Fetch full profile
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId: user_.id },
      });

      this.logger.log(`[AuthService] Apple Sign In successful for ${this.maskEmail(normalizedEmail)}`);

      return {
        message: 'Signed in successfully with Apple.',
        user: {
          id: user_.id,
          email: user_.email,
        },
        profile,
        ...tokens,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('[AuthService] Apple Sign In failed:', error);
      throw new UnauthorizedException('Apple Sign In failed. Please try again.');
    }
  }

  async signInWithGoogle(googleSignInDto: GoogleSignInDto) {
    try {
      const { idToken, accessToken, name, picture } = googleSignInDto;

      let verifiedEmail: string;
      let verifiedName: string | undefined = name;
      let verifiedPicture: string | undefined = picture;

      if (idToken) {
        try {
          const client = this.getGoogleClient();
          const ticket = await client.verifyIdToken({
            idToken,
            audience: [
              process.env.GOOGLE_IOS_CLIENT_ID,
              process.env.GOOGLE_ANDROID_CLIENT_ID,
              process.env.GOOGLE_WEB_CLIENT_ID,
            ].filter(Boolean) as string[],
          });

          const payload = ticket.getPayload();
          if (!payload || !payload.email) {
            throw new UnauthorizedException('Invalid Google ID token');
          }

          verifiedEmail = payload.email;
          verifiedName = payload.name || name;
          verifiedPicture = payload.picture || picture;

          if (!payload.email_verified) {
            throw new BadRequestException('Google email is not verified');
          }
        } catch (tokenError: any) {
          this.logger.error('[AuthService] Google ID token verification failed:', tokenError.message);
          throw new UnauthorizedException('Invalid Google ID token');
        }
      } else if (accessToken) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
          );

          if (!response.ok) {
            throw new UnauthorizedException('Invalid Google access token');
          }

          const userInfo = await response.json() as {
            email?: string;
            name?: string;
            picture?: string;
            email_verified?: boolean;
          };

          if (!userInfo.email) {
            throw new UnauthorizedException('No email in Google response');
          }

          verifiedEmail = userInfo.email;
          verifiedName = userInfo.name || name;
          verifiedPicture = userInfo.picture || picture;

          if (!userInfo.email_verified) {
            throw new BadRequestException('Google email is not verified');
          }
        } catch (fetchError: any) {
          this.logger.error('[AuthService] Google userinfo fetch failed:', fetchError.message);
          throw new UnauthorizedException('Failed to verify Google token');
        }
      } else {
        throw new BadRequestException('Either idToken or accessToken is required');
      }

      const normalizedEmail = this.normalizeEmail(verifiedEmail);

      const user = await this.findOrCreateUser(normalizedEmail);

      if (verifiedName || verifiedPicture) {
        const nameParts = (verifiedName || '').split(' ');
        const firstName = nameParts[0] || undefined;
        const lastName = nameParts.slice(1).join(' ') || undefined;

        await this.prisma.userProfile.upsert({
          where: { userId: user.id },
          update: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(verifiedPicture && { avatarUrl: verifiedPicture }),
          },
          create: {
            userId: user.id,
            firstName,
            lastName,
            avatarUrl: verifiedPicture,
          },
        });
      }

      const tokens = await this.generateTokens(user.id, user.email);

      // Fetch full profile
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId: user.id },
      });

      this.logger.log(`[AuthService] Google Sign In successful for ${this.maskEmail(normalizedEmail)}`);

      return {
        message: 'Signed in successfully with Google.',
        user: {
          id: user.id,
          email: user.email,
        },
        profile,
        ...tokens,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('[AuthService] Google Sign In failed:', error);
      throw new UnauthorizedException('Google Sign In failed. Please try again.');
    }
  }

  private async generateTokens(userId: string, email: string): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.log(`[AuthService] generateTokens() called for userId=${userId}, email=${this.maskEmail(email)}`);

    // Generate unique jti (JWT ID) to ensure token uniqueness even with parallel requests
    const jti = crypto.randomUUID();

    const payload = { sub: userId, email, jti };
    this.logger.log(`[AuthService] generateTokens() - payload created with jti=${jti}`);

    this.logger.log(`[AuthService] generateTokens() - signing access token...`);
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '45m', // 30-60 minutes as requested, using 45m as middle ground
    });
    this.logger.log(`[AuthService] generateTokens() - access token signed, length=${accessToken.length}`);

    this.logger.log(`[AuthService] generateTokens() - signing refresh token...`);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      expiresIn: `${refreshTokenTtlDays()}d`,
    });
    this.logger.log(`[AuthService] generateTokens() - refresh token signed, length=${refreshToken.length}`);

    this.logger.log(`[AuthService] generateTokens() - creating refresh token in database...`);
    // Use findFirst + create/update to handle race conditions
    // This works even with partial unique indexes (WHERE jti IS NOT NULL)
    try {
      const expiresAt = new Date(Date.now() + refreshTokenTtlDays() * 24 * 60 * 60 * 1000);

      // Try to find existing token by jti
      const existingToken = await this.prisma.refreshToken.findFirst({
        where: { jti },
      });

      if (existingToken) {
        // Update existing token
        await this.prisma.refreshToken.update({
          where: { id: existingToken.id },
          data: {
            token: refreshToken,
            expiresAt,
            revoked: false,
          },
        });
        this.logger.log(`[AuthService] generateTokens() - refresh token updated in database`);
      } else {
        // Create new token
        try {
          await this.prisma.refreshToken.create({
            data: {
              token: refreshToken,
              jti,
              userId,
              expiresAt,
            },
          });
          this.logger.log(`[AuthService] generateTokens() - refresh token created in database`);
        } catch (createError: any) {
          // If token collision occurs (P2002), retry with new jti
          if (createError.code === 'P2002' && createError.meta?.target?.includes('token')) {
            this.logger.warn(`[AuthService] Token collision detected, retrying with new jti...`);
            return this.generateTokens(userId, email); // Recursive retry
          }
          throw createError;
        }
      }
    } catch (error: any) {
      this.logger.error(`[AuthService] generateTokens() - error saving refresh token:`, error);
      throw error;
    }

    const result = {
      accessToken,
      refreshToken,
    };
    this.logger.log(`[AuthService] generateTokens() - returning tokens successfully`);
    return result;
  }

  private async findOrCreateUser(email: string) {
    this.logger.log(`[AuthService] findOrCreateUser() called for email: ${this.maskEmail(email)}`);

    this.logger.log(`[AuthService] findOrCreateUser() - searching for user in database...`);
    // Defensive lookup: case-insensitive match + return the OLDEST user.
    //
    // History: some accounts created before normalizeEmail() was applied got
    // stored with mixed case (e.g. `Bountyvangun348@gmail.com`). The current
    // login passes `bountyvangun348@gmail.com`, which `findUnique` treats as a
    // different string → creates a fresh User → user loops back into the
    // onboarding screen because their old profile lives under the original
    // capitalized row. `mode: 'insensitive'` makes the comparison ILIKE in
    // Postgres. orderBy createdAt asc pins a returning user to their original
    // (oldest) record even if duplicates were created during the bug window.
    const candidates = await this.prisma.user.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
    if (candidates.length > 1) {
      this.logger.error(
        `[AuthService] findOrCreateUser() - DUPLICATE USERS for email=${this.maskEmail(email)}: ${candidates.map((u) => u.id).join(', ')}. Pinning to oldest.`,
      );
    }
    let user: typeof candidates[number] | null = candidates[0] || null;
    this.logger.log(`[AuthService] findOrCreateUser() - user search completed, found=${!!user}, userId=${user?.id || 'N/A'}, duplicates=${Math.max(0, candidates.length - 1)}`);

    if (!user) {
      this.logger.log(`[AuthService] findOrCreateUser() - user not found, creating new user...`);
      const password = await this.generateRandomPasswordHash();
      this.logger.log(`[AuthService] findOrCreateUser() - password hash generated, creating user record...`);
      user = await this.prisma.user.create({
        data: {
          email,
          password,
        },
      });
      this.logger.log(`[AuthService] findOrCreateUser() - new user created: id=${user.id}, email=${this.maskEmail(user.email)}`);
      return user;
    }

    this.logger.log(`[AuthService] findOrCreateUser() - user found, checking password...`);
    if (!user.password || user.password.trim().length === 0) {
      this.logger.log(`[AuthService] findOrCreateUser() - user has no password, generating and updating...`);
      const password = await this.generateRandomPasswordHash();
      this.logger.log(`[AuthService] findOrCreateUser() - password hash generated, updating user...`);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { password },
      });
      this.logger.log(`[AuthService] findOrCreateUser() - user password updated`);
    } else {
      this.logger.log(`[AuthService] findOrCreateUser() - user has password, no update needed`);
    }

    this.logger.log(`[AuthService] findOrCreateUser() - returning user: id=${user.id}, email=${this.maskEmail(user.email)}`);
    return user;
  }

  private async generateRandomPasswordHash() {
    const random = crypto.randomBytes(32).toString('hex');
    return bcrypt.hash(random, 10);
  }

  private async enforceOtpRateLimits(email: string, ip?: string | null) {
    await this.ensureCooldown(email);
    await this.ensureHourlyLimit(OTP_EMAIL_HOURLY_LIMIT, this.emailHourlyKey(email));

    if (ip) {
      await this.ensureHourlyLimit(OTP_IP_HOURLY_LIMIT, this.ipHourlyKey(ip));
    }
  }

  private async enforceMagicLinkRateLimits(email: string, ip?: string | null) {
    await this.ensureHourlyLimit(MAGIC_LINK_HOURLY_LIMIT, this.magicHourlyKey(email));

    if (ip) {
      await this.ensureHourlyLimit(MAGIC_LINK_HOURLY_LIMIT * 2, this.magicIpHourlyKey(ip));
    }
  }

  /**
   * Increments an in-memory fallback counter. Used when Redis is unavailable.
   * Cleans expired entries opportunistically on each call to bound memory.
   */
  private incrFallbackCounter(key: string, ttlSeconds: number): number {
    const now = Date.now();

    // Opportunistic cleanup: drop expired entries (cheap, runs every call).
    if (this.fallbackCounters.size > 1000) {
      for (const [k, v] of this.fallbackCounters) {
        if (v.expiresAt <= now) {
          this.fallbackCounters.delete(k);
        }
      }
    }

    const existing = this.fallbackCounters.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.fallbackCounters.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }
    existing.count += 1;
    return existing.count;
  }

  private fallbackCounterTtl(key: string): number {
    const entry = this.fallbackCounters.get(key);
    if (!entry) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }

  private async ensureCooldown(email: string) {
    const key = this.cooldownKey(email);
    const acquired = await this.redisService.setNx(key, '1', OTP_EMAIL_COOLDOWN_SECONDS);

    if (acquired) {
      return; // Lock acquired in Redis — proceed.
    }

    // setNx returned false. Two possible reasons:
    //   (a) cooldown is genuinely active in Redis → ttl > 0
    //   (b) Redis is down/errored → ttl <= 0 (fail-open in original code)
    // We disambiguate via ttl. If ttl <= 0 we fall back to the in-memory counter
    // so the cooldown still works during a Redis outage.
    const ttl = await this.redisService.ttl(key);
    if (ttl > 0) {
      throw new HttpException(
        {
          message: 'Too many requests. Wait a moment before trying again.',
          retryAfter: ttl,
          code: 'OTP_RATE_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Redis appears unavailable — use in-memory fallback per process.
    this.logger.warn(
      `[AuthService] Redis unavailable for cooldown key=${key}. Falling back to in-memory cooldown.`,
    );
    const fallbackCount = this.incrFallbackCounter(key, OTP_EMAIL_COOLDOWN_SECONDS);
    if (fallbackCount > 1) {
      const fallbackTtl = this.fallbackCounterTtl(key);
      throw new HttpException(
        {
          message: 'Too many requests. Wait a moment before trying again.',
          retryAfter: fallbackTtl > 0 ? fallbackTtl : OTP_EMAIL_COOLDOWN_SECONDS,
          code: 'OTP_RATE_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async ensureHourlyLimit(limit: number, key: string) {
    const count = await this.redisService.incr(key);

    // FAIL-CLOSED on Redis outage. A real Redis INCR always returns >= 1; the only
    // way to get 0 is RedisService.incr() catching an error or unconnected client.
    // Previously this returned silently → OTP/magic-link flood was possible during
    // any Redis hiccup. Now we fall back to a per-process in-memory counter so the
    // attacker is bounded even when Redis is down.
    if (count <= 0) {
      this.logger.error(
        `[AuthService] Redis unavailable for hourly-limit key=${key} (incr returned ${count}). ` +
        `Falling back to in-memory counter.`,
      );
      const fallbackCount = this.incrFallbackCounter(key, 60 * 60);
      if (fallbackCount > limit) {
        throw new HttpException(
          {
            message: 'Too many requests. Please try again later.',
            retryAfter: this.fallbackCounterTtl(key) || 60 * 60,
            code: 'OTP_RATE_LIMIT',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return;
    }

    if (count === 1) {
      await this.redisService.expire(key, 60 * 60);
    }

    if (count > limit) {
      const ttl = await this.redisService.ttl(key);
      throw new HttpException(
        {
          message: 'Too many requests. Please try again later.',
          retryAfter: ttl > 0 ? ttl : 60 * 60,
          code: 'OTP_RATE_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  private sanitizeIp(ip?: string | null): string | null {
    if (!ip) {
      return null;
    }
    const first = ip.split(',')[0].trim();
    return first.replace('::ffff:', '') || null;
  }

  private cooldownKey(email: string) {
    return `auth:otp:cooldown:${email}`;
  }

  private emailHourlyKey(email: string) {
    return `auth:otp:rate:${email}`;
  }

  private ipHourlyKey(ip: string) {
    return `auth:otp:rate:ip:${ip}`;
  }

  private magicHourlyKey(email: string) {
    return `auth:magic:rate:${email}`;
  }

  private magicIpHourlyKey(ip: string) {
    return `auth:magic:rate:ip:${ip}`;
  }

  private maskEmail(email: string) {
    const [local, domain] = email.split('@');
    if (!domain) {
      return `${email.slice(0, 3)}***`;
    }
    const visibleLocal = local.slice(0, Math.min(2, local.length));
    return `${visibleLocal}***@${domain}`;
  }

  /**
   * Cleanup expired and old revoked refresh tokens.
   * Should be called periodically via cron (e.g., daily).
   */
  async cleanupExpiredTokens(): Promise<{ deleted: number }> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            // Delete tokens that have expired
            { expiresAt: { lt: new Date() } },
            // Delete revoked tokens older than 7 days
            { revoked: true, createdAt: { lt: sevenDaysAgo } },
          ],
        },
      });

      this.logger.log(`[AuthService] Cleaned up ${result.count} expired/revoked tokens`);
      return { deleted: result.count };
    } catch (error: any) {
      this.logger.error(`[AuthService] Token cleanup failed: ${error.message}`);
      return { deleted: 0 };
    }
  }
}
