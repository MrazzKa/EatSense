import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { HotlineController } from './hotline.controller';
import { HotlineExpertController } from './hotline-expert.controller';
import { HotlineService } from './hotline.service';
import { HotlineAvailabilityService } from './hotline-availability.service';
import { HotlineScheduler } from './hotline.scheduler';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [HotlineController, HotlineExpertController],
  providers: [HotlineService, HotlineAvailabilityService, HotlineScheduler],
  exports: [HotlineService, HotlineAvailabilityService],
})
export class HotlineModule {}
