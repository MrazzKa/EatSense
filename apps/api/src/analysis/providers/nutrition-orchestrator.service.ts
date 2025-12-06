import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  INutritionProvider,
  NutritionLookupContext,
  NutritionProviderResult,
  CanonicalFood,
} from './nutrition-provider.interface';

export const NUTRITION_PROVIDERS = 'NUTRITION_PROVIDERS';

@Injectable()
export class NutritionOrchestrator {
  private readonly logger = new Logger(NutritionOrchestrator.name);

  constructor(
    @Inject(NUTRITION_PROVIDERS)
    private readonly providers: INutritionProvider[],
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
   * Find nutrition data by text query
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

    const sorted = await this.sortProviders(contextWithRegion);

    let bestSuspiciousResult: NutritionProviderResult | null = null;

    for (const provider of sorted) {
      try {
        const result = await provider.findByText(trimmed, contextWithRegion);

        if (!result || !result.food) {
          continue;
        }

        // Validate result
        const validation = this.validateResult(result, contextWithRegion);

        if (!validation.isValid) {
          this.logger.debug(
            `[Orchestrator] Invalid result from provider=${provider.id}: ${validation.reason}`,
          );
          continue;
        }

        // If suspicious, save but try next provider
        if (validation.isSuspicious) {
          if (!bestSuspiciousResult || (result.confidence > (bestSuspiciousResult.confidence || 0))) {
            bestSuspiciousResult = {
              ...result,
              isSuspicious: true,
              debug: {
                ...result.debug,
                validationReason: validation.reason,
                providerId: provider.id,
              },
            };
          }
          this.logger.debug(
            `[Orchestrator] Suspicious result from provider=${provider.id}: ${validation.reason}`,
          );
          continue;
        }

        // Good result found
        if (result.confidence >= 0.7) {
          this.logger.log(
            `[Orchestrator] Found by text in provider=${provider.id} id=${result.food.providerFoodId} name=${result.food.displayName} confidence=${result.confidence}`,
          );
          return {
            ...result,
            debug: {
              ...result.debug,
              providerId: provider.id,
              kcalPer100: result.food.per100g.calories ?? 0,
            },
          };
        }
      } catch (e: any) {
        this.logger.warn(
          `[Orchestrator] Error in provider=${provider.id} findByText: ${e.message}`,
        );
      }
    }

    // If no good result, return best suspicious one if available
    if (bestSuspiciousResult) {
      this.logger.warn(
        `[Orchestrator] Only suspicious results found, using best: ${bestSuspiciousResult.debug?.validationReason}`,
      );
      return bestSuspiciousResult;
    }

    return null;
  }

  /**
   * Find nutrition data by barcode
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

    for (const provider of sorted) {
      if (!provider.getByBarcode) continue;

      try {
        const result = await provider.getByBarcode(barcode, contextWithRegion);
        if (result && result.food) {
          const validation = this.validateResult(result, contextWithRegion);
          if (validation.isValid && !validation.isSuspicious && result.confidence >= 0.7) {
            this.logger.log(
              `[Orchestrator] Found by barcode in provider=${provider.id} id=${result.food.providerFoodId}`,
            );
            return {
              ...result,
              debug: {
                ...result.debug,
                providerId: provider.id,
              },
            };
          }
        }
      } catch (e: any) {
        this.logger.warn(
          `[Orchestrator] Error in provider=${provider.id} getByBarcode: ${e.message}`,
        );
      }
    }

    return null;
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
