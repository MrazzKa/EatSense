import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
    CreateExpertProfileDto,
    UpdateExpertProfileDto,
    ExpertFiltersDto,
    CreateCredentialDto,
    CreateOfferDto,
    UpdateOfferDto,
} from './dto/experts.dto';

@Injectable()
export class ExpertsService {
    private readonly logger = new Logger(ExpertsService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== EXPERT PROFILES ====================

    async findAll(filters: ExpertFiltersDto) {
        const where: any = {
            isActive: true,
            isPublished: true,
        };

        if (filters.type) {
            where.type = filters.type;
        }

        if (filters.language) {
            where.languages = { has: filters.language };
        }

        if (filters.specialization) {
            where.specializations = { has: filters.specialization };
        }

        if (filters.verified !== undefined) {
            where.isVerified = filters.verified;
        }

        if (filters.minRating !== undefined) {
            where.rating = { gte: filters.minRating };
        }

        if (filters.search) {
            where.OR = [
                { displayName: { contains: filters.search, mode: 'insensitive' } },
                { bio: { contains: filters.search, mode: 'insensitive' } },
                { title: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const [experts, total] = await Promise.all([
            this.prisma.expertProfile.findMany({
                where,
                take: filters.limit || 20,
                skip: filters.offset || 0,
                orderBy: [
                    { isVerified: 'desc' },
                    { rating: 'desc' },
                    { consultationCount: 'desc' },
                ],
                include: {
                    offers: {
                        where: { isPublished: true },
                        orderBy: { sortOrder: 'asc' },
                        take: 3,
                    },
                    _count: {
                        select: { reviews: true },
                    },
                },
            }),
            this.prisma.expertProfile.count({ where }),
        ]);

        return {
            experts,
            total,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
        };
    }

    async findById(id: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { id },
            include: {
                offers: {
                    where: { isPublished: true },
                    orderBy: { sortOrder: 'asc' },
                },
                credentials: {
                    where: { status: 'approved' },
                },
                reviews: {
                    where: { isVisible: true },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        client: {
                            select: {
                                id: true,
                                userProfile: {
                                    select: { firstName: true, avatarUrl: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!expert) {
            throw new NotFoundException('Expert not found');
        }

        return expert;
    }

    async findByUserId(userId: string) {
        return this.prisma.expertProfile.findUnique({
            where: { userId },
            include: {
                credentials: true,
                offers: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });
    }

    async createProfile(userId: string, dto: CreateExpertProfileDto) {
        // Check if profile already exists
        const existing = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (existing) {
            throw new BadRequestException('Expert profile already exists');
        }

        // Update user role
        await this.prisma.user.update({
            where: { id: userId },
            data: { expertsRole: 'EXPERT' },
        });

        return this.prisma.expertProfile.create({
            data: {
                userId,
                type: dto.type,
                displayName: dto.displayName,
                title: dto.title,
                bio: dto.bio,
                avatarUrl: dto.avatarUrl,
                education: dto.education,
                experienceYears: dto.experienceYears || 0,
                specializations: dto.specializations || [],
                languages: dto.languages || ['en'],
                contactPolicy: dto.contactPolicy,
            },
        });
    }

    async updateProfile(userId: string, dto: UpdateExpertProfileDto) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        return this.prisma.expertProfile.update({
            where: { userId },
            data: {
                type: dto.type,
                displayName: dto.displayName,
                title: dto.title,
                bio: dto.bio,
                avatarUrl: dto.avatarUrl,
                education: dto.education,
                experienceYears: dto.experienceYears,
                specializations: dto.specializations,
                languages: dto.languages,
                contactPolicy: dto.contactPolicy,
                isActive: dto.isActive,
            },
        });
    }

    async publishProfile(userId: string, isPublished: boolean) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        return this.prisma.expertProfile.update({
            where: { userId },
            data: { isPublished },
        });
    }

    // ==================== CREDENTIALS ====================

    async getCredentials(userId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        return this.prisma.expertCredential.findMany({
            where: { expertId: expert.id },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createCredential(userId: string, dto: CreateCredentialDto) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        return this.prisma.expertCredential.create({
            data: {
                expertId: expert.id,
                name: dto.name,
                issuer: dto.issuer,
                issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
                fileUrl: dto.fileUrl,
                fileType: dto.fileType,
                status: 'pending',
            },
        });
    }

    async deleteCredential(userId: string, credentialId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const credential = await this.prisma.expertCredential.findUnique({
            where: { id: credentialId },
        });

        if (!credential || credential.expertId !== expert.id) {
            throw new ForbiddenException('Not allowed to delete this credential');
        }

        return this.prisma.expertCredential.delete({
            where: { id: credentialId },
        });
    }

    // ==================== OFFERS ====================

    async getOffers(expertId: string, onlyPublished = true) {
        const where: any = { expertId };
        if (onlyPublished) {
            where.isPublished = true;
        }

        return this.prisma.expertOffer.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
        });
    }

    async getMyOffers(userId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        return this.prisma.expertOffer.findMany({
            where: { expertId: expert.id },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async createOffer(userId: string, dto: CreateOfferDto) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const defaultName = { en: 'Consultation', ru: 'Консультация', kk: 'Кеңес' };

        return this.prisma.expertOffer.create({
            data: {
                expertId: expert.id,
                name: dto.name || defaultName,
                description: dto.description,
                format: dto.format || 'CHAT_CONSULTATION',
                priceType: dto.priceType || 'FREE',
                priceAmount: dto.priceAmount,
                currency: dto.currency || 'USD',
                durationDays: dto.durationDays,
                deliverables: dto.deliverables,
                isPublished: dto.isPublished || false,
                sortOrder: dto.sortOrder || 0,
            },
        });
    }

    async updateOffer(userId: string, offerId: string, dto: UpdateOfferDto) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const offer = await this.prisma.expertOffer.findUnique({
            where: { id: offerId },
        });

        if (!offer || offer.expertId !== expert.id) {
            throw new ForbiddenException('Not allowed to update this offer');
        }

        return this.prisma.expertOffer.update({
            where: { id: offerId },
            data: {
                name: dto.name,
                description: dto.description,
                format: dto.format,
                priceType: dto.priceType,
                priceAmount: dto.priceAmount,
                currency: dto.currency,
                durationDays: dto.durationDays,
                deliverables: dto.deliverables,
                isPublished: dto.isPublished,
                sortOrder: dto.sortOrder,
            },
        });
    }

    async deleteOffer(userId: string, offerId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const offer = await this.prisma.expertOffer.findUnique({
            where: { id: offerId },
        });

        if (!offer || offer.expertId !== expert.id) {
            throw new ForbiddenException('Not allowed to delete this offer');
        }

        return this.prisma.expertOffer.delete({
            where: { id: offerId },
        });
    }

    async publishOffer(userId: string, offerId: string, isPublished: boolean) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const offer = await this.prisma.expertOffer.findUnique({
            where: { id: offerId },
        });

        if (!offer || offer.expertId !== expert.id) {
            throw new ForbiddenException('Not allowed to update this offer');
        }

        return this.prisma.expertOffer.update({
            where: { id: offerId },
            data: { isPublished },
        });
    }

    // ==================== RATING ====================

    async updateRating(expertId: string) {
        const stats = await this.prisma.review.aggregate({
            where: { expertId, isVisible: true },
            _avg: { rating: true },
            _count: { rating: true },
        });

        return this.prisma.expertProfile.update({
            where: { id: expertId },
            data: {
                rating: stats._avg.rating || 0,
                reviewCount: stats._count.rating,
            },
        });
    }
}
