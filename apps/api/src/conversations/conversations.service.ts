import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

interface StartConversationDto {
    expertId: string;
    offerId?: string;
}

interface UpdateConversationDto {
    status?: 'active' | 'completed' | 'cancelled';
    reportsShared?: boolean;
}

@Injectable()
export class ConversationsService {
    private readonly logger = new Logger(ConversationsService.name);

    constructor(private prisma: PrismaService) { }

    async start(clientId: string, dto: StartConversationDto) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { id: dto.expertId },
        });

        if (!expert || !expert.isActive || !expert.isPublished) {
            throw new NotFoundException('Expert not found or not available');
        }

        // Check if client is not the expert themselves
        if (expert.userId === clientId) {
            throw new BadRequestException('Cannot start conversation with yourself');
        }

        // Check for existing conversation
        const existing = await this.prisma.conversation.findUnique({
            where: {
                clientId_expertId: {
                    clientId,
                    expertId: dto.expertId,
                },
            },
        });

        if (existing) {
            // Return existing conversation
            return this.findById(existing.id, clientId);
        }

        // Validate offer if provided
        if (dto.offerId) {
            const offer = await this.prisma.expertOffer.findUnique({
                where: { id: dto.offerId },
            });

            if (!offer || offer.expertId !== dto.expertId || !offer.isPublished) {
                throw new BadRequestException('Invalid offer');
            }
        }

        const conversation = await this.prisma.conversation.create({
            data: {
                clientId,
                expertId: dto.expertId,
                offerId: dto.offerId,
                status: 'active',
            },
            include: {
                expert: {
                    select: {
                        id: true,
                        userId: true,
                        displayName: true,
                        avatarUrl: true,
                        type: true,
                        isVerified: true,
                    },
                },
                offer: {
                    select: {
                        id: true,
                        name: true,
                        format: true,
                    },
                },
            },
        });

        // Increment expert's consultation count
        await this.prisma.expertProfile.update({
            where: { id: dto.expertId },
            data: { consultationCount: { increment: 1 } },
        });

        this.logger.log(`Conversation started: client=${clientId}, expert=${dto.expertId}`);

        return conversation;
    }

    async findByUserId(userId: string) {
        // Get user's expert profile if exists
        const expertProfile = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        // Get conversations where user is client
        const asClient = await this.prisma.conversation.findMany({
            where: { clientId: userId },
            orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
            include: {
                expert: {
                    select: {
                        id: true,
                        userId: true,
                        displayName: true,
                        avatarUrl: true,
                        type: true,
                        isVerified: true,
                    },
                },
                offer: {
                    select: { id: true, name: true, format: true },
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: {
                        messages: {
                            where: { isRead: false, senderId: { not: userId } },
                        },
                    },
                },
            },
        });

        // Get conversations where user is expert
        let asExpert: any[] = [];
        if (expertProfile) {
            asExpert = await this.prisma.conversation.findMany({
                where: { expertId: expertProfile.id },
                orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
                include: {
                    client: {
                        select: {
                            id: true,
                            userProfile: {
                                select: { firstName: true, lastName: true, avatarUrl: true },
                            },
                        },
                    },
                    offer: {
                        select: { id: true, name: true, format: true },
                    },
                    messages: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                    },
                    _count: {
                        select: {
                            messages: {
                                where: { isRead: false, senderId: { not: userId } },
                            },
                        },
                    },
                },
            });
        }

        return {
            asClient,
            asExpert,
        };
    }

    async findById(id: string, userId: string) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id },
            include: {
                expert: {
                    select: {
                        id: true,
                        userId: true,
                        displayName: true,
                        avatarUrl: true,
                        type: true,
                        isVerified: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        userProfile: {
                            select: { firstName: true, lastName: true, avatarUrl: true },
                        },
                    },
                },
                offer: {
                    select: { id: true, name: true, format: true, durationDays: true },
                },
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

        return {
            ...conversation,
            isClient,
            isExpert,
        };
    }

    async update(id: string, userId: string, dto: UpdateConversationDto) {
        const conversation = await this.findById(id, userId);

        // Only clients can toggle reports sharing
        if (dto.reportsShared !== undefined && !conversation.isClient) {
            throw new ForbiddenException('Only clients can toggle report sharing');
        }

        return this.prisma.conversation.update({
            where: { id },
            data: {
                status: dto.status,
                reportsShared: dto.reportsShared,
                endedAt: dto.status === 'completed' || dto.status === 'cancelled' ? new Date() : undefined,
            },
        });
    }

    async getUnreadCount(userId: string) {
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
}
