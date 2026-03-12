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

    async applyCode(userId: string, code: string) {
        const prismaAny = this.prisma as any;
        if (!prismaAny.referralCode || !prismaAny.referral) {
            throw new Error('Referral tables not available');
        }

        // Find the referral code
        const referralCode = await prismaAny.referralCode.findUnique({
            where: { code: code.toUpperCase().trim() },
        });

        if (!referralCode) {
            throw new Error('Invalid referral code');
        }

        // Can't refer yourself
        if (referralCode.userId === userId) {
            throw new Error('Cannot use your own referral code');
        }

        // Check if user was already referred
        const existingReferral = await prismaAny.referral.findUnique({
            where: { referredId: userId },
        });

        if (existingReferral) {
            throw new Error('You have already used a referral code');
        }

        const BONUS_DAYS = 7;

        // Create referral record
        await prismaAny.referral.create({
            data: {
                referralCodeId: referralCode.id,
                referrerId: referralCode.userId,
                referredId: userId,
                status: 'completed',
                referrerBonus: BONUS_DAYS,
                referredBonus: BONUS_DAYS,
            },
        });

        // Update referral code stats
        await prismaAny.referralCode.update({
            where: { id: referralCode.id },
            data: {
                usageCount: { increment: 1 },
                totalBonusDays: { increment: BONUS_DAYS },
            },
        });

        // Grant trial days to both users
        const now = new Date();
        const grantTrialDays = async (uid: string) => {
            const existingSub = await prismaAny.userSubscription?.findFirst({
                where: { userId: uid, status: 'ACTIVE' },
            });

            if (existingSub) {
                // Extend existing subscription
                const currentEnd = new Date(existingSub.endDate);
                const newEnd = new Date(currentEnd.getTime() + BONUS_DAYS * 24 * 60 * 60 * 1000);
                await prismaAny.userSubscription.update({
                    where: { id: existingSub.id },
                    data: { endDate: newEnd },
                });
            } else {
                // Create trial subscription
                const endDate = new Date(now.getTime() + BONUS_DAYS * 24 * 60 * 60 * 1000);
                // Find or create a referral trial plan
                let trialPlan = await prismaAny.subscriptionPlan?.findFirst({
                    where: { name: 'referral-trial' },
                });
                if (!trialPlan && prismaAny.subscriptionPlan) {
                    trialPlan = await prismaAny.subscriptionPlan.create({
                        data: {
                            name: 'referral-trial',
                            basePriceUsd: 0,
                            durationDays: BONUS_DAYS,
                            dailyLimit: 9999,
                            features: ['referral_bonus'],
                        },
                    });
                }
                if (trialPlan && prismaAny.userSubscription) {
                    await prismaAny.userSubscription.create({
                        data: {
                            userId: uid,
                            planId: trialPlan.id,
                            currency: 'USD',
                            pricePaid: 0,
                            status: 'ACTIVE',
                            startDate: now,
                            endDate: endDate,
                        },
                    });
                }
            }
        };

        // Run sequentially to avoid race condition on plan creation
        await grantTrialDays(referralCode.userId); // Referrer gets bonus
        await grantTrialDays(userId);               // Referred user gets bonus

        return {
            success: true,
            bonusDays: BONUS_DAYS,
            message: `Both you and your friend received ${BONUS_DAYS} days of PRO!`,
        };
    }

    private generateCode(_userId: string): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}
