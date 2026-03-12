import { Controller, Get, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
    constructor(private referralsService: ReferralsService) { }

    @Get('my-code')
    async getMyCode(@Request() req: any) {
        return this.referralsService.getOrCreateCode(req.user.id);
    }

    @Get('stats')
    async getStats(@Request() req: any) {
        return this.referralsService.getStats(req.user.id);
    }

    @Get('recent')
    async getRecent(@Request() req: any) {
        return this.referralsService.getRecentReferrals(req.user.id);
    }

    @Post('apply')
    async applyCode(@Request() req: any, @Body() body: { code: string }) {
        if (!body.code || body.code.trim().length === 0) {
            throw new HttpException('Referral code is required', HttpStatus.BAD_REQUEST);
        }
        try {
            return await this.referralsService.applyCode(req.user.id, body.code);
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to apply referral code',
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
