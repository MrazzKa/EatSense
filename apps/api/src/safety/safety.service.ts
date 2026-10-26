import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

interface AcceptDisclaimerDto {
    type: string;
}

export interface CreateAbuseReportDto {
    reportedUserId?: string;
    reportedExpertId?: string;
    conversationId?: string;
    category?: string;
    description?: string;
    attachmentUrls?: string[];
    // Legacy RN payload aliases: `reason` → category, `reportedId` → reportedUserId.
    reason?: string;
    reportedId?: string;
}

const DEFAULT_REPORT_CATEGORY = 'other';

function optionalString(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

@Injectable()
export class SafetyService {
    private readonly logger = new Logger(SafetyService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== DISCLAIMERS ====================

    async getDisclaimerStatus(userId: string) {
        const acceptances = await this.prisma.disclaimerAcceptance.findMany({
            where: { userId },
            orderBy: { acceptedAt: 'desc' },
        });

        // Map of type → true for quick boolean checks (back-compat) plus the
        // full list with timestamps for the "My consents" screen.
        const accepted: Record<string, boolean> = {};
        for (const a of acceptances) accepted[a.type] = true;

        return {
            ...accepted,
            // Back-compat: callers historically read `experts_chat` directly.
            experts_chat: accepted['experts_chat'] === true,
            acceptances: acceptances.map(a => ({ type: a.type, acceptedAt: a.acceptedAt })),
        };
    }

    async acceptDisclaimer(userId: string, dto: AcceptDisclaimerDto) {
        const existing = await this.prisma.disclaimerAcceptance.findUnique({
            where: {
                userId_type: {
                    userId,
                    type: dto.type,
                },
            },
        });

        if (existing) {
            return existing;
        }

        return this.prisma.disclaimerAcceptance.create({
            data: {
                userId,
                type: dto.type,
            },
        });
    }

    // ==================== ABUSE REPORTS ====================

    async createAbuseReport(reporterId: string, dto: CreateAbuseReportDto) {
        const body = dto || {};
        // `category` is optional for backward compatibility: shipped RN clients
        // send `reason` (or nothing) instead.
        const category = optionalString(body.category, 64)
            ?? optionalString(body.reason, 64)
            ?? DEFAULT_REPORT_CATEGORY;
        const attachmentUrls = Array.isArray(body.attachmentUrls)
            ? body.attachmentUrls.filter((u): u is string => typeof u === 'string').slice(0, 10)
            : [];

        const report = await this.prisma.abuseReport.create({
            data: {
                reporterId,
                reportedUserId: optionalString(body.reportedUserId, 64) ?? optionalString(body.reportedId, 64),
                reportedExpertId: optionalString(body.reportedExpertId, 64),
                conversationId: optionalString(body.conversationId, 64),
                category,
                description: optionalString(body.description, 4000),
                attachmentUrls,
            },
        });

        this.logger.warn(`Abuse report created: ${report.id}, category=${category}, reporter=${reporterId}`);

        return report;
    }

    // ==================== BLOCKS ====================

    async blockUser(blockerId: string, blockedId: string) {
        const existing = await this.prisma.userBlock.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId,
                    blockedId,
                },
            },
        });

        if (existing) {
            return existing;
        }

        return this.prisma.userBlock.create({
            data: {
                blockerId,
                blockedId,
            },
        });
    }

    async unblockUser(blockerId: string, blockedId: string) {
        await this.prisma.userBlock.deleteMany({
            where: {
                blockerId,
                blockedId,
            },
        });

        return { success: true };
    }

    async getBlockedUsers(userId: string) {
        const blocks = await this.prisma.userBlock.findMany({
            where: { blockerId: userId },
            include: {
                blocked: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true, lastName: true, avatarUrl: true } },
                    },
                },
            },
        });

        return blocks.map(b => b.blocked);
    }

    async isBlocked(userId1: string, userId2: string): Promise<boolean> {
        const block = await this.prisma.userBlock.findFirst({
            where: {
                OR: [
                    { blockerId: userId1, blockedId: userId2 },
                    { blockerId: userId2, blockedId: userId1 },
                ],
            },
        });

        return !!block;
    }
}
