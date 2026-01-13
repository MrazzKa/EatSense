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
            // TODO: Implement Google Play validation
            throw new BadRequestException('Android purchases not yet supported');
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

