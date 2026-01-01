import { Injectable, Logger } from '@nestjs/common';
import {
  INutritionProvider,
  NutritionProviderId,
  NutritionLookupContext,
  NutritionProviderResult,
  CanonicalFood,
  CanonicalNutrients,
} from './nutrition-provider.interface';
import { HybridService } from '../../fdc/hybrid/hybrid.service';

@Injectable()
export class UsdaNutritionProvider implements INutritionProvider {
  readonly id: NutritionProviderId = 'usda';
  private readonly logger = new Logger(UsdaNutritionProvider.name);

  constructor(private readonly hybrid: HybridService) { }

  async isAvailable(_context: NutritionLookupContext): Promise<boolean> {
    // USDA доступен глобально
    return true;
  }

  getPriority(context: NutritionLookupContext): number {
    const region = context.region || 'OTHER';
    if (region === 'US') return 120;
    // для остального мира оставляем высокий, но чуть ниже Swiss для CH
    return 90;
  }

  private toNutrients(normalized: any): CanonicalNutrients {
    const base = normalized?.nutrients ?? {};
    return {
      calories: base.calories ?? 0,
      protein: base.protein ?? 0,
      carbs: base.carbs ?? 0,
      fat: base.fat ?? 0,
      fiber: base.fiber,
      sugars: base.sugars,
      satFat: base.satFat,
      sodium: base.sodium,
    };
  }

  /**
   * Detect category from description
   */
  private detectCategory(description: string, expectedCategory?: 'drink' | 'solid' | 'unknown'): 'drink' | 'solid' | 'unknown' {
    if (expectedCategory && expectedCategory !== 'unknown') {
      return expectedCategory;
    }

    const descLower = description.toLowerCase();
    const drinkKeywords = [
      'coffee', 'tea', 'juice', 'soda', 'cola', 'drink', 'beverage', 'milk',
      'кофе', 'чай', 'сок', 'напиток', 'молоко',
    ];

    if (drinkKeywords.some((kw) => descLower.includes(kw))) {
      return 'drink';
    }

    return 'solid';
  }

  async findByText(
    query: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    const trimmed = query?.trim();
    if (!trimmed) return null;

    try {
      const expectedCategory = context.expectedCategory || 'unknown';

      // Use existing HybridService search
      const matches = await (this.hybrid as any).findByText(
        trimmed,
        5, // limit
        0.8, // minScore - increased from 0.7 for better accuracy
        expectedCategory,
      );

      if (!matches || matches.length === 0) {
        return null;
      }

      const bestMatch = matches[0];
      if (bestMatch.score < 0.8) {
        return null;
      }

      // Get normalized food data
      const normalized = await this.hybrid.getFoodNormalized(bestMatch.fdcId);
      if (!normalized) return null;

      const category = this.detectCategory(normalized.description || '', expectedCategory);

      const canonicalFood: CanonicalFood = {
        providerId: this.id,
        providerFoodId: String(bestMatch.fdcId),
        displayName: normalized.description || bestMatch.description || trimmed,
        originalQuery: query,
        category,
        per100g: this.toNutrients(normalized),
        defaultPortionG: category === 'drink' ? 250 : 100, // FDC serving size can be used if available in normalized
        meta: {
          dataType: normalized.dataType,
          fdcId: bestMatch.fdcId,
          score: bestMatch.score,
        },
      };

      return {
        food: canonicalFood,
        confidence: bestMatch.score,
        debug: {
          fdcId: bestMatch.fdcId,
          dataType: normalized.dataType,
          score: bestMatch.score,
        },
      };
    } catch (error: any) {
      this.logger.warn(
        `[UsdaNutritionProvider] Error searching for "${trimmed}": ${error.message}`,
      );
      return null;
    }
  }

  async getByBarcode(
    _barcode: string,
    _context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    // USDA doesn't support barcode lookup
    return null;
  }
}
