import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TranslationService } from '../translation/translation.service';

interface StartConversationDto {
    expertId: string;
    offerId?: string;
}

interface UpdateConversationDto {
    status?: 'active' | 'completed' | 'cancelled';
    // Legacy aggregate flag — when set, mirrored to all three granular fields.
    reportsShared?: boolean;
    // Granular sharing — client toggles each category independently.
    shareMeals?: boolean;
    shareAnalyses?: boolean;
    shareMedications?: boolean;
}

@Injectable()
export class ConversationsService {
    private readonly logger = new Logger(ConversationsService.name);

    constructor(
        private prisma: PrismaService,
        private translation: TranslationService,
    ) { }

    async start(clientId: string, dto: StartConversationDto) {
        this.logger.log(`Starting conversation: client=${clientId}, expertId=${dto.expertId}, offerId=${dto.offerId || 'none'}`);

        if (!dto.expertId || typeof dto.expertId !== 'string') {
            throw new BadRequestException('expertId is required');
        }

        const expert = await this.prisma.expertProfile.findUnique({
            where: { id: dto.expertId },
        });

        if (!expert || !expert.isActive || !expert.isPublished) {
            this.logger.warn(`Expert not available: id=${dto.expertId}, found=${!!expert}, active=${expert?.isActive}, published=${expert?.isPublished}`);
            throw new NotFoundException('Expert not found or not available');
        }

        // Check if client is not the expert themselves
        if (expert.userId === clientId) {
            throw new BadRequestException('Cannot start conversation with yourself');
        }

        // Check for mutual blocks between client and expert user
        const block = await this.prisma.userBlock.findFirst({
            where: {
                OR: [
                    { blockerId: clientId, blockedId: expert.userId },
                    { blockerId: expert.userId, blockedId: clientId },
                ],
            },
        });

        if (block) {
            this.logger.warn(`Block prevents conversation: client=${clientId}, expert=${expert.userId}`);
            throw new ForbiddenException('Cannot start conversation with this user');
        }

        let selectedOffer: any = null;
        let requiresPayment = false;
        if (dto.offerId) {
            const offer = await this.prisma.expertOffer.findUnique({
                where: { id: dto.offerId },
            });

            if (!offer || offer.expertId !== dto.expertId || !offer.isPublished) {
                throw new BadRequestException('Invalid offer');
            }

            selectedOffer = offer;
            requiresPayment = offer.priceType === 'FIXED' && Number(offer.priceAmount || 0) > 0;
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
            const existingConversation = await this.findById(existing.id, clientId);
            if (requiresPayment) {
                const paid = await this.prisma.payment.findFirst({
                    where: {
                        userId: clientId,
                        conversationId: existing.id,
                        offerId: dto.offerId,
                        status: 'SUCCEEDED',
                    },
                    select: { id: true },
                });
                if (!paid) {
                    await this.prisma.conversation.update({
                        where: { id: existing.id },
                        data: {
                            status: 'payment_pending',
                            offerId: dto.offerId,
                        },
                    });
                    return {
                        requiresPayment: true,
                        conversation: {
                            ...existingConversation,
                            status: 'payment_pending',
                            offerId: dto.offerId,
                            offer: selectedOffer,
                        },
                        offer: selectedOffer,
                    };
                }
            }
            return existingConversation;
        }

        try {
            const conversation = await this.prisma.conversation.create({
                data: {
                    clientId,
                    expertId: dto.expertId,
                    offerId: dto.offerId,
                    status: requiresPayment ? 'payment_pending' : 'active',
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
	                            priceType: true,
	                            priceAmount: true,
	                            currency: true,
	                        },
	                    },
                },
            });

            this.logger.log(`Conversation started: client=${clientId}, expert=${dto.expertId}`);

            if (requiresPayment) {
                return {
                    requiresPayment: true,
                    conversation,
                    offer: selectedOffer,
                };
            }

