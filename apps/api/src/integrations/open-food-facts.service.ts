import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface OffNutriments {
  ['energy-kcal_100g']?: number;
  ['energy_100g']?: number;
  proteins_100g?: number;
  fat_100g?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  salt_100g?: number;
  sodium_100g?: number;
  fiber_100g?: number;
  saturated_fat_100g?: number;
}

interface OffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutrition_grades?: string;
  nutriments?: OffNutriments;
  categories_tags_en?: string[];
  categories_tags?: string[];
}

interface OffSearchResponse {
  products: OffProduct[];
  count: number;
}

interface InternalFoodData {
  source: 'open_food_facts';
  externalCode: string;
  name: string;
  brand: string | null;
  nutritionGrade: string | null;
  per100g: {
    energyKcal: number | null;
    proteins: number | null;
    fats: number | null;
    carbs: number | null;
    sugars: number | null;
    salt: number | null;
    fiber: number | null;
    satFat: number | null;
  };
  categories: string[];
}

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly baseUrl = 'https://world.openfoodfacts.net/api/v2';

  /**
   * Search for a product in OpenFoodFacts
   */
  async searchProduct(query: string): Promise<OffProduct | null> {
    try {
      const url = `${this.baseUrl}/search`;
      const params = {
        search_terms: query,
        fields: 'code,product_name,nutrition_grades,nutriments,brands,categories_tags_en,categories_tags',
        page_size: 5,
        sort_by: 'popularity',
      };

      const { data } = await axios.get<OffSearchResponse>(url, {
        params,
        timeout: 5000,
      });

      if (!data?.products?.length) {
        this.logger.debug(`No products found for query: ${query}`);
        return null;
      }

      // Find first product with valid nutrition data
      const candidate = data.products.find(
        (p) =>
          p.nutriments &&
          (p.nutriments['energy-kcal_100g'] ||
            p.nutriments['energy_100g'] ||
            p.nutriments.proteins_100g ||
            p.nutriments.carbohydrates_100g),
      ) ?? data.products[0];

      return candidate || null;
    } catch (error: any) {
      this.logger.error(
        `Failed to search OpenFoodFacts for query="${query}": ${error?.message || error}`,
      );
      return null;
    }
  }

  /**
   * Map OpenFoodFacts product to internal format
   */
  mapToInternal(off: OffProduct): InternalFoodData {
    const nutr = off.nutriments || {};

    // Convert energy from kJ to kcal if needed
    const energyKcal =
      nutr['energy-kcal_100g'] ??
      (nutr['energy_100g'] ? nutr['energy_100g'] / 4.184 : null);

    // Convert sodium to salt (salt = sodium * 2.5)
    const salt =
      nutr.salt_100g ?? (nutr.sodium_100g ? nutr.sodium_100g * 2.5 : null);

    return {
      source: 'open_food_facts',
      externalCode: off.code,
      name: off.product_name || '',
      brand: off.brands || null,
      nutritionGrade: off.nutrition_grades || null,
      per100g: {
        energyKcal: energyKcal ? Math.round(energyKcal) : null,
        proteins: nutr.proteins_100g ?? null,
        fats: nutr.fat_100g ?? null,
        carbs: nutr.carbohydrates_100g ?? null,
        sugars: nutr.sugars_100g ?? null,
        salt: salt ? Math.round(salt * 10) / 10 : null,
        fiber: nutr.fiber_100g ?? null,
        satFat: nutr.saturated_fat_100g ?? null,
      },
      categories:
        off.categories_tags_en || off.categories_tags || [],
    };
  }

  /**
   * Check if a product name suggests it's a drink
   */
  isDrink(name: string, categories: string[] = []): boolean {
    const nameLower = name.toLowerCase();
    const drinkKeywords = [
      'coffee',
      'latte',
      'cappuccino',
      'espresso',
      'tea',
      'juice',
      'soda',
      'cola',
      'energy drink',
      'water',
      'milk',
      'smoothie',
      'shake',
      'beer',
      'wine',
      'cocktail',
      'drink',
      'beverage',
      'напиток',
      'кофе',
      'чай',
      'сок',
      'газировка',
    ];

    const categoryDrinkKeywords = [
      'en:beverages',
      'en:drinks',
      'en:coffees',
      'en:teas',
      'en:juices',
      'en:sodas',
    ];

    const nameMatches = drinkKeywords.some((keyword) =>
      nameLower.includes(keyword),
    );
    const categoryMatches = categories.some((cat) =>
      categoryDrinkKeywords.some((keyword) => cat.toLowerCase().includes(keyword)),
    );

    return nameMatches || categoryMatches;
  }
}

