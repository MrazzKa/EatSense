import { Injectable, Logger } from '@nestjs/common';
import {
  INutritionProvider,
  NutritionProviderId,
  NutritionLookupContext,
  NutritionProviderResult,
  CanonicalFood,
  CanonicalNutrients,
} from './nutrition-provider.interface';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

type SwissName = { id: number; term: string };
type SwissSynonym = { id: number; term: string };

type SwissFoodWithNames = {
  id: number; // foodId
  generic: boolean;
  names?: SwissName[];
  synonyms?: SwissSynonym[];
  categories?: number[];
};

type SwissComponent = {
  id: number;
  code: string;
  name: string;
  unit?: string;
};

type SwissUnit = {
  code: string;
  name?: string;
};

type SwissValue = {
  value: number;
  component: SwissComponent;
  unit: SwissUnit;
};

type SwissFood = {
  id: number; // DBID
  name: string;
  values?: SwissValue[];
};

type SwissFoodDbIdResponse = {
  dbid: number;
};

@Injectable()
export class SwissFoodProvider implements INutritionProvider {
  readonly id: NutritionProviderId = 'swiss';
  private readonly logger = new Logger(SwissFoodProvider.name);
  private readonly baseUrl =
    'https://api.webapp.prod.blv.foodcase-services.com/BLV_WebApp_WS';

  private componentMap: { [code: string]: number } = {};
  private componentsLoaded = false;

  constructor(private readonly http: HttpService) {}

  async isAvailable(context: NutritionLookupContext): Promise<boolean> {
    if (process.env.SWISS_FOOD_ENABLED === 'false') {
      return false;
    }
    const region = context.region || 'OTHER';
    return region === 'CH' || region === 'EU';
  }

  getPriority(context: NutritionLookupContext): number {
    const region = context.region || 'OTHER';
    if (region === 'CH') return 130; // Highest priority for CH
    if (region === 'EU') return 100;
    return 60; // Lower for other regions
  }

  /**
   * Load component map from Swiss API
   */
  private async loadComponentMap(): Promise<void> {
    if (this.componentsLoaded) return;

    try {
      const url = `${this.baseUrl}/webresources/BLV-api/components`;
      const resp = await firstValueFrom(
        this.http.get<SwissComponent[]>(url, { params: { lang: 'en' } }),
      );

      const components = resp.data || [];
      const codeMap: { [code: string]: number } = {};

      for (const comp of components) {
        if (comp.code && comp.id) {
          const codeUpper = comp.code.toUpperCase();
          codeMap[codeUpper] = comp.id;

          // Map common aliases
          if (codeUpper === 'ENERC' || codeUpper === 'ENERC_KCAL') {
            codeMap['ENERGY'] = comp.id;
            codeMap['KCAL'] = comp.id;
          }
          if (codeUpper === 'PROT' || codeUpper === 'PROT_TOT') {
            codeMap['PROTEIN'] = comp.id;
          }
          if (codeUpper === 'FAT' || codeUpper === 'FAT_TOT') {
            codeMap['FAT_TOTAL'] = comp.id;
          }
          if (codeUpper === 'CHOCDF' || codeUpper === 'CHOAVL') {
            codeMap['CARBS'] = comp.id;
            codeMap['CARBOHYDRATES'] = comp.id;
          }
        }
      }

      this.componentMap = codeMap;
      this.componentsLoaded = true;

      this.logger.debug(
        `[SwissFoodProvider] Loaded ${Object.keys(codeMap).length} component mappings`,
      );
    } catch (error: any) {
      this.logger.warn(
        `[SwissFoodProvider] Failed to load component map: ${error.message}`,
      );
      // Continue with empty map - will use hardcoded codes
    }
  }

  /**
   * Map Swiss food values to canonical nutrients
   */
  private mapSwissNutrients(food: SwissFood): CanonicalNutrients {
    const result: CanonicalNutrients = {};

    if (!food.values?.length) return result;

    // Ensure component map is loaded
    if (!this.componentsLoaded) {
      // Synchronous fallback - will be loaded async next time
      this.loadComponentMap().catch(() => {});
    }

    for (const v of food.values) {
      if (!v?.component?.code) continue;

      const code = v.component.code.toUpperCase();
      const val = Number(v.value) || 0;

      // Map codes to nutrients (with fallback to hardcoded mapping)
      if (
        code === 'ENERC_KCAL' ||
        code === 'ENERC' ||
        code === 'ENERGY' ||
        code === 'KCAL'
      ) {
        result.calories = val;
      } else if (code === 'PROT' || code === 'PROT_TOT' || code === 'PROTEIN') {
        result.protein = val;
      } else if (code === 'FAT' || code === 'FAT_TOT' || code === 'FAT_TOTAL') {
        result.fat = val;
      } else if (
        code === 'CHOAVL' ||
        code === 'CHOCDF' ||
        code === 'CARBS' ||
        code === 'CARBOHYDRATES'
      ) {
        result.carbs = val;
      } else if (code === 'FIBTG' || code === 'FIBT' || code === 'FIBER') {
        result.fiber = val;
      } else if (code === 'SUGAR' || code === 'SUGARS') {
        result.sugars = val;
      } else if (code === 'FASAT' || code === 'SATURATED_FAT') {
        result.satFat = val;
      } else if (code === 'NA' || code === 'SODIUM') {
        result.sodium = val;
      }
    }

    return result;
  }

