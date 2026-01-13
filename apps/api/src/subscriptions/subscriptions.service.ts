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
     * @param userId - User ID
     * @param planIdOrProductId - Plan ID from database OR Apple productId (e.g. 'eatsense.pro.monthly')
     * @param currency - Currency code
     * @param pricePaid - Price paid (0 when using Apple validation)
     * @param paymentData - Payment transaction data
     * @param expiresDate - Optional expiration date from Apple (overrides calculated endDate)
     * @param durationDays - Optional duration in days (fallback if plan not found)
     */
    async createSubscription(
        userId: string,
        planIdOrProductId: string,
        currency: string,
        pricePaid: number,
        paymentData?: {
            appleTransactionId?: string;
            googlePurchaseToken?: string;
        },
        expiresDate?: Date,
        durationDays?: number,
    ) {
        // Try to find plan by ID first, then by productId (Apple SKU)
        let plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id: planIdOrProductId },
        });

        // If not found by ID, try to find by name/productId mapping
        if (!plan) {
            // Map Apple productId to plan name
            const productIdToName: Record<string, string> = {
                'eatsense.pro.monthly': 'monthly',
                'eatsense.pro.yearly': 'yearly',
                'eatsense.pro.yearly.student': 'student',
                'eatsense.founder.pass': 'founders',
            };
            const planName = productIdToName[planIdOrProductId];
            if (planName) {
                plan = await this.prisma.subscriptionPlan.findFirst({
                    where: { name: planName },
                });
            }
        }

        // If still no plan and we have durationDays, create subscription without plan reference
        // This handles new products not yet in database
        const effectivePlanId = plan?.id;
        const effectiveDuration = plan?.durationDays || durationDays || 30;

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

        // Calculate end date: use Apple's expiresDate if provided, otherwise calculate
        let endDate: Date;
        if (expiresDate) {
            endDate = expiresDate;
        } else {
            endDate = new Date();
            endDate.setDate(endDate.getDate() + effectiveDuration);
        }

        return this.prisma.userSubscription.create({
            data: {
                userId,
                planId: effectivePlanId,
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
