import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { DailyLimitGuard } from './daily-limit.guard';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [RedisModule],
  providers: [DailyLimitGuard, PrismaService],
  exports: [DailyLimitGuard],
})
export class LimitsModule { }
