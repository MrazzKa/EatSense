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
      await this.prisma.foodNutrient.deleteMany({ where: { foodId: food.id } });
      const savedNutrients = await this.prisma.foodNutrient.createMany({
        data: foodData.foodNutrients
          .filter((fn: any) => fn.nutrient && fn.amount !== null && fn.amount > 0)
          .map((fn: any) => ({
            foodId: food.id,
            nutrientId: fn.nutrient.id,
            amount: fn.amount || 0,
          })),
      });
      
      // Task 1: Log warning if no nutrients were saved despite having foodNutrients array
      if (savedNutrients.count === 0 && foodData.foodNutrients.length > 0) {
        this.logger.warn('[HybridService] Food saved but no nutrients persisted', {
          fdcId: food.fdcId,
          description: food.description,
          dataType: food.dataType,
          foodNutrientsCount: foodData.foodNutrients.length,
          reason: 'All nutrients filtered out (null/zero amounts or missing nutrient.id)',
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
    const nutrients = this.extractNutrients(food);
    
    return {
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      source: food.source,
      portions: food.portions || [],
      nutrients: {
        calories: nutrients.calories,
        protein: nutrients.protein,
        fat: nutrients.fat,
        carbs: nutrients.carbs,
        fiber: nutrients.fiber,
        sugars: nutrients.sugars,
        sodium: nutrients.sodium,
        satFat: nutrients.satFat || 0, // BUG 2: Add satFat
      },
    };
  }

  // BUG 3: Extract label value from nested structure or direct value
  private extractLabelValue(labelField: any): number {
    if (labelField === null || labelField === undefined) return 0;
    if (typeof labelField === 'number') return labelField;
    if (typeof labelField === 'object' && labelField.value !== undefined) {
      return labelField.value;
    }
    return 0;
  }

  private extractNutrients(food: any): any {
    // Priority: LabelNutrients > FoodNutrient (1008 Energy) > FoodNutrient (Atwater 2047/2048)
    if (food.label) {
      // BUG 3: Handle nested structure { "calories": { "value": 203 } }
      const fatValue = this.extractLabelValue(food.label.fat);
      return {
        calories: this.extractLabelValue(food.label.calories),
        protein: this.extractLabelValue(food.label.protein),
        fat: fatValue,
        carbs: this.extractLabelValue(food.label.carbohydrates),
        fiber: this.extractLabelValue(food.label.fiber),
        sugars: this.extractLabelValue(food.label.sugars),
        sodium: this.extractLabelValue(food.label.sodium),
        // Task 2: Add satFat from label or estimate from fat (only if fat > 0)
        satFat: this.extractLabelValue(food.label.saturatedFat) || (fatValue > 0 ? fatValue * 0.35 : 0),
      };
    }

    // Extract from FoodNutrient
    const nutrients = food.nutrients || [];
    
    // Energy (kcal): primary 1008, then Atwater 2047/2048
    const energy =
      nutrients.find((n: any) => n.nutrientId === 1008) ||
      nutrients.find((n: any) => n.nutrientId === 2047 || n.nutrientId === 2048);
    
    // Macros: 1003 (protein), 1004 (fat), 1005 (carbs)
    const protein = nutrients.find((n: any) => n.nutrientId === 1003);
    const fat = nutrients.find((n: any) => n.nutrientId === 1004);
    const carbs = nutrients.find((n: any) => n.nutrientId === 1005);
    // Fiber: 1079 (Fiber, total dietary)
    const fiber = nutrients.find((n: any) => n.nutrientId === 1079);
    // Sugars: 2000 (Sugars, total)
    const sugars = nutrients.find((n: any) => n.nutrientId === 2000);
    // Sodium: 1093 (Sodium, Na)
    const sodium = nutrients.find((n: any) => n.nutrientId === 1093);
    // BUG 2: Saturated Fat: 1258 (Fatty acids, total saturated)
    const satFat = nutrients.find((n: any) => n.nutrientId === 1258);

    const fatAmount = fat?.amount || 0;
    return {
      calories: energy?.amount || 0,
      protein: protein?.amount || 0,
      fat: fatAmount,
      carbs: carbs?.amount || 0,
      fiber: fiber?.amount || 0,
      sugars: sugars?.amount || 0,
      sodium: sodium?.amount || 0,
      // Task 2: Add satFat from nutrients or estimate from fat (only if fat > 0)
      satFat: satFat?.amount || (fatAmount > 0 ? fatAmount * 0.35 : 0),
    };
  }
}

