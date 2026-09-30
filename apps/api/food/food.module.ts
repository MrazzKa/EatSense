import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FoodController } from './food.controller';
import { FoodService } from './food.service';
import { FridgeController } from './fridge.controller';
import { FridgeService } from './fridge.service';
import { BarcodeController } from './barcode.controller';
import { BarcodeService } from './barcode.service';
// NOTE: FoodAnalyzerModule removed - was dead code (injected but never called)
// All food analysis now uses AnalysisModule (AnalyzeService + VisionService)
import { AnalysisModule } from '../src/analysis/analysis.module';
import { NutritionModule } from '../src/analysis/providers/nutrition.module';
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
    NutritionModule,
    RedisModule,
    LimitsModule,
    MealsModule,
    MediaModule,
  ],
  controllers: [FoodController, FridgeController, BarcodeController],
  providers: [FoodService, FridgeService, BarcodeService],
  exports: [FoodService],
})
export class FoodModule {}