            return conversation;
        } catch (error) {
            this.logger.error(`Failed to create conversation: client=${clientId}, expert=${dto.expertId}`, (error as Error).stack);
            throw error;
        }
    }

    async findByUserId(userId: string, limit = 50, offset = 0) {
        // Get user's expert profile if exists
        const expertProfile = await this.prisma.expertProfile.findUnique({
            where: { userId },
        });

        // Get conversations where user is client
        const asClient = await this.prisma.conversation.findMany({
            where: { clientId: userId },
            orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
            take: limit,
            skip: offset,
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
	                    select: { id: true, name: true, format: true, priceType: true, priceAmount: true, currency: true },
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
                take: limit,
                skip: offset,
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
	                        select: { id: true, name: true, format: true, priceType: true, priceAmount: true, currency: true },
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
	                    select: { id: true, name: true, format: true, durationDays: true, priceType: true, priceAmount: true, currency: true },
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

        const sharingFields = ['reportsShared', 'shareMeals', 'shareAnalyses', 'shareMedications'] as const;
        const isSharingChange = sharingFields.some((k) => dto[k] !== undefined);
        if (isSharingChange && !conversation.isClient) {
            throw new ForbiddenException('Only clients can toggle data sharing');
        }

        if (dto.status !== undefined) {
            if (conversation.status === 'completed' || conversation.status === 'cancelled') {
                throw new BadRequestException('Conversation has already ended');
            }

            if (dto.status === 'active') {
                throw new BadRequestException('Cannot reset conversation to active');
            }

            if (dto.status === 'completed' && !conversation.isExpert) {
                throw new ForbiddenException('Only the expert can mark a conversation as completed');
            }
        }

        // Build the sharing patch:
        // - Legacy reportsShared toggles all three granular flags together.
        // - Granular flags take precedence if provided.
        // - When conversation transitions to completed/cancelled, auto-revoke all
        //   sharing (privacy by default once consultation ends).
        const isEnding = dto.status === 'completed' || dto.status === 'cancelled';
        let shareMeals = dto.shareMeals;
        let shareAnalyses = dto.shareAnalyses;
        let shareMedications = dto.shareMedications;
        if (dto.reportsShared !== undefined && shareMeals === undefined) shareMeals = dto.reportsShared;
        if (dto.reportsShared !== undefined && shareAnalyses === undefined) shareAnalyses = dto.reportsShared;
        if (dto.reportsShared !== undefined && shareMedications === undefined) shareMedications = dto.reportsShared;
        if (isEnding) {
            shareMeals = false;
            shareAnalyses = false;
            shareMedications = false;
        }
        const reportsShared =
            shareMeals !== undefined || shareAnalyses !== undefined || shareMedications !== undefined
                ? Boolean(shareMeals || shareAnalyses || shareMedications)
                : dto.reportsShared;

        const updated = await this.prisma.conversation.update({
            where: { id },
            data: {
                status: dto.status,
                reportsShared,
                shareMeals,
                shareAnalyses,
                shareMedications,
                endedAt: isEnding ? new Date() : undefined,
            },
        });

        // Record per-category grant/revoke transitions so the client has an
        // audit trail of who got access to what and when. Best-effort: a
        // failure here must not block the toggle.
        if (isSharingChange) {
            try {
                const transitions: Array<{ scope: string; before: boolean; after: boolean }> = [];
                if (shareMeals !== undefined && Boolean(conversation.shareMeals) !== Boolean(shareMeals)) {
                    transitions.push({ scope: 'meals', before: Boolean(conversation.shareMeals), after: Boolean(shareMeals) });
                }
                if (shareAnalyses !== undefined && Boolean(conversation.shareAnalyses) !== Boolean(shareAnalyses)) {
                    transitions.push({ scope: 'lab', before: Boolean(conversation.shareAnalyses), after: Boolean(shareAnalyses) });
                }
                if (shareMedications !== undefined && Boolean(conversation.shareMedications) !== Boolean(shareMedications)) {
                    transitions.push({ scope: 'medications', before: Boolean(conversation.shareMedications), after: Boolean(shareMedications) });
                }
                for (const t of transitions) {
                    await this.prisma.dataAccessAudit.create({
                        data: {
                            clientId: conversation.clientId,
                            expertId: conversation.expertId,
                            action: t.after ? 'granted' : 'revoked',
                            scope: t.scope,
                            context: { source: 'client_toggle', conversationId: id, autoOnEnd: isEnding || undefined },
                        },
                    });
                }
            } catch (err: any) {
                this.logger.warn(`[Conversations] audit log for sharing change failed: ${err?.message}`);
            }
        }

        // Increment expert's consultation count only on transition to 'completed'
        if (dto.status === 'completed' && conversation.status !== 'completed') {
            await this.prisma.expertProfile.update({
                where: { id: conversation.expertId },
                data: { consultationCount: { increment: 1 } },
            });
        }

        return updated;
    }

    private async getExpertLocale(expertUserId: string): Promise<string | null> {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId: expertUserId },
            select: { languages: true },
        });
        if (!expert?.languages?.length) return null;
        // languages stored as ISO 639-1 codes; first one wins.
        return expert.languages[0]?.toLowerCase() || null;
    }

    private async translateMealsInPlace(meals: any[], locale: string) {
        // Collect unique strings to translate in one batch (meal.name + items[].name).
        const stringsSet = new Set<string>();
        for (const m of meals) {
            if (m?.name) stringsSet.add(m.name);
            for (const it of m?.items || []) {
                if (it?.name) stringsSet.add(it.name);
            }
        }
        const inputs = Array.from(stringsSet);
        if (!inputs.length) return;
        const translated = await this.translation.translateBatch(inputs, locale);
        const map = new Map<string, string>();
        for (let i = 0; i < inputs.length; i++) map.set(inputs[i], translated[i]);
        for (const m of meals) {
            if (m?.name && map.has(m.name)) m.name = map.get(m.name);
            for (const it of m?.items || []) {
                if (it?.name && map.has(it.name)) it.name = map.get(it.name);
            }
        }
    }

    async getClientData(conversationId: string, userId: string) {
        const conversation = await this.findById(conversationId, userId);

        // Only the expert side can view client data
        if (!conversation.isExpert) {
            throw new ForbiddenException('Only experts can view client data');
        }

        const anyShared =
            conversation.shareMeals || conversation.shareAnalyses || conversation.shareMedications || conversation.reportsShared;
        if (!anyShared) {
            throw new ForbiddenException('Client has not granted access to data');
        }

        const clientId = conversation.clientId;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const wantMeals = conversation.shareMeals || conversation.reportsShared;
        const wantAnalyses = conversation.shareAnalyses || conversation.reportsShared;
        const wantMedications = conversation.shareMedications || conversation.reportsShared;

        const [meals, labResults, userProfile] = await Promise.all([
            wantMeals
                ? this.prisma.meal.findMany({
                      where: { userId: clientId, createdAt: { gte: thirtyDaysAgo } },
                      include: { items: true },
                      orderBy: { createdAt: 'desc' },
                      take: 100,
                  })
                : Promise.resolve([]),
            wantAnalyses
                ? this.prisma.labResult.findMany({
                      where: { userId: clientId },
                      include: { metrics: true },
                      orderBy: { createdAt: 'desc' },
                      take: 20,
                  })
                : Promise.resolve([]),
            // userProfile always returned (basic demographic info — expert needs
            // at least name/age to address the client); healthProfile + medications
            // gated separately below.
            this.prisma.userProfile.findUnique({
                where: { userId: clientId },
                select: {
                    firstName: true,
                    age: true,
                    height: true,
                    weight: true,
                    gender: true,
                    activityLevel: true,
                    goal: true,
                    targetWeight: true,
                    dailyCalories: true,
                    healthProfile: wantMedications,
                    // Expose preferences so the expert can see the client's
                    // dietary preferences, allergies and health conditions
                    // (gastritis / diabetes / high cholesterol). We only
                    // surface a safe whitelist below, not the raw object.
                    preferences: true,
                },
            }),
        ]);

        // Extract the safe subset of preferences for the expert: dietary prefs,
        // allergies and chronic conditions. Subscription / language / country
        // stay private.
        if (userProfile) {
            const prefs = (userProfile.preferences || {}) as Record<string, any>;
            (userProfile as any).preferences = {
                dietaryPreferences: Array.isArray(prefs.dietaryPreferences)
                    ? prefs.dietaryPreferences
                    : Array.isArray(prefs.diets) ? prefs.diets : [],
                allergies: Array.isArray(prefs.allergies) ? prefs.allergies : [],
                allergiesNone: Boolean(prefs.allergiesNone),
                healthConditions: Array.isArray(prefs.healthConditions)
                    ? prefs.healthConditions.filter((c: string) => c && c !== 'none')
                    : [],
            };
        }

        // Best-effort audit log of data access — never block the response on failure.
        this.prisma.adminAuditLog
            .create({
                data: {
                    action: 'expert_view_client_data',
                    targetType: 'conversation',
                    targetId: conversationId,
                    adminIdentifier: `user:${userId}`,
                    payload: {
                        clientId,
                        shareMeals: wantMeals,
                        shareAnalyses: wantAnalyses,
                        shareMedications: wantMedications,
                    },
                },
            })
            .catch((err) => this.logger.warn(`Audit log (view client data) failed: ${err?.message}`));

        // Auto-translate meal ingredient + meal names into the expert's locale.
        // Best-effort: silently falls back to original on any error or missing key.
        if (meals.length && this.translation.hasApiKey()) {
            try {
                const expertLocale = await this.getExpertLocale(userId);
                if (expertLocale && expertLocale !== 'en') {
                    await this.translateMealsInPlace(meals as any[], expertLocale);
                }
            } catch (err: any) {
                this.logger.warn(`[getClientData] meal translation failed: ${err?.message}`);
            }
        }

        return {
            clientId,
            meals,
            labResults,
            healthProfile: userProfile,
            permissions: {
                meals: wantMeals,
                analyses: wantAnalyses,
                medications: wantMedications,
            },
            periodDays: 30,
        };
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
