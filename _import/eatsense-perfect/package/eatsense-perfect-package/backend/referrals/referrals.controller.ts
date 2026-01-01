import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('my')
  async getStats(@Request() req) {
    return this.referralsService.getStats(req.user.id);
  }

  @Get('code')
  async getCode(@Request() req) {
    return this.referralsService.getOrCreateCode(req.user.id);
  }

  @Get('validate')
  async validateCode(@Request() req, @Query('code') code: string) {
    return this.referralsService.validateCode(code, req.user.id);
  }

  @Post('apply')
  async applyCode(@Request() req, @Body() body: { code: string }) {
    return this.referralsService.applyCode(req.user.id, body.code);
  }
}
