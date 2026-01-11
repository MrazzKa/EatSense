import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FdcSchedulerService } from './fdc-scheduler.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'fdc-update',
    }),
  ],
  providers: [FdcSchedulerService],
})
export class FdcSchedulerModule {}

