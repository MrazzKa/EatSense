import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NutritionOrchestrator, NUTRITION_PROVIDERS } from './nutrition-orchestrator.service';
import { LocalFoodService } from './local-food.service';
import { UsdaNutritionProvider } from './usda.provider';
import { HybridModule } from '../../fdc/hybrid/hybrid.module';
import { CacheModule } from '../../cache/cache.module';
import { PrismaModule } from '../../../prisma.module';
import { INutritionProvider } from './nutrition-provider.interface';

@Module({
  imports: [HttpModule, HybridModule, CacheModule, PrismaModule],
  providers: [
    NutritionOrchestrator,
    LocalFoodService,
    UsdaNutritionProvider,
    {
      provide: NUTRITION_PROVIDERS,
      useFactory: (
        usda: UsdaNutritionProvider,
      ): INutritionProvider[] => [usda],
      inject: [
        UsdaNutritionProvider,
      ],
    },
  ],
  exports: [NutritionOrchestrator],
})
export class NutritionModule {}
