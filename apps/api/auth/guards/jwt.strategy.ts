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
    const requestPath = (req?.originalUrl || req?.url || req?.path || 'unknown').split('?')[0];

    this.logger.debug(`[JWT] Validating token for ${requestPath}`, {
      userId: payload?.sub,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      this.logger.log(`[JWT] User not found for token path=${requestPath} userId=${payload?.sub}`);
      return null;
    }

    if (requestPath.includes('user-profiles')) {
      this.logger.log(`[JWT] Token OK path=${requestPath} user=${user.email.split('@')[0]}***`);
    }

    return {
      id: user.id,
      email: user.email,
    };
  }
}
