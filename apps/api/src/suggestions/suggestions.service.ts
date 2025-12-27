import { Injectable, Logger } from '@nestjs/common';
import { StatsService } from '../../stats/stats.service';
import { PrismaService } from '../../prisma.service';

export interface SuggestedFoodItem {
  id: string;
  name: string;
  category: 'protein' | 'fiber' | 'healthy_fat' | 'carb' | 'general';
  reason: string;
  tip: string;
  locale?: 'en' | 'ru' | 'kk'; // P2.4: Add locale support
}

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);

  constructor(
    private readonly statsService: StatsService,
    private readonly prisma: PrismaService,
  ) { }

  /**
   * P2.4: Improved personalization with user profile, goals, preferences, and history
   */
  async getSuggestedFoodsForUser(userId: string, locale: 'en' | 'ru' | 'kk' = 'en'): Promise<SuggestedFoodItem[]> {
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

    // P2.4: Get user profile for personalization
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const goal = (userProfile?.goal as string) || 'maintain_weight';
    const preferences = (userProfile?.preferences as any) || {};
    const dietaryPreferences = preferences.dietaryPreferences || [];
    const allergies = preferences.allergies || [];

    // P2.4: Get recent food history to avoid repetition
    const recentFoodNames = new Set<string>();
    meals.slice(0, 20).forEach((meal) => {
      meal.items.forEach((item) => {
        recentFoodNames.add(item.name.toLowerCase());
      });
    });

    // P2.4: Localized food suggestions
    const localizedFoods = this.getLocalizedFoods(locale, dietaryPreferences, allergies, recentFoodNames);

    const suggestions: SuggestedFoodItem[] = [];

    // Collect stats for personalized messages
    const userStats = {
      proteinPerc: avgProteinPerc,
      fatPerc: avgFatPerc,
      carbPerc: avgCarbPerc,
      fiberGrams: avgFiberGrams,
    };

    // P2.4: Personalized thresholds based on goal
    const proteinThreshold = goal === 'lose_weight' ? 20 : goal === 'gain_weight' ? 25 : 18;
    const fatThreshold = goal === 'lose_weight' ? 30 : 35;
    const carbThreshold = goal === 'lose_weight' ? 50 : 55;

    // Protein suggestions
    if (avgProteinPerc < proteinThreshold) {
      const foods = this.filterFoodsByPreferences(
        localizedFoods.protein,
        dietaryPreferences,
        allergies,
        recentFoodNames,
      );
      if (foods.length > 0) {
        suggestions.push({
          id: 'high_protein',
          name: foods.join(', '),
          category: 'protein',
          reason: this.getLocalizedReason('low_protein', locale, goal, userStats),
          tip: this.getLocalizedTip('protein', locale, goal),
          locale,
        });
      }
    }

    // Fat suggestions
    if (avgFatPerc > fatThreshold) {
      const foods = this.filterFoodsByPreferences(
        localizedFoods.healthyFat,
        dietaryPreferences,
        allergies,
        recentFoodNames,
      );
      if (foods.length > 0) {
        suggestions.push({
          id: 'lower_fat',
          name: foods.join(', '),
          category: 'healthy_fat',
          reason: this.getLocalizedReason('high_fat', locale, goal, userStats),
          tip: this.getLocalizedTip('fat', locale, goal),
          locale,
        });
      }
    }

    // Fiber suggestions
    if (avgFiberGrams < 20) {
      const foods = this.filterFoodsByPreferences(
        localizedFoods.fiber,
        dietaryPreferences,
        allergies,
        recentFoodNames,
      );
      if (foods.length > 0) {
        suggestions.push({
          id: 'more_fiber',
          name: foods.join(', '),
          category: 'fiber',
          reason: this.getLocalizedReason('low_fiber', locale, goal, userStats),
          tip: this.getLocalizedTip('fiber', locale, goal),
          locale,
        });
      }
    }

    // Carb suggestions
    if (avgCarbPerc > carbThreshold) {
      const foods = this.filterFoodsByPreferences(
        localizedFoods.carb,
        dietaryPreferences,
        allergies,
        recentFoodNames,
      );
      if (foods.length > 0) {
        suggestions.push({
          id: 'carb_balance',
          name: foods.join(', '),
          category: 'carb',
          reason: this.getLocalizedReason('high_carb', locale, goal, userStats),
          tip: this.getLocalizedTip('carb', locale, goal),
          locale,
        });
      }
    }

    // P2.4: If balanced, suggest variety
    if (suggestions.length === 0) {
      const balancedName = locale === 'ru'
        ? 'Рацион в целом сбалансирован'
        : locale === 'kk'
          ? 'Рацион жалпы теңгерілген'
          : 'Your diet is well balanced';
      suggestions.push({
        id: 'balanced',
        name: balancedName,
        category: 'general',
        reason: this.getLocalizedReason('balanced', locale, goal, userStats),
        tip: this.getLocalizedTip('balanced', locale, goal),
        locale,
      });
    }

    // P2.4: Sort by priority (most needed first)
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * P2.4: Filter foods by dietary preferences and allergies, avoid recent foods
   */
  private filterFoodsByPreferences(
    foods: string[],
    dietaryPreferences: string[],
    allergies: string[],
    recentFoods: Set<string>,
  ): string[] {
    return foods
      .filter((food) => {
        const foodLower = food.toLowerCase();
        // Skip if recently consumed
        if (recentFoods.has(foodLower)) return false;

        // Filter by dietary preferences
        if (dietaryPreferences.includes('vegetarian') && this.isMeat(foodLower)) return false;
        if (dietaryPreferences.includes('vegan') && (this.isMeat(foodLower) || this.isDairy(foodLower))) return false;
        if (dietaryPreferences.includes('gluten_free') && this.containsGluten(foodLower)) return false;

        // Filter by allergies
        for (const allergy of allergies) {
          if (foodLower.includes(allergy.toLowerCase())) return false;
        }

        return true;
      })
      .slice(0, 3); // Return top 3
  }

  private isMeat(food: string): boolean {
    const meatKeywords = ['chicken', 'beef', 'pork', 'meat', 'turkey', 'курица', 'говядина', 'свинина', 'мясо'];
    return meatKeywords.some((keyword) => food.includes(keyword));
  }

  private isDairy(food: string): boolean {
    const dairyKeywords = ['milk', 'cheese', 'yogurt', 'dairy', 'молоко', 'сыр', 'йогурт'];
    return dairyKeywords.some((keyword) => food.includes(keyword));
  }

  private containsGluten(food: string): boolean {
    const glutenKeywords = ['wheat', 'bread', 'pasta', 'gluten', 'пшеница', 'хлеб', 'макароны'];
    return glutenKeywords.some((keyword) => food.includes(keyword));
  }

  /**
   * P2.4: Get localized food names
   */
  private getLocalizedFoods(locale: 'en' | 'ru' | 'kk', dietaryPreferences: string[], allergies: string[], recentFoods: Set<string>): {
    protein: string[];
    healthyFat: string[];
    fiber: string[];
    carb: string[];
  } {
    const foods = {
      en: {
        protein: ['Greek yogurt', 'cottage cheese', 'chicken breast', 'eggs', 'salmon', 'tofu', 'lentils'],
        healthyFat: ['lean meat', 'fish', 'avocado', 'nuts', 'olive oil'],
        fiber: ['vegetables', 'fruits', 'whole grains', 'legumes', 'berries'],
        carb: ['oats', 'buckwheat', 'quinoa', 'sweet potato', 'brown rice'],
      },
      ru: {
        protein: ['греческий йогурт', 'творог', 'куриная грудка', 'яйца', 'лосось', 'тофу', 'чечевица'],
        healthyFat: ['постное мясо', 'рыба', 'авокадо', 'орехи', 'оливковое масло'],
        fiber: ['овощи', 'фрукты', 'цельнозерновые продукты', 'бобовые', 'ягоды'],
        carb: ['овсянка', 'гречка', 'киноа', 'батат', 'бурый рис'],
      },
      kk: {
        protein: ['грекалық йогурт', 'ірімшік', 'тауық кеудесі', 'жұмыртқа', 'лосось', 'тофу', 'бұршақ'],
        healthyFat: ['азық ет', 'балық', 'авокадо', 'жаңғақ', 'зейтүн майы'],
        fiber: ['көкөністер', 'жемістер', 'толық дәндер', 'бұршақ', 'жидектер'],
        carb: ['бұршақ', 'қарақұмық', 'киноа', 'тәтті картоп', 'қоңыр күріш'],
      },
    };

    return foods[locale] || foods.en;
  }

  /**
   * P2.4: Get localized reason messages with actual stats
   */
  private getLocalizedReason(
    type: string,
    locale: 'en' | 'ru' | 'kk',
    goal: string,
    stats?: { proteinPerc?: number; fatPerc?: number; carbPerc?: number; fiberGrams?: number }
  ): string {
    const proteinPerc = stats?.proteinPerc ? Math.round(stats.proteinPerc) : 0;
    const fatPerc = stats?.fatPerc ? Math.round(stats.fatPerc) : 0;
    const carbPerc = stats?.carbPerc ? Math.round(stats.carbPerc) : 0;
    const fiberGrams = stats?.fiberGrams ? Math.round(stats.fiberGrams) : 0;

    const reasons = {
      en: {
        low_protein: `Your protein is ${proteinPerc}% of calories (target: ${goal === 'lose_weight' ? '25%+' : '20%+'}).`,
        high_fat: `Fat intake is ${fatPerc}% of calories (target: below ${goal === 'lose_weight' ? '30%' : '35%'}).`,
        low_fiber: `Fiber intake is ${fiberGrams}g/day (recommended: 25-30g).`,
        high_carb: `Carbs are ${carbPerc}% of calories (target: below ${goal === 'lose_weight' ? '45%' : '50%'}).`,
        balanced: 'Great job! Your nutrition is well balanced for the last 7 days.',
      },
      ru: {
        low_protein: `Белок составляет ${proteinPerc}% от калорий (цель: ${goal === 'lose_weight' ? '25%+' : '20%+'}).`,
        high_fat: `Жиры составляют ${fatPerc}% от калорий (цель: ниже ${goal === 'lose_weight' ? '30%' : '35%'}).`,
        low_fiber: `Клетчатка: ${fiberGrams}г/день (рекомендуется: 25-30г).`,
        high_carb: `Углеводы: ${carbPerc}% от калорий (цель: ниже ${goal === 'lose_weight' ? '45%' : '50%'}).`,
        balanced: 'Отлично! Ваше питание сбалансировано за последние 7 дней.',
      },
      kk: {
        low_protein: `Ақуыз калориялардың ${proteinPerc}% құрайды (мақсат: ${goal === 'lose_weight' ? '25%+' : '20%+'}).`,
        high_fat: `Майлар калориялардың ${fatPerc}% құрайды (мақсат: ${goal === 'lose_weight' ? '30%' : '35%'} төмен).`,
        low_fiber: `Талшық: ${fiberGrams}г/күн (ұсынылады: 25-30г).`,
        high_carb: `Көмірсулар: ${carbPerc}% калориялардан (мақсат: ${goal === 'lose_weight' ? '45%' : '50%'} төмен).`,
        balanced: 'Керемет! Соңғы 7 күнде тамақтануыңыз теңгерілген.',
      },
    };

    return reasons[locale]?.[type] || reasons.en[type] || '';
  }

  /**
   * P2.4: Get localized tip messages
   */
  private getLocalizedTip(category: string, locale: 'en' | 'ru' | 'kk', goal: string): string {
    const tips = {
      en: {
        protein: goal === 'lose_weight'
          ? 'Add a protein portion to each meal (yogurt, eggs, cottage cheese, poultry) to support metabolism.'
          : goal === 'gain_weight'
            ? 'Increase protein intake with lean sources (chicken, fish, legumes) to support muscle growth.'
            : 'Add a protein portion to each meal (yogurt, eggs, cottage cheese, poultry).',
        fat: 'Choose lean protein sources more often and reduce added oils in cooking.',
        fiber: 'Add vegetables to every meal and choose whole grain bread/cereals.',
        carb: 'Shift focus from simple carbs to complex ones (oats, buckwheat, legumes).',
        balanced: 'Keep up the good work and maintain food variety.',
      },
      ru: {
        protein: goal === 'lose_weight'
          ? 'Добавь порцию белка в каждый приём пищи (йогурт, яйца, творог, птица) для поддержания метаболизма.'
          : goal === 'gain_weight'
            ? 'Увеличь потребление белка из постных источников (курица, рыба, бобовые) для роста мышц.'
            : 'Добавь порцию белкового продукта в каждый приём пищи (йогурт, яйца, творог, птица).',
        fat: 'Чаще выбирай постные источники белка и убирай лишнее масло при приготовлении.',
        fiber: 'Добавляй овощи к каждому приёму пищи и выбирай цельнозерновой хлеб/крупы.',
        carb: 'Смести фокус с быстрых углеводов на сложные (овсянка, гречка, фасоль).',
        balanced: 'Продолжай в том же духе и следи за разнообразием продуктов.',
      },
      kk: {
        protein: goal === 'lose_weight'
          ? 'Әр тамақта ақуыз порциясын қосыңыз (йогурт, жұмыртқа, ірімшік, құс) метаболизмді қолдау үшін.'
          : goal === 'gain_weight'
            ? 'Бұлшықет өсуін қолдау үшін азық көздерден (тауық, балық, бұршақ) ақуыз тұтынуды арттырыңыз.'
            : 'Әр тамақта ақуыз өнімінің порциясын қосыңыз (йогурт, жұмыртқа, ірімшік, құс).',
        fat: 'Жиі азық ақуыз көздерін таңдап, дайындау кезінде артық майды алып тастаңыз.',
        fiber: 'Әр тамаққа көкөністерді қосып, толық дән нан/крупаларды таңдаңыз.',
        carb: 'Жедел көмірсулардан күрделілерге ауысыңыз (бұршақ, қарақұмық, бұршақ).',
        balanced: 'Жақсы жұмысты жалғастырып, тағам алуантүрлілігін сақтаңыз.',
      },
    };

    return tips[locale]?.[category] || tips.en[category] || '';
  }
}

