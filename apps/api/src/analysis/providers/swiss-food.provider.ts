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
import { AxiosResponse } from 'axios';

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

  constructor(private readonly http: HttpService) { }

  async isAvailable(context: NutritionLookupContext): Promise<boolean> {
    if (process.env.SWISS_FOOD_ENABLED === 'false') {
      return false;
    }
    const region = context.region || 'OTHER';
    // FIX 1: Only available for CH and EU regions - skip completely for others
    if (region !== 'CH' && region !== 'EU') {
      return false;
    }
    return true;
  }

  getPriority(context: NutritionLookupContext): number {
    const region = context.region || 'OTHER';
    if (region === 'CH') return 130; // Highest priority for CH
    if (region === 'EU') return 100;
    // FIX 1: Return negative priority for non-CH/EU to ensure it's never used
    return -100;
  }

  /**
   * Load component map from Swiss API
   */
  private async loadComponentMap(): Promise<void> {
    if (this.componentsLoaded) return;

    try {
      const url = `${this.baseUrl}/webresources/BLV-api/components`;
      const resp = await firstValueFrom<AxiosResponse<SwissComponent[]>>(
        this.http.get<SwissComponent[]>(url, { params: { lang: 'en' } }) as any,
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
      this.loadComponentMap().catch(() => { });
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

    // Import matching utils
    const {
      buildQueryVariants,
      nameMatchScore,
      getLookupMode,
      MATCH_THRESHOLDS,
    } = await import('../utils/name-match');

    const mode = getLookupMode(context);
    const queryVariants = buildQueryVariants(trimmed);

    // Load component map if needed
    await this.loadComponentMap();

    try {
      let bestMatch: SwissFoodWithNames | null = null;
      let bestMatchScore = 0;
      let bestVariant = trimmed;
      let allFoods: SwissFoodWithNames[] = [];

      // Try each query variant (max 2 API calls to stay fast)
      const variantsToTry = queryVariants.slice(0, 2);

      for (const variant of variantsToTry) {
        const searchUrl = `${this.baseUrl}/webresources/BLV-api/foods`;
        const searchResp = await firstValueFrom<AxiosResponse<SwissFoodWithNames[]>>(
          this.http.get<SwissFoodWithNames[]>(searchUrl, {
            params: {
              search: variant,
              type: true, // generic foods
              lang: context.locale === 'ru' ? 'en' : (context.locale || 'en'),
              limit: 10,
            },
          }) as any,
        );

        const foods = searchResp.data || [];
        allFoods = allFoods.concat(foods);

        // Score each candidate
        for (const food of foods) {
          // Build candidate name from first few name terms
          const nameTerms = (food.names || []).slice(0, 3).map(n => n.term).join(' ');
          const candidateName = nameTerms || `Food ${food.id}`;

          // Calculate match score against all query variants
          let maxScore = 0;
          for (const qv of queryVariants) {
            const score = nameMatchScore(qv, candidateName);
            if (score > maxScore) maxScore = score;
          }

          if (maxScore > bestMatchScore) {
            bestMatchScore = maxScore;
            bestMatch = food;
            bestVariant = variant;
          }
        }

        // Early return if good match found (avoid second API call)
        if (bestMatchScore >= 0.85) {
          break;
        }
      }

      // No results at all
      if (!bestMatch || allFoods.length === 0) {
        return null;
      }

      // Hard reject in ingredient mode if match is too weak
      if (mode === 'ingredient' && bestMatchScore < MATCH_THRESHOLDS.HARD_REJECT) {
        this.logger.debug(`[Swiss] Rejecting weak match for "${trimmed}": score=${bestMatchScore.toFixed(2)}`);
        return null;
      }

      // Get DBID from foodId
      let dbid: number;
      try {
        const dbidUrl = `${this.baseUrl}/webresources/BLV-api/fooddbid/${bestMatch.id}`;
        const dbidResp = await firstValueFrom<AxiosResponse<SwissFoodDbIdResponse>>(
          this.http.get<SwissFoodDbIdResponse>(dbidUrl) as any,
        );
        dbid = dbidResp.data?.dbid || bestMatch.id;
      } catch (error: any) {
        this.logger.debug(
          `[SwissFoodProvider] Could not get DBID for foodId=${bestMatch.id}, using foodId as DBID`,
        );
        dbid = bestMatch.id;
      }

      // Get full food data
      const foodUrl = `${this.baseUrl}/webresources/BLV-api/food/${dbid}`;
      const foodResp = await firstValueFrom<AxiosResponse<SwissFood>>(
        this.http.get<SwissFood>(foodUrl, { params: { lang: 'en' } }) as any,
      );

      const food = foodResp.data;
      if (!food) return null;

      // Map nutrients
      const nutrients = this.mapSwissNutrients(food);

      // Determine category
      const category = this.detectCategory(query, food.name);

      // Confidence based on match score
      const confidence = Math.min(1, Math.max(0, 0.45 + 0.55 * bestMatchScore));

      // Build CanonicalFood
      const primaryName = bestMatch.names?.[0]?.term || '';
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

      this.logger.debug(`[Swiss] Best match for "${trimmed}": "${canonicalFood.displayName}" (score=${bestMatchScore.toFixed(2)}, conf=${confidence.toFixed(2)}, variant="${bestVariant}")`);

      return {
        food: canonicalFood,
        confidence,
        isSuspicious: bestMatchScore < MATCH_THRESHOLDS.SUSPICIOUS,
        debug: {
          foodId: bestMatch.id,
          dbid,
          primaryName,
          matchScore: bestMatchScore,
          queryVariant: bestVariant,
          candidatesEvaluated: allFoods.length,
        },
      };
    } catch (error: any) {
      this.logger.warn(
        `[SwissFoodProvider] Error searching for "${trimmed}": ${error.message}`,
      );

      // Fallback to Excel if API consistently fails
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
