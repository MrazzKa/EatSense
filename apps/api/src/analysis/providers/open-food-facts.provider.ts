import { Injectable, Logger } from '@nestjs/common';
import {
  INutritionProvider,
  NutritionProviderId,
  NutritionLookupContext,
  NutritionProviderResult,
  CanonicalFood,
  CanonicalNutrients,
} from './nutrition-provider.interface';
import { OpenFoodFactsService } from '../../openfoodfacts/openfoodfacts.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

type OFFProduct = {
  code: string;
  product_name?: string;
  generic_name?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    'proteins_100g'?: number;
    'proteins'?: number;
    'carbohydrates_100g'?: number;
    'carbohydrates'?: number;
    'fat_100g'?: number;
    'fat'?: number;
    'fiber_100g'?: number;
    'fiber'?: number;
    'sugars_100g'?: number;
    'sugars'?: number;
    'saturated-fat_100g'?: number;
    'saturated-fat'?: number;
    'sodium_100g'?: number;
    'sodium'?: number;
  };
  categories?: string;
  [key: string]: any;
};

type OFFSearchResponse = {
  products?: OFFProduct[];
  count?: number;
};

@Injectable()
export class OpenFoodFactsProvider implements INutritionProvider {
  readonly id: NutritionProviderId = 'openfoodfacts';
  private readonly logger = new Logger(OpenFoodFactsProvider.name);
  private readonly baseUrl = 'https://world.openfoodfacts.org';

  constructor(
    private readonly off: OpenFoodFactsService,
    private readonly http: HttpService,
  ) { }

  async isAvailable(_context: NutritionLookupContext): Promise<boolean> {
    if (process.env.OPENFOODFACTS_ENABLED === 'false') {
      return false;
    }
    return true;
  }

  getPriority(_context: NutritionLookupContext): number {
    // Lower priority than USDA/Swiss, mainly for barcode lookup
    return 50;
  }

