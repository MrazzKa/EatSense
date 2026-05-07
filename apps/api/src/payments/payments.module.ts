import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * Stripe-backed expert offer payments. Disabled unless STRIPE_ENABLED=true and
 * STRIPE_SECRET_KEY are set, so the Coming Soon experts surface stays inert.
 */
@Module({
    imports: [PrismaModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
