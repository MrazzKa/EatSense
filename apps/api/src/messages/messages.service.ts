import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

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

    constructor(private prisma: PrismaService) { }

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
        const { conversation } = await this.checkAccess(data.conversationId, data.senderId);

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
