import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private applePublicKeys: jose.JWTVerifyGetKey | null = null;
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
  ) {}

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

  async register(_: RegisterDto) {
    throw new BadRequestException('Password registration is disabled. Use email code login.');
  }

  async validateUser(): Promise<any> {
    return null;
  }

  async login(_: LoginDto) {
    throw new BadRequestException('Password login is disabled. Use email code login.');
  }

  async requestOtp(requestOtpDto: RequestOtpDto, clientIp?: string) {
    const normalizedEmail = this.normalizeEmail(requestOtpDto.email);
    const sanitizedIp = this.sanitizeIp(clientIp);

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

    this.logger.log(`[AuthService] verifyOtp() - OTP valid, calling findOrCreateUser()...`);
    const user = await this.findOrCreateUser(normalizedEmail);
    this.logger.log(`[AuthService] verifyOtp() - user found/created: id=${user.id}, email=${this.maskEmail(user.email)}`);
    
    this.logger.log(`[AuthService] verifyOtp() - calling generateTokens()...`);
    const tokens = await this.generateTokens(user.id, user.email);
    this.logger.log(`[AuthService] verifyOtp() - tokens generated successfully, hasAccessToken=${!!tokens.accessToken}, hasRefreshToken=${!!tokens.refreshToken}`);

    this.logger.log(`[AuthService] OTP verified for ${this.maskEmail(normalizedEmail)}`);

    const response = {
      message: 'Signed in successfully.',
      user: {
        id: user.id,
        email: user.email,
      },
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

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const magicLinkUrl = `${baseUrl}/v1/auth/magic-link?token=${token}`;

    try {
      await this.mailerService.sendMagicLinkEmail(user.email, magicLinkUrl);
    } catch (error) {
      this.logger.error(`[AuthService] Failed to dispatch magic link for ${this.maskEmail(user.email)}`);
      throw new ServiceUnavailableException('We could not send the magic link. Please try again later.');
    }

    this.logger.log(`[AuthService] Magic link requested for ${this.maskEmail(user.email)}`);

    return {
      message: 'If this email is registered, we sent a magic link to your inbox.',
    };
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

    this.logger.log(`[AuthService] Magic link consumed for ${this.maskEmail(magicLink.user.email)}`);

    return {
      message: 'Signed in successfully.',
      user: {
        id: magicLink.user.id,
        email: magicLink.user.email,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      // Check if token is blacklisted in Redis
      const blacklistKey = `${process.env.REDIS_BLACKLIST_PREFIX || 'auth:refresh:blacklist:'}${refreshToken}`;
      const isBlacklisted = await this.redisService.exists(blacklistKey);
      
      if (isBlacklisted) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      });

      // Use jti from payload if available, otherwise fall back to token lookup
      const jti = (payload as any).jti;
      let tokenRecord;
      
      if (jti) {
        tokenRecord = await this.prisma.refreshToken.findUnique({
          where: { jti },
          include: { user: true },
        });
      } else {
        // Fallback for old tokens without jti
        tokenRecord = await this.prisma.refreshToken.findUnique({
          where: { token: refreshToken },
          include: { user: true },
        });
      }

      if (!tokenRecord || tokenRecord.revoked) {
        // Add to blacklist if token was revoked
        if (tokenRecord?.revoked) {
          const ttl = Math.max(0, Math.floor((tokenRecord.expiresAt.getTime() - Date.now()) / 1000));
          if (ttl > 0) {
            await this.redisService.set(blacklistKey, '1', ttl);
          }
        }
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Atomic token rotation: revoke old token and create new one in a transaction
      const tokens = await this.prisma.$transaction(async (tx) => {
        // Revoke old token
        await tx.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revoked: true },
        });

        // Generate new tokens
        const newTokens = await this.generateTokensInTransaction(tx, tokenRecord.user.id, tokenRecord.user.email);

        return newTokens;
      });

      // Add old token to Redis blacklist until it expires
      const oldTokenTtl = Math.max(0, Math.floor((tokenRecord.expiresAt.getTime() - Date.now()) / 1000));
      if (oldTokenTtl > 0) {
        await this.redisService.set(blacklistKey, '1', oldTokenTtl);
      }

      this.logger.log(`[AuthService] Token refreshed for user ${this.maskEmail(tokenRecord.user.email)}`);

      return {
        message: 'Token refreshed successfully',
        ...tokens,
      };
    } catch (error) {
      this.logger.warn(`[AuthService] Refresh token verification failed: ${error.message || error}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Helper method for generating tokens within a transaction
  private async generateTokensInTransaction(tx: any, userId: string, email: string) {
    const jti = crypto.randomUUID();
    
    const payload = { sub: userId, email, jti };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '45m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      expiresIn: '30d',
    });

    // Use findFirst + create/update to handle race conditions
    // This works even with partial unique indexes (WHERE jti IS NOT NULL)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
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
      const { identityToken, user, email: providedEmail, fullName } = appleSignInDto;

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

      let email = tokenEmail || providedEmail;

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

      let user_ = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user_) {
        const password = await this.generateRandomPasswordHash();
        user_ = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            password,
            appleUserId: tokenSub,
          },
        });
      } else if (!user_.appleUserId) {
        user_ = await this.prisma.user.update({
          where: { id: user_.id },
          data: { appleUserId: tokenSub },
        });
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

      this.logger.log(`[AuthService] Apple Sign In successful for ${this.maskEmail(normalizedEmail)}`);

      return {
        message: 'Signed in successfully with Apple.',
        user: {
          id: user_.id,
          email: user_.email,
        },
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
      const { idToken, accessToken, email: providedEmail, name, picture } = googleSignInDto;

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

      this.logger.log(`[AuthService] Google Sign In successful for ${this.maskEmail(normalizedEmail)}`);

      return {
        message: 'Signed in successfully with Google.',
        user: {
          id: user.id,
          email: user.email,
        },
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

  private async generateTokens(userId: string, email: string) {
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
      expiresIn: '30d',
    });
    this.logger.log(`[AuthService] generateTokens() - refresh token signed, length=${refreshToken.length}`);

    this.logger.log(`[AuthService] generateTokens() - creating refresh token in database...`);
    // Use findFirst + create/update to handle race conditions
    // This works even with partial unique indexes (WHERE jti IS NOT NULL)
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
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
    let user = await this.prisma.user.findUnique({
      where: { email },
    });
    this.logger.log(`[AuthService] findOrCreateUser() - user search completed, found=${!!user}, userId=${user?.id || 'N/A'}`);

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

  private async ensureCooldown(email: string) {
    const key = this.cooldownKey(email);
    const acquired = await this.redisService.setNx(key, '1', OTP_EMAIL_COOLDOWN_SECONDS);

    if (!acquired) {
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
    }
  }

  private async ensureHourlyLimit(limit: number, key: string) {
    const count = await this.redisService.incr(key);
    if (count <= 0) {
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
}
