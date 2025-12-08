import { Module } from '@nestjs/common';
import { VisionService } from './vision.service';
import { PortionService } from './portion.service';
import { AnalyzeService } from './analyze.service';
import { FoodLocalizationService } from './food-localization.service';
import { HiddenIngredientsService } from './hidden-ingredients.service';
import { HybridModule } from '../fdc/hybrid/hybrid.module';
import { PrismaModule } from '../../prisma.module';
import { CacheModule } from '../cache/cache.module';
import { NutritionModule } from './providers/nutrition.module';

@Module({
  imports: [HybridModule, PrismaModule, CacheModule, NutritionModule],
  providers: [VisionService, PortionService, FoodLocalizationService, HiddenIngredientsService, AnalyzeService],
  exports: [AnalyzeService, VisionService],
})
export class AnalysisModule {}

