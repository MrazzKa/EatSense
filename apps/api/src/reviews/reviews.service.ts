import { Injectable, ForbiddenException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ExpertsService } from '../experts/experts.service';

interface CreateReviewDto {
    expertId: string;
    clientId: string;
    rating: number;
    comment?: string;
    conversationId?: string;
}

interface UpdateReviewDto {
    rating?: number;
    comment?: string;
}

@Injectable()
export class ReviewsService {
    private readonly logger = new Logger(ReviewsService.name);

    constructor(
        private prisma: PrismaService,
        private expertsService: ExpertsService,
    ) { }

    async findByExpertId(expertId: string) {
        return this.prisma.review.findMany({
            where: { expertId, isVisible: true },
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true, avatarUrl: true } },
                    },
                },
            },
        });
    }

    async create(data: CreateReviewDto) {
        // Check if review already exists for this client-expert pair
        const existing = await this.prisma.review.findUnique({
            where: {
                clientId_expertId: {
                    clientId: data.clientId,
                    expertId: data.expertId,
                },
            },
        });

        if (existing) {
            // Update existing review
            const updated = await this.prisma.review.update({
                where: { id: existing.id },
                data: {
                    rating: data.rating,
                    comment: data.comment,
                },
            });

            await this.expertsService.updateRating(data.expertId);
            return updated;
        }

        // Validate conversation if provided
        if (data.conversationId) {
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: data.conversationId },
            });

            if (!conversation) {
                throw new NotFoundException('Conversation not found');
            }

            if (conversation.clientId !== data.clientId || conversation.expertId !== data.expertId) {
                throw new ForbiddenException('Invalid conversation for this review');
            }
        }

        const review = await this.prisma.review.create({
            data: {
                expertId: data.expertId,
                clientId: data.clientId,
                conversationId: data.conversationId,
                rating: data.rating,
                comment: data.comment,
            },
        });

        // Update expert rating
        await this.expertsService.updateRating(data.expertId);

        this.logger.log(`Review created: expert=${data.expertId}, client=${data.clientId}, rating=${data.rating}`);

        return review;
    }

    async update(reviewId: string, clientId: string, dto: UpdateReviewDto) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        if (review.clientId !== clientId) {
            throw new ForbiddenException('Not allowed to update this review');
        }

        const updated = await this.prisma.review.update({
            where: { id: reviewId },
            data: {
                rating: dto.rating,
                comment: dto.comment,
            },
        });

        // Update expert rating
        await this.expertsService.updateRating(review.expertId);

        return updated;
    }

    async delete(reviewId: string, clientId: string) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        if (review.clientId !== clientId) {
            throw new ForbiddenException('Not allowed to delete this review');
        }

        const expertId = review.expertId;

        await this.prisma.review.delete({
            where: { id: reviewId },
        });

        // Update expert rating
        await this.expertsService.updateRating(expertId);

        return { success: true };
    }
}
