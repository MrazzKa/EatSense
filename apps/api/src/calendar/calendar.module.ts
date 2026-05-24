import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailerModule } from '../../mailer/mailer.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarScheduler } from './calendar.scheduler';

@Module({
  imports: [PrismaModule, ScheduleModule, NotificationsModule, MailerModule],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarScheduler],
  exports: [CalendarService],
})
export class CalendarModule {}
