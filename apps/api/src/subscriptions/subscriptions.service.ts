import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GeoService } from '../geo/geo.service';

export interface PlanWithPrice {
    id: string;
    name: string;
    durationDays: number;
    features: string[];
    requiresVerification: boolean;
    price: number;
    priceFormatted: string;
    pricePerMonth?: number;
    pricePerMonthFormatted?: string;
    savingsPercent?: number;
    appleProductId?: string;
    googleProductId?: string;
}

@Injectable()
export class SubscriptionsService {
    private readonly logger = new Logger(SubscriptionsService.name);

    constructor(
        private prisma: PrismaService,
        private geoService: GeoService,
    ) { }

    /**
     * Get all plans with prices for the specified currency
     */
    async getPlansWithPrices(currencyCode: string): Promise<PlanWithPrice[]> {
        const plans = await this.prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            include: {
                prices: {
                    where: { currencyCode },
                },
            },
            orderBy: { displayOrder: 'asc' },
        });

        // If no prices for currency, fallback to USD
        const plansWithFallback = await Promise.all(
            plans.map(async (plan) => {
                let priceData = plan.prices[0];

                if (!priceData) {
                    // Fallback to USD
                    priceData = await this.prisma.subscriptionPrice.findFirst({
                        where: {
                            planId: plan.id,
                            currencyCode: 'USD',
                        },
                    });
                }

                if (!priceData) {
                    this.logger.warn(`No price found for plan ${plan.name}`);
                    return null;
                }

                return {
                    id: plan.id,
                    name: plan.name,
                    durationDays: plan.durationDays,
                    features: plan.features as string[],
                    requiresVerification: plan.requiresVerification,
                    price: priceData.price,
                    priceFormatted: priceData.priceFormatted,
                    pricePerMonth: priceData.pricePerMonth,
                    pricePerMonthFormatted: priceData.pricePerMonthFormatted,
                    savingsPercent: priceData.savingsPercent,
                    appleProductId: priceData.appleProductId,
                    googleProductId: priceData.googleProductId,
                };
            })
        );

        return plansWithFallback.filter(Boolean) as PlanWithPrice[];
    }

    /**
     * Create subscription for user
     */
    async createSubscription(
        userId: string,
        planId: string,
        currency: string,
        pricePaid: number,
        paymentData?: {
            appleTransactionId?: string;
            googlePurchaseToken?: string;
        },
    ) {
        const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id: planId },
        });

        if (!plan) {
            throw new NotFoundException('Plan not found');
        }

        // Deactivate current subscription
        await this.prisma.userSubscription.updateMany({
            where: {
                userId,
                status: 'ACTIVE',
            },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
        });

        // Create new subscription
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);

        return this.prisma.userSubscription.create({
            data: {
                userId,
                planId,
                currency,
                pricePaid,
                status: 'ACTIVE',
                endDate,
                appleTransactionId: paymentData?.appleTransactionId,
                googlePurchaseToken: paymentData?.googlePurchaseToken,
            },
            include: {
                plan: true,
            },
        });
    }

    /**
     * Get user's active subscription
     */
    async getActiveSubscription(userId: string) {
        return this.prisma.userSubscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
                endDate: { gt: new Date() },
            },
            include: {
                plan: true,
            },
        });
    }

    /**
     * Check and update expired subscriptions
     */
    async checkExpiredSubscriptions() {
        const expired = await this.prisma.userSubscription.updateMany({
            where: {
                status: 'ACTIVE',
                endDate: { lt: new Date() },
            },
            data: {
                status: 'EXPIRED',
            },
        });

        this.logger.log(`Marked ${expired.count} subscriptions as expired`);
        return expired.count;
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId: string, subscriptionId: string) {
        const subscription = await this.prisma.userSubscription.findFirst({
            where: {
                id: subscriptionId,
                userId,
                status: 'ACTIVE',
            },
        });

        if (!subscription) {
            throw new NotFoundException('Active subscription not found');
        }

        return this.prisma.userSubscription.update({
            where: { id: subscriptionId },
            data: {
                autoRenew: false,
                cancelledAt: new Date(),
            },
        });
    }
}
