import { Body, Controller, Get, Headers, Param, Post, Request, UnauthorizedException, UseGuards, RawBodyRequest, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

class CreateOfferIntentDto {
    @IsString()
    @IsNotEmpty()
    offerId!: string;

    @IsString()
    @IsNotEmpty()
    conversationId!: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('expert-offer/intent')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a Stripe payment intent for a paid expert offer' })
    async createOfferIntent(@Request() req: any, @Body() body: CreateOfferIntentDto) {
        return this.paymentsService.createIntentForOffer({
            userId: req.user.id,
            offerId: body.offerId,
            conversationId: body.conversationId,
        });
    }

    /**
     * Stripe webhook. No JwtAuthGuard — verification is via Stripe-Signature header.
     * Body must be raw (configured in main.ts via app.use bodyParser.raw for this path).
     */
    @Post('webhook')
    @ApiOperation({ summary: 'Stripe webhook receiver' })
    async webhook(@Req() req: RawBodyRequest<any>, @Headers('stripe-signature') signature?: string) {
        const raw = req.rawBody || (req.body as Buffer);
        return this.paymentsService.handleWebhook(raw, signature);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a payment by id' })
    async getPayment(@Request() req: any, @Param('id') id: string) {
        return this.paymentsService.getPayment(id, req.user.id);
    }

    @Post('admin/refund/:id')
    @ApiOperation({ summary: 'Admin: refund a payment (requires x-admin-secret)' })
    async adminRefund(@Param('id') id: string, @Headers('x-admin-secret') adminSecret: string, @Body() body: any) {
        if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
            throw new UnauthorizedException();
        }
        return this.paymentsService.adminRefund(id, { reason: body?.reason, amount: body?.amount });
    }

    @Post('connect/onboarding-link')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create Stripe Connect Express onboarding link for the current expert' })
    async connectOnboarding(@Request() req: any) {
        return this.paymentsService.createConnectOnboardingLink(req.user.id);
    }

    @Get('connect/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get Stripe Connect status for the current expert' })
    async connectStatus(@Request() req: any) {
        return this.paymentsService.getConnectStatus(req.user.id);
    }
}
