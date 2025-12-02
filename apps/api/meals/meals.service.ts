import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, Optional } from '@nestjs/common';
import { MealLogMealType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateMealDto, UpdateMealItemDto } from './dto';
import { CacheService } from '../src/cache/cache.service';

@Injectable()
export class MealsService {
  private readonly logger = new Logger(MealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(CacheService) private readonly cache?: CacheService,
  ) {}

  async getMeals(userId: string, date?: string) {
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
      orderBy: { createdAt: 'desc' },
    });

    // B2: Map imageUri to imageUrl for frontend consistency
    return meals.map(meal => ({
      ...meal,
      imageUrl: meal.imageUri || null, // Use imageUri as imageUrl for frontend
    }));
  }

  async createMeal(userId: string, createMealDto: CreateMealDto) {
    const { items, consumedAt, healthScore: healthScorePayload, imageUri, ...mealData } = createMealDto;
    
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

    // Invalidate stats cache when meal is created
    if (this.cache) {
      try {
        await this.cache.invalidateNamespace('stats:monthly', userId);
        await this.cache.invalidateNamespace('stats:daily' as any, userId);
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
    return this.prisma.mealItem.update({
      where: { id: itemId },
      data: updateItemDto,
    });
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
