import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { CommunityAdminController } from './community-admin.controller';
import { CommunityPublicController } from './community-public.controller';
import { PrismaModule } from '../../prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailerModule } from '../../mailer/mailer.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule, NotificationsModule, MailerModule],
  providers: [CommunityService],
  controllers: [CommunityController, CommunityAdminController, CommunityPublicController],
  exports: [CommunityService],
})
export class CommunityModule {}
