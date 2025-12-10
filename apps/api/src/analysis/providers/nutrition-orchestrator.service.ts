import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  INutritionProvider,
  NutritionLookupContext,
  NutritionProviderResult,
  CanonicalFood,
} from './nutrition-provider.interface';
import { CacheService } from '../../cache/cache.service';

export const NUTRITION_PROVIDERS = 'NUTRITION_PROVIDERS';

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
  ) {}

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
   */
  private validateResult(
    result: NutritionProviderResult,
    context: NutritionLookupContext,
  ): { isValid: boolean; isSuspicious: boolean; reason?: string } {
    if (!result.food) {
      return { isValid: false, isSuspicious: false };
    }

    const { per100g, category } = result.food;
    const calories = per100g.calories ?? 0;
    const kcalPer100 = calories;

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

    return { isValid: true, isSuspicious: false };
  }

  /**
   * Build cache key for nutrition lookup
   */
  private buildNutritionCacheKey(input: NutritionCacheKeyInput): string {
    const { normalizedName, locale, portionGrams } = input;
    const namespace = 'nutrition:lookup';
    const base = normalizedName.trim().toLowerCase();
    const portionPart = portionGrams ? `:${Math.round(portionGrams)}` : '';
    return `${namespace}:${base}:${locale}${portionPart}`;
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

    this.logger.debug(
      `[NutritionOrchestrator] Cache miss for "${normalizedName}", querying providers in parallel...`,
    );

    const sorted = await this.sortProviders(contextWithRegion);
    if (sorted.length === 0) {
      return null;
    }

    // P2: Launch all provider queries in parallel
    const tasks = sorted.map((provider) =>
      this.wrapProviderCall(provider, () => provider.findByText(trimmed, contextWithRegion)),
    );

    // Wait for all providers to complete (or fail)
    const responses = await Promise.allSettled(tasks);
    
    // Extract valid results
    const validResults: Array<{
      providerId: string;
      result: NutritionProviderResult;
      validation: { isValid: boolean; isSuspicious: boolean; reason?: string };
    }> = [];

    for (const response of responses) {
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

    // Separate good and suspicious results
    const goodResults = validResults.filter((r) => !r.validation.isSuspicious && (r.result.confidence ?? 0) >= 0.7);
    const suspiciousResults = validResults.filter((r) => r.validation.isSuspicious);

    // Prioritize good results
    if (goodResults.length > 0) {
      // Sort by confidence (descending), then by provider priority
      goodResults.sort((a, b) => {
        const confidenceDiff = (b.result.confidence ?? 0) - (a.result.confidence ?? 0);
        if (Math.abs(confidenceDiff) > 0.01) {
          return confidenceDiff;
        }
        // If confidence is similar, prefer higher priority provider (earlier in sorted array)
        const aIndex = sorted.findIndex((p) => p.id === a.providerId);
        const bIndex = sorted.findIndex((p) => p.id === b.providerId);
        return aIndex - bIndex;
      });

      const best = goodResults[0];
      const finalResult = {
        ...best.result,
        debug: {
          ...best.result.debug,
          providerId: best.providerId,
          kcalPer100: best.result.food.per100g.calories ?? 0,
          parallelResults: goodResults.length,
          totalProviders: sorted.length,
        },
      };

      // Cache successful result (30 days default via CacheService)
      await this.cacheService.set(cacheKey, finalResult, 'nutrition:lookup').catch((err) => {
        this.logger.warn(`[NutritionOrchestrator] Failed to cache result: ${err.message}`);
      });

      this.logger.log(
        `[Orchestrator] Found by text in provider=${best.providerId} id=${best.result.food.providerFoodId} name=${best.result.food.displayName} confidence=${best.result.confidence} (parallel, ${goodResults.length} good results, cached)`,
      );
      return finalResult;
    }

    // Fallback to best suspicious result if no good results
    if (suspiciousResults.length > 0) {
      suspiciousResults.sort((a, b) => {
        const confidenceDiff = (b.result.confidence ?? 0) - (a.result.confidence ?? 0);
        if (Math.abs(confidenceDiff) > 0.01) {
          return confidenceDiff;
        }
        const aIndex = sorted.findIndex((p) => p.id === a.providerId);
        const bIndex = sorted.findIndex((p) => p.id === b.providerId);
        return aIndex - bIndex;
      });

      const best = suspiciousResults[0];
      this.logger.warn(
        `[Orchestrator] Only suspicious results found, using best from provider=${best.providerId}: ${best.validation.reason}`,
      );
      return {
        ...best.result,
        debug: {
          ...best.result.debug,
          providerId: best.providerId,
          kcalPer100: best.result.food.per100g.calories ?? 0,
          parallelResults: suspiciousResults.length,
          totalProviders: sorted.length,
        },
      };
    }

    return null;
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
