import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  INutritionProvider,
  NutritionLookupContext,
  NutritionProviderResult,
  CanonicalFood,
} from './nutrition-provider.interface';
import { CacheService } from '../../cache/cache.service';
import { LocalFoodService } from './local-food.service';
import { nameMatchScore, MATCH_THRESHOLDS, validateMatch } from '../utils/name-match';

export const NUTRITION_PROVIDERS = 'NUTRITION_PROVIDERS';

// Version for cache key - increment when validation logic or providers change
const NUTRITION_CACHE_VERSION = 'v7_2026-01-10_speed_optimization';

// Per-provider timeout configuration (ms)
// FIX 5: Further increased USDA timeout (2026-01-19) - 2500ms still timing out
const PROVIDER_TIMEOUTS: Record<string, number> = {
  'local': 500,           // Local embeddings - fast
  'swiss-food': 1500,     // Swiss API
  'openfoodfacts': 3000,  // OFF
  'usda': 3500,           // USDA - increased from 2500 (still timing out)
  'rag': 2000,            // RAG
};
const DEFAULT_PROVIDER_TIMEOUT = 3000;

export interface NutritionCacheKeyInput {
  normalizedName: string;
  locale: string;
  portionGrams?: number;
}

@Injectable()
export class NutritionOrchestrator {
  private readonly logger = new Logger(NutritionOrchestrator.name);

  constructor(
    @Inject(NUTRITION_PROVIDERS)
    private readonly providers: INutritionProvider[],
    private readonly cacheService: CacheService,
    private readonly localFoodService: LocalFoodService,
  ) { }

  /**
   * Determine region from locale if not provided in context
   * 
   * Priority:
   * 1. Explicit context.region
   * 2. Locale-based mapping (de-CH, fr-CH, it-CH → CH; en-US → US)
   * 3. Default: EU
   * 
   * TODO: Get from user profile preferences (user.region field)
   */
  private determineRegion(context: NutritionLookupContext): 'US' | 'CH' | 'EU' | 'OTHER' {
    if (context.region) {
      return context.region;
    }

    // Map locale to region
    // TODO: Get from user profile preferences
    const locale = context.locale || 'en';

    // Swiss locales: de-CH, fr-CH, it-CH → CH
    // For now, we only have 'en', 'ru', 'kk' in context.locale
    // In future, if we have full locale strings like 'de-CH', parse them:
    // if (locale.includes('-CH')) return 'CH';

    // US locale: en-US → US
    // For now, simple mapping: en -> US (default)
    if (locale === 'en') {
      return 'US';
    }

    // Default: EU
    return 'EU';
  }

  /**
   * Sort providers by priority for given region
   */
  private async sortProviders(context: NutritionLookupContext): Promise<INutritionProvider[]> {
    const region = this.determineRegion(context);
    const contextWithRegion = { ...context, region };

    const available: Array<{ provider: INutritionProvider; priority: number }> = [];

    for (const provider of this.providers) {
      const isAvail = await provider.isAvailable(contextWithRegion);
      if (isAvail) {
        const priority = provider.getPriority(contextWithRegion);
        available.push({ provider, priority });
      }
    }

    return available
      .sort((a, b) => b.priority - a.priority)
      .map((item) => item.provider);
  }

