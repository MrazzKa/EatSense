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
// OPTIMIZED: Aggressive timeouts for fast analysis
const PROVIDER_TIMEOUTS: Record<string, number> = {
  'local': 100,          // Local DB - instant
  'swiss-food': 800,     // Swiss Food - fast API
  'openfoodfacts': 1500, // OFF - reduced for speed
  'usda': 2000,          // USDA - main provider
  'rag': 1500,           // RAG - backup
};
const DEFAULT_PROVIDER_TIMEOUT = 2000; // Fast fallback

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
   * Find nutrition data by text query
   * P2: Optimized with parallel provider queries and caching
   */
  async findNutrition(
    query: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    const trimmed = query?.trim();
    if (!trimmed) return null;

    const contextWithRegion = {
      ...context,
      region: this.determineRegion(context),
    };

    // Normalize query for cache key
    const normalizedName = trimmed.toLowerCase().trim();
    const cacheKey = this.buildNutritionCacheKey({
      normalizedName,
      locale: context.locale || 'en',
    });

    // Try cache first
    const cached = await this.cacheService.get<NutritionProviderResult>(cacheKey, 'nutrition:lookup');
    if (cached) {
      this.logger.debug(
        `[NutritionOrchestrator] Cache hit for "${normalizedName}" locale=${context.locale}`,
      );
      return cached;
    }

    // P4: Check local food database first (instant lookup)
    const localFood = await this.localFoodService.findLocalFood(trimmed, context.locale || 'en');
    if (localFood) {
      this.logger.debug(
        `[NutritionOrchestrator] Found in local database: "${normalizedName}"`,
      );

      const result: NutritionProviderResult = {
        food: localFood,
        confidence: 0.95, // High confidence for local foods
        isSuspicious: false,
      };

      // Cache the result
      await this.cacheService.set(cacheKey, result, 'nutrition:lookup');

      return result;
    }

    this.logger.debug(
      `[NutritionOrchestrator] Cache miss and not in local DB for "${normalizedName}", querying providers in parallel...`,
    );

    const sorted = await this.sortProviders(contextWithRegion);
    if (sorted.length === 0) {
      return null;
    }

    // P2: Launch all provider queries in parallel with per-provider timeouts
    // Use Promise.allSettled but check for early return when a good result arrives
    const getProviderTimeout = (providerId: string): number => {
      return PROVIDER_TIMEOUTS[providerId] || DEFAULT_PROVIDER_TIMEOUT;
    };

    const tasks = sorted.map((provider) => {
      const providerTimeout = getProviderTimeout(provider.id);
      const providerCall = this.wrapProviderCall(provider, () => provider.findByText(trimmed, contextWithRegion));

      // Add timeout for each provider call
      const timeoutPromise = new Promise<{ providerId: string; result: null; error: string }>((resolve) => {
        setTimeout(() => {
          resolve({
            providerId: provider.id,
            result: null,
            error: `Provider ${provider.id} timed out after ${providerTimeout}ms`,
          });
        }, providerTimeout);
      });

      return Promise.race([providerCall, timeoutPromise]);
    });

    // Wait for all providers to complete (or fail or timeout)
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
          `[Orchestrator] Provider ${response.value.providerId} timed out, skipping`,
        );
        continue;
      }

      if (response.status === 'fulfilled' && response.value.result && response.value.result.food) {
        const validation = this.validateResult(response.value.result, contextWithRegion);

        if (validation.isValid) {
          validResults.push({
            providerId: response.value.providerId,
            result: {
              ...response.value.result,
              isSuspicious: validation.isSuspicious,
              debug: {
                ...response.value.result.debug,
                validationReason: validation.reason,
                providerId: response.value.providerId,
              },
            },
            validation,
          });
        } else {
          this.logger.debug(
            `[Orchestrator] Invalid result from provider=${response.value.providerId}: ${validation.reason}`,
          );
        }
      }
    }

    if (validResults.length === 0) {
      return null;
    }

    // Calculate effective confidence for each result (use provider default if undefined)
    const scoredResults = validResults.map(r => ({
      ...r,
      effectiveConfidence: r.result.confidence ?? this.getDefaultConfidence(r.providerId),
    }));

    // Sort by non-suspicious first, then by effective confidence, then by provider priority
    scoredResults.sort((a, b) => {
      // Non-suspicious results first
      if (a.validation.isSuspicious !== b.validation.isSuspicious) {
        return a.validation.isSuspicious ? 1 : -1;
      }
      // Then by confidence
      const confDiff = b.effectiveConfidence - a.effectiveConfidence;
      if (Math.abs(confDiff) > 0.05) {
        return confDiff;
      }
      // Tie-breaker: provider priority
      const aIndex = sorted.findIndex((p) => p.id === a.providerId);
      const bIndex = sorted.findIndex((p) => p.id === b.providerId);
      return aIndex - bIndex;
    });

    const best = scoredResults[0];
    const finalResult = {
      ...best.result,
      confidence: best.effectiveConfidence,
      isSuspicious: best.validation.isSuspicious,
      debug: {
        ...best.result.debug,
        providerId: best.providerId,
        kcalPer100: best.result.food.per100g.calories ?? 0,
        effectiveConfidence: best.effectiveConfidence,
        totalCandidates: scoredResults.length,
        totalProviders: sorted.length,
        validationReason: best.validation.reason,
      },
    };

    // Cache non-suspicious results
    if (!best.validation.isSuspicious) {
      await this.cacheService.set(cacheKey, finalResult, 'nutrition:lookup').catch((err) => {
        this.logger.warn(`[NutritionOrchestrator] Failed to cache result: ${err.message}`);
      });
    }

    // =====================================================
    // OBSERVABILITY: Structured log of nutrition lookup
    // =====================================================
    const candidatesLog = scoredResults.slice(0, 3).map(r => ({
      providerId: r.providerId,
      name: r.result.food.displayName,
      kcalPer100: r.result.food.per100g.calories,
      protein: r.result.food.per100g.protein,
      carbs: r.result.food.per100g.carbs,
      fat: r.result.food.per100g.fat,
      confidence: r.effectiveConfidence,
      suspicious: r.validation.isSuspicious,
      reason: r.validation.reason,
    }));

    this.logger.log(JSON.stringify({
      stage: 'nutrition_lookup',
      query: trimmed,
      locale: context.locale,
      region: contextWithRegion.region,
      cacheHit: false, // Set to true above if cache hit
      localDbHit: false, // Set to true above if local DB hit
      providersQueried: sorted.length,
      candidatesFound: validResults.length,
      candidates: candidatesLog,
      selected: {
        providerId: best.providerId,
        name: best.result.food.displayName,
        providerFoodId: best.result.food.providerFoodId,
        kcalPer100: best.result.food.per100g.calories,
        protein: best.result.food.per100g.protein,
        carbs: best.result.food.per100g.carbs,
        fat: best.result.food.per100g.fat,
        confidence: best.effectiveConfidence,
        suspicious: best.validation.isSuspicious,
        selectionReason: best.validation.reason || 'highest_confidence',
      },
    }));

    this.logger.log(
      `[Orchestrator] Best match: provider=${best.providerId}, name="${best.result.food.displayName}", conf=${best.effectiveConfidence.toFixed(2)}, suspicious=${best.validation.isSuspicious}`,
    );
    return finalResult;
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
