import { Controller, Get, Post, Body, Req, UseGuards, BadRequestException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { AppleReceiptService } from './apple-receipt.service';
import { GeoService } from '../geo/geo.service';

@Controller('subscriptions')
export class SubscriptionsController {
    private readonly logger = new Logger(SubscriptionsController.name);

    constructor(
        private subscriptionsService: SubscriptionsService,
        private appleReceiptService: AppleReceiptService,
        private geoService: GeoService,
    ) { }

    /**
     * Get available subscription plans with prices
     */
    @Get('plans')
    async getPlans(@Req() req: Request) {
        // Determine IP
        const ip = this.getClientIp(req);

        // Detect country and currency
        const countryInfo = this.geoService.detectCountry(ip);

        // Get plans with prices
        const plans = await this.subscriptionsService.getPlansWithPrices(
            countryInfo.currency.code
        );

        return {
            country: countryInfo.countryCode,
            currency: {
                code: countryInfo.currency.code,
                symbol: countryInfo.currency.symbol,
            },
            plans,
        };
    }

    /**
     * Get current user's subscription
     */
    @Get('current')
    @UseGuards(JwtAuthGuard)
    async getCurrentSubscription(@CurrentUser() user: any) {
        const subscription = await this.subscriptionsService.getActiveSubscription(user.id);

        if (!subscription) {
            return { hasSubscription: false };
        }

        return {
            hasSubscription: true,
            subscription: {
                id: subscription.id,
                plan: subscription.plan.name,
                planId: subscription.plan.id,
                dailyLimit: subscription.plan.dailyLimit,
                status: subscription.status,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                autoRenew: subscription.autoRenew,
            },
        };
    }

    /**
     * Verify purchase (after IAP)
     */
    @Post('verify-purchase')
    @UseGuards(JwtAuthGuard)
    async verifyPurchase(
        @CurrentUser() user: any,
        @Body() dto: {
            productId?: string;  // New field from IAP
            planId?: string;     // Legacy field
            platform: 'ios' | 'android';
            transactionId?: string;
            purchaseToken?: string;
            receipt?: string;
        },
    ) {
        const productId = dto.productId || dto.planId;
        this.logger.log(`Verify purchase for user ${user.id}, product: ${productId}`);

        if (!productId || !dto.receipt) {
            throw new BadRequestException('productId and receipt are required');
        }

        if (dto.platform === 'ios') {
            // Validate with Apple
            const validation = await this.appleReceiptService.verifyReceipt(dto.receipt);

            if (!validation.isValid) {
                this.logger.warn(`Invalid receipt for user ${user.id}: ${validation.status}`);
                throw new BadRequestException(
                    `Invalid receipt: ${this.appleReceiptService.getStatusMessage(validation.status || 0)}`
                );
            }

            // Verify product ID matches
            if (validation.productId !== productId) {
                this.logger.warn(`Product mismatch: expected ${productId}, got ${validation.productId}`);
                throw new BadRequestException('Product ID mismatch');
            }

            const durationDays = this.getDurationByProductId(productId);

            // Create subscription with validated data
            const subscription = await this.subscriptionsService.createSubscription(
                user.id,
                productId,
                'USD',
                0, // Price from Apple, not needed for validation
                {
                    appleTransactionId: validation.transactionId,
                },
                validation.expiresDate,
                durationDays,
            );

            this.logger.log(`Subscription created for user ${user.id}: ${subscription.id}`);

            return {
                success: true,
                subscription: {
                    id: subscription.id,
                    productId: productId,
                    expiresDate: subscription.endDate,
                    isTrial: validation.isTrialPeriod,
                },
            };
        }

        if (dto.platform === 'android') {
            if (!dto.purchaseToken) {
                throw new BadRequestException('purchaseToken is required for Android purchases');
            }

            // Validate with Google Play Developer API
            const { google } = await import('googleapis');
            const packageName = 'ch.eatsense.app';

            try {
                const auth = new google.auth.GoogleAuth({
                    keyFile: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY || './google-play-service-account.json',
                    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
                });

                const androidpublisher = google.androidpublisher({ version: 'v3', auth });

                const subscriptionResult = await androidpublisher.purchases.subscriptions.get({
                    packageName,
                    subscriptionId: productId,
                    token: dto.purchaseToken,
                });

                const subscriptionData = subscriptionResult.data;

                if (!subscriptionData.expiryTimeMillis) {
                    throw new BadRequestException('Invalid subscription: no expiry time');
                }

                const expiresDate = new Date(parseInt(subscriptionData.expiryTimeMillis));
                const isCanceled = subscriptionData.cancelReason !== undefined;
                const durationDays = this.getDurationByProductId(productId);

                const subscription = await this.subscriptionsService.createSubscription(
                    user.id,
                    productId,
                    'USD',
                    0,
                    { googlePurchaseToken: dto.purchaseToken },
                    expiresDate,
                    durationDays,
                );

                this.logger.log(`Android subscription created for user ${user.id}: ${subscription.id}`);

                return {
                    success: true,
                    subscription: {
                        id: subscription.id,
                        productId,
                        expiresDate: subscription.endDate,
                        isTrial: subscriptionData.paymentState === 2,
                    },
                };
            } catch (err) {
                this.logger.error(`Google Play validation failed for user ${user.id}:`, err);
                throw new BadRequestException('Failed to validate Android purchase');
            }
        }

        throw new BadRequestException('Invalid platform');
    }

    /**
     * Cancel subscription
     */
    @Post('cancel')
    @UseGuards(JwtAuthGuard)
    async cancelSubscription(
        @CurrentUser() user: any,
        @Body() dto: { subscriptionId: string },
    ) {
        if (!dto.subscriptionId) {
            throw new BadRequestException('subscriptionId is required');
        }

        const result = await this.subscriptionsService.cancelSubscription(
            user.id,
            dto.subscriptionId,
        );

        return {
            success: true,
            message: 'Subscription will not auto-renew',
            endDate: result.endDate,
        };
    }

    /**
     * Sign promotional offer for Apple In-App Purchase
     * Used to apply free trial when purchasing from paywall
     */
    @Post('sign-offer')
    @UseGuards(JwtAuthGuard)
    async signPromotionalOffer(
        @CurrentUser() user: any,
        @Body() dto: {
            productId: string;
            offerId: string;
        },
    ) {
        if (!dto.productId || !dto.offerId) {
            throw new BadRequestException('productId and offerId are required');
        }

        this.logger.log(`Signing promotional offer for user ${user.id}: ${dto.offerId}`);

        const signature = await this.subscriptionsService.signPromotionalOffer(
            dto.productId,
            dto.offerId,
            user.id, // Use user ID as applicationUsername
        );

        return {
            success: true,
            ...signature,
            productId: dto.productId,
            offerId: dto.offerId,
            applicationUsername: user.id,
        };
    }

    /**
     * Check if user is eligible for free trial (promotional offer)
     */
    @Get('trial-eligibility')
    @UseGuards(JwtAuthGuard)
    async checkTrialEligibility(@CurrentUser() user: any) {
        const result = await this.subscriptionsService.checkTrialEligibility(user.id);
        return result;
    }

    private getClientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        if (Array.isArray(forwarded)) {
            return forwarded[0];
        }
        return req.socket?.remoteAddress || '127.0.0.1';
    }

    private getDurationByProductId(productId: string): number {
        const durations: Record<string, number> = {
            'eatsense.pro.monthly': 30,
            'eatsense.pro.yearly': 365,
            'eatsense.pro.yearly.student': 365,
            'eatsense.founder.pass': 36500, // ~100 years for lifetime
        };
        return durations[productId] || 30;
    }
}

