import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FoodProcessor } from '../food/food.processor';
import { PrismaModule } from '../prisma.module';
// NOTE: FoodAnalyzerModule removed - was dead code (injected but never called)
// All food analysis now uses AnalysisModule (AnalyzeService + VisionService)
import { AnalysisModule } from '../src/analysis/analysis.module';
import { MealsModule } from '../meals/meals.module';
import { MediaModule } from '../media/media.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    // FoodAnalyzerModule removed - dead code, replaced by AnalysisModule
    AnalysisModule,
    MealsModule,
    MediaModule,
    RedisModule,
    BullModule.registerQueue({
      name: 'food-analysis',
    }),
  ],
  providers: [FoodProcessor],
  exports: [BullModule],
})
export class QueuesModule { }
