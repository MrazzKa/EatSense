import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class MessagesService {
    constructor(private prisma: PrismaService) { }

    private async checkAccess(consultationId: string, userId: string) {
        if (!(this.prisma as any).consultation) {
            throw new ForbiddenException('Feature not available');
        }

        const consultation = await (this.prisma as any).consultation.findUnique({
            where: { id: consultationId },
            include: { specialist: { select: { userId: true } } },
        });

        if (!consultation) throw new ForbiddenException('Consultation not found');

        const isClient = consultation.clientId === userId;
        const isSpecialist = consultation.specialist.userId === userId;
        if (!isClient && !isSpecialist) throw new ForbiddenException('Access denied');

        return consultation;
    }

    async findByConsultationId(consultationId: string, userId: string) {
        if (!(this.prisma as any).message) {
            return [];
        }

        await this.checkAccess(consultationId, userId);

        return (this.prisma as any).message.findMany({
            where: { consultationId },
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

    async create(data: {
        consultationId: string;
        senderId: string;
        type: string;
        content: string;
        metadata?: any;
    }) {
        if (!(this.prisma as any).message) {
            throw new ForbiddenException('Feature not available');
        }

        await this.checkAccess(data.consultationId, data.senderId);

        return (this.prisma as any).message.create({
            data: {
                consultationId: data.consultationId,
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
    }

    async markAsRead(consultationId: string, userId: string) {
        if (!(this.prisma as any).message) {
            return { success: true };
        }

        await this.checkAccess(consultationId, userId);

        await (this.prisma as any).message.updateMany({
            where: {
                consultationId,
                senderId: { not: userId },
                isRead: false,
            },
            data: { isRead: true },
        });

        return { success: true };
    }

    async getUnreadCount(userId: string) {
        if (!(this.prisma as any).consultation || !(this.prisma as any).message) {
            return 0;
        }

        try {
            const clientConsultations = await (this.prisma as any).consultation.findMany({
                where: { clientId: userId },
                select: { id: true },
            });

            const allConsultationIds = clientConsultations.map((c) => c.id);

            if (allConsultationIds.length === 0) return 0;

            return (this.prisma as any).message.count({
                where: {
                    consultationId: { in: allConsultationIds },
                    senderId: { not: userId },
                    isRead: false,
                },
            });
        } catch {
            return 0;
        }
    }

    async shareMeals(data: {
        consultationId: string;
        senderId: string;
        fromDate: Date;
        toDate: Date;
    }) {
        await this.checkAccess(data.consultationId, data.senderId);

        const meals = await this.prisma.meal.findMany({
            where: {
                userId: data.senderId,
                createdAt: { gte: data.fromDate, lte: data.toDate },
            },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });

        return this.create({
            consultationId: data.consultationId,
            senderId: data.senderId,
            type: 'meal_share',
            content: `Shared ${meals.length} meals`,
            metadata: { meals, fromDate: data.fromDate, toDate: data.toDate },
        });
    }
}
