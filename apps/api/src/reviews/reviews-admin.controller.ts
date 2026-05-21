import {
    Controller,
    Get,
    Delete,
    Patch,
    Param,
    Headers,
    Req,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma.service';

@ApiTags('Reviews Admin')
@Controller('reviews/admin')
export class ReviewsAdminController {
    private readonly logger = new Logger(ReviewsAdminController.name);
    constructor(
        private readonly reviewsService: ReviewsService,
        private readonly prisma: PrismaService,
    ) {}

    private async writeAudit(action: string, targetId: string, payload: Record<string, any> | null, req?: Request) {
        try {
            await this.prisma.adminAuditLog.create({
                data: {
                    action,
                    targetType: 'review',
                    targetId,
                    payload: payload ?? undefined,
                    adminIdentifier: 'env-admin',
                    ipAddress: req?.ip ?? req?.headers?.['x-forwarded-for']?.toString() ?? null,
                },
            });
        } catch (err: any) {
            this.logger.warn(`Audit write failed: ${err?.message}`);
        }
    }

    private validateAdmin(adminSecret: string) {
        const expectedSecret = process.env.ADMIN_SECRET;
        if (!expectedSecret) throw new UnauthorizedException('Invalid admin credentials');
        const a = Buffer.from(String(adminSecret || ''));
        const b = Buffer.from(expectedSecret);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            throw new UnauthorizedException('Invalid admin credentials');
        }
    }

    @Get()
    @ApiOperation({ summary: 'Admin: list all reviews' })
    async getAll(@Headers('x-admin-secret') adminSecret: string) {
        this.validateAdmin(adminSecret);
        return this.reviewsService.findAll();
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Admin: delete any review' })
    async deleteReview(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        this.validateAdmin(adminSecret);
        const result = await this.reviewsService.adminDelete(id);
        await this.writeAudit('delete_review', id, null, req);
        return result;
    }

    @Patch(':id/toggle-visibility')
    @ApiOperation({ summary: 'Admin: toggle review visibility' })
    async toggleVisibility(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        this.validateAdmin(adminSecret);
        const result = await this.reviewsService.adminToggleVisibility(id);
        await this.writeAudit('toggle_review_visibility', id, null, req);
        return result;
    }
}
