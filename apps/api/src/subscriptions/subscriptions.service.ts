import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GeoService } from '../geo/geo.service';
import { CacheService } from '../cache/cache.service';
import * as crypto from 'crypto';

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
export class SubscriptionsService implements OnModuleInit {
    private readonly logger = new Logger(SubscriptionsService.name);

    constructor(
        private prisma: PrismaService,
        private geoService: GeoService,
        @Optional() @Inject(CacheService) private readonly cache?: CacheService,
    ) { }

    onModuleInit() {
        const rawKeyId = process.env.APPLE_IAP_KEY_ID?.trim();
        const rawIssuerId = process.env.APPLE_IAP_ISSUER_ID?.trim();
        let rawKey = process.env.APPLE_IAP_KEY?.trim();
        const bundleId = (process.env.APPLE_BUNDLE_ID || process.env.APP_BUNDLE_ID || 'ch.eatsense.app').trim();

        // Support base64-encoded PEM keys (useful when env vars don't handle multiline well)
        if (rawKey && !rawKey.includes('BEGIN') && rawKey.length > 100) {
            try {
                const decoded = Buffer.from(rawKey, 'base64').toString('utf8');
                if (decoded.includes('BEGIN')) {
                    rawKey = decoded;
                    this.logger.log('Apple IAP KEY: decoded from base64');
                }
            } catch {
                // Not base64, use as-is
            }
        }

        this.logger.log(
            `Apple IAP config: KEY_ID=${rawKeyId ? `SET(len=${rawKeyId.length}, prefix=${rawKeyId.substring(0, 4)}...)` : 'MISSING'}, ` +
            `ISSUER_ID=${rawIssuerId ? `SET(len=${rawIssuerId.length})` : 'MISSING'}, ` +
            `KEY=${rawKey ? `SET(len=${rawKey.length}, hasBEGIN=${rawKey.includes('BEGIN')}, hasNewlines=${rawKey.includes('\n')})` : 'MISSING'}, ` +
            `BUNDLE_ID=${bundleId}`
        );

        if (!rawKeyId || !rawIssuerId || !rawKey) {
            this.logger.warn('Apple IAP promotional offers will not work - missing credentials');
        }
    }

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

