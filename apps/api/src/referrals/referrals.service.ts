import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReferralsService {
    constructor(private prisma: PrismaService) { }

    async getOrCreateCode(userId: string) {
        // Use type assertion until prisma generate is run
        const prismaAny = this.prisma as any;
        if (!prismaAny.referralCode) {
            return { code: this.generateCode(userId), invitedCount: 0, earnedDays: 0 };
        }

        let referralCode = await prismaAny.referralCode.findUnique({
            where: { userId },
        });

        if (!referralCode) {
            referralCode = await prismaAny.referralCode.create({
                data: {
                    userId,
                    code: this.generateCode(userId),
                },
            });
        }

        return referralCode;
    }

    async getStats(userId: string) {
        const prismaAny = this.prisma as any;
        if (!prismaAny.referralCode) {
            return { code: '---', invitedCount: 0, earnedDays: 0, referrals: [] };
        }

        const referralCode = await this.getOrCreateCode(userId);

        const referrals = prismaAny.referral ? await prismaAny.referral.findMany({
            where: { referrerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                referred: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true } },
                    },
                },
            },
        }) : [];

        return {
            code: referralCode.code,
            invitedCount: 'usageCount' in referralCode ? referralCode.usageCount : 0,
            earnedDays: 'totalBonusDays' in referralCode ? referralCode.totalBonusDays : 0,
            referrals: referrals.map((r: any) => ({
                id: r.id,
                friend: { firstName: r.referred?.userProfile?.firstName },
                date: r.createdAt,
                bonusDays: r.referrerBonus,
            })),
        };
    }

    async getRecentReferrals(userId: string) {
        const prismaAny = this.prisma as any;
        if (!prismaAny.referral) {
            return [];
        }

        const referrals = await prismaAny.referral.findMany({
            where: { referrerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                referred: {
                    select: {
                        id: true,
                        userProfile: { select: { firstName: true } },
                    },
                },
            },
        });

        return referrals;
    }

    private generateCode(userId: string): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}
