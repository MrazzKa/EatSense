import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SpecialistsService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters?: { type?: string; isVerified?: boolean }) {
        // If Specialist model doesn't exist yet, return empty array
        if (!this.prisma.specialist) {
            return [];
        }

        const where: any = { isActive: true };
        if (filters?.type) where.type = filters.type;
        if (filters?.isVerified !== undefined) where.isVerified = filters.isVerified;

        return this.prisma.specialist.findMany({
            where,
            orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }],
        });
    }

    async findById(id: string) {
        if (!this.prisma.specialist) {
            return null;
        }

        return this.prisma.specialist.findUnique({
            where: { id },
            include: {
                reviews: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        client: {
                            select: {
                                id: true,
                                userProfile: { select: { firstName: true, avatarUrl: true } },
                            },
                        },
                    },
                },
            },
        });
    }

    async updateRating(specialistId: string) {
        if (!this.prisma.specialist) {
            return null;
        }

        const stats = await this.prisma.review.aggregate({
            where: { specialistId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        return this.prisma.specialist.update({
            where: { id: specialistId },
            data: {
                rating: stats._avg.rating || 0,
                reviewCount: stats._count.rating,
            },
        });
    }
}
