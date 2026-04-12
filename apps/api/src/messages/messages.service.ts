import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
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
            throw new ForbiddenException('Conversation not found');
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

        const senderName = isClient
            ? (conversation.client.userProfile?.firstName || 'Client')
            : (conversation.expert.displayName || 'Expert');

        const body = message.type === 'text'
            ? (message.content.length > 100 ? message.content.slice(0, 100) + '…' : message.content)
            : message.type === 'photo' ? '📷 Photo' : 'New message';

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
            content: `Shared ${meals.length} meals`,
            metadata: { meals, fromDate, toDate },
        });
    }

    async shareReport(conversationId: string, senderId: string, reportData: any) {
        await this.checkAccess(conversationId, senderId);

        return this.create({
            conversationId,
            senderId,
            type: 'report_share',
            content: 'Shared nutrition report',
            metadata: reportData,
        });
    }
}
