import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { FdcApiService } from '../api/fdc-api.service';
// FoodSource enum defined inline
enum FoodSource {
  USDA_LOCAL = 'USDA_LOCAL',
  USDA_API = 'USDA_API',
}

@Injectable()
export class HybridService {
  private readonly logger = new Logger(HybridService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fdcApi: FdcApiService,
  ) {}

  /**
   * Find foods by text query using Postgres FTS + API fallback
   */
  async findByText(query: string, k = 10, minScore = 0.6): Promise<any[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    try {
      const results = await this.textSearch(normalizedQuery, k * 2);
      const filtered = results.filter((r) => r.score >= minScore).slice(0, k);
      const reranked = await this.rerankResults(filtered, normalizedQuery);

      if (reranked.length > 0) {
        return reranked;
      }

      this.logger.log(`No local results for "${normalizedQuery}", falling back to USDA API`);
      return await this.apiFallback(normalizedQuery, k);
    } catch (error: any) {
      this.logger.error(`Error in findByText: ${error.message}`);
      return await this.apiFallback(normalizedQuery, k);
    }
  }

  private async textSearch(query: string, limit: number): Promise<Array<{
    id: string;
    fdcId: number;
    description: string;
    dataType: string;
    score: number;
  }>> {
    // Use FTS (search_vector) if available, otherwise fallback to ILIKE
    try {
      const results = await this.prisma.$queryRaw<Array<{
        id: string;
        fdc_id: number;
        description: string;
        data_type: string;
        rank: number;
      }>>`
        SELECT 
          id,
          fdc_id,
          description,
          data_type,
          ts_rank_cd(search_vector, plainto_tsquery('simple', ${query})) as rank
        FROM foods
        WHERE search_vector @@ plainto_tsquery('simple', ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;

      return results.map(f => ({
        id: f.id,
        fdcId: f.fdc_id,
        description: f.description,
        dataType: f.data_type,
        score: Math.min(1.0, (f.rank || 0) * 2), // Normalize rank to 0-1
      }));
    } catch (error: any) {
      // Fallback to ILIKE if FTS fails (e.g., search_vector not populated)
      this.logger.warn(`FTS search failed, using ILIKE fallback: ${error.message}`);
      const results = await this.prisma.food.findMany({
        where: {
          description: {
            contains: query,
            mode: 'insensitive',
          },
        },
        take: limit,
        orderBy: {
          description: 'asc',
        },
      });

      return results.map(f => ({
        id: f.id,
        fdcId: f.fdcId,
        description: f.description,
        dataType: f.dataType,
        score: 0.8, // Default score for text match
      }));
    }
  }

  private async rerankResults(results: any[], query: string): Promise<any[]> {
    // Simple reranking based on dataType priority and text match
    const typePriority: Record<string, number> = {
      'Branded': 4,
      'Foundation': 3,
      'FNDDS': 2,
      'SR Legacy': 1,
    };

    return results
      .map(r => ({
        ...r,
        priority: typePriority[r.dataType] || 0,
        textMatch: r.description.toLowerCase().includes(query.toLowerCase()) ? 1 : 0,
      }))
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (a.textMatch !== b.textMatch) return b.textMatch - a.textMatch;
        return b.score - a.score;
      })
      .slice(0, 10);
  }

  private async apiFallback(query: string, limit: number): Promise<any[]> {
    try {
      const apiResults = await this.fdcApi.searchFoods({
        query,
        pageSize: limit,
        dataType: ['Branded', 'Foundation'],
      });

      if (!apiResults.foods || apiResults.foods.length === 0) {
        return [];
      }

      // Save top results to database (slim mode for Branded)
      const saved: any[] = [];
      for (const foodData of apiResults.foods.slice(0, limit)) {
        try {
          const savedFood = await this.saveFoodFromApi(foodData, true); // Use slim mode
          saved.push(savedFood);
        } catch (error: any) {
          this.logger.error(`Error saving food ${foodData.fdcId}:`, error.message);
        }
      }

      return saved.map(f => ({
        id: f.id,
        fdcId: f.fdcId,
        description: f.description,
        dataType: f.dataType,
        score: 0.9, // API results get high score
        source: 'USDA_API',
      }));
    } catch (error: any) {
      this.logger.error(`API fallback error: ${error.message}`);
      return [];
    }
  }

  private async saveFoodFromApi(foodData: any, slim: boolean = false): Promise<any> {
    // For Branded, use slim mode (skip foodNutrients)
    const isBranded = foodData.dataType === 'Branded';
    const useSlim = slim || isBranded;

    const food = await this.prisma.food.upsert({
      where: { fdcId: foodData.fdcId },
      update: {
        dataType: foodData.dataType,
        description: foodData.description,
        brandOwner: foodData.brandOwner,
        gtinUpc: foodData.gtinUpc,
        scientificName: foodData.scientificName,
        publishedAt: foodData.publishedDate ? new Date(foodData.publishedDate) : null,
        updatedAt: foodData.foodUpdateDate ? new Date(foodData.foodUpdateDate) : null,
        source: FoodSource.USDA_API,
      },
      create: {
        fdcId: foodData.fdcId,
        dataType: foodData.dataType,
        description: foodData.description,
        brandOwner: foodData.brandOwner,
        gtinUpc: foodData.gtinUpc,
        scientificName: foodData.scientificName,
        publishedAt: foodData.publishedDate ? new Date(foodData.publishedDate) : null,
        updatedAt: foodData.foodUpdateDate ? new Date(foodData.foodUpdateDate) : null,
        source: FoodSource.USDA_API,
      },
    });

    // Save portions (always save for slim)
    if (foodData.foodPortions) {
      await this.prisma.foodPortion.deleteMany({ where: { foodId: food.id } });
      await this.prisma.foodPortion.createMany({
        data: foodData.foodPortions.map((p: any) => {
          // Extract measureUnit string from object if needed
          let measureUnitStr = '';
          if (typeof p.measureUnit === 'string') {
            measureUnitStr = p.measureUnit;
          } else if (p.measureUnit && typeof p.measureUnit === 'object') {
            // Use abbreviation if available, otherwise name
            measureUnitStr = p.measureUnit.abbreviation || p.measureUnit.name || '';
          }
          
          return {
            foodId: food.id,
            gramWeight: p.gramWeight || 0,
            measureUnit: measureUnitStr,
            modifier: p.modifier || null,
            amount: p.amount !== null && p.amount !== undefined ? p.amount : null,
          };
        }),
      });
    }

    // Always save nutrients if they exist (BUG 1: Branded products need nutrients too)
    if (foodData.foodNutrients && foodData.foodNutrients.length > 0) {
      const mapped = this.mapFoodNutrients(foodData);

      if (!mapped.length) {
        this.logger.warn('[HybridService] Food saved but no nutrients persisted', {
          fdcId: food.fdcId,
          description: foodData.description,
          dataType: foodData.dataType,
          foodNutrientsCount: Array.isArray(foodData.foodNutrients)
            ? foodData.foodNutrients.length
            : 0,
          reason: 'mapFoodNutrients returned empty array',
        });
      } else {
        await this.prisma.foodNutrient.deleteMany({ where: { foodId: food.id } });

        await this.prisma.foodNutrient.createMany({
          data: mapped.map((n) => ({
            foodId: food.id,
            nutrientId: n.nutrientId,
            amount: n.amount, // allowed to be 0, это норма
          })),
          skipDuplicates: true,
        });
      }
    } else if (foodData.dataType === 'Branded' && !foodData.labelNutrients) {
      // Task 1: Warn if Branded product has no nutrients at all
      this.logger.warn('[HybridService] Branded product saved without nutrients', {
        fdcId: food.fdcId,
        description: food.description,
        reason: 'No foodNutrients array and no labelNutrients',
      });
    }

    // Save label nutrients
    if (foodData.labelNutrients) {
      await this.prisma.labelNutrients.upsert({
        where: { foodId: food.id },
        update: {
          calories: foodData.labelNutrients.calories,
          protein: foodData.labelNutrients.protein,
          fat: foodData.labelNutrients.fat,
          carbohydrates: foodData.labelNutrients.carbohydrates,
          fiber: foodData.labelNutrients.fiber,
          sugars: foodData.labelNutrients.sugars,
          sodium: foodData.labelNutrients.sodium,
          cholesterol: foodData.labelNutrients.cholesterol,
          potassium: foodData.labelNutrients.potassium,
          calcium: foodData.labelNutrients.calcium,
          iron: foodData.labelNutrients.iron,
        },
        create: {
          foodId: food.id,
          calories: foodData.labelNutrients.calories,
          protein: foodData.labelNutrients.protein,
          fat: foodData.labelNutrients.fat,
          carbohydrates: foodData.labelNutrients.carbohydrates,
          fiber: foodData.labelNutrients.fiber,
          sugars: foodData.labelNutrients.sugars,
          sodium: foodData.labelNutrients.sodium,
          cholesterol: foodData.labelNutrients.cholesterol,
          potassium: foodData.labelNutrients.potassium,
          calcium: foodData.labelNutrients.calcium,
          iron: foodData.labelNutrients.iron,
        },
      });
    }

    return food;
  }

  /**
   * Get normalized food data
   */
  async getFoodNormalized(fdcId: number): Promise<any> {
    // Try local first
    const localFood = await this.prisma.food.findUnique({
      where: { fdcId },
      include: {
        portions: true,
        nutrients: {
          include: {
            nutrient: true,
          },
        },
        label: true,
      },
    });

    if (localFood) {
      return this.normalizeFood(localFood);
    }

    // Fallback to API
    const apiFood = await this.fdcApi.getFood(fdcId);
    const savedFood = await this.saveFoodFromApi(apiFood);
    
    return this.normalizeFood(savedFood);
  }

  private normalizeFood(food: any): any {
    // Extract DB nutrients if available (from Prisma relation)
    const dbNutrients =
      food.nutrients && Array.isArray(food.nutrients)
        ? food.nutrients.map((n: any) => ({
            nutrientId: n.nutrientId || n.nutrient?.id,
            amount: n.amount || 0,
          }))
        : undefined;

    const nutrients = this.extractNutrients(food, dbNutrients);

    return {
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      source: food.source,
      portions: food.portions || [],
      nutrients: {
        calories: nutrients.calories || 0,
        protein: nutrients.protein || 0,
        fat: nutrients.fat || 0,
        carbs: nutrients.carbs || 0,
        fiber: nutrients.fiber || 0,
        sugars: nutrients.sugars || 0,
        sodium: nutrients.sodium || 0,
        satFat: nutrients.satFat || 0,
      },
    };
  }

  /**
   * Map foodNutrients from API response to database format
   * Supports multiple formats: fn.nutrient.id, fn.nutrientId, fn.nutrient.number
   * Does NOT filter out entries with amount === 0 (some nutrients legitimately have 0)
   */
  private mapFoodNutrients(food: any): { nutrientId: number; amount: number }[] {
    if (!food) return [];

    // FDC often gives `foodNutrients` array
    const raw = food.foodNutrients || food.foodNutrient || [];

    const toNumber = (v: any): number => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }
      if (typeof v === 'object' && v.value !== undefined) {
        // labelNutrients style { value: 203 }
        return toNumber(v.value);
      }
      return 0;
    };

    const resolveNutrientId = (fn: any): number | null => {
      if (!fn) return null;

      // Possible shapes:
      // - fn.nutrient.id
      // - fn.nutrientId
      // - fn.nutrient.number (string like '1008' → calories)
      if (fn.nutrient?.id) return Number(fn.nutrient.id);
      if (fn.nutrientId) return Number(fn.nutrientId);
      if (fn.nutrient?.number) {
        const n = Number(fn.nutrient.number);
        if (Number.isFinite(n)) return n;
      }
      return null;
    };

    const mapped = (raw as any[])
      .map((fn) => {
        const nutrientId = resolveNutrientId(fn);
        const amount = toNumber(fn.amount ?? fn.value);

        return { nutrientId, amount };
      })
      // Keep only entries where we know nutrientId; allow 0 amount
      .filter((n) => n.nutrientId !== null && Number.isFinite(n.nutrientId));

    return mapped as { nutrientId: number; amount: number }[];
  }

  // Extract label value from nested structure or direct value
  private extractLabelValue(labelField: any): number {
    if (labelField === null || labelField === undefined) return 0;
    if (typeof labelField === 'number') return labelField;
    if (typeof labelField === 'string') {
      const n = Number(labelField);
      return Number.isFinite(n) ? n : 0;
    }
    if (typeof labelField === 'object' && labelField.value !== undefined) {
      return this.extractLabelValue(labelField.value);
    }
    return 0;
  }

  private extractNutrientsFromLabel(food: any) {
    const label = food.labelNutrients || food.label || null;
    if (!label) return null;

    return {
      calories: this.extractLabelValue(label.calories),
      protein: this.extractLabelValue(label.protein),
      fat: this.extractLabelValue(label.fat),
      carbs: this.extractLabelValue(label.carbohydrates),
      fiber: this.extractLabelValue(label.fiber),
      sugars: this.extractLabelValue(label.sugars),
      sodium: this.extractLabelValue(label.sodium),
      satFat:
        this.extractLabelValue(label.saturatedFat) ||
        this.extractLabelValue(label['saturated_fat']),
    };
  }

  private extractNutrients(
    food: any,
    dbNutrients?: { nutrientId: number; amount: number }[],
  ): {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
    sugars: number;
    sodium: number;
    satFat: number;
  } {
    // 1) Try labelNutrients first (Branded, etc.)
    const fromLabel = this.extractNutrientsFromLabel(food);
    if (
      fromLabel &&
      (fromLabel.calories || fromLabel.protein || fromLabel.fat || fromLabel.carbs)
    ) {
      return {
        calories: fromLabel.calories || 0,
        protein: fromLabel.protein || 0,
        fat: fromLabel.fat || 0,
        carbs: fromLabel.carbs || 0,
        fiber: fromLabel.fiber || 0,
        sugars: fromLabel.sugars || 0,
        sodium: fromLabel.sodium || 0,
        satFat: fromLabel.satFat || 0,
      };
    }

    // 2) Fallback – use DB nutrients (foodNutrient rows) if available
    const source = dbNutrients ?? this.mapFoodNutrients(food);
    const byId = new Map<number, number>();
    for (const n of source) {
      if (!Number.isFinite(n.nutrientId)) continue;
      const prev = byId.get(n.nutrientId) ?? 0;
      byId.set(n.nutrientId, prev + (n.amount ?? 0));
    }

    const get = (id: number): number => byId.get(id) ?? 0;

    const calories = get(1008); // Energy (kcal)
    const protein = get(1003);
    const fat = get(1004);
    const carbs = get(1005);
    const fiber = get(1079);
    const sugars = get(2000);
    const sodium = get(1093);
    const satFat = get(1258); // Fatty acids, total saturated

    return {
      calories,
      protein,
      fat,
      carbs,
      fiber,
      sugars,
      sodium,
      satFat,
    };
  }

  /**
   * Rehydrate foods that have no nutrients saved in the database
   * Fetches them from USDA API and saves their nutrients
   */
  async rehydrateFoodsWithoutNutrients(
    limit = 100,
  ): Promise<{ total: number; fixed: number; stillEmpty: number }> {
    // Find foods from USDA that have no nutrients
    // Using Prisma relation filter to find foods without any FoodNutrient records
    const foods = await this.prisma.food.findMany({
      where: {
        source: {
          in: [FoodSource.USDA_API, FoodSource.USDA_LOCAL],
        },
        nutrients: {
          none: {},
        },
      },
      take: limit,
      select: {
        id: true,
        fdcId: true,
        description: true,
        dataType: true,
      },
    });

    let fixed = 0;
    let stillEmpty = 0;

    this.logger.log(`[HybridService] Rehydrate: found ${foods.length} foods without nutrients`);

    for (const food of foods) {
      try {
        const fdcId = food.fdcId;
        if (!fdcId) {
          this.logger.warn('[HybridService] Rehydrate: food without fdcId', { foodId: food.id });
          continue;
        }

        // Fetch full data from USDA API
        const apiFood = await this.fdcApi.getFood(fdcId);

        if (!apiFood) {
          this.logger.warn('[HybridService] Rehydrate: API returned no data', {
            foodId: food.id,
            fdcId,
          });
          stillEmpty++;
          continue;
        }

        // Map nutrients using existing method
        const mapped = this.mapFoodNutrients(apiFood);

        if (!mapped.length) {
          this.logger.warn('[HybridService] Rehydrate: still no nutrients', {
            fdcId: food.fdcId,
            foodId: food.id,
            description: food.description,
            dataType: food.dataType,
            foodNutrientsCount: (apiFood.foodNutrients || []).length,
          });
          stillEmpty++;
          continue;
        }

        // Clean existing nutrients and create new ones
        await this.prisma.foodNutrient.deleteMany({ where: { foodId: food.id } });
        await this.prisma.foodNutrient.createMany({
          data: mapped.map((n) => ({
            foodId: food.id,
            nutrientId: n.nutrientId,
            amount: n.amount,
          })),
          skipDuplicates: true,
        });

        fixed++;
        this.logger.debug('[HybridService] Rehydrate: saved nutrients', {
          foodId: food.id,
          fdcId,
          nutrientsCount: mapped.length,
        });
      } catch (error: any) {
        this.logger.error('[HybridService] Rehydrate: failed to rehydrate food', {
          foodId: food.id,
          fdcId: food.fdcId,
          error: error.message,
          stack: error.stack,
        });
        stillEmpty++;
      }
    }

    this.logger.log('[HybridService] Rehydrate summary', {
      total: foods.length,
      fixed,
      stillEmpty,
    });

    return { total: foods.length, fixed, stillEmpty };
  }
}