  /**
   * Validate nutrition result for suspicious values
   * Enhanced with product-specific validation ranges and category-based filtering
   */
  private validateResult(
    result: NutritionProviderResult,
    context: NutritionLookupContext,
  ): { isValid: boolean; isSuspicious: boolean; reason?: string } {
    if (!result.food) {
      return { isValid: false, isSuspicious: false };
    }

    const { per100g, category, displayName } = result.food;
    const calories = per100g.calories ?? 0;
    const kcalPer100 = calories;
    const nameLower = (displayName || '').toLowerCase();
    const queryLower = (context.originalQuery || '').toLowerCase();

    // =====================================================
    // NON-FOOD FILTERING: Reject obvious non-food items
    // Fixes: "olive oil" → "motor oil" bug from USDA branded products
    // =====================================================
    const nonFoodKeywords = [
      'motor oil', 'engine oil', 'synthetic oil', '5w-30', '10w-40', '5w-40',
      'lubricant', 'grease', 'antifreeze', 'coolant',
      'soap', 'detergent', 'shampoo', 'conditioner', 'lotion', 'cream',
      'paint', 'glue', 'adhesive', 'solvent', 'cleaner',
      'pet food', 'dog food', 'cat food', 'bird seed', 'fish food',
      'supplement', 'vitamin', 'pill', 'capsule', 'tablet',
      'fertilizer', 'pesticide', 'herbicide',
    ];

    const isNonFood = nonFoodKeywords.some(kw => nameLower.includes(kw));
    if (isNonFood) {
      this.logger.warn(
        `[Orchestrator] Rejected non-food item: "${context.originalQuery}" → "${displayName}"`,
      );
      return {
        isValid: false,
        isSuspicious: true,
        reason: `non_food_item: result "${displayName}" is not a food item`,
      };
    }

    // =====================================================
    // BRANDED COMPOUND PRODUCT FILTERING
    // Fixes: "dill" → "Philadelphia Räucherlachs mit Dill" bug
    // When query is a simple ingredient but result is a branded product
    // containing that ingredient, reject it.
    // =====================================================
    const knownBrands = [
      'philadelphia', 'kraft', 'heinz', 'nestle', 'danone', 'kellogg',
      'mccain', 'birds eye', 'dr. oetker', 'knorr', 'maggi', 'barilla',
      'hellmann', 'unilever', 'pringles', 'lay', 'doritos', 'ruffles',
      'oreo', 'chips ahoy', 'ritz', 'triscuit', 'wheat thins',
    ];

    const isSimpleIngredientQuery = queryLower.split(/\s+/).length <= 2 &&
      !knownBrands.some(brand => queryLower.includes(brand));

    const resultHasBrand = knownBrands.some(brand => nameLower.includes(brand));
    const resultIsCompound = nameLower.includes(' with ') ||
      nameLower.includes(' und ') ||
      nameLower.includes(' mit ') ||
      nameLower.includes(' and ') ||
      nameLower.includes(' cream ') ||
      nameLower.includes(' sauce') ||
      nameLower.includes(' dip') ||
      nameLower.includes(' spread');

    if (isSimpleIngredientQuery && (resultHasBrand || resultIsCompound)) {
      // Check if query word appears but is NOT the primary food
      const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 2);
      const resultTokens = nameLower.split(/\s+/).filter(t => t.length > 2);

      // If query is a single token and result starts with a different word, it's likely wrong
      if (queryTokens.length === 1 && resultTokens.length > 0) {
        const queryToken = queryTokens[0];
        const firstResultToken = resultTokens[0];

        // If result doesn't start with query token, and result has brand/compound, reject
        if (firstResultToken !== queryToken && (resultHasBrand || resultIsCompound)) {
          this.logger.warn(
            `[Orchestrator] Rejected branded/compound product: "${context.originalQuery}" → "${displayName}"`,
          );
          return {
            isValid: false,
            isSuspicious: true,
            reason: `branded_compound_mismatch: simple ingredient "${queryLower}" matched compound product "${displayName}"`,
          };
        }
      }
    }
    // =====================================================
    // CATEGORY-BASED CALORIE VALIDATION (FIX 4)
    // Fixes: Cauliflower (25kcal) -> Roasted/Fried (180kcal) issues
    // =====================================================
    const expectedCategory = context.categoryHint;

    // Vegetables: 10-80 kcal/100g (raw), max 150 for roasted/cooked
    if (expectedCategory === 'veg' || expectedCategory === 'vegetable') {
      if (kcalPer100 > 150) {
        return {
          isValid: false,
          isSuspicious: true, // Treat as suspicious to trigger fallback
          reason: `vegetable_kcal_too_high: ${kcalPer100} kcal/100g (max 150 for veg)`,
        };
      }
    }

