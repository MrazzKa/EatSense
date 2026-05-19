import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../../redis/redis.service';
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
    private readonly codeAttemptWindowSec = 5 * 60;
    private readonly codeAttemptLimit = 10;
    // In-memory fallback used only when Redis is offline so the API does not
    // become unusable. Cluster-wide enforcement requires Redis.
    private readonly memoryAttempts = new Map<string, { count: number; resetAt: number }>();

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
        private redis: RedisService,
    ) { }

    private normalizeAccessCode(code: string) {
        return String(code || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
    }

    private async assertCodeRateLimit(userId: string) {
        const key = `expert:code-attempt:${userId}`;
        // Try Redis first (cluster-safe). Fall back to in-memory if Redis is down.
        try {
            const count = await this.redis.incr(key);
            if (count === 1) {
                await this.redis.expire(key, this.codeAttemptWindowSec);
            }
            if (count > this.codeAttemptLimit) {
                throw new HttpException('Too many code attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
            }
            if (count > 0) return; // Redis path succeeded
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.warn(`[rateLimit] Redis unavailable, falling back to memory: ${(err as any)?.message}`);
        }
        // Memory fallback
        const now = Date.now();
        const current = this.memoryAttempts.get(userId);
        if (!current || current.resetAt <= now) {
            this.memoryAttempts.set(userId, { count: 1, resetAt: now + this.codeAttemptWindowSec * 1000 });
            return;
        }
        if (current.count >= this.codeAttemptLimit) {
            throw new HttpException('Too many code attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
        }
        current.count += 1;
    }

    private async generateUniqueAccessCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for (let attempt = 0; attempt < 20; attempt += 1) {
            const bytes = crypto.randomBytes(6);
            let code = '';
            for (const byte of bytes) {
                code += alphabet[byte % alphabet.length];
            }
            const existing = await this.prisma.expertAccessCode.findUnique({ where: { code } });
            if (!existing) return code;
        }
        throw new BadRequestException('Could not generate unique expert code');
    }

    private publicExpertInclude() {
        return {
            offers: {
                where: { isPublished: true },
                orderBy: { sortOrder: 'asc' as const },
            },
            credentials: {
                where: { status: 'approved' },
            },
            educationEntries: {
                orderBy: { createdAt: 'asc' as const },
            },
            reviews: {
                where: { isVisible: true },
                take: 10,
                orderBy: { createdAt: 'desc' as const },
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
        };
    }

    async ensureAccessCodeForExpert(expertId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { id: expertId },
            select: { id: true },
        });
        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const existing = await this.prisma.expertAccessCode.findUnique({
            where: { expertId },
        });
        if (existing) return existing;

        const code = await this.generateUniqueAccessCode();
        return this.prisma.expertAccessCode.create({
            data: { expertId, code },
        });
    }

    async regenerateAccessCodeForExpert(expertId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { id: expertId },
            select: { id: true },
        });
        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const code = await this.generateUniqueAccessCode();
        const existing = await this.prisma.expertAccessCode.findUnique({
            where: { expertId },
        });
        if (!existing) {
            return this.prisma.expertAccessCode.create({
                data: { expertId, code },
            });
        }
        return this.prisma.expertAccessCode.update({
            where: { expertId },
            data: { code, isActive: true },
        });
    }

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
                ...this.publicExpertInclude(),
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
                accessCode: true,
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
                country: dto.country,
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

        // Re-submit after rejection: clear rejection fields and re-activate so
        // the profile shows up in the admin "Pending" filter again. Without this
        // a rejected applicant who fixes their docs and resubmits stays
        // permanently invisible to the admin (isActive=false → no pending row).
        const isResubmit = expert.isActive === false;
        const resubmitPatch = isResubmit
            ? { isActive: true, isVerified: false, isPublished: false, rejectedAt: null, rejectionReason: null }
            : {};

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
                country: dto.country,
                isActive: dto.isActive,
                ...resubmitPatch,
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

        if (isPublished) {
            const credentialCount = await this.prisma.expertCredential.count({
                where: { expertId: expert.id },
            });
            if (credentialCount < 1) {
                throw new BadRequestException(
                    'At least one credential (diploma, license, or certificate) must be uploaded before publishing.',
                );
            }
        }

        const updated = await this.prisma.expertProfile.update({
            where: { userId },
            data: { isPublished },
        });
        if (isPublished) {
            await this.ensureAccessCodeForExpert(expert.id);
        }
        return updated;
    }

    // ==================== ACCESS CODES ====================

    async getMyAccessCode(userId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
            select: { id: true, isActive: true, isPublished: true, isVerified: true },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        const accessCode = await this.ensureAccessCodeForExpert(expert.id);
        const usageCount = await this.prisma.expertAccessCodeUsage.count({
            where: { codeId: accessCode.id },
        });

        return {
            ...accessCode,
            usageCount,
            canUsePublicly: expert.isActive && expert.isPublished,
            expertStatus: {
                isActive: expert.isActive,
                isPublished: expert.isPublished,
                isVerified: expert.isVerified,
            },
        };
    }

    async regenerateMyAccessCode(userId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!expert) {
            throw new NotFoundException('Expert profile not found');
        }

        await this.regenerateAccessCodeForExpert(expert.id);
        return this.getMyAccessCode(userId);
    }

    async getMySpecialists(userId: string) {
        const links = await this.prisma.expertClientLink.findMany({
            where: { clientId: userId, isActive: true },
            orderBy: { updatedAt: 'desc' },
            include: {
                expert: {
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
                },
            },
        });

        const expertIds = links.map((link) => link.expertId);
        const conversations = expertIds.length
            ? await this.prisma.conversation.findMany({
                where: { clientId: userId, expertId: { in: expertIds } },
                select: { id: true, expertId: true, status: true },
            })
            : [];
        const conversationByExpert = new Map(conversations.map((conv) => [conv.expertId, conv]));

        return links.map((link) => ({
            id: link.id,
            source: link.source,
            createdAt: link.createdAt,
            available: link.expert.isActive && link.expert.isPublished,
            conversation: conversationByExpert.get(link.expertId) || null,
            expert: link.expert,
        }));
    }

    async applyAccessCode(userId: string, rawCode: string) {
        await this.assertCodeRateLimit(userId);
        const code = this.normalizeAccessCode(rawCode);
        if (code.length < 4) {
            throw new BadRequestException('Check the code and try again.');
        }

        const accessCode = await this.prisma.expertAccessCode.findUnique({
            where: { code },
            include: {
                expert: {
                    include: {
                        ...this.publicExpertInclude(),
                    },
                },
            },
        });

        if (
            !accessCode ||
            !accessCode.isActive ||
            !accessCode.expert ||
            !accessCode.expert.isActive ||
            !accessCode.expert.isPublished
        ) {
            throw new BadRequestException('Check the code and try again.');
        }

        if (accessCode.expert.userId === userId) {
            throw new BadRequestException('You cannot use your own specialist code.');
        }

        const block = await this.prisma.userBlock.findFirst({
            where: {
                OR: [
                    { blockerId: userId, blockedId: accessCode.expert.userId },
                    { blockerId: accessCode.expert.userId, blockedId: userId },
                ],
            },
        });
        if (block) {
            throw new ForbiddenException('Cannot connect with this specialist.');
        }

        const existingConversation = await this.prisma.conversation.findUnique({
            where: {
                clientId_expertId: {
                    clientId: userId,
                    expertId: accessCode.expertId,
                },
            },
            select: { id: true, status: true, expertId: true },
        });

        const link = await this.prisma.$transaction(async (tx) => {
            const savedLink = await tx.expertClientLink.upsert({
                where: {
                    clientId_expertId: {
                        clientId: userId,
                        expertId: accessCode.expertId,
                    },
                },
                update: {
                    isActive: true,
                    codeId: accessCode.id,
                    source: 'code',
                },
                create: {
                    clientId: userId,
                    expertId: accessCode.expertId,
                    codeId: accessCode.id,
                    source: 'code',
                },
            });
            await tx.expertAccessCodeUsage.create({
                data: {
                    codeId: accessCode.id,
                    expertId: accessCode.expertId,
                    clientId: userId,
                    conversationId: existingConversation?.id,
                },
            });
            await tx.expertAccessCode.update({
                where: { id: accessCode.id },
                data: { usageCount: { increment: 1 } },
            });
            return savedLink;
        });

        // Notify expert + insert welcome system message (best-effort, never blocks the flow).
        Promise.resolve().then(async () => {
            try {
                const client = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        email: true,
                        userProfile: { select: { firstName: true } },
                    },
                });
                const clientName = client?.userProfile?.firstName || client?.email?.split('@')[0] || 'A new client';
                await this.notifications.sendPushNotification(
                    accessCode.expert.userId,
                    'New client',
                    `${clientName} connected via your access code.`,
                    { type: 'expert.new_client', expertId: accessCode.expertId, clientId: userId },
                );
            } catch (err) {
                this.logger.warn(`[applyAccessCode] notify expert failed: ${(err as any)?.message}`);
            }

            try {
                // Welcome message in the conversation (created on first chat open if missing).
                // Type 'text' for safe rendering across mobile + portal. To distinguish
                // from a normal user message we tag it via `metadata.system = true`.
                if (existingConversation?.id) {
                    const existingWelcome = await this.prisma.message.findFirst({
                        where: {
                            conversationId: existingConversation.id,
                            senderId: accessCode.expert.userId,
                            metadata: { path: ['system'], equals: true },
                        },
                        select: { id: true },
                    }).catch(() => null);
                    if (!existingWelcome) {
                        await this.prisma.message.create({
                            data: {
                                conversationId: existingConversation.id,
                                senderId: accessCode.expert.userId,
                                type: 'text',
                                content: 'Welcome! Feel free to ask anything — I will respond as soon as I can.',
                                metadata: { system: true, kind: 'welcome', clientId: userId },
                            },
                        }).catch(() => {});
                    }
                }
            } catch (err) {
                this.logger.warn(`[applyAccessCode] welcome message failed: ${(err as any)?.message}`);
            }
        });

        return {
            link,
            expert: accessCode.expert,
            conversation: existingConversation,
        };
    }

    async listMyCodeUsages(userId: string, take = 25) {
        const expert = await this.prisma.expertProfile.findUnique({ where: { userId }, select: { id: true } });
        if (!expert) return [];
        return this.listAccessCodeUsageForExpert(expert.id, take);
    }

    async listMyClients(userId: string) {
        const expert = await this.prisma.expertProfile.findUnique({ where: { userId }, select: { id: true } });
        if (!expert) return [];
        const links = await this.prisma.expertClientLink.findMany({
            where: { expertId: expert.id, isActive: true },
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: {
                        id: true,
                        email: true,
                        userProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
                    },
                },
            },
        });
        // Enrich with last meal + last message timestamps for "activity" sort
        const clientIds = links.map((l) => l.clientId);
        const [lastMeals, lastMessages] = await Promise.all([
            clientIds.length
                ? this.prisma.meal.groupBy({
                      by: ['userId'],
                      where: { userId: { in: clientIds } },
                      _max: { createdAt: true },
                  })
                : [],
            clientIds.length
                ? this.prisma.conversation.findMany({
                      where: { clientId: { in: clientIds }, expertId: expert.id },
                      select: { clientId: true, lastMessageAt: true, id: true },
                  })
                : [],
        ]);
        const mealByUser = new Map(lastMeals.map((m: any) => [m.userId, m._max.createdAt]));
        const convByUser = new Map(lastMessages.map((c: any) => [c.clientId, { id: c.id, lastMessageAt: c.lastMessageAt }]));
        return links.map((l) => ({
            id: l.id,
            source: l.source,
            createdAt: l.createdAt,
            client: l.client,
            lastMealAt: mealByUser.get(l.clientId) || null,
            conversation: convByUser.get(l.clientId) || null,
        }));
    }

    async getClientNote(userId: string, clientId: string) {
        const expert = await this.requireExpert(userId);
        const note = await this.prisma.expertClientNote.findUnique({
            where: { expertId_clientId: { expertId: expert.id, clientId } },
        });
        return note || { body: '' };
    }

    async saveClientNote(userId: string, clientId: string, bodyText: string) {
        const expert = await this.requireExpert(userId);
        // Verify expert-client link exists
        const link = await this.prisma.expertClientLink.findFirst({ where: { expertId: expert.id, clientId } });
        if (!link) throw new ForbiddenException('No link to this client');
        return this.prisma.expertClientNote.upsert({
            where: { expertId_clientId: { expertId: expert.id, clientId } },
            update: { body: bodyText },
            create: { expertId: expert.id, clientId, body: bodyText },
        });
    }

    async getClientSnapshot(expertUserId: string, clientId: string) {
        const expert = await this.requireExpert(expertUserId);
        const link = await this.prisma.expertClientLink.findFirst({ where: { expertId: expert.id, clientId, isActive: true } });
        if (!link) throw new ForbiddenException('No link to this client');
        const [lastMeal, lastLab, lastMsg] = await Promise.all([
            this.prisma.meal.findFirst({ where: { userId: clientId }, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true } }),
            this.prisma.labResult.findFirst({ where: { userId: clientId }, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true } }).catch(() => null),
            this.prisma.conversation.findFirst({ where: { clientId, expertId: expert.id }, select: { lastMessageAt: true } }),
        ]);
        return {
            lastMealId: lastMeal?.id || null,
            lastMealAt: lastMeal?.createdAt || null,
            lastLabId: (lastLab as any)?.id || null,
            lastLabAt: (lastLab as any)?.createdAt || null,
            lastMessageAt: lastMsg?.lastMessageAt || null,
            ts: Date.now(),
        };
    }

    async setVacation(userId: string, dto: { awayUntil?: string | null; awayMessage?: string | null }) {
        const expert = await this.requireExpert(userId);
        const data: any = {
            awayUntil: dto.awayUntil ? new Date(dto.awayUntil) : null,
            awayMessage: dto.awayMessage ?? null,
        };
        return this.prisma.expertProfile.update({ where: { id: expert.id }, data });
    }

    private async requireExpert(userId: string) {
        const expert = await this.prisma.expertProfile.findUnique({ where: { userId }, select: { id: true } });
        if (!expert) throw new ForbiddenException('Not an expert');
        return expert;
    }

    async listAccessCodeUsageForExpert(expertId: string, take = 25) {
        return this.prisma.expertAccessCodeUsage.findMany({
            where: { expertId },
            orderBy: { createdAt: 'desc' },
            take: Math.min(Math.max(take, 1), 100),
            include: {
                client: {
                    select: {
                        id: true,
                        email: true,
                        userProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
                    },
                },
                conversation: {
                    select: { id: true, status: true },
                },
            },
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
                slotMinutes: dto.slotMinutes,
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
                slotMinutes: dto.slotMinutes,
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
