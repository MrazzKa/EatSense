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
  ) {}

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

    try {
      // Use OFF search API
      const searchUrl = `${this.baseUrl}/cgi/search.pl`;
      const resp = await firstValueFrom(
        this.http.get<OFFSearchResponse>(searchUrl, {
          params: {
            search_terms: trimmed,
            search_simple: 1,
            action: 'process',
            json: 1,
            page_size: 5,
          },
        }),
      );

      const products = resp.data?.products || [];
      if (products.length === 0) {
        return null;
      }

      // Find first product with valid nutrition data
      let bestProduct: OFFProduct | null = null;
      for (const product of products) {
        const nutriments = product.nutriments || {};
        const hasKcal = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'];
        const hasMacros =
          nutriments['proteins_100g'] ||
          nutriments['carbohydrates_100g'] ||
          nutriments['fat_100g'];

        if (hasKcal || hasMacros) {
          bestProduct = product;
          break;
        }
      }

      if (!bestProduct) {
        return null;
      }

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

      // Calculate confidence based on data completeness
      let confidence = 0.7;
      if (nutrients.calories && (nutrients.protein || nutrients.carbs || nutrients.fat)) {
        confidence = 0.8;
      }

      return {
        food: canonicalFood,
        confidence,
        debug: {
          code: bestProduct.code,
          hasKcal: !!nutrients.calories,
          hasMacros: !!(nutrients.protein || nutrients.carbs || nutrients.fat),
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
