import { Injectable, NotFoundException, BadRequestException, Logger, Inject, Optional, ForbiddenException } from '@nestjs/common';
import { MealLogMealType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateMealDto, UpdateMealItemDto, EditMealItemsDto } from './dto';
import { CacheService } from '../src/cache/cache.service';
import { AnalyzeService } from '../src/analysis/analyze.service';

@Injectable()
export class MealsService {
  private readonly logger = new Logger(MealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzeService: AnalyzeService,
    @Optional() @Inject(CacheService) private readonly cache?: CacheService,
  ) { }

  /**
   * Edit items of a meal that has no underlying Analysis (legacy meals).
   * Replaces mealItem rows, recomputes totals + health score directly.
   * For meals with analysisId, the frontend should call /food/analysis/:id/manual-reanalyze instead.
   */
  async editMealItems(userId: string, mealId: string, dto: EditMealItemsDto) {
    const meal = await this.prisma.meal.findFirst({
      where: { id: mealId, userId },
      include: { items: true },
    });
    if (!meal) {
      throw new ForbiddenException('Meal not found or access denied');
    }
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Meal must have at least one item');
    }

    const locale = (dto.locale as any) || 'en';

    // Build analyzed items shape for health score computation
    // For ingredients with all-zero macros, attempt USDA lookup (same as manualReanalyze).
    const analyzedItems = await Promise.all(dto.items.map(async (it, idx) => {
      const portion = Math.max(1, Number(it.portion_g) || 1);
      let calories = Math.max(0, Number(it.calories) || 0);
      let protein = Math.max(0, Number(it.protein_g) || 0);
      let fat = Math.max(0, Number(it.fat_g) || 0);
      let carbs = Math.max(0, Number(it.carbs_g) || 0);
      let fiber = 0, sugars = 0, satFat = 0;

      const allZero = calories === 0 && protein === 0 && fat === 0 && carbs === 0;
      if (allZero && it.name) {
        const looked = await this.analyzeService.lookupNutritionForName(it.name, portion, locale);
        if (looked) {
          calories = looked.calories;
          protein = looked.protein;
          carbs = looked.carbs;
          fat = looked.fat;
          fiber = looked.fiber;
          sugars = looked.sugars;
          satFat = looked.satFat;
          this.logger.log(`[editMealItems] Auto-filled nutrition for "${it.name}" via ${looked.provider}`);
        }
      }

      return {
        id: it.id || `meal-item-${idx}`,
        name: it.name,
        originalName: it.name,
        portion_g: portion,
        nutrients: {
          calories,
          protein,
          carbs,
          fat,
          fiber,
          sugars,
          satFat,
          energyDensity: portion > 0 ? (calories / portion) * 100 : 0,
        },
        source: 'manual' as const,
        locale,
      };
    }));

    const totals = analyzedItems.reduce(
      (acc, it) => {
        acc.calories += it.nutrients.calories;
        acc.protein += it.nutrients.protein;
        acc.carbs += it.nutrients.carbs;
        acc.fat += it.nutrients.fat;
        acc.portion_g += it.portion_g;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, portion_g: 0, fiber: 0, sugars: 0, satFat: 0 } as any,
    );

    let healthScore: any = null;
    try {
      healthScore = this.analyzeService.computeHealthScore(totals as any, totals.portion_g, analyzedItems as any, locale);
    } catch (e: any) {
      this.logger.warn(`[editMealItems] computeHealthScore failed: ${e?.message}`);
    }

    // Replace items (use resolved nutrients from analyzedItems, not raw DTO,
    // so USDA-auto-filled values land in DB).
    await this.prisma.mealItem.deleteMany({ where: { mealId } });
    await this.prisma.meal.update({
      where: { id: mealId },
      data: {
        healthScore: healthScore?.score ?? healthScore?.total ?? null,
        healthGrade: healthScore?.grade ?? null,
        healthInsights: healthScore ?? null,
        items: {
          create: analyzedItems.map((it) => ({
            name: it.name || 'Unknown',
            calories: Math.round(it.nutrients.calories),
            protein: Math.round(it.nutrients.protein * 10) / 10,
            fat: Math.round(it.nutrients.fat * 10) / 10,
            carbs: Math.round(it.nutrients.carbs * 10) / 10,
            weight: Math.round(it.portion_g),
          })),
        },
      },
    });

