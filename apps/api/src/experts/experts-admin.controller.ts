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
                educationEntries: {
                    orderBy: { createdAt: 'asc' },
                },
                offers: {
                    orderBy: { sortOrder: 'asc' },
                },
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
                educationEntries: {
                    orderBy: { createdAt: 'asc' },
                },
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

    private async getUserLanguage(userId: string): Promise<string> {
        try {
            const profile = await this.prisma.userProfile.findUnique({
                where: { userId },
                select: { preferences: true },
            });
            const prefs = profile?.preferences as Record<string, any> | null;
            return prefs?.language || 'en';
        } catch {
            return 'en';
        }
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

        // Send push notification (localized)
        const APPROVE_TITLE: Record<string, string> = {
            en: 'Profile Approved!', ru: 'Профиль одобрен!', kk: 'Профиль мақұлданды!',
            fr: 'Profil approuvé !', de: 'Profil genehmigt!', es: '¡Perfil aprobado!',
        };
        const APPROVE_BODY: Record<string, string> = {
            en: 'Your expert profile has been approved and is now visible to clients.',
            ru: 'Ваш профиль эксперта одобрен и теперь виден клиентам.',
            kk: 'Сарапшы профиліңіз мақұлданып, енді клиенттерге көрінеді.',
            fr: 'Votre profil d\'expert a été approuvé et est désormais visible par les clients.',
            de: 'Ihr Expertenprofil wurde genehmigt und ist jetzt für Kunden sichtbar.',
            es: 'Tu perfil de experto ha sido aprobado y ahora es visible para los clientes.',
        };
        const lang = await this.getUserLanguage(expert.userId);
        this.notifications.sendPushNotification(
            expert.userId,
            APPROVE_TITLE[lang] || APPROVE_TITLE.en,
            APPROVE_BODY[lang] || APPROVE_BODY.en,
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

        // Send push notification (localized)
        const REJECT_TITLE: Record<string, string> = {
            en: 'Profile Not Approved', ru: 'Профиль не одобрен', kk: 'Профиль мақұлданбады',
            fr: 'Profil non approuvé', de: 'Profil nicht genehmigt', es: 'Perfil no aprobado',
        };
        const REJECT_BODY_NO_REASON: Record<string, string> = {
            en: 'Your expert profile was not approved. Please review your profile and try again.',
            ru: 'Ваш профиль эксперта не был одобрен. Проверьте профиль и попробуйте снова.',
            kk: 'Сарапшы профиліңіз мақұлданбады. Профиліңізді тексеріп, қайта көріңіз.',
            fr: 'Votre profil d\'expert n\'a pas été approuvé. Vérifiez votre profil et réessayez.',
            de: 'Ihr Expertenprofil wurde nicht genehmigt. Bitte prüfen Sie Ihr Profil und versuchen Sie es erneut.',
            es: 'Tu perfil de experto no fue aprobado. Revisa tu perfil e inténtalo de nuevo.',
        };
        const REJECT_BODY_WITH_REASON: Record<string, string> = {
            en: 'Your expert profile was not approved. Reason: ',
            ru: 'Ваш профиль эксперта не был одобрен. Причина: ',
            kk: 'Сарапшы профиліңіз мақұлданбады. Себеп: ',
            fr: 'Votre profil d\'expert n\'a pas été approuvé. Raison : ',
            de: 'Ihr Expertenprofil wurde nicht genehmigt. Grund: ',
            es: 'Tu perfil de experto no fue aprobado. Motivo: ',
        };
        const lang = await this.getUserLanguage(expert.userId);
        const pushBody = body.reason
            ? (REJECT_BODY_WITH_REASON[lang] || REJECT_BODY_WITH_REASON.en) + body.reason
            : (REJECT_BODY_NO_REASON[lang] || REJECT_BODY_NO_REASON.en);

        this.notifications.sendPushNotification(
            expert.userId,
            REJECT_TITLE[lang] || REJECT_TITLE.en,
            pushBody,
            { type: 'expert_rejected', reason: body.reason },
        ).catch((err) => this.logger.error(`Push failed: ${err.message}`));

        this.logger.log(`Expert rejected: id=${id}, reason=${body.reason}`);
        return { success: true, expert };
    }

    @Post(':id/unpublish')
    async unpublish(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
    ) {
        this.validateAdmin(adminSecret);

        const expert = await this.prisma.expertProfile.update({
            where: { id },
            data: { isPublished: false },
        });

        this.logger.log(`Expert unpublished: id=${id}`);
        return { success: true, expert };
    }

    @Post(':id/publish')
    async publish(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
    ) {
        this.validateAdmin(adminSecret);

        const expert = await this.prisma.expertProfile.update({
            where: { id },
            data: { isPublished: true, isActive: true },
        });

        this.logger.log(`Expert re-published: id=${id}`);
        return { success: true, expert };
    }
}
