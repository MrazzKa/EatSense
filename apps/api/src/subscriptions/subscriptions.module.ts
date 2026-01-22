import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { AppleReceiptService } from './apple-receipt.service';
import { GeoModule } from '../geo/geo.module';

@Module({
    imports: [GeoModule],
    controllers: [SubscriptionsController],
    providers: [SubscriptionsService, AppleReceiptService],
    exports: [SubscriptionsService, AppleReceiptService],
})
export class SubscriptionsModule { }

