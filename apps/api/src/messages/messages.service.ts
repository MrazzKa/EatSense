import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface CreateMessageDto {
    conversationId: string;
    senderId: string;
    type: string;
    content: string;
    metadata?: any;
}

@Injectable()
export class MessagesService {
    private readonly logger = new Logger(MessagesService.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
    ) { }

    private async checkAccess(conversationId: string, userId: string) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                expert: { select: { userId: true } },
            },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const isClient = conversation.clientId === userId;
        const isExpert = conversation.expert.userId === userId;

        if (!isClient && !isExpert) {
            throw new ForbiddenException('Access denied');
        }

        return { conversation, isClient, isExpert };
    }

    async findByConversationId(conversationId: string, userId: string) {
        await this.checkAccess(conversationId, userId);

        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true, avatarUrl: true } },
                    },
                },
            },
        });
    }

    async create(data: CreateMessageDto) {
        await this.checkAccess(data.conversationId, data.senderId);

        const message = await this.prisma.message.create({
            data: {
                conversationId: data.conversationId,
                senderId: data.senderId,
                type: data.type,
                content: data.content,
                metadata: data.metadata,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true, avatarUrl: true } },
                    },
                },
            },
        });

        // Update lastMessageAt on conversation
        await this.prisma.conversation.update({
            where: { id: data.conversationId },
            data: { lastMessageAt: new Date() },
        });

        this.logger.log(`Message sent: conversation=${data.conversationId}, sender=${data.senderId}`);

        // Send push notification to the other party (fire-and-forget)
        this.sendMessagePush(data.conversationId, data.senderId, message).catch((err) =>
            this.logger.error(`Push notification failed: ${err.message}`),
        );

        return message;
    }

    async markAsRead(conversationId: string, userId: string) {
        await this.checkAccess(conversationId, userId);

        await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
            },
            data: { isRead: true },
        });

        return { success: true };
    }

    async getUnreadCount(userId: string) {
        // Get expert profile if exists
        const expertProfile = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        // Count unread as client
        const unreadAsClient = await this.prisma.message.count({
            where: {
                conversation: { clientId: userId },
                senderId: { not: userId },
                isRead: false,
            },
        });

        // Count unread as expert
        let unreadAsExpert = 0;
        if (expertProfile) {
            unreadAsExpert = await this.prisma.message.count({
                where: {
                    conversation: { expertId: expertProfile.id },
                    senderId: { not: userId },
                    isRead: false,
                },
            });
        }

        return {
            count: unreadAsClient + unreadAsExpert,
            asClient: unreadAsClient,
            asExpert: unreadAsExpert,
        };
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

    private async sendMessagePush(conversationId: string, senderId: string, message: any) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                expert: { select: { userId: true, displayName: true } },
                client: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true } },
                    },
                },
            },
        });

        if (!conversation) return;

        const isClient = conversation.clientId === senderId;
        const recipientUserId = isClient ? conversation.expert.userId : conversation.clientId;

        const language = await this.getUserLanguage(recipientUserId);

        const FALLBACK_CLIENT: Record<string, string> = {
            en: 'Client', ru: 'Клиент', kk: 'Клиент',
            fr: 'Client', de: 'Klient', es: 'Cliente',
        };
        const FALLBACK_EXPERT: Record<string, string> = {
            en: 'Expert', ru: 'Эксперт', kk: 'Сарапшы',
            fr: 'Expert', de: 'Experte', es: 'Experto',
        };
        const LABEL_PHOTO: Record<string, string> = {
            en: 'Photo', ru: 'Фото', kk: 'Фото',
            fr: 'Photo', de: 'Foto', es: 'Foto',
        };
        const LABEL_NEW_MESSAGE: Record<string, string> = {
            en: 'New message', ru: 'Новое сообщение', kk: 'Жаңа хабарлама',
            fr: 'Nouveau message', de: 'Neue Nachricht', es: 'Nuevo mensaje',
        };
        const LABEL_SHARED_MEALS: Record<string, string> = {
            en: 'Shared meals', ru: 'Поделился приёмами пищи', kk: 'Тамақтар бөлісті',
            fr: 'Repas partagés', de: 'Mahlzeiten geteilt', es: 'Comidas compartidas',
        };
        const LABEL_SHARED_REPORT: Record<string, string> = {
            en: 'Shared nutrition report', ru: 'Поделился отчётом', kk: 'Есеп бөлісті',
            fr: 'Rapport partagé', de: 'Bericht geteilt', es: 'Informe compartido',
        };
        const LABEL_REPORT_REQUEST: Record<string, string> = {
            en: 'Requested nutrition report', ru: 'Запросил отчёт', kk: 'Есеп сұрады',
            fr: 'Rapport demandé', de: 'Bericht angefragt', es: 'Informe solicitado',
        };
        const LABEL_REPORT_GRANT: Record<string, string> = {
            en: 'Granted report access', ru: 'Предоставил доступ к отчёту', kk: 'Есепке рұқсат берді',
            fr: 'Accès au rapport accordé', de: 'Berichtzugriff gewährt', es: 'Acceso al informe concedido',
        };
        const LABEL_REPORT_REVOKE: Record<string, string> = {
            en: 'Revoked report access', ru: 'Отозвал доступ к отчёту', kk: 'Есеп рұқсатын кері алды',
            fr: 'Accès au rapport révoqué', de: 'Berichtzugriff entzogen', es: 'Acceso al informe revocado',
        };

        const pickLabel = (dict: Record<string, string>) => dict[language] || dict.en;

        const senderName = isClient
            ? (conversation.client.userProfile?.firstName || pickLabel(FALLBACK_CLIENT))
            : (conversation.expert.displayName || pickLabel(FALLBACK_EXPERT));

        let body: string;
        switch (message.type) {
            case 'text':
                body = message.content.length > 100 ? message.content.slice(0, 100) + '…' : message.content;
                break;
            case 'photo': body = pickLabel(LABEL_PHOTO); break;
            case 'meal_share': body = pickLabel(LABEL_SHARED_MEALS); break;
            case 'report_share': body = pickLabel(LABEL_SHARED_REPORT); break;
            case 'report_request': body = pickLabel(LABEL_REPORT_REQUEST); break;
            case 'report_grant': body = pickLabel(LABEL_REPORT_GRANT); break;
            case 'report_revoke': body = pickLabel(LABEL_REPORT_REVOKE); break;
            default: body = pickLabel(LABEL_NEW_MESSAGE);
        }

        await this.notifications.sendPushNotification(
            recipientUserId,
            senderName,
            body,
            {
                type: 'new_message',
                conversationId,
                messageId: message.id,
            },
        );
    }

    async shareMeals(conversationId: string, senderId: string, fromDate: Date, toDate: Date) {
        await this.checkAccess(conversationId, senderId);

        const meals = await this.prisma.meal.findMany({
            where: {
                userId: senderId,
                createdAt: { gte: fromDate, lte: toDate },
            },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });

        return this.create({
            conversationId,
            senderId,
            type: 'meal_share',
            content: `meal_share:${meals.length}`,
            metadata: { meals, fromDate, toDate, count: meals.length },
        });
    }

    async shareReport(conversationId: string, senderId: string, reportData: any) {
        await this.checkAccess(conversationId, senderId);

        return this.create({
            conversationId,
            senderId,
            type: 'report_share',
            content: 'report_share',
            metadata: reportData,
        });
    }
}
