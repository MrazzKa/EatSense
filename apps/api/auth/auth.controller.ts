import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
import { Request as ExpressRequest } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Load-test only: mint an access token for a synthetic user without OTP/email.
   * Gated by env LOAD_TEST_MODE=true — refuses to work otherwise. Never enable
   * this in production.
   */
  @Post('load-test-token')
  async loadTestToken(@Body() body: { email?: string }) {
    if ((process.env.LOAD_TEST_MODE || '').toLowerCase() !== 'true') {
      throw new BadRequestException('Load test mode is not enabled');
    }
    const email = (body?.email || `loadtest-${Date.now()}@eatsense.test`).toLowerCase();
    return this.authService.mintLoadTestToken(email);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('expert/login')
  @ApiOperation({ summary: 'Expert portal password login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async expertLogin(@Req() req: ExpressRequest, @Body() dto: ExpertLoginDto) {
    const clientIp = this.getClientIp(req);
    return this.authService.expertLogin(dto, clientIp);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current password (also clears forced-reset flag)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }

  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP code' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async requestOtp(@Req() req: ExpressRequest, @Body() requestOtpDto: RequestOtpDto) {
    const clientIp = this.getClientIp(req);
    return this.authService.requestOtp(requestOtpDto, clientIp);
  }

  @Post('request-magic-link')
  @ApiOperation({ summary: 'Request magic link' })
  @ApiResponse({ status: 200, description: 'Magic link sent successfully' })
  async requestMagicLink(@Req() req: ExpressRequest, @Body() requestMagicLinkDto: RequestMagicLinkDto) {
    const clientIp = this.getClientIp(req);
    return this.authService.requestMagicLink(requestMagicLinkDto, clientIp);
  }

  @Post('expert/request-magic-link')
  @ApiOperation({ summary: 'Request expert portal magic link' })
  @ApiResponse({ status: 200, description: 'Magic link sent successfully for eligible expert accounts' })
  async requestExpertMagicLink(@Req() req: ExpressRequest, @Body() requestMagicLinkDto: RequestMagicLinkDto) {
    const clientIp = this.getClientIp(req);
    return this.authService.requestExpertMagicLink(requestMagicLinkDto, clientIp);
  }

  @Get('magic-link')
  @ApiOperation({ summary: 'Consume magic link' })
  @ApiResponse({ status: 200, description: 'Magic link verified successfully' })
  async consumeMagicLink(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    return this.authService.consumeMagicLink(token);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req: any) {
    return this.authService.logout(req.user.id);
  }

  @Post('apple')
  @ApiOperation({ summary: 'Sign in with Apple' })
  @ApiResponse({ status: 200, description: 'Apple Sign In successful' })
  async signInWithApple(@Body() appleSignInDto: AppleSignInDto) {
    return this.authService.signInWithApple(appleSignInDto);
  }

  @Post('google')
  @ApiOperation({ summary: 'Sign in with Google' })
  @ApiResponse({ status: 200, description: 'Google Sign In successful' })
  async signInWithGoogle(@Body() googleSignInDto: GoogleSignInDto) {
    return this.authService.signInWithGoogle(googleSignInDto);
  }

  private getClientIp(req: ExpressRequest): string | undefined {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }
    return req.ip;
  }
}
