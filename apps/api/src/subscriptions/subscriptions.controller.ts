import { Controller, Get, Post, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { GeoService } from '../geo/geo.service';

@Controller('subscriptions')
export class SubscriptionsController {
    constructor(
        private subscriptionsService: SubscriptionsService,
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
            planId: string;
            platform: 'ios' | 'android';
            transactionId?: string;
            purchaseToken?: string;
            receipt?: string;
        },
    ) {
        if (!dto.planId) {
            throw new BadRequestException('planId is required');
        }

        // TODO: Verify purchase with Apple/Google
        // This requires integration with App Store Connect and Google Play Console
        // For now, we'll trust the client and create the subscription

        // Get price from database
        const plans = await this.subscriptionsService.getPlansWithPrices('USD');
        const plan = plans.find(p => p.id === dto.planId);

        if (!plan) {
            throw new BadRequestException('Plan not found');
        }

        // Create subscription
        const subscription = await this.subscriptionsService.createSubscription(
            user.id,
            dto.planId,
            'USD',
            plan.price,
            {
                appleTransactionId: dto.platform === 'ios' ? dto.transactionId : undefined,
                googlePurchaseToken: dto.platform === 'android' ? dto.purchaseToken : undefined,
            },
        );

        return {
            success: true,
            subscription: {
                id: subscription.id,
                plan: subscription.plan.name,
                endDate: subscription.endDate,
            },
        };
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
}
