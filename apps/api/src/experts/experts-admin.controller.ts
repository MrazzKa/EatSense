import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    Headers,
    Query,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('admin/experts')
export class ExpertsAdminController {
    private readonly logger = new Logger(ExpertsAdminController.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
    ) {}

    private validateAdmin(adminSecret: string) {
        const expectedSecret = process.env.ADMIN_SECRET;
        if (!expectedSecret || adminSecret !== expectedSecret) {
            throw new UnauthorizedException('Invalid admin credentials');
        }
    }

    @Get()
    async list(
        @Headers('x-admin-secret') adminSecret: string,
        @Query('status') status?: string,
    ) {
        this.validateAdmin(adminSecret);

        const where: any = {};

        if (status === 'pending') {
            where.isPublished = false;
            where.isActive = true;
        } else if (status === 'approved') {
            where.isPublished = true;
            where.isVerified = true;
        } else if (status === 'rejected') {
            where.isActive = false;
        }

        return this.prisma.expertProfile.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                credentials: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        userProfile: {
                            select: { firstName: true, lastName: true },
                        },
                    },
                },
                _count: {
                    select: { reviews: true, conversations: true },
                },
            },
        });
    }

    @Get(':id')
    async getById(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
    ) {
        this.validateAdmin(adminSecret);

        return this.prisma.expertProfile.findUnique({
            where: { id },
            include: {
                credentials: true,
                offers: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        createdAt: true,
                        userProfile: {
                            select: { firstName: true, lastName: true, avatarUrl: true },
                        },
                    },
                },
                reviews: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: { reviews: true, conversations: true },
                },
            },
        });
    }

    @Post(':id/approve')
    async approve(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
    ) {
        this.validateAdmin(adminSecret);

        const expert = await this.prisma.expertProfile.update({
            where: { id },
            data: {
                isPublished: true,
                isVerified: true,
                isActive: true,
            },
        });

        // Approve all pending credentials
        await this.prisma.expertCredential.updateMany({
            where: { expertId: id, status: 'pending' },
            data: { status: 'approved' },
        });

        // Send push notification
        this.notifications.sendPushNotification(
            expert.userId,
            'Profile Approved!',
            'Your expert profile has been approved and is now visible to clients.',
            { type: 'expert_approved' },
        ).catch((err) => this.logger.error(`Push failed: ${err.message}`));

        this.logger.log(`Expert approved: id=${id}`);
        return { success: true, expert };
    }

    @Post(':id/reject')
    async reject(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
        @Body() body: { reason?: string },
    ) {
        this.validateAdmin(adminSecret);

        const expert = await this.prisma.expertProfile.update({
            where: { id },
            data: {
                isPublished: false,
                isVerified: false,
                isActive: false,
            },
        });

        // Reject all pending credentials
        await this.prisma.expertCredential.updateMany({
            where: { expertId: id, status: 'pending' },
            data: { status: 'rejected' },
        });

        // Send push notification
        const pushBody = body.reason
            ? `Your expert profile was not approved. Reason: ${body.reason}`
            : 'Your expert profile was not approved. Please review your profile and try again.';

        this.notifications.sendPushNotification(
            expert.userId,
            'Profile Not Approved',
            pushBody,
            { type: 'expert_rejected', reason: body.reason },
        ).catch((err) => this.logger.error(`Push failed: ${err.message}`));

        this.logger.log(`Expert rejected: id=${id}, reason=${body.reason}`);
        return { success: true, expert };
    }
}
