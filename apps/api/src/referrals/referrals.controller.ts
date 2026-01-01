import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
    constructor(private referralsService: ReferralsService) { }

    @Get('my-code')
    async getMyCode(@Request() req) {
        return this.referralsService.getOrCreateCode(req.user.id);
    }

    @Get('stats')
    async getStats(@Request() req) {
        return this.referralsService.getStats(req.user.id);
    }

    @Get('recent')
    async getRecent(@Request() req) {
        return this.referralsService.getRecentReferrals(req.user.id);
    }
}
