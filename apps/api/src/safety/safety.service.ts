import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

interface AcceptDisclaimerDto {
    type: string;
}

interface CreateAbuseReportDto {
    reportedUserId?: string;
    reportedExpertId?: string;
    conversationId?: string;
    category: string;
    description?: string;
    attachmentUrls?: string[];
}

@Injectable()
export class SafetyService {
    private readonly logger = new Logger(SafetyService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== DISCLAIMERS ====================

    async getDisclaimerStatus(userId: string) {
        const acceptances = await this.prisma.disclaimerAcceptance.findMany({
            where: { userId },
        });

        return {
            experts_chat: acceptances.some(a => a.type === 'experts_chat'),
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
        const report = await this.prisma.abuseReport.create({
            data: {
                reporterId,
                reportedUserId: dto.reportedUserId,
                reportedExpertId: dto.reportedExpertId,
                conversationId: dto.conversationId,
                category: dto.category,
                description: dto.description,
                attachmentUrls: dto.attachmentUrls || [],
            },
        });

        this.logger.warn(`Abuse report created: ${report.id}, category=${dto.category}, reporter=${reporterId}`);

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
