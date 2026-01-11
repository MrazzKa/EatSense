import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FoodController } from './food.controller';
import { FoodService } from './food.service';
// NOTE: FoodAnalyzerModule removed - was dead code (injected but never called)
// All food analysis now uses AnalysisModule (AnalyzeService + VisionService)
import { AnalysisModule } from '../src/analysis/analysis.module';
import { PrismaModule } from '../prisma.module';
import { RedisModule } from '../redis/redis.module';
import { LimitsModule } from '../limits/limits.module';
import { MealsModule } from '../meals/meals.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'food-analysis',
    }),
    // FoodAnalyzerModule removed - dead code, replaced by AnalysisModule
    AnalysisModule,
    RedisModule,
    LimitsModule,
    MealsModule,
    MediaModule,
  ],
  controllers: [FoodController],
  providers: [FoodService],
  exports: [FoodService],
})
export class FoodModule {}
