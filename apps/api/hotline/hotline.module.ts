import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { HotlineController } from './hotline.controller';
import { HotlineExpertController } from './hotline-expert.controller';
import { HotlineService } from './hotline.service';
import { HotlineAvailabilityService } from './hotline-availability.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [HotlineController, HotlineExpertController],
  providers: [HotlineService, HotlineAvailabilityService],
  exports: [HotlineService, HotlineAvailabilityService],
})
export class HotlineModule {}