  /**
   * Detect category from product name and categories
   */
  private detectCategory(product: OFFProduct): 'drink' | 'solid' | 'unknown' {
    const text = `${product.product_name || ''} ${product.generic_name || ''} ${product.categories || ''}`.toLowerCase();
    const drinkKeywords = [
      'coffee', 'tea', 'juice', 'soda', 'cola', 'drink', 'beverage', 'milk',
      'кофе', 'чай', 'сок', 'напиток', 'молоко',
    ];

    if (drinkKeywords.some((kw) => text.includes(kw))) {
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

    // Import matching utils
    const {
      nameMatchScore,
      isLikelyProcessedFood,
      queryImpliesProcessed,
      getLookupMode,
      MATCH_THRESHOLDS,
      mustTokensMatch,
    } = await import('../utils/name-match');

    const mode = getLookupMode(context);
    const queryIsProcessed = queryImpliesProcessed(trimmed);

    // Construct search URL
    const searchUrl = `${this.baseUrl}/cgi/search.pl?search_terms=${encodeURIComponent(trimmed)}&search_simple=1&action=process&json=1&page_size=20`;

    try {
      this.logger.log(`[OFF] Searching for "${trimmed}" mode=${mode}`);
      const resp: AxiosResponse<OFFSearchResponse> = await firstValueFrom(
        this.http.get(searchUrl, { timeout: 8000 }),
      );

      const products = resp.data?.products || [];
      if (products.length === 0) {
        return null;
      }

      // Score and filter candidates
      interface ScoredCandidate {
        product: OFFProduct;
        matchScore: number;
        dataQualityScore: number;
        finalScore: number;
        isProcessed: boolean;
      }

      const candidates: ScoredCandidate[] = [];

      for (const product of products) {
        const nutriments = product.nutriments || {};
        const productName = product.product_name || product.generic_name || '';

        // Skip empty names
        if (!productName.trim()) continue;

        // Check if processed food
        const isProcessed = isLikelyProcessedFood(productName, product.categories);

        // In ingredient mode, filter out processed foods unless query implies processed
        if (mode === 'ingredient' && isProcessed && !queryIsProcessed) {
          this.logger.debug(`[OFF] Filtering processed food "${productName}" for query "${trimmed}"`);
          continue;
        }

        // Must-tokens validation: reject if key tokens don't match (prevents carrot → carrot muesli)
        if (mode === 'ingredient' && !mustTokensMatch(trimmed, productName)) {
          this.logger.debug(`[OFF] Rejecting "${productName}" for "${trimmed}": must-tokens mismatch`);
          continue;
        }

        // Calculate match score
        const matchScore = nameMatchScore(trimmed, productName);

        // Hard reject in ingredient mode if match score too low
        if (mode === 'ingredient' && matchScore < MATCH_THRESHOLDS.HARD_REJECT) {
          this.logger.debug(`[OFF] Rejecting "${productName}" for "${trimmed}": matchScore=${matchScore.toFixed(2)}`);
          continue;
        }

        // Calculate data quality score (0 to 0.5)
        let dataQualityScore = 0;
        const hasKcal = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'];
        const hasProtein = nutriments['proteins_100g'] || nutriments['proteins'];
        const hasCarbs = nutriments['carbohydrates_100g'] || nutriments['carbohydrates'];
        const hasFat = nutriments['fat_100g'] || nutriments['fat'];
        const hasFiber = nutriments['fiber_100g'] || nutriments['fiber'];
        const hasSugars = nutriments['sugars_100g'] || nutriments['sugars'];
        const hasSatFat = nutriments['saturated-fat_100g'] || nutriments['saturated-fat'];

        if (hasKcal) dataQualityScore += 0.2;
        const macroCount = [hasProtein, hasCarbs, hasFat].filter(Boolean).length;
        if (macroCount >= 2) dataQualityScore += 0.2;
        if (hasFiber || hasSugars || hasSatFat) dataQualityScore += 0.1;
        dataQualityScore = Math.min(0.5, dataQualityScore);

        // Skip if no nutrition data at all
        if (!hasKcal && macroCount === 0) continue;

        // Final candidate score
        const finalScore = 0.65 * matchScore + 0.35 * dataQualityScore;

        candidates.push({
          product,
          matchScore,
          dataQualityScore,
          finalScore,
          isProcessed,
        });
      }

      // No valid candidates after filtering
      if (candidates.length === 0) {
        this.logger.debug(`[OFF] No valid candidates for "${trimmed}" after filtering`);
        return null;
      }

      // Sort by final score descending
      candidates.sort((a, b) => b.finalScore - a.finalScore);
      const best = candidates[0];
      const bestProduct = best.product;

      // Build result
      const nutriments = bestProduct.nutriments || {};
      const nutrients: CanonicalNutrients = {
        calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
        protein: nutriments['proteins_100g'] || nutriments['proteins'] || 0,
        carbs: nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0,
        fat: nutriments['fat_100g'] || nutriments['fat'] || 0,
        fiber: nutriments['fiber_100g'] || nutriments['fiber'],
        sugars: nutriments['sugars_100g'] || nutriments['sugars'],
        satFat: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'],
        sodium: nutriments['sodium_100g'] || nutriments['sodium'],
      };

      const category = this.detectCategory(bestProduct);

      const canonicalFood: CanonicalFood = {
        providerId: this.id,
        providerFoodId: bestProduct.code || 'unknown',
        displayName: bestProduct.product_name || bestProduct.generic_name || 'Unknown product',
        originalQuery: query,
        category,
        per100g: nutrients,
        defaultPortionG: category === 'drink' ? 250 : 100,
        meta: {
          code: bestProduct.code,
          generic_name: bestProduct.generic_name,
          categories: bestProduct.categories,
        },
      };

      // Confidence based on match quality (not fixed 0.7/0.8)
      const confidence = Math.min(1, Math.max(0, 0.4 + 0.6 * best.finalScore));

      this.logger.debug(`[OFF] Best match for "${trimmed}": "${canonicalFood.displayName}" (match=${best.matchScore.toFixed(2)}, quality=${best.dataQualityScore.toFixed(2)}, conf=${confidence.toFixed(2)})`);

      return {
        food: canonicalFood,
        confidence,
        isSuspicious: best.matchScore < MATCH_THRESHOLDS.SUSPICIOUS,
        debug: {
          code: bestProduct.code,
          matchScore: best.matchScore,
          dataQualityScore: best.dataQualityScore,
          finalScore: best.finalScore,
          processedFiltered: candidates.length < products.length,
          candidatesEvaluated: products.length,
          candidatesAccepted: candidates.length,
        },
      };
    } catch (error: any) {
      this.logger.warn(
        `[OpenFoodFactsProvider] Error searching for "${trimmed}": ${error.message}`,
      );
      return null;
    }
  }

  async getByBarcode(
    barcode: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    const product = await this.off.getByBarcode(barcode);
    if (!product) return null;

    const nutriments = product.nutriments || {};
    const nutrients: CanonicalNutrients = {
      calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
      protein: nutriments['proteins_100g'] || nutriments['proteins'] || 0,
      carbs: nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0,
      fat: nutriments['fat_100g'] || nutriments['fat'] || 0,
      fiber: nutriments['fiber_100g'] || nutriments['fiber'],
      sugars: nutriments['sugars_100g'] || nutriments['sugars'],
      satFat: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'],
      sodium: nutriments['sodium_100g'] || nutriments['sodium'],
    };

    const category = this.detectCategory(product);

    const canonicalFood: CanonicalFood = {
      providerId: this.id,
      providerFoodId: product.code || barcode,
      displayName: product.product_name || product.generic_name || 'Unknown product',
      originalQuery: barcode,
      category,
      per100g: nutrients,
      defaultPortionG: category === 'drink' ? 250 : 100,
      meta: { raw: product },
    };

    return {
      food: canonicalFood,
      confidence: 0.9, // Barcode lookup is high confidence
      debug: {
        code: product.code,
        barcode,
      },
    };
  }
}