    // Fruits: 20-100 kcal/100g (most), max 250 for dried/avocado
    if (expectedCategory === 'fruit') {
      // Avocado is special - high fat fruit
      const isAvocado = nameLower.includes('avocado') || nameLower.includes('авокадо');

      if (isAvocado) {
        // Avocado: 160-180 kcal/100g. If < 140 or > 220, likely wrong
        if (kcalPer100 < 130 || kcalPer100 > 230) {
          return {
            isValid: false,
            isSuspicious: true,
            reason: `avocado_kcal_invalid: ${kcalPer100} kcal/100g (expected ~160)`,
          };
        }
      } else {
        // Normal fruit
        if (kcalPer100 > 150 && !nameLower.includes('dried') && !nameLower.includes('dry') && !nameLower.includes('сушен')) {
          return {
            isValid: false,
            isSuspicious: true,
            reason: `fruit_kcal_too_high: ${kcalPer100} kcal/100g (max 150 for fresh fruit)`,
          };
        }
      }
    }

    // Cooked grains (quinoa, rice): 100-150 kcal/100g (water absorbed)
    // Rejects raw grain vales (350+ kcal) when we want cooked
    if (expectedCategory === 'grain') {
      const isCookedQuery = queryLower.includes('cooked') || queryLower.includes('варён') ||
        queryLower.includes('boiled') || queryLower.includes('отварн');
      const isSpecificGrain = nameLower.includes('quinoa') || nameLower.includes('киноа') ||
        nameLower.includes('rice') || nameLower.includes('рис') ||
        nameLower.includes('buckwheat') || nameLower.includes('греч');

      if ((isCookedQuery || isSpecificGrain) && kcalPer100 > 250) {
        return {
          isValid: false,
          isSuspicious: true,
          reason: `cooked_grain_kcal_too_high: ${kcalPer100} kcal/100g (expected <250 for cooked)`,
        };
      }
    }

    // =====================================================
    // CATEGORY-BASED FILTERING: Reject obvious mismatches
    // Fixes: "corn cooked" → "Oil, corn" bug
    // =====================================================
    if (context.categoryHint) {
      const isOilResult = nameLower.includes('oil') || nameLower.includes('масло') ||
        nameLower.startsWith('oil,') || nameLower.includes(' oil,');
      const isVegCategory = context.categoryHint === 'veg' || context.categoryHint === 'vegetable';
      const isGrainCategory = context.categoryHint === 'grain';
      const isLegumeCategory = context.categoryHint === 'legume';

      // If query is for vegetable/grain/legume but result is oil - reject
      if ((isVegCategory || isGrainCategory || isLegumeCategory) && isOilResult) {
        // Only reject if query doesn't explicitly mention oil
        if (!queryLower.includes('oil') && !queryLower.includes('масло')) {
          this.logger.warn(
            `[Orchestrator] Rejected oil match for ${context.categoryHint} query: "${context.originalQuery}" → "${displayName}"`,
          );
          return {
            isValid: false,
            isSuspicious: true,
            reason: `category_mismatch: oil result for ${context.categoryHint} query`,
          };
        }
      }

      // If query is for vegetable but result is clearly a prepared meal - reject
      const isMealResult = nameLower.includes('meal') || nameLower.includes('dinner') ||
        nameLower.includes('lunch') || nameLower.includes('breakfast') ||
        nameLower.includes('frozen') || nameLower.includes('ready');

      if (isVegCategory && isMealResult && !queryLower.includes('meal')) {
        this.logger.warn(
          `[Orchestrator] Rejected meal match for vegetable query: "${context.originalQuery}" → "${displayName}"`,
        );
        return {
          isValid: false,
          isSuspicious: true,
          reason: `category_mismatch: meal result for vegetable query`,
        };
      }
    }

    // Product-specific validation for common foods with known calorie ranges
    const productValidation = this.validateProductSpecificCalories(nameLower, kcalPer100);
    if (productValidation) {
      return productValidation;
    }

