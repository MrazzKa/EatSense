import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NutritionOrchestrator, NUTRITION_PROVIDERS } from './nutrition-orchestrator.service';
import { UsdaNutritionProvider } from './usda.provider';
import { SwissFoodProvider } from './swiss-food.provider';
import { OpenFoodFactsProvider } from './open-food-facts.provider';
import { RagProvider } from './rag.provider';
import { EuroFirProvider } from './eurofir.provider';
import { FaoWhoReferenceProvider } from './fao-who-reference.provider';
import { HybridModule } from '../../fdc/hybrid/hybrid.module';
import { OpenFoodFactsModule } from '../../openfoodfacts/openfoodfacts.module';
import { CacheModule } from '../../cache/cache.module';
import { INutritionProvider } from './nutrition-provider.interface';

@Module({
  imports: [HttpModule, HybridModule, OpenFoodFactsModule, CacheModule],
  providers: [
    NutritionOrchestrator,
    UsdaNutritionProvider,
    SwissFoodProvider,
    OpenFoodFactsProvider,
    RagProvider,
    EuroFirProvider,
    FaoWhoReferenceProvider,
    {
      provide: NUTRITION_PROVIDERS,
      useFactory: (
        usda: UsdaNutritionProvider,
        swiss: SwissFoodProvider,
        off: OpenFoodFactsProvider,
        rag: RagProvider,
        eurofir: EuroFirProvider,
        // Note: FaoWhoReferenceProvider is NOT included - it's for reference values, not food lookup
      ): INutritionProvider[] => [usda, swiss, off, rag, eurofir],
      inject: [
        UsdaNutritionProvider,
        SwissFoodProvider,
        OpenFoodFactsProvider,
        RagProvider,
        EuroFirProvider,
      ],
    },
  ],
  exports: [NutritionOrchestrator],
})
export class NutritionModule {}

