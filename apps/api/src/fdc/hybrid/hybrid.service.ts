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
  ) { }

  /**
   * Find foods by text query using Postgres FTS + API fallback
   * @param query Search query
   * @param k Number of results to return
   * @param minScore Minimum score threshold
   * @param expectedCategory Optional hint: 'drink' | 'solid' | 'unknown' to improve matching
   */
  async findByText(query: string, k = 10, minScore = 0.6, expectedCategory?: 'drink' | 'solid' | 'unknown'): Promise<any[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    try {
      const results = await this.textSearch(normalizedQuery, k * 2);
      const filtered = results.filter((r) => r.score >= minScore).slice(0, k);
      const reranked = await this.rerankResults(filtered, normalizedQuery, expectedCategory);

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

  /**
   * Check if description clearly indicates a dessert or yogurt product
   */
  private isClearlyDessertOrYogurt(desc: string): boolean {
    const d = desc.toLowerCase();
    return [
      'yogurt', 'yoghurt', 'ice cream', 'parfait', 'dessert',
      'pudding', 'gelato', 'sorbet', 'tiramisu', 'cheesecake',
      'mousse', 'custard', 'flan',
    ].some(k => d.includes(k));
  }

  /**
   * Check if description likely indicates plain coffee or tea (not dessert)
   */
  private isLikelyPlainCoffeeOrTea(desc: string): boolean {
    const d = desc.toLowerCase();
    return (
      (d.includes('coffee') || d.includes('espresso') || d.includes('cappuccino') ||
        d.includes('latte') || d.includes('tea') || d.includes('chai') || d.includes('matcha')) &&
      !this.isClearlyDessertOrYogurt(desc)
    );
  }

  private async rerankResults(results: any[], query: string, expectedCategory?: 'drink' | 'solid' | 'unknown'): Promise<any[]> {
    // Simple reranking based on dataType priority and text match
    const typePriority: Record<string, number> = {
      'Branded': 4,
      'Foundation': 3,
      'FNDDS': 2,
      'SR Legacy': 1,
    };

    const queryLower = query.toLowerCase();
    const isDrinkQuery = expectedCategory === 'drink' ||
      ['coffee', 'latte', 'cappuccino', 'espresso', 'mocha', 'tea', 'chai', 'matcha',
        'juice', 'smoothie', 'shake', 'soda', 'cola', 'milk', 'drink', 'beverage',
        'кофе', 'чай', 'сок', 'газировка', 'напиток', 'молоко'].some(k => queryLower.includes(k));

    return results
      .map(r => {
        const desc = (r.description || '').toLowerCase();
        let penalty = 0;

        // Penalize dessert/yogurt matches for drink queries
        if (isDrinkQuery) {
          if (this.isClearlyDessertOrYogurt(desc)) {
            penalty += 2; // Strong penalty
          } else if (!this.isLikelyPlainCoffeeOrTea(desc) &&
            (desc.includes('yogurt') || desc.includes('ice cream'))) {
            penalty += 1; // Moderate penalty
          }
        }

        return {
          ...r,
          priority: (typePriority[r.dataType] || 0) - penalty,
          textMatch: desc.includes(queryLower) ? 1 : 0,
        };
      })
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
      // Not all errors are critical - timeouts are expected
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        this.logger.debug(`[HybridService] API fallback timeout for "${query}"`);
      } else {
        this.logger.warn(`[HybridService] API fallback error for "${query}": ${error.message}`);
      }
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

        // Filter by existing Nutrient IDs to avoid FK violations in production
        const uniqueIds = Array.from(
          new Set(mapped.map((n) => n.nutrientId).filter((id) => Number.isFinite(id))),
        ) as number[];

        if (uniqueIds.length === 0) {
          this.logger.warn(
            '[HybridService] Skipping nutrient persistence: no valid nutrientIds after mapping',
            {
              fdcId: food.fdcId,
              description: foodData.description,
            },
          );
        } else {
          const existing = await this.prisma.nutrient.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true },
          });
          const existingIds = new Set(existing.map((n) => n.id));

          // CRITICAL FIX: Create missing core nutrients before saving FoodNutrient
          // Core nutrient IDs that must exist for proper calorie tracking
          const coreNutrientIds = [1003, 1004, 1005, 1008, 1079, 2000, 1093, 1258, 2047];
          const missingCoreIds = coreNutrientIds.filter(id => uniqueIds.includes(id) && !existingIds.has(id));

          if (missingCoreIds.length > 0) {
            this.logger.warn('[HybridService] Creating missing core nutrients in DB', { missingCoreIds });

            // Create missing core nutrients with minimal info
            const nutrientDefaults: Record<number, { name: string; unitName: string; number: string }> = {
              1003: { name: 'Protein', unitName: 'G', number: '203' },
              1004: { name: 'Total lipid (fat)', unitName: 'G', number: '204' },
              1005: { name: 'Carbohydrate, by difference', unitName: 'G', number: '205' },
              1008: { name: 'Energy', unitName: 'KCAL', number: '208' },
              1079: { name: 'Fiber, total dietary', unitName: 'G', number: '291' },
              2000: { name: 'Sugars, total including NLEA', unitName: 'G', number: '269' },
              1093: { name: 'Sodium, Na', unitName: 'MG', number: '307' },
              1258: { name: 'Fatty acids, total saturated', unitName: 'G', number: '606' },
              2047: { name: 'Energy (Atwater General Factors)', unitName: 'KCAL', number: '957' },
            };

            for (const id of missingCoreIds) {
              const def = nutrientDefaults[id];
              if (def) {
                await this.prisma.nutrient.upsert({
                  where: { id },
                  update: {},
                  create: { id, name: def.name, unitName: def.unitName, number: def.number },
                });
                existingIds.add(id);
              }
            }
          }

          const safeNutrients = mapped.filter((n) => existingIds.has(n.nutrientId));

          if (!safeNutrients.length) {
            this.logger.debug(
              '[HybridService] No matching nutrients in DB for mapped food nutrients, skipping save',
              {
                fdcId: food.fdcId,
                description: foodData.description,
                triedIds: uniqueIds,
              },
            );
          } else {
            await this.prisma.foodNutrient.createMany({
              data: safeNutrients.map((n) => ({
                foodId: food.id,
                nutrientId: n.nutrientId,
                amount: n.amount, // allowed to be 0, это норма
              })),
              skipDuplicates: true,
            });
          }
        }
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

    /**
     * USDA nutrient.number → nutrientId mapping
     * nutrient.number is NOT the same as nutrientId!
     * Example: Energy (kcal) has number=208 but nutrientId=1008
     */
    const NUTRIENT_NUMBER_TO_ID: Record<string, number> = {
      '208': 1008,  // Energy (kcal)
      '268': 2047,  // Energy (kJ)
      '203': 1003,  // Protein
      '204': 1004,  // Total lipid (fat)
      '205': 1005,  // Carbohydrate, by difference
      '291': 1079,  // Fiber, total dietary
      '269': 2000,  // Sugars, Total
      '307': 1093,  // Sodium, Na
      '606': 1258,  // Fatty acids, total saturated
    };

    const resolveNutrientId = (fn: any): number | null => {
      if (!fn) return null;

      // Priority 1: fn.nutrient.id (this IS the nutrientId)
      if (fn.nutrient?.id) return Number(fn.nutrient.id);

      // Priority 2: fn.nutrientId (this IS the nutrientId)
      if (fn.nutrientId) return Number(fn.nutrientId);

      // Priority 3: fn.nutrient.number (this is NOT nutrientId - must map!)
      if (fn.nutrient?.number) {
        const numStr = String(fn.nutrient.number);

        // If number >= 1000, it's probably already a nutrientId (rare but possible)
        const numVal = Number(numStr);
        if (numVal >= 1000 && Number.isFinite(numVal)) {
          return numVal;
        }

        // Map known numbers to nutrientIds
        const mappedId = NUTRIENT_NUMBER_TO_ID[numStr];
        if (mappedId) {
          return mappedId;
        }

        // Unknown number - return null (better to lose nutrient than corrupt data)
        return null;
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

    let calories = get(1008); // Energy (kcal)

    // Fallback 1: if kcal not available but kJ is, convert kJ → kcal
    if (calories === 0) {
      const energyKJ = get(2047); // Energy (kJ)
      if (energyKJ > 0) {
        calories = Math.round(energyKJ / 4.184);
      }
    }

    const protein = get(1003);
    const fat = get(1004);
    const carbs = get(1005);
    const fiber = get(1079);
    const sugars = get(2000);
    const sodium = get(1093);
    const satFat = get(1258); // Fatty acids, total saturated

    // Fallback 2: if still no calories but macros exist, derive from macros
    // kcal = protein*4 + carbs*4 + fat*9
    if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
      const derivedCal = Math.round(protein * 4 + carbs * 4 + fat * 9);
      if (derivedCal > 0) {
        calories = derivedCal;
        if (process.env.ANALYSIS_DEBUG === 'true') {
          console.log(`[HybridService] Derived calories from macros: ${derivedCal} (P:${protein} C:${carbs} F:${fat})`);
        }
      }
    }

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

