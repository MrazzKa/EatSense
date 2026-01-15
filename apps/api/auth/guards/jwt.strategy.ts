import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
      // Pass request to validate for diagnostic logging
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const requestPath = req?.path || req?.url || 'unknown';
    const jti = payload?.jti || 'no-jti';
    const exp = payload?.exp ? new Date(payload.exp * 1000).toISOString() : 'unknown';
    const iat = payload?.iat ? new Date(payload.iat * 1000).toISOString() : 'unknown';

    this.logger.debug(`[JWT] Validating token for ${requestPath}`, {
      userId: payload?.sub,
      jti: jti.substring(0, 8) + '...',
      issuedAt: iat,
      expiresAt: exp,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      this.logger.warn(`[JWT] User not found for token`, {
        userId: payload?.sub,
        path: requestPath,
      });
      return null;
    }

    this.logger.debug(`[JWT] Token validated successfully for ${user.email.split('@')[0]}***`);

    return {
      id: user.id,
      email: user.email,
    };
  }
}
