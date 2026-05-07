import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * Foundation module for Stripe-backed expert offer payments.
 *
 * MVP runs with all offers FREE; this module activates only when
 * STRIPE_ENABLED=true and STRIPE_SECRET_KEY are set in env. Otherwise
 * endpoints respond with 500 "not enabled" so accidental calls are obvious.
 *
 * To wire the actual Stripe SDK:
 *   1. `pnpm --filter eatsense-api add stripe`
 *   2. Replace TODO blocks in payments.service.ts (createIntentForOffer + handleWebhook).
 *   3. Add Payment Prisma model + migration (see comments in service file).
 *   4. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_ENABLED in Railway env.
 *   5. In main.ts, configure raw body parser for `/payments/webhook` only.
 */
@Module({
    imports: [PrismaModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