        // Prevent duplicate processing of the same transaction
        if (paymentData?.appleTransactionId) {
            const existing = await this.prisma.userSubscription.findFirst({
                where: { appleTransactionId: paymentData.appleTransactionId },
                include: { plan: true },
            });
            if (existing) {
                this.logger.debug(`Duplicate transaction ${paymentData.appleTransactionId} - returning existing subscription`);
                return existing;
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
        const planName = plan?.name;

        // Special handling for Founders Pass: lifetime access
        if (planName === 'founders' || planIdOrProductId === 'eatsense.founder.pass') {
            endDate = new Date('2099-12-31');
        } else if (expiresDate) {
            endDate = expiresDate;
        } else {
            endDate = new Date();
            endDate.setDate(endDate.getDate() + effectiveDuration);
        }

        const subscription = await this.prisma.userSubscription.create({
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

        // FIX: Invalidate caches after subscription creation
        // Without this, the old dailyLimit (3 for free users) stays cached
        // and users can't analyze more food even after paying
        if (this.cache) {
            try {
                await Promise.all([
                    this.cache.invalidateNamespace('suggestions', userId),
                    this.cache.invalidateNamespace('stats:monthly', userId),
                    this.cache.invalidateNamespace('stats:daily', userId),
                    this.cache.invalidateNamespace('meals:diary', userId),
                ]);
                this.logger.log(`[Subscriptions] Cache invalidated for user ${userId} after subscription creation`);
            } catch (e) {
                this.logger.warn(`[Subscriptions] Failed to invalidate cache: ${e?.message}`);
            }
        }

        return subscription;
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

    /**
     * Generate signed promotional offer for Apple In-App Purchase
     * Used to apply free trial offer when purchasing from paywall (not onboarding)
     *
     * @param productId - The subscription product ID (e.g., 'eatsense.pro.monthly')
     * @param offerId - The promotional offer ID (e.g., 'eatsense.monthly.trial')
     * @param applicationUsername - Unique identifier for the user (usually app user ID)
     * @returns Signed offer data for use with react-native-iap
     */
    async signPromotionalOffer(
        productId: string,
        offerId: string,
        applicationUsername: string,
    ): Promise<{
        keyIdentifier: string;
        nonce: string;
        timestamp: number;
        signature: string;
    }> {
        const keyId = process.env.APPLE_IAP_KEY_ID?.trim();
        const issuerId = process.env.APPLE_IAP_ISSUER_ID?.trim();
        const privateKey = process.env.APPLE_IAP_KEY?.trim();

        if (!keyId || !issuerId || !privateKey) {
            const missing = [
                !keyId && 'APPLE_IAP_KEY_ID',
                !issuerId && 'APPLE_IAP_ISSUER_ID',
                !privateKey && 'APPLE_IAP_KEY',
            ].filter(Boolean).join(', ');
            this.logger.error(`Apple IAP credentials missing: ${missing}`);
            throw new BadRequestException(
                `Apple IAP credentials not configured. Missing: ${missing}`
            );
        }

        // Generate nonce (UUID v4 without dashes, lowercase)
        const nonce = crypto.randomUUID().toLowerCase();

        // Timestamp in milliseconds
        const timestamp = Date.now();

        // Build the payload to sign
        // Format: appBundleID + '\u2063' + keyIdentifier + '\u2063' + productIdentifier + '\u2063' + offerIdentifier + '\u2063' + applicationUsername + '\u2063' + nonce + '\u2063' + timestamp
        // Note: \u2063 is the invisible separator character
        const appBundleId = (process.env.APPLE_BUNDLE_ID || process.env.APP_BUNDLE_ID || 'ch.eatsense.app').trim();
        const separator = '\u2063';

        const payload = [
            appBundleId,
            keyId,
            productId,
            offerId,
            applicationUsername,
            nonce,
            timestamp.toString(),
        ].join(separator);

        try {
            // Parse the private key (PEM format)
            // Handle literal \n strings from env vars, and base64-encoded keys
            let keyContent = privateKey.replace(/\\n/g, '\n');
            if (!keyContent.includes('BEGIN') && keyContent.length > 100) {
                try {
                    const decoded = Buffer.from(keyContent, 'base64').toString('utf8');
                    if (decoded.includes('BEGIN')) {
                        keyContent = decoded;
                    }
                } catch {
                    // Not base64, use as-is
                }
            }

            // Create signature using ECDSA with SHA-256
            const sign = crypto.createSign('SHA256');
            sign.update(payload);
            sign.end();

            // Sign and encode as base64
            const signature = sign.sign(
                {
                    key: keyContent,
                    dsaEncoding: 'ieee-p1363', // Required format for Apple
                },
                'base64'
            );

            this.logger.debug(`[SubscriptionsService] Generated promotional offer signature for ${offerId}`);

            return {
                keyIdentifier: keyId,
                nonce,
                timestamp,
                signature,
            };
        } catch (error: any) {
            this.logger.error(`[SubscriptionsService] Failed to sign promotional offer: ${error.message}`);
            throw new BadRequestException(`Failed to sign promotional offer: ${error.message}`);
        }
    }

    /**
     * Check if user is eligible for promotional offer (free trial)
     * User is NOT eligible if they've already used a trial or have/had an active subscription
     */
    async checkTrialEligibility(userId: string): Promise<{
        eligible: boolean;
        reason?: string;
    }> {
        // Check for any previous subscriptions (including expired)
        const previousSubscription = await this.prisma.userSubscription.findFirst({
            where: {
                userId,
            },
        });

        if (previousSubscription) {
            return {
                eligible: false,
                reason: 'User has previous subscription history',
            };
        }

        return {
            eligible: true,
        };
    }
}
