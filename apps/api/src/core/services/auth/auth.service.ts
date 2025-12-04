import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../../../../prisma.service';
import type { RegisterDto } from '../../../../auth/dto';
import type { MailerService } from '../../../../mailer/mailer.service';
import type { OtpService } from '../../../../auth/otp.service';
import type { UsersService } from '../../../../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private otpService: OtpService,
    private usersService: UsersService,
  ) {}

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
      },
    });
    return this.generateTokens(user);
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    return this.generateTokens(user);
  }

  async generateTokens(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME || '30d',
    });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + (parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME_MS || '2592000000'))),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const storedToken = await this.prisma.refreshToken.findUnique({ where: { token } });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      await this.prisma.refreshToken.delete({ where: { token } }); // Invalidate old token

      return this.generateTokens(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async requestOtp(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User with this email does not exist.');
    }

    const otp = this.otpService.generateOtp();
    await this.otpService.saveOtp(email, otp);
    
    // Try to send email, but don't fail if SMTP is not configured (for testing)
    try {
      await this.mailerService.sendOtpEmail(email, otp);
    } catch (error: any) {
      console.warn('[AuthService] Failed to send OTP email (SMTP may not be configured):', error.message);
      // For testing: return OTP in response if email fails
      return { 
        message: 'OTP generated (email sending failed - SMTP not configured)', 
        otp: otp, // Return OTP for testing
        email: email 
      };
    }
    
    return { message: 'OTP sent to email' };
  }

  async verifyOtp(email: string, otp: string) {
    const isValid = await this.otpService.verifyOtp(email, otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.generateTokens(user);
  }
}