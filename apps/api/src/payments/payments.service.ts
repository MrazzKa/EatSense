import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

/**
 * Foundation for Stripe-backed expert offer payments.
 *
 * MVP launches with FREE-only offers — this service exists so paid offers can be
 * wired in without a schema or routing change. The actual Stripe SDK call is
 * stubbed; flipping STRIPE_ENABLED=true and filling createIntent's `// TODO`
 * block with `stripe.paymentIntents.create({...})` is the next step.
 */
@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(private readonly prisma: PrismaService) { }

    private get isEnabled(): boolean {
        return process.env.STRIPE_ENABLED === 'true' && Boolean(process.env.STRIPE_SECRET_KEY);
    }

    /**
     * Create a payment intent for a paid expert offer. Caller must already have
     * a Conversation with the expert (so we can attribute the payment).
     *
     * Returns: { clientSecret, paymentId } on success, or throws.
     */
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
        if (!offer.priceAmount || offer.priceAmount <= 0) {
            throw new BadRequestException('Offer has no price set.');
        }

        const conversation = await this.prisma.conversation.findUnique({
            where: { id: params.conversationId },
        });
        if (!conversation || conversation.clientId !== params.userId) {
            throw new BadRequestException('Conversation not found or not owned by user.');
        }

        // TODO(stripe): replace this stub with real Stripe SDK once API key is set.
        //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
        //   const intent = await stripe.paymentIntents.create({
        //     amount: Math.round(offer.priceAmount * 100),
        //     currency: (offer.currency || 'USD').toLowerCase(),
        //     metadata: { offerId: offer.id, conversationId, userId: params.userId, expertId: offer.expertId },
        //   });
        //   const clientSecret = intent.client_secret!;
        //   const stripePaymentIntentId = intent.id;
        // For now we throw so callers don't accidentally rely on this path until wired.
        throw new InternalServerErrorException(
            'Stripe SDK not wired yet. Replace the TODO block in payments.service.ts to enable.',
        );

        // Once wired, persist a Payment row so we can reconcile via webhook:
        //
        // const payment = await this.prisma.payment.create({
        //     data: {
        //         userId: params.userId,
        //         offerId: offer.id,
        //         conversationId: params.conversationId,
        //         amount: offer.priceAmount,
        //         currency: offer.currency || 'USD',
        //         status: 'PENDING',
        //         stripePaymentIntentId,
        //     },
        // });
        // return { clientSecret, paymentId: payment.id };
    }

    /**
     * Stripe webhook entry. Signature verification + idempotent state transitions
     * (PENDING → SUCCEEDED / FAILED / REFUNDED) live here.
     */
    async handleWebhook(rawBody: Buffer, signatureHeader: string | undefined): Promise<{ received: boolean }> {
        if (!this.isEnabled) {
            this.logger.warn('Stripe webhook received but payments are disabled — ignoring.');
            return { received: true };
        }
        if (!signatureHeader) {
            throw new BadRequestException('Missing Stripe-Signature header');
        }

        // TODO(stripe): verify signature + dispatch on event type.
        //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
        //   const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, process.env.STRIPE_WEBHOOK_SECRET!);
        //   switch (event.type) {
        //     case 'payment_intent.succeeded': await this.markSucceeded(event.data.object as any); break;
        //     case 'payment_intent.payment_failed': await this.markFailed(event.data.object as any); break;
        //     case 'charge.refunded': await this.markRefunded(event.data.object as any); break;
        //   }

        this.logger.log('Stripe webhook stub received — wire SDK to process events.');
        return { received: true };
    }

    async getPayment(paymentId: string, userId: string) {
        // Once Payment model is migrated, replace with prisma.payment.findUnique.
        // Stubbed so the controller compiles and routes register cleanly.
        this.logger.warn(`getPayment stub: ${paymentId} for ${userId}`);
        return null;
    }
}
