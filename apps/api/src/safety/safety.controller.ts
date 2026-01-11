import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SafetyService } from './safety.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class SafetyController {
    constructor(private safetyService: SafetyService) { }

    // ==================== DISCLAIMERS ====================

    @Get('disclaimers/status')
    async getDisclaimerStatus(@Request() req: any) {
        return this.safetyService.getDisclaimerStatus(req.user.id);
    }

    @Post('disclaimers/accept')
    async acceptDisclaimer(@Request() req: any, @Body() body: { type: string }) {
        return this.safetyService.acceptDisclaimer(req.user.id, body);
    }

    // ==================== ABUSE REPORTS ====================

    @Post('reports')
    async createReport(
        @Request() req: any,
        @Body() body: {
            reportedUserId?: string;
            reportedExpertId?: string;
            conversationId?: string;
            category: string;
            description?: string;
            attachmentUrls?: string[];
        },
    ) {
        return this.safetyService.createAbuseReport(req.user.id, body);
    }

    // ==================== BLOCKS ====================

    @Get('blocks')
    async getBlocks(@Request() req: any) {
        return this.safetyService.getBlockedUsers(req.user.id);
    }

    @Post('blocks')
    async blockUser(@Request() req: any, @Body() body: { blockedId: string }) {
        return this.safetyService.blockUser(req.user.id, body.blockedId);
    }

    @Delete('blocks/:blockedId')
    async unblockUser(@Request() req: any, @Param('blockedId') blockedId: string) {
        return this.safetyService.unblockUser(req.user.id, blockedId);
    }
}
