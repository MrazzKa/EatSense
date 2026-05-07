import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { CommunityAdminController } from './community-admin.controller';
import { PrismaModule } from '../../prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule, NotificationsModule],
  providers: [CommunityService],
  controllers: [CommunityController, CommunityAdminController],
  exports: [CommunityService],
})
export class CommunityModule {}