    // Invalidate caches
    if (this.cache) {
      try {
        await this.cache.invalidateNamespace('stats:monthly', userId);
        await this.cache.invalidateNamespace('stats:daily' as any, userId);
        await this.cache.invalidateNamespace('meals:diary', userId);
      } catch {}
    }

    // Return shape compatible with frontend normalizeAnalysis (mirrors mapAnalysisResult shape)
    const ingredients = analyzedItems.map((it) => ({
      id: it.id,
      name: it.name,
      calories: it.nutrients.calories,
      protein: it.nutrients.protein,
      carbs: it.nutrients.carbs,
      fat: it.nutrients.fat,
      weight: it.portion_g,
      hasNutrition: true,
    }));

    return {
      mealId,
      analysisId: meal.analysisId || null,
      dishName: meal.name,
      totalCalories: Math.round(totals.calories),
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
      ingredients,
      data: { items: ingredients, total: totals, healthScore },
      healthScore,
      imageUrl: meal.imageUri || null,
    };
  }

  async getMeals(userId: string, date?: string) {
    const cacheKey = `${userId}:${date || 'latest'}`;

    if (this.cache) {
      const cached = await this.cache.get(cacheKey, 'meals:diary');
      if (cached) {
        return cached;
      }
    }

    const where: any = { userId };

    // Filter by date if provided (date should be in YYYY-MM-DD format)
    if (date) {
      try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          const startOfDay = new Date(dateObj);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(dateObj);
          endOfDay.setHours(23, 59, 59, 999);

          // Filter by consumedAt if available, otherwise by createdAt
          where.OR = [
            {
              consumedAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            {
              consumedAt: null,
              createdAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          ];
        }
      } catch (error) {
        this.logger.warn(`Invalid date parameter: ${date}`, error);
        // Continue without date filter if date is invalid
      }
    }

    const meals = await this.prisma.meal.findMany({
      where,
      include: {
        items: true,
      },
      // Order by consumedAt first (for diary), then createdAt as fallback
      orderBy: [
        { consumedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50, // Increased limit for better diary view (was 20)
    });

    // B: Map meals with calculated totals from items
    // Frontend expects totalCalories, totalProtein, totalCarbs, totalFat for Recent items
    const result = meals.map(meal => {
      // Calculate totals from items
      const totals = meal.items.reduce(
        (acc, item) => {
          acc.calories += item.calories || 0;
          acc.protein += item.protein || 0;
          acc.carbs += item.carbs || 0;
          acc.fat += item.fat || 0;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      // Map items to ingredients format for AnalysisResultsScreen
      const ingredients = meal.items.map(item => ({
        id: item.id,
        name: item.name || 'Unknown',
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        weight: item.weight || 0,
        hasNutrition: true,
      }));

      return {
        ...meal,
        imageUrl: meal.imageUri || null, // Use imageUri as imageUrl for frontend
        // STAGE 2 FIX: Add displayName = dishNameLocalized || name for UI
        displayName: (meal as any).dishNameLocalized || meal.name,
        dishNameLocalized: (meal as any).dishNameLocalized || null,
        originalDishName: (meal as any).originalDishName || null,
        // B: Add totals for frontend Recent items display
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        // Also keep legacy fields for backward compatibility
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        // Add ingredients alias for AnalysisResultsScreen compatibility
        ingredients,
        // Include health score data for AnalysisResultsScreen
        healthScore: meal.healthInsights || (meal.healthScore ? {
          score: meal.healthScore,
          grade: meal.healthGrade || 'C',
        } : null),
        healthInsights: meal.healthInsights || null,
      };
    });

    if (this.cache) {
      // Cache for 5 minutes (300s) - good balance between freshness and load
      await this.cache.set(cacheKey, result, 'meals:diary', 300);
    }

    return result;
  }

  async createMeal(userId: string, createMealDto: CreateMealDto) {
    const { items, consumedAt, healthScore: healthScorePayload, imageUri, analysisId, ...mealData } = createMealDto;

    // Валидация: проверяем, что есть хотя бы один item
    if (!items || items.length === 0) {
      throw new BadRequestException('Meal must have at least one item');
    }

    // Валидация: проверяем, что name существует
    if (!mealData.name || mealData.name.trim().length === 0) {
      throw new BadRequestException('Meal name is required');
    }

    // Преобразуем consumedAt из строки в Date, если передано
    const consumedAtDate = consumedAt ? new Date(consumedAt) : new Date();

    // Проверяем валидность даты
    if (isNaN(consumedAtDate.getTime())) {
      throw new BadRequestException('Invalid consumedAt date');
    }

    // Нормализуем type: 'meal' -> 'MEAL', или оставляем как есть
    const normalizedType = mealData.type?.toUpperCase() || 'MEAL';

    // Валидация и нормализация items
    const validItems = items
      .filter(item => item && (item.name || item.calories || item.protein || item.fat || item.carbs))
      .map(item => ({
        name: (item.name || 'Unknown').trim() || 'Unknown',
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        fat: Number(item.fat) || 0,
        carbs: Number(item.carbs) || 0,
        weight: Number(item.weight) || 0,
      }));

    if (validItems.length === 0) {
      throw new BadRequestException('Meal must have at least one valid item');
    }

    const meal = await this.prisma.meal.create({
      data: {
        userId,
        name: mealData.name.trim(),
        type: normalizedType,
        consumedAt: consumedAtDate,
        healthScore: healthScorePayload?.score ?? null,
        healthGrade: healthScorePayload?.grade ?? null,
        healthInsights: healthScorePayload ? (healthScorePayload as any) : null,
        imageUri: imageUri || null,
        analysisId: analysisId || null,
        items: {
          create: validItems,
        },
      },
      include: {
        items: true,
      },
    });

    // B2: Map imageUri to imageUrl for frontend consistency
    const mealWithImageUrl = {
      ...meal,
      imageUrl: meal.imageUri || null,
    };

    try {
      const mealLogType = this.mapMealTypeForLogging(normalizedType);
      const logEntries = meal.items.map((item) => {
        const calories = Number(item.calories) || 0;
        const protein = Number(item.protein) || 0;
        const fat = Number(item.fat) || 0;
        const carbs = Number(item.carbs) || 0;
        const weight = Number(item.weight) || null;
        const fdcId = (item as any)?.fdcId ?? null;

        return {
          userId,
          mealType: mealLogType,
          fdcId,
          label: item.name || meal.name,
          quantity: weight,
          unit: weight ? 'g' : null,
          calories,
          protein,
          fat,
          carbs,
          createdAt: consumedAtDate,
        };
      });

      if (logEntries.length) {
        await this.prisma.mealLog.createMany({
          data: logEntries,
        });
      }
    } catch (error: any) {
      this.logger.warn(`mealLog=failed userId=${userId} mealId=${meal.id} reason=${error.message}`);
    }

    // Invalidate stats cache and MEALS cache when meal is created
    if (this.cache) {
      try {
        await this.cache.invalidateNamespace('stats:monthly', userId);
        await this.cache.invalidateNamespace('stats:daily' as any, userId);
        await this.cache.invalidateNamespace('meals:diary', userId);
        await this.cache.invalidateNamespace('suggestions', userId);
      } catch (error: any) {
        this.logger.warn(`Failed to invalidate stats cache: ${error?.message || String(error)}`);
      }
    }

    // B2: Map imageUri to imageUrl for frontend consistency
    return {
      ...mealWithImageUrl,
      imageUrl: meal.imageUri || null,
    };
  }

  async updateMeal(userId: string, mealId: string, updateMealDto: Partial<CreateMealDto>) {
    // Verify meal belongs to user
    const meal = await this.prisma.meal.findFirst({
      where: { id: mealId, userId },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    const { items, healthScore: healthScorePayload, ...mealData } = updateMealDto;

    const updateData: any = { ...mealData };

    if (healthScorePayload) {
      updateData.healthScore = healthScorePayload.score ?? null;
      updateData.healthGrade = healthScorePayload.grade ?? null;
      updateData.healthInsights = healthScorePayload as any;
    }

    if (items) {
      // Delete existing items and create new ones
      await this.prisma.mealItem.deleteMany({
        where: { mealId },
      });

      updateData.items = {
        create: items.map(item => ({
          name: item.name || 'Unknown',
          calories: item.calories || 0,
          protein: item.protein || 0,
          fat: item.fat || 0,
          carbs: item.carbs || 0,
          weight: item.weight || 0,
        })),
      };
    }

    const updatedMeal = await this.prisma.meal.update({
      where: { id: mealId },
      data: updateData,
      include: { items: true },
    });

    // Invalidate stats cache when meal is updated
    if (this.cache) {
      try {
        await this.cache.invalidateNamespace('stats:monthly', userId);
        await this.cache.invalidateNamespace('stats:daily' as any, userId);
        await this.cache.invalidateNamespace('meals:diary', userId);
        await this.cache.invalidateNamespace('suggestions', userId);
      } catch (error: any) {
        this.logger.warn(`Failed to invalidate stats cache: ${error?.message || String(error)}`);
      }
    }

    // Task 5: Map imageUri to imageUrl for frontend consistency
    return {
      ...updatedMeal,
      imageUrl: updatedMeal.imageUri || null,
    };
  }

  async deleteMeal(userId: string, mealId: string) {
    // Verify meal belongs to user
    const meal = await this.prisma.meal.findFirst({
      where: { id: mealId, userId },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    await this.prisma.meal.delete({
      where: { id: mealId },
    });

    // Invalidate stats cache when meal is deleted
    if (this.cache) {
      try {
        await this.cache.invalidateNamespace('stats:monthly', userId);
        await this.cache.invalidateNamespace('stats:daily' as any, userId);
        await this.cache.invalidateNamespace('meals:diary', userId);
        await this.cache.invalidateNamespace('suggestions', userId);
      } catch (error: any) {
        this.logger.warn(`Failed to invalidate stats cache: ${error?.message || String(error)}`);
      }
    }

    return { message: 'Meal deleted successfully' };
  }

  async updateMealItem(userId: string, mealId: string, itemId: string, updateItemDto: UpdateMealItemDto) {
    // Verify meal belongs to user
    const meal = await this.prisma.meal.findFirst({
      where: { id: mealId, userId },
      include: { items: true },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    // Verify item belongs to meal
    const item = meal.items.find(i => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Meal item not found');
    }

    // Update the item
    const updated = await this.prisma.mealItem.update({
      where: { id: itemId },
      data: updateItemDto,
    });

    if (this.cache) {
      try {
        await this.cache.invalidateNamespace('meals:diary', userId);
        await this.cache.invalidateNamespace('suggestions', userId);
        // Also invalidate stats to be safe
        await this.cache.invalidateNamespace('stats:monthly', userId);
        await this.cache.invalidateNamespace('stats:daily' as any, userId);
      } catch (e) {
        this.logger.warn(`Failed to invalidate cache in updateMealItem: ${e}`);
      }
    }

    return updated;
  }

  private mapMealTypeForLogging(mealType: string): MealLogMealType {
    switch (mealType) {
      case 'BREAKFAST':
        return MealLogMealType.BREAKFAST;
      case 'DINNER':
        return MealLogMealType.DINNER;
      case 'LUNCH':
      case 'MEAL':
      default:
        return MealLogMealType.LUNCH;
    }
  }
}
