import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ConsultationsService {
    constructor(private prisma: PrismaService) { }

    async create(data: { clientId: string; specialistId: string }) {
        if (!this.prisma.specialist || !this.prisma.consultation) {
            throw new NotFoundException('Feature not available');
        }

        const specialist = await this.prisma.specialist.findUnique({
            where: { id: data.specialistId },
        });

        if (!specialist || !specialist.isActive) {
            throw new NotFoundException('Specialist not found');
        }

        const startsAt = new Date();
        const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);

        return this.prisma.consultation.create({
            data: {
                clientId: data.clientId,
                specialistId: data.specialistId,
                startsAt,
                endsAt,
                price: specialist.pricePerWeek,
                currency: specialist.currency,
                status: 'active',
            },
            include: {
                specialist: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });
    }

    async findByClientId(clientId: string) {
        if (!this.prisma.consultation) {
            return [];
        }

        return this.prisma.consultation.findMany({
            where: { clientId },
            orderBy: { createdAt: 'desc' },
            include: {
                specialist: { select: { id: true, displayName: true, avatarUrl: true, type: true } },
                messages: { take: 1, orderBy: { createdAt: 'desc' } },
            },
        });
    }

    async findBySpecialistUserId(userId: string) {
        if (!this.prisma.specialist || !this.prisma.consultation) {
            return [];
        }

        const specialist = await this.prisma.specialist.findUnique({ where: { userId } });
        if (!specialist) return [];

        return this.prisma.consultation.findMany({
            where: { specialistId: specialist.id },
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
                    },
                },
                messages: { take: 1, orderBy: { createdAt: 'desc' } },
            },
        });
    }

    async findById(id: string, userId: string) {
        if (!this.prisma.consultation) {
            throw new NotFoundException('Feature not available');
        }

        const consultation = await this.prisma.consultation.findUnique({
            where: { id },
            include: {
                specialist: {
                    select: { id: true, userId: true, displayName: true, avatarUrl: true, type: true },
                },
                client: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
                    },
                },
            },
        });

        if (!consultation) throw new NotFoundException('Consultation not found');

        const isClient = consultation.clientId === userId;
        const isSpecialist = consultation.specialist.userId === userId;
        if (!isClient && !isSpecialist) {
            throw new ForbiddenException('Access denied');
        }

        return consultation;
    }
}
