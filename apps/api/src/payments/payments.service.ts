import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(private readonly prisma: PrismaService) { }

    private get isEnabled(): boolean {
        return process.env.STRIPE_ENABLED === 'true' && Boolean(process.env.STRIPE_SECRET_KEY);
    }

    private get stripe(): InstanceType<typeof Stripe> {
        if (!this.isEnabled) {
            throw new InternalServerErrorException(
                'Payments are not enabled in this environment. Set STRIPE_ENABLED=true and STRIPE_SECRET_KEY to activate.',
            );
        }
        return new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2026-04-22.dahlia',
        });
    }

    async createIntentForOffer(params: {
        userId: string;
        offerId: string;
        conversationId: string;
    }): Promise<{ clientSecret: string; paymentId: string }> {
        if (!this.isEnabled) {
            throw new InternalServerErrorException(
                'Payments are not enabled in this environment. Set STRIPE_ENABLED=true and STRIPE_SECRET_KEY to activate.',
            );
        }

        const offer = await this.prisma.expertOffer.findUnique({
            where: { id: params.offerId },
            include: { expert: true },
        });
        if (!offer) throw new NotFoundException('Offer not found');
        if (offer.priceType === 'FREE') {
            throw new BadRequestException('This offer is free — no payment required.');
        }
        if (offer.priceType !== 'FIXED') {
            throw new BadRequestException('Only fixed-price offers can be paid in-app.');
        }
        if (!offer.priceAmount || offer.priceAmount <= 0) {
            throw new BadRequestException('Offer has no price set.');
        }

        const conversation = await this.prisma.conversation.findUnique({
            where: { id: params.conversationId },
        });
        if (!conversation || conversation.clientId !== params.userId) {
            throw new BadRequestException('Conversation not found or not owned by user.');
        }
        if (conversation.expertId !== offer.expertId) {
            throw new BadRequestException('Offer does not belong to this conversation expert.');
        }

        const amountCents = Math.round(offer.priceAmount * 100);
        const currency = (offer.currency || 'USD').toUpperCase();

        const payment = await this.prisma.payment.create({
            data: {
                userId: params.userId,
                offerId: offer.id,
                conversationId: params.conversationId,
                amountCents,
                currency,
                status: 'PENDING',
            },
        });

        try {
            const intent = await this.stripe.paymentIntents.create({
                amount: amountCents,
                currency: currency.toLowerCase(),
                automatic_payment_methods: { enabled: true },
                metadata: {
                    paymentId: payment.id,
                    offerId: offer.id,
                    conversationId: params.conversationId,
                    userId: params.userId,
                    expertId: offer.expertId,
                },
            });

            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { stripePaymentIntentId: intent.id },
            });

            if (!intent.client_secret) {
                throw new InternalServerErrorException('Stripe did not return a client secret.');
            }

            return { clientSecret: intent.client_secret, paymentId: payment.id };
        } catch (error: any) {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'FAILED', failureReason: error?.message || 'Stripe intent creation failed' },
            }).catch(() => undefined);
            throw error;
        }
    }

    async handleWebhook(rawBody: Buffer, signatureHeader: string | undefined): Promise<{ received: boolean }> {
        if (!this.isEnabled) {
            this.logger.warn('Stripe webhook received but payments are disabled — ignoring.');
            return { received: true };
        }
        if (!signatureHeader) {
            throw new BadRequestException('Missing Stripe-Signature header');
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET is not configured.');
        }
        if (!Buffer.isBuffer(rawBody)) {
            throw new BadRequestException('Webhook raw body is not available.');
        }

        const event = this.stripe.webhooks.constructEvent(
            rawBody,
            signatureHeader,
            process.env.STRIPE_WEBHOOK_SECRET,
        );

        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.markIntentSucceeded(event.data.object as any);
                break;
            case 'payment_intent.payment_failed':
                await this.markIntentFailed(event.data.object as any);
                break;
            case 'payment_intent.canceled':
                await this.markIntentCancelled(event.data.object as any);
                break;
            case 'charge.refunded':
                await this.markChargeRefunded(event.data.object as any);
                break;
            case 'account.updated':
                await this.handleConnectAccountUpdated(event.data.object as any);
                break;
            default:
                this.logger.debug(`Unhandled Stripe event: ${event.type}`);
        }

        return { received: true };
    }

    async createConnectOnboardingLink(userId: string): Promise<{ url: string; expiresAt: number }> {
        if (!this.isEnabled) throw new InternalServerErrorException('Payments not enabled');
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
            select: { id: true, stripeConnectAccountId: true, displayName: true } as any,
        });
        if (!expert) throw new NotFoundException('Expert profile not found');
        const e = expert as any;

        let accountId = e.stripeConnectAccountId as string | null;
        if (!accountId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
            const account = await this.stripe.accounts.create({
                type: 'express',
                email: user?.email,
                capabilities: {
                    transfers: { requested: true },
                },
                business_profile: { product_description: 'Nutrition consultations on EatSense' },
            });
            accountId = account.id;
            await this.prisma.expertProfile.update({
                where: { id: e.id },
                data: { stripeConnectAccountId: accountId } as any,
            });
        }

        const link = await this.stripe.accountLinks.create({
            account: accountId,
            refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL || 'https://experts.eatsense.ch/earnings',
            return_url: process.env.STRIPE_CONNECT_RETURN_URL || 'https://experts.eatsense.ch/earnings',
            type: 'account_onboarding',
        });
        return { url: link.url, expiresAt: link.expires_at };
    }

    async getConnectStatus(userId: string) {
        const expert = await this.prisma.expertProfile.findUnique({
            where: { userId },
            select: {
                stripeConnectAccountId: true,
                stripeConnectPayoutsEnabled: true,
                stripeConnectChargesEnabled: true,
                stripeConnectDetailsSubmitted: true,
            } as any,
        });
        if (!expert) throw new NotFoundException();
        return expert;
    }

    async adminRefund(paymentId: string, opts?: { reason?: string; amount?: number }): Promise<{ refundId: string }> {
        if (!this.isEnabled) throw new InternalServerErrorException('Payments not enabled');
        const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment) throw new NotFoundException();
        if (!payment.stripePaymentIntentId) throw new BadRequestException('No payment intent on file');
        if (payment.status === 'REFUNDED') throw new BadRequestException('Already refunded');
        const refund = await this.stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId,
            reason: 'requested_by_customer',
            amount: opts?.amount,
            metadata: { adminReason: opts?.reason || '' },
        });
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED', refundedAt: new Date() },
        });
        return { refundId: refund.id };
    }

    private async handleConnectAccountUpdated(account: any) {
        if (!account?.id) return;
        await this.prisma.expertProfile.updateMany({
            where: { stripeConnectAccountId: account.id } as any,
            data: {
                stripeConnectPayoutsEnabled: !!account.payouts_enabled,
                stripeConnectChargesEnabled: !!account.charges_enabled,
                stripeConnectDetailsSubmitted: !!account.details_submitted,
            } as any,
        }).catch((e) => this.logger.warn(`handleConnectAccountUpdated update failed: ${e?.message}`));
    }

    async getPayment(paymentId: string, userId: string) {
        const payment = await this.prisma.payment.findFirst({
            where: { id: paymentId, userId },
            include: {
                offer: true,
                conversation: { select: { id: true, expertId: true, status: true } },
            },
        });
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    private async markIntentSucceeded(intent: any) {
        const payment = await this.prisma.payment.findUnique({
            where: { stripePaymentIntentId: intent.id },
            select: { id: true, conversationId: true },
        });

        await this.prisma.payment.updateMany({
            where: { stripePaymentIntentId: intent.id },
            data: {
                status: 'SUCCEEDED',
                paidAt: new Date(),
                stripeChargeId: typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id,
                failureReason: null,
            },
        });

        if (payment?.conversationId) {
            await this.prisma.conversation.update({
                where: { id: payment.conversationId },
                data: { status: 'active' },
            }).catch((error) => {
                this.logger.warn(`Failed to activate paid conversation ${payment.conversationId}: ${error?.message || error}`);
            });
        }
    }

    private async markIntentFailed(intent: any) {
        await this.prisma.payment.updateMany({
            where: { stripePaymentIntentId: intent.id },
            data: {
                status: 'FAILED',
                failureReason: intent.last_payment_error?.message || 'Payment failed',
            },
        });
    }

    private async markIntentCancelled(intent: any) {
        await this.prisma.payment.updateMany({
            where: { stripePaymentIntentId: intent.id },
            data: {
                status: 'CANCELLED',
                failureReason: intent.cancellation_reason || 'Payment cancelled',
            },
        });
    }

    private async markChargeRefunded(charge: any) {
        const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (!intentId) return;
        await this.prisma.payment.updateMany({
            where: { stripePaymentIntentId: intentId },
            data: {
                status: 'REFUNDED',
                refundedAt: new Date(),
                stripeChargeId: charge.id,
            },
        });
    }
}