    // Validation for drinks
    if (category === 'drink') {
      if (kcalPer100 > 150) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `drink_kcal_too_high: ${kcalPer100} kcal/100ml`,
        };
      }
      if (kcalPer100 < 0) {
        return {
          isValid: false,
          isSuspicious: true,
          reason: 'drink_kcal_negative',
        };
      }
    }

    // Validation for solids
    if (category === 'solid') {
      if (kcalPer100 < 5 || kcalPer100 > 900) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `solid_kcal_out_of_range: ${kcalPer100} kcal/100g`,
        };
      }

      // Check macro-kcal mismatch
      const protein = per100g.protein ?? 0;
      const carbs = per100g.carbs ?? 0;
      const fat = per100g.fat ?? 0;
      const calculatedKcal = protein * 4 + carbs * 4 + fat * 9;
      const kcalDiff = Math.abs(calculatedKcal - calories);

      if (calories > 0 && kcalDiff > Math.max(50, calories * 0.25)) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `macro_kcal_mismatch: calculated=${calculatedKcal}, reported=${calories}`,
        };
      }
    }

    // Name-match validation for ingredient mode (with must-tokens)
    const originalQuery = context.originalQuery;
    if (originalQuery && context.mode === 'ingredient') {
      const validation = validateMatch(originalQuery, displayName, 'ingredient');

      if (!validation.isValid) {
        return {
          isValid: false,
          isSuspicious: true,
          reason: `name_mismatch: ${validation.reason || 'validation failed'}`,
        };
      }

      if (validation.isSuspicious) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `weak_name_match: score=${validation.matchScore.toFixed(2)}, mustTokens=${validation.mustTokensHit}`,
        };
      }
    }

    return { isValid: true, isSuspicious: false };
  }

  /**
   * Validate calories for specific products with known ranges
   * Returns validation result if product matches, null otherwise
   */
  private validateProductSpecificCalories(
    nameLower: string,
    kcalPer100: number,
  ): { isValid: boolean; isSuspicious: boolean; reason?: string } | null {
    // Vegetables (low calorie)
    if (nameLower.includes('свёкл') || nameLower.includes('beet') || nameLower.includes('beetroot')) {
      if (kcalPer100 < 20 || kcalPer100 > 50) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `beetroot_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 26-43)`,
        };
      }
    }

    if (nameLower.includes('морков') || nameLower.includes('carrot')) {
      if (kcalPer100 < 30 || kcalPer100 > 45) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `carrot_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 32-41)`,
        };
      }
    }

    if (nameLower.includes('огурец') || nameLower.includes('cucumber')) {
      if (kcalPer100 < 10 || kcalPer100 > 20) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `cucumber_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 12-16)`,
        };
      }
    }

    if (nameLower.includes('помидор') || nameLower.includes('томат') || nameLower.includes('tomato')) {
      if (kcalPer100 < 15 || kcalPer100 > 25) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `tomato_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 18-20)`,
        };
      }
    }

    if (nameLower.includes('капуст') || nameLower.includes('cabbage')) {
      if (kcalPer100 < 20 || kcalPer100 > 30) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `cabbage_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 25)`,
        };
      }
    }

    // Брокколи: 28-35 ккал/100г
    if (nameLower.includes('брокколи') || nameLower.includes('broccoli')) {
      if (kcalPer100 < 20 || kcalPer100 > 50) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `broccoli_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 28-35)`,
        };
      }
    }

    // Цветная капуста: 25-30 ккал/100г
    if (nameLower.includes('цветная капуста') || nameLower.includes('cauliflower')) {
      if (kcalPer100 < 15 || kcalPer100 > 45) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `cauliflower_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 25-30)`,
        };
      }
    }

    // Кабачок: 17-25 ккал/100г
    if (nameLower.includes('кабачок') || nameLower.includes('zucchini') || nameLower.includes('courgette')) {
      if (kcalPer100 < 10 || kcalPer100 > 40) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `zucchini_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 17-25)`,
        };
      }
    }

    // Шпинат: 20-25 ккал/100г
    if (nameLower.includes('шпинат') || nameLower.includes('spinach')) {
      if (kcalPer100 < 15 || kcalPer100 > 35) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `spinach_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 20-25)`,
        };
      }
    }

    // Стручковая фасоль: 30-35 ккал/100г
    if (nameLower.includes('стручковая фасоль') || nameLower.includes('green beans') || nameLower.includes('string beans')) {
      if (kcalPer100 < 20 || kcalPer100 > 50) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `green_beans_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 30-35)`,
        };
      }
    }

    // Горошек зелёный: 70-85 ккал/100г
    if (nameLower.includes('горошек') || nameLower.includes('горох') || nameLower.includes('peas') || nameLower.includes('green peas')) {
      if (kcalPer100 < 50 || kcalPer100 > 100) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `peas_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 70-85)`,
        };
      }
    }

    // Баклажан: 24-28 ккал/100г
    if (nameLower.includes('баклажан') || nameLower.includes('eggplant') || nameLower.includes('aubergine')) {
      if (kcalPer100 < 15 || kcalPer100 > 40) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `eggplant_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 24-28)`,
        };
      }
    }

    // Перец болгарский: 26-32 ккал/100г
    if (nameLower.includes('перец') || nameLower.includes('pepper') || nameLower.includes('bell pepper')) {
      if (kcalPer100 < 15 || kcalPer100 > 45) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `pepper_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 26-32)`,
        };
      }
    }


    if (nameLower.includes('яблок') || nameLower.includes('apple')) {
      if (kcalPer100 < 45 || kcalPer100 > 60) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `apple_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 52)`,
        };
      }
    }

    if (nameLower.includes('банан') || nameLower.includes('banana')) {
      if (kcalPer100 < 85 || kcalPer100 > 100) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `banana_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 89-93)`,
        };
      }
    }

    // Grains
    if (nameLower.includes('рис') || nameLower.includes('rice')) {
      if (kcalPer100 < 120 || kcalPer100 > 140) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `rice_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 130)`,
        };
      }
    }

    if (nameLower.includes('гречк') || nameLower.includes('buckwheat')) {
      if (kcalPer100 < 300 || kcalPer100 > 350) {
        return {
          isValid: true,
          isSuspicious: true,
          reason: `buckwheat_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 343)`,
        };
      }
    }

    // =====================================================
    // OILS/FATS SANITY CHECK: Must be 700-950 kcal/100g
    // Fixes: "масло 15г = 5 ккал" bug
    // =====================================================
    const isOil = nameLower.includes('oil') || nameLower.includes('масло') ||
      nameLower.includes('butter') || nameLower.includes('сливочное') ||
      nameLower.includes('margarine') || nameLower.includes('маргарин') ||
      nameLower.includes('lard') || nameLower.includes('сало') ||
      nameLower.includes('ghee') || nameLower.includes('топлёное');

    if (isOil) {
      // Pure oils: 800-900 kcal/100g, butter: ~717 kcal/100g, allow 650-950 range
      if (kcalPer100 < 650 || kcalPer100 > 950) {
        return {
          isValid: false,
          isSuspicious: true,
          reason: `oil_fat_kcal_invalid: ${kcalPer100} kcal/100g (expected 650-950 for oils/fats)`,
        };
      }
    }

    // Corn validation - but NOT if it's oil
    // Cooked corn: 86-100 kcal/100g, NOT oil (800+ kcal)
    if ((nameLower.includes('corn') || nameLower.includes('кукуруз')) && !isOil) {
      // Cooked corn / canned corn
      if (nameLower.includes('cooked') || nameLower.includes('варён') ||
        nameLower.includes('canned') || nameLower.includes('консерв')) {
        if (kcalPer100 < 70 || kcalPer100 > 130) {
          return {
            isValid: true,
            isSuspicious: true,
            reason: `cooked_corn_kcal_out_of_range: ${kcalPer100} kcal/100g (expected 86-100)`,
          };
        }
      }
    }

    return null; // No specific validation matched
  }

  /**
   * Build cache key for nutrition lookup - includes version for invalidation
   */
  private buildNutritionCacheKey(input: NutritionCacheKeyInput): string {
    const { normalizedName, locale, portionGrams } = input;
    const namespace = 'nutrition:lookup';
    const base = normalizedName.trim().toLowerCase();
    const portionPart = portionGrams ? `:${Math.round(portionGrams)}` : '';
    return `${namespace}:${NUTRITION_CACHE_VERSION}:${base}:${locale}${portionPart}`;
  }

  /**
   * Get default confidence score for a provider when not provided
   */
  private getDefaultConfidence(providerId: string): number {
    const defaults: Record<string, number> = {
      'usda': 0.78,
      'swiss-food': 0.80,
      'openfoodfacts': 0.60,
      'local': 0.95,
    };
    return defaults[providerId] ?? 0.65;
  }

  /**
   * Extract confidence score from provider result
   */
  private extractConfidenceScore(data: any, provider: string): number | undefined {
    // Simple heuristic: if provider returns score or matchConfidence, use it
    if (provider === 'openfoodfacts' && typeof data?.score === 'number') {
      return data.score / 100; // Normalize to 0-1 if needed
    }
    if (typeof data?.matchConfidence === 'number') {
      return data.matchConfidence;
    }
    if (typeof data?.confidence === 'number') {
      return data.confidence;
    }
    return undefined;
  }

  /**
   * Wrap provider call with error handling
   */
  private async wrapProviderCall(
    provider: INutritionProvider,
    fn: () => Promise<NutritionProviderResult | null>,
  ): Promise<{ providerId: string; result: NutritionProviderResult | null; error: any }> {
    try {
      const result = await fn();
      return {
        providerId: provider.id,
        result,
        error: null,
      };
    } catch (e: any) {
      this.logger.warn(
        `[Orchestrator] Error in provider=${provider.id}: ${e.message}`,
      );
      return {
        providerId: provider.id,
        result: null,
        error: e.message,
      };
    }
  }

  /**
   * FAST PATH: Parallel provider queries with first-win strategy
   * Returns as soon as ANY provider returns valid result
   * 
   * @performance Expected: 2-3s instead of 5-15s sequential
   */
  async findNutritionFast(
    query: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    const startTime = Date.now();

    // 1. Check cache first
    const cacheKey = this.buildNutritionCacheKey({
      normalizedName: query.toLowerCase().trim(),
      locale: context.locale || 'en',
    });

    const cached = await this.cacheService.get<NutritionProviderResult>(cacheKey, 'nutrition:lookup');
    if (cached) {
      this.logger.debug(`[Orchestrator] Cache HIT for "${query}" in ${Date.now() - startTime}ms`);
      return cached;
    }

    // 2. Get sorted providers
    const contextWithRegion = {
      ...context,
      region: this.determineRegion(context),
    };
    const sortedProviders = await this.sortProviders(contextWithRegion);

    if (sortedProviders.length === 0) {
      this.logger.warn(`[Orchestrator] No providers available for context`);
      return null;
    }

    this.logger.debug(`[Orchestrator] Starting parallel query for "${query}" with ${sortedProviders.length} providers`);

    // 3. Create promises for all providers with individual timeouts
    const providerPromises = sortedProviders.map(async (provider) => {
      const timeout = PROVIDER_TIMEOUTS[provider.id] || DEFAULT_PROVIDER_TIMEOUT;
      const providerStart = Date.now();

      try {
        // Race between provider call and timeout
        const result = await Promise.race([
          this.wrapProviderCall(provider, () => provider.findByText(query, contextWithRegion)),
          new Promise<{ providerId: string; result: null; error: string }>((resolve) =>
            setTimeout(() => resolve({
              providerId: provider.id,
              result: null,
              error: `timeout after ${timeout}ms`
            }), timeout)
          )
        ]);

        const duration = Date.now() - providerStart;

        // Validate result
        if (result?.result) {
          const validation = this.validateResult(result.result, contextWithRegion);
          if (validation.isValid) {
            this.logger.log(`[Orchestrator] ✓ ${provider.id} returned valid result in ${duration}ms`);
            return result.result;
          } else {
            this.logger.debug(`[Orchestrator] ✗ ${provider.id} result invalid: ${validation.reason}`);
          }
        } else if (result?.error) {
          this.logger.debug(`[Orchestrator] ✗ ${provider.id}: ${result.error}`);
        }

        // Reject to let Promise.any continue to next
        throw new Error(`Provider ${provider.id} failed or invalid`);

      } catch (error: any) {
        this.logger.debug(`[Orchestrator] ✗ ${provider.id} error: ${error.message}`);
        throw error;
      }
    });

    // 4. Promise.any - returns FIRST successful result
    try {
      const firstValid = await (Promise as any).any(providerPromises);
      const totalDuration = Date.now() - startTime;

      this.logger.log(`[Orchestrator] Fast path: got result in ${totalDuration}ms`);

      // Cache the result
      await this.cacheService.set(cacheKey, firstValid, 'nutrition:lookup'); // 3 days default

      return firstValid;
    } catch (aggregateError) {
      // All providers failed
      const totalDuration = Date.now() - startTime;
      this.logger.warn(`[Orchestrator] All ${sortedProviders.length} providers failed for "${query}" in ${totalDuration}ms`);
      return null;
    }
  }

  /**
   * Find nutrition data by text query
   * Delegates to findNutritionFast for parallel provider queries
   */
  async findNutrition(
    query: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    // Use fast parallel path with first-win strategy
    return this.findNutritionFast(query, context);
  }

  /**
   * Find nutrition data by barcode
   * P2: Optimized with parallel provider queries
   */
  async findByBarcode(
    barcode: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    if (!barcode) return null;

    const contextWithRegion = {
      ...context,
      region: this.determineRegion(context),
    };

    const sorted = await this.sortProviders(contextWithRegion);

    // Filter providers that support barcode lookup
    const barcodeProviders = sorted.filter((p) => p.getByBarcode);
    if (barcodeProviders.length === 0) {
      return null;
    }

    // P2: Launch all barcode queries in parallel
    const tasks = barcodeProviders.map(async (provider) => {
      try {
        const result = await provider.getByBarcode!(barcode, contextWithRegion);
        return {
          providerId: provider.id,
          result,
          error: null,
        };
      } catch (e: any) {
        this.logger.warn(
          `[Orchestrator] Error in provider=${provider.id} getByBarcode: ${e.message}`,
        );
        return {
          providerId: provider.id,
          result: null,
          error: e.message,
        };
      }
    });

    const responses = await Promise.allSettled(tasks);

    // Extract valid results
    const validResults: Array<{
      providerId: string;
      result: NutritionProviderResult;
      validation: { isValid: boolean; isSuspicious: boolean; reason?: string };
    }> = [];

    for (const response of responses) {
      // Handle timeout errors
      if (response.status === 'fulfilled' && response.value.error && response.value.error.includes('timed out')) {
        this.logger.warn(
          `[Orchestrator] Provider ${response.value.providerId} timed out during barcode lookup, skipping`,
        );
        continue;
      }

      if (response.status === 'fulfilled' && response.value.result && response.value.result.food) {
        const validation = this.validateResult(response.value.result, contextWithRegion);

        if (validation.isValid && !validation.isSuspicious && (response.value.result.confidence ?? 0) >= 0.7) {
          validResults.push({
            providerId: response.value.providerId,
            result: response.value.result,
            validation,
          });
        }
      }
    }

    if (validResults.length === 0) {
      return null;
    }

    // Sort by confidence, then by provider priority
    validResults.sort((a, b) => {
      const confidenceDiff = (b.result.confidence ?? 0) - (a.result.confidence ?? 0);
      if (Math.abs(confidenceDiff) > 0.01) {
        return confidenceDiff;
      }
      const aIndex = sorted.findIndex((p) => p.id === a.providerId);
      const bIndex = sorted.findIndex((p) => p.id === b.providerId);
      return aIndex - bIndex;
    });

    const best = validResults[0];
    this.logger.log(
      `[Orchestrator] Found by barcode in provider=${best.providerId} id=${best.result.food.providerFoodId} (parallel, ${validResults.length} results)`,
    );
    return {
      ...best.result,
      debug: {
        ...best.result.debug,
        providerId: best.providerId,
        parallelResults: validResults.length,
        totalProviders: barcodeProviders.length,
      },
    };
  }

  // Legacy method for backward compatibility
  async findNutritionLegacy(
    query: string,
    options: { region?: string | null; category?: 'drink' | 'solid' | 'unknown'; limit?: number } = {},
  ): Promise<any | null> {
    const context: NutritionLookupContext = {
      locale: 'en',
      region: options.region as any,
      expectedCategory: options.category,
    };

    const result = await this.findNutrition(query, context);
    if (!result || !result.food) return null;

    // Convert to legacy FoodData format
    return {
      id: result.food.providerFoodId,
      name: result.food.displayName,
      description: result.food.displayName,
      nutrients: result.food.per100g,
      portionSize: result.food.defaultPortionG || 100,
      isDrink: result.food.category === 'drink',
      source: result.food.providerId,
      metadata: result.food.meta,
    };
  }
}
