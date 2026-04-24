import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
    CreateExpertProfileDto,
    UpdateExpertProfileDto,
    ExpertFiltersDto,
    CreateCredentialDto,
    CreateEducationDto,
    UpdateEducationDto,
    CreateOfferDto,
    UpdateOfferDto,
} from './dto/experts.dto';

@Injectable()
export class ExpertsService {
    private readonly logger = new Logger(ExpertsService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== EXPERT PROFILES ====================

    async findAll(filters: ExpertFiltersDto, currentUserId?: string) {
        const where: any = {
            isActive: true,
            isPublished: true,
        };

        // Hide the caller's own expert profile — they should never see or
        // start a conversation with themselves (self-conversation guard would reject it anyway).
        if (currentUserId) {
            where.userId = { not: currentUserId };
        }

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

    async findById(id: string, currentUserId?: string) {
        const baseWhere: any = { id, isActive: true, isPublished: true };
        if (currentUserId) {
            baseWhere.userId = { not: currentUserId };
        }
        const expert = await this.prisma.expertProfile.findFirst({
            where: baseWhere,
            include: {
                offers: {
                    where: { isPublished: true },
                    orderBy: { sortOrder: 'asc' },
                },
                credentials: {
                    where: { status: 'approved' },
                },
                educationEntries: {
                    orderBy: { createdAt: 'asc' },
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
                educationEntries: {
                    orderBy: { createdAt: 'asc' },
                },
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

        const profile = await this.prisma.expertProfile.create({
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

        // Auto-create a free "Chat Consultation" offer for MVP
        await this.prisma.expertOffer.create({
            data: {
                expertId: profile.id,
                name: { en: 'Free Chat Consultation', ru: 'Бесплатная консультация в чате', kk: 'Тегін чат кеңесі', fr: 'Consultation gratuite par chat', de: 'Kostenlose Chat-Beratung', es: 'Consulta gratuita por chat' },
                description: { en: 'Free nutrition consultation via chat', ru: 'Бесплатная консультация по питанию в чате', kk: 'Чат арқылы тегін тамақтану кеңесі', fr: 'Consultation nutrition gratuite par chat', de: 'Kostenlose Ernährungsberatung per Chat', es: 'Consulta de nutrición gratuita por chat' },
                format: 'CHAT_CONSULTATION',
                priceType: 'FREE',
                isPublished: true,
                sortOrder: 0,
            },
        });

        return profile;
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

    // ==================== EDUCATION ====================

    async getEducation(userId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        return this.prisma.expertEducation.findMany({
            where: { expertId: expert.id },
            orderBy: { createdAt: 'asc' },
        });
    }

    async createEducation(userId: string, dto: CreateEducationDto) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        return this.prisma.expertEducation.create({
            data: {
                expertId: expert.id,
                institution: dto.institution,
                degree: dto.degree,
                year: dto.year,
                documentUrl: dto.documentUrl,
                documentType: dto.documentType,
                documentName: dto.documentName,
            },
        });
    }

    async updateEducation(userId: string, educationId: string, dto: UpdateEducationDto) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const entry = await this.prisma.expertEducation.findUnique({
            where: { id: educationId },
        });

        if (!entry || entry.expertId !== expert.id) {
            throw new ForbiddenException('Not allowed to update this education entry');
        }

        return this.prisma.expertEducation.update({
            where: { id: educationId },
            data: {
                institution: dto.institution,
                degree: dto.degree,
                year: dto.year,
                documentUrl: dto.documentUrl,
                documentType: dto.documentType,
                documentName: dto.documentName,
            },
        });
    }

    async deleteEducation(userId: string, educationId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const entry = await this.prisma.expertEducation.findUnique({
            where: { id: educationId },
        });

        if (!entry || entry.expertId !== expert.id) {
            throw new ForbiddenException('Not allowed to delete this education entry');
        }

        return this.prisma.expertEducation.delete({
            where: { id: educationId },
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

    async getMyReviews(userId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        return this.prisma.review.findMany({
            where: { expertId: expert.id },
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
                    },
                },
            },
        });
    }

    async createOffer(userId: string, dto: CreateOfferDto) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const defaultName = {
            en: 'Consultation',
            ru: 'Консультация',
            kk: 'Кеңес',
            fr: 'Consultation',
            de: 'Beratung',
            es: 'Consulta',
        };

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
