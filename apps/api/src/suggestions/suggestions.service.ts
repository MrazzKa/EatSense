import { Injectable } from '@nestjs/common';
import { StatsService } from '../../stats/stats.service';
import { PrismaService } from '../../prisma.service';

export interface SuggestedFoodItem {
  id: string;
  name: string;
  category: 'protein' | 'fiber' | 'healthy_fat' | 'carb' | 'general';
  reason: string;
  tip: string;
}

@Injectable()
export class SuggestionsService {
  constructor(
    private readonly statsService: StatsService,
    private readonly prisma: PrismaService,
  ) {}

  async getSuggestedFoodsForUser(userId: string): Promise<SuggestedFoodItem[]> {
    // Получаем данные за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    // Получаем статистику за 7 дней
    const stats = await this.statsService.getPersonalStats(
      userId,
      sevenDaysAgo.toISOString(),
      now.toISOString(),
    );

    const { totals } = stats;
    const daysCount = 7;
    const avgCalories = totals.calories / daysCount;
    const avgProtein = totals.protein / daysCount;
    const avgFat = totals.fat / daysCount;
    const avgCarbs = totals.carbs / daysCount;

    // Рассчитываем проценты от калорий
    const totalMacroCalories = avgProtein * 4 + avgCarbs * 4 + avgFat * 9;
    const avgProteinPerc = totalMacroCalories > 0 ? (avgProtein * 4 / totalMacroCalories) * 100 : 0;
    const avgFatPerc = totalMacroCalories > 0 ? (avgFat * 9 / totalMacroCalories) * 100 : 0;
    const avgCarbPerc = totalMacroCalories > 0 ? (avgCarbs * 4 / totalMacroCalories) * 100 : 0;

    // Получаем клетчатку из meals (если есть поле fiber)
    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        OR: [
          {
            consumedAt: {
              gte: sevenDaysAgo,
              lte: now,
            },
          },
          {
            consumedAt: null,
            createdAt: {
              gte: sevenDaysAgo,
              lte: now,
            },
          },
        ],
      },
      include: {
        items: true,
      },
    });

    const avgFiberGrams = meals.reduce((sum, meal) => {
      return sum + meal.items.reduce((mealSum, item) => mealSum + ((item as any).fiber || 0), 0);
    }, 0) / daysCount;

    const suggestions: SuggestedFoodItem[] = [];

    // Простые эвристики:
    if (avgProteinPerc < 18) {
      suggestions.push({
        id: 'high_protein',
        name: 'Греческий йогурт, творог, куриная грудка',
        category: 'protein',
        reason: 'В рационе мало белка по сравнению с целью.',
        tip: 'Добавь порцию белкового продукта в каждый приём пищи (йогурт, яйца, творог, птица).',
      });
    }

    if (avgFatPerc > 35) {
      suggestions.push({
        id: 'lower_fat',
        name: 'Постное мясо, рыба, обезжиренный творог',
        category: 'healthy_fat',
        reason: 'Доля жиров выше рекомендованного диапазона.',
        tip: 'Чаще выбирай постные источники белка и убирай лишнее масло при приготовлении.',
      });
    }

    if (avgFiberGrams < 20) {
      suggestions.push({
        id: 'more_fiber',
        name: 'Овощи, фрукты, цельнозерновые продукты',
        category: 'fiber',
        reason: 'Низкое потребление клетчатки.',
        tip: 'Добавляй овощи к каждому приёму пищи и выбирай цельнозерновой хлеб/крупы.',
      });
    }

    if (avgCarbPerc > 55) {
      suggestions.push({
        id: 'carb_balance',
        name: 'Крупы с низким гликемическим индексом, бобовые',
        category: 'carb',
        reason: 'Доля углеводов выше рекомендованного диапазона.',
        tip: 'Смести фокус с быстрых углеводов на сложные (овсянка, гречка, фасоль).',
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        id: 'balanced',
        name: 'Рацион в целом сбалансирован',
        category: 'general',
        reason: 'Профиль БЖУ в пределах нормы за последние 7 дней.',
        tip: 'Продолжай в том же духе и следи за разнообразием продуктов.',
      });
    }

    return suggestions;
  }
}

