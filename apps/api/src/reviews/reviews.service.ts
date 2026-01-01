import { Injectable, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReviewsService {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        consultationId: string;
        clientId: string;
        rating: number;
        comment?: string;
    }) {
        if (!this.prisma.consultation || !this.prisma.review) {
            throw new ForbiddenException('Feature not available');
        }

        const consultation = await this.prisma.consultation.findUnique({
            where: { id: data.consultationId },
            include: { review: true },
        });

        if (!consultation) throw new ForbiddenException('Consultation not found');
        if (consultation.clientId !== data.clientId) throw new ForbiddenException('Access denied');
        if (consultation.review) throw new ConflictException('Review already exists');

        const review = await this.prisma.review.create({
            data: {
                consultationId: data.consultationId,
                clientId: data.clientId,
                specialistId: consultation.specialistId,
                rating: data.rating,
                comment: data.comment,
            },
        });

        // Update specialist rating
        await this.updateSpecialistRating(consultation.specialistId);

        return review;
    }

    private async updateSpecialistRating(specialistId: string) {
        if (!this.prisma.specialist) return;

        const stats = await this.prisma.review.aggregate({
            where: { specialistId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        await this.prisma.specialist.update({
            where: { id: specialistId },
            data: {
                rating: stats._avg.rating || 0,
                reviewCount: stats._count.rating,
            },
        });
    }
}
