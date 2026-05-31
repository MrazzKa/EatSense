import { Module } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyAdminController } from './pharmacy-admin.controller';
import { PrismaModule } from '../../prisma.module';
import { MailerModule } from '../../mailer/mailer.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, MailerModule, NotificationsModule],
  providers: [PharmacyService],
  controllers: [PharmacyController, PharmacyAdminController],
  exports: [PharmacyService],
})
export class PharmacyModule {}