  /**
   * Detect category from query and food name
   */
  private detectCategory(query: string, foodName?: string): 'drink' | 'solid' | 'unknown' {
    const text = `${query} ${foodName || ''}`.toLowerCase();
    const drinkKeywords = [
      'coffee',
      'tea',
      'water',
      'juice',
      'soda',
      'cola',
      'drink',
      'beverage',
      'milk',
      'кофе',
      'чай',
      'вода',
      'сок',
      'напиток',
      'молоко',
    ];

    if (drinkKeywords.some((kw) => text.includes(kw))) {
      return 'drink';
    }

    return 'solid';
  }

  /**
   * Fallback to Excel file if API is unavailable
   * 
   * TODO: Implement when Excel file is available
   * Expected file path: process.env.SWISS_FOOD_XLSX_PATH or data/swiss_food_composition.xlsx
   * 
   * Implementation approach:
   * 1. Load Excel file on first request (lazy)
   * 2. Parse using 'xlsx' package
   * 3. Build in-memory index: Map<normalized_name, CanonicalFood>
   * 4. Search by name (case-insensitive, fuzzy matching)
   * 5. Return CanonicalFood from index
   */
  private async findByTextExcelFallback(
    query: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    const excelPath =
      process.env.SWISS_FOOD_XLSX_PATH || 'data/swiss_food_composition.xlsx';
    
    // Check if file exists (would need fs access)
    // For now, return null - implement when Excel file is available
    this.logger.debug(
      `[SwissFoodProvider] Excel fallback not implemented yet. Path: ${excelPath}`,
    );
    return null;
  }

  async findByText(
    query: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    const trimmed = query?.trim().toLowerCase();
    if (!trimmed) return null;

    // Load component map if needed
    await this.loadComponentMap();

    try {
      // Step 1: Search for foods
      const searchUrl = `${this.baseUrl}/webresources/BLV-api/foods`;
      const searchResp = await firstValueFrom(
        this.http.get<SwissFoodWithNames[]>(searchUrl, {
          params: {
            search: trimmed,
            type: true, // generic foods
            lang: 'en',
            limit: 5,
          },
        }),
      );

      const foods = searchResp.data || [];
      if (foods.length === 0) {
        return null;
      }

      // Step 2: Find best match (prioritize exact name match)
      let bestMatch = foods[0];
      const queryLower = trimmed.toLowerCase();

      for (const food of foods) {
        const primaryName = food.names?.[0]?.term?.toLowerCase() || '';
        if (primaryName.includes(queryLower) || queryLower.includes(primaryName)) {
          bestMatch = food;
          break;
        }
      }

      // Step 3: Get DBID from foodId
      let dbid: number;
      try {
        const dbidUrl = `${this.baseUrl}/webresources/BLV-api/fooddbid/${bestMatch.id}`;
        const dbidResp = await firstValueFrom(
          this.http.get<SwissFoodDbIdResponse>(dbidUrl),
        );
        dbid = dbidResp.data?.dbid || bestMatch.id;
      } catch (error: any) {
        // Fallback: use foodId as DBID
        this.logger.debug(
          `[SwissFoodProvider] Could not get DBID for foodId=${bestMatch.id}, using foodId as DBID`,
        );
        dbid = bestMatch.id;
      }

      // Step 4: Get full food data
      const foodUrl = `${this.baseUrl}/webresources/BLV-api/food/${dbid}`;
      const foodResp = await firstValueFrom(
        this.http.get<SwissFood>(foodUrl, { params: { lang: 'en' } }),
      );

      const food = foodResp.data;
      if (!food) return null;

      // Step 5: Map nutrients
      const nutrients = this.mapSwissNutrients(food);

      // Step 6: Determine category
      const category = this.detectCategory(query, food.name);

      // Step 7: Calculate confidence
      let confidence = 0.8;
      const primaryName = bestMatch.names?.[0]?.term || '';
      const primaryNameLower = primaryName.toLowerCase();
      if (primaryNameLower.includes(queryLower) || queryLower.includes(primaryNameLower)) {
        confidence = 0.9;
      }

      // Step 8: Build CanonicalFood
      const canonicalFood: CanonicalFood = {
        providerId: this.id,
        providerFoodId: String(dbid),
        displayName: food.name || primaryName || `Food ${dbid}`,
        originalQuery: query,
        category,
        per100g: nutrients,
        defaultPortionG: category === 'drink' ? 250 : 100,
        meta: {
          dbid,
          foodId: bestMatch.id,
          categories: bestMatch.categories,
          generic: bestMatch.generic,
          names: bestMatch.names,
        },
      };

      return {
        food: canonicalFood,
        confidence,
        debug: {
          foodId: bestMatch.id,
          dbid,
          primaryName,
        },
      };
    } catch (error: any) {
      this.logger.warn(
        `[SwissFoodProvider] Error searching for "${trimmed}": ${error.message}`,
      );
      
      // Fallback to Excel if API consistently fails
      // Check if error is network-related (ECONNREFUSED, ETIMEDOUT, etc.)
      const isNetworkError =
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED');
      
      if (isNetworkError) {
        this.logger.debug(
          `[SwissFoodProvider] Network error detected, attempting Excel fallback`,
        );
        return await this.findByTextExcelFallback(trimmed, context);
      }
      
      return null;
    }
  }

  async getByBarcode(
    _barcode: string,
    _context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    // Swiss API doesn't support barcode lookup
    return null;
  }
}
