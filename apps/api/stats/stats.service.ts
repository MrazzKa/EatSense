import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../src/cache/cache.service';
import { MealLogMealType } from '@prisma/client';
import * as crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

// Calculate daily calories based on user profile or return default
function calculateDailyCalories(userProfile: any): number {
  if (!userProfile) return 2000; // Default for users without profile
  
  const { age, weight, height, gender, activityLevel, goal } = userProfile;
  
  if (!weight || !height || !age || !gender || !activityLevel) {
    return 2000; // Default if profile incomplete
  }
  
  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  // Apply activity multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };
  
  const tdee = bmr * (activityMultipliers[activityLevel] || 1.2);
  
  // Adjust for goal
  if (goal === 'lose_weight') {
    return Math.round(tdee * 0.85); // 15% deficit
  } else if (goal === 'gain_weight') {
    return Math.round(tdee * 1.15); // 15% surplus
  } else {
    return Math.round(tdee); // Maintenance
  }
}

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getDashboardStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's meals (use consumedAt if available, otherwise createdAt)
    const todayMeals = await this.prisma.meal.findMany({
      where: {
        userId,
        OR: [
          {
            consumedAt: {
              gte: today,
              lt: tomorrow,
            },
          },
          {
            consumedAt: null,
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        ],
      },
      include: {
        items: true,
      },
    });

    // Get user profile for personalized goals
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    // Calculate totals
    const totalCalories = todayMeals.reduce((sum, meal) => {
      return sum + meal.items.reduce((mealSum, item) => mealSum + item.calories, 0);
    }, 0);

    const totalProtein = todayMeals.reduce((sum, meal) => {
      return sum + meal.items.reduce((mealSum, item) => mealSum + item.protein, 0);
    }, 0);

    const totalFat = todayMeals.reduce((sum, meal) => {
      return sum + meal.items.reduce((mealSum, item) => mealSum + item.fat, 0);
    }, 0);

    const totalCarbs = todayMeals.reduce((sum, meal) => {
      return sum + meal.items.reduce((mealSum, item) => mealSum + item.carbs, 0);
    }, 0);

    // Calculate personalized goals
    const dailyCalories = calculateDailyCalories(userProfile);
    const dailyProtein = Math.round(dailyCalories * 0.3 / 4); // 30% of calories from protein
    const dailyFat = Math.round(dailyCalories * 0.25 / 9); // 25% from fat
    const dailyCarbs = Math.round(dailyCalories * 0.45 / 4); // 45% from carbs

    return {
      today: {
        calories: totalCalories,
        protein: totalProtein,
        fat: totalFat,
        carbs: totalCarbs,
        meals: todayMeals.length,
      },
      goals: {
        calories: userProfile?.dailyCalories || dailyCalories,
        protein: dailyProtein,
        fat: dailyFat,
        carbs: dailyCarbs,
      },
    };
  }

  async getNutritionStats(userId: string) {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        consumedAt: {
          gte: last30Days,
        },
      },
      include: {
        items: true,
      },
    });

    const dailyStats = meals.reduce((acc, meal) => {
      const date = meal.consumedAt?.toISOString().split('T')[0] || 'unknown';
      if (!acc[date]) {
        acc[date] = { calories: 0, protein: 0, fat: 0, carbs: 0 };
      }
      
      meal.items.forEach(item => {
        acc[date].calories += item.calories;
        acc[date].protein += item.protein;
        acc[date].fat += item.fat;
        acc[date].carbs += item.carbs;
      });
      
      return acc;
    }, {} as Record<string, any>);

    return {
      dailyStats,
      average: {
        calories: Object.values(dailyStats).reduce((sum: number, day: any) => sum + day.calories, 0) / Object.keys(dailyStats).length || 0,
        protein: Object.values(dailyStats).reduce((sum: number, day: any) => sum + day.protein, 0) / Object.keys(dailyStats).length || 0,
        fat: Object.values(dailyStats).reduce((sum: number, day: any) => sum + day.fat, 0) / Object.keys(dailyStats).length || 0,
        carbs: Object.values(dailyStats).reduce((sum: number, day: any) => sum + day.carbs, 0) / Object.keys(dailyStats).length || 0,
      },
    };
  }

  async getProgressStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profile: true },
    });

    const profile = user?.profile as any;
    
    return {
      weight: {
        current: profile?.weight || 0,
        target: profile?.targetWeight || 0,
        change: 0, // Would need historical data
      },
      goal: profile?.goal || 'MAINTENANCE',
      activityLevel: profile?.activityLevel || 'MODERATE',
    };
  }

  async getPersonalStats(userId: string, from?: string, to?: string) {
    const now = new Date();
    const toDate = to ? new Date(to) : now;
    if (Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid "to" date');
    }

    const fromDate = from ? new Date(from) : new Date(toDate);
    if (!from) {
      fromDate.setMonth(fromDate.getMonth() - 1);
    }
    if (Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException('Invalid "from" date');
    }

    if (fromDate > toDate) {
      throw new BadRequestException('"from" date must be before "to" date');
    }

    // Normalize dates to start/end of day
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    const cacheKey = crypto
      .createHash('sha1')
      .update(`${userId}:${fromDate.toISOString()}:${toDate.toISOString()}`)
      .digest('hex');

    const cached = await this.cache.get<any>(cacheKey, 'stats:monthly');
    if (cached) {
      return cached;
    }

    // Use meals instead of mealLog for more accurate data
    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        OR: [
          {
            consumedAt: {
              gte: fromDate,
              lte: toDate,
            },
          },
          {
            consumedAt: null,
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          },
        ],
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get mealLog for backward compatibility
    const logs = await this.prisma.mealLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals from meals (more accurate than mealLog)
    const totals = {
      entries: meals.length,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    };

    meals.forEach((meal) => {
      meal.items.forEach((item) => {
        totals.calories += item.calories || 0;
        totals.protein += item.protein || 0;
        totals.fat += item.fat || 0;
        totals.carbs += item.carbs || 0;
      });
    });

    const mealTypeDistribution: Record<MealLogMealType, { count: number; calories: number }> = {
      [MealLogMealType.BREAKFAST]: { count: 0, calories: 0 },
      [MealLogMealType.LUNCH]: { count: 0, calories: 0 },
      [MealLogMealType.DINNER]: { count: 0, calories: 0 },
    };

    const foodMap = new Map<
      string,
      {
        label: string;
        fdcId: string | null;
        count: number;
        quantity: number;
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
      }
    >();

    // Process meals for food map (primary source)
    meals.forEach((meal) => {
      meal.items.forEach((item) => {
        const labelKey = (item.name || 'unknown').toLowerCase();
        const existing =
          foodMap.get(labelKey) ||
          {
            label: item.name || 'Unknown',
            fdcId: (item as any)?.fdcId || null,
            count: 0,
            quantity: 0,
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
          };

        existing.count += 1;
        existing.quantity += item.weight || 0;
        existing.calories += item.calories || 0;
        existing.protein += item.protein || 0;
        existing.fat += item.fat || 0;
        existing.carbs += item.carbs || 0;

        foodMap.set(labelKey, existing);
      });
    });

    // Also process logs for backward compatibility and meal type distribution
    logs.forEach((log) => {
      const distribution = mealTypeDistribution[log.mealType];
      if (distribution) {
        distribution.count += 1;
        distribution.calories += log.calories ?? 0;
      }
    });

    const topFoods = Array.from(foodMap.values())
      // Ignore foods that have no calories at all
      .filter((entry) => entry.calories > 0)
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.calories - a.calories;
      })
      .slice(0, 10)
      .map((entry) => ({
        label: entry.label,
        fdcId: entry.fdcId,
        count: entry.count,
        totalCalories: entry.calories,
        averageCalories: entry.count ? entry.calories / entry.count : 0,
        totalQuantity: entry.quantity,
        unit: entry.quantity > 0 ? 'g' : null,
      }));

    const distributionList = (Object.keys(mealTypeDistribution) as MealLogMealType[]).map((mealType) => {
      const data = mealTypeDistribution[mealType];
      return {
        mealType,
        count: data.count,
        totalCalories: data.calories,
        percentage: totals.entries ? (data.count / totals.entries) * 100 : 0,
      };
    });

    const payload = {
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      totals,
      topFoods,
      mealTypeDistribution: distributionList,
      generatedAt: new Date().toISOString(),
    };

    await this.cache.set(cacheKey, payload, 'stats:monthly');

    return payload;
  }

  async generateMonthlyReportPDF(
    userId: string,
    year: number,
    month: number,
    locale: string = 'en',
  ): Promise<Readable | null> {
    try {
      const fromDate = new Date(year, month - 1, 1);
      const toDate = new Date(year, month, 0, 23, 59, 59, 999);

      const summary = await this.getPersonalStats(
        userId,
        fromDate.toISOString(),
        toDate.toISOString(),
      );

      // Check if there's any data for this month
      const hasData = summary.totals.calories > 0 || 
                      (summary.topFoods && summary.topFoods.length > 0) ||
                      (summary.meals && summary.meals.length > 0);

      if (!hasData) {
        // No data for this month - return null (controller will send 204)
        return null;
      }

      const doc = new PDFDocument({ margin: 40 });
      const stream = new Readable();
      stream._read = () => {};

      let streamError: Error | null = null;

      doc.on('data', (chunk) => {
        if (!streamError) {
          stream.push(chunk);
        }
      });

      doc.on('end', () => {
        if (!streamError) {
          stream.push(null);
        }
      });

      doc.on('error', (error) => {
        streamError = error;
        stream.destroy(error);
      });

      // Localized titles
      const title = locale === 'ru'
        ? `EatSense — Отчёт о питании за месяц`
        : locale === 'kk'
        ? `EatSense — Айлық тамақтану есебі`
        : `EatSense Monthly Report`;

      const subtitle = `${year}-${String(month).padStart(2, '0')}`;

      doc.fontSize(20).text(title, { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(16).text(subtitle, { align: 'left' });
      doc.moveDown(1);

      // Monthly summary
      const summaryTitle = locale === 'ru'
        ? 'Сводка за месяц'
        : locale === 'kk'
        ? 'Айлық қорытынды'
        : 'Monthly summary';

      doc.fontSize(14).text(summaryTitle);
      doc.moveDown(0.5);

      const daysCount = summary.meals?.length || 1;
      const avgCalories = Math.round(summary.totals.calories / daysCount);

      if (locale === 'ru') {
        doc.fontSize(12).text(`Калории (всего): ${Math.round(summary.totals.calories)}`);
        doc.text(`Белки (всего): ${Math.round(summary.totals.protein)} г`);
        doc.text(`Жиры (всего): ${Math.round(summary.totals.fat)} г`);
        doc.text(`Углеводы (всего): ${Math.round(summary.totals.carbs)} г`);
        doc.moveDown(0.5);
        doc.text(`Калории в день (сред.): ${avgCalories}`);
      } else if (locale === 'kk') {
        doc.fontSize(12).text(`Калориялар (барлығы): ${Math.round(summary.totals.calories)}`);
        doc.text(`Ақуыз (барлығы): ${Math.round(summary.totals.protein)} г`);
        doc.text(`Май (барлығы): ${Math.round(summary.totals.fat)} г`);
        doc.text(`Көмірсулар (барлығы): ${Math.round(summary.totals.carbs)} г`);
        doc.moveDown(0.5);
        doc.text(`Күнделікті калориялар (орташа): ${avgCalories}`);
      } else {
        doc.fontSize(12).text(`Calories (total): ${Math.round(summary.totals.calories)}`);
        doc.text(`Protein (total): ${Math.round(summary.totals.protein)} g`);
        doc.text(`Fat (total): ${Math.round(summary.totals.fat)} g`);
        doc.text(`Carbs (total): ${Math.round(summary.totals.carbs)} g`);
        doc.moveDown(0.5);
        doc.text(`Calories per day (avg): ${avgCalories}`);
      }

      doc.moveDown(1);

      // Top foods if available
      if (summary.topFoods && summary.topFoods.length > 0) {
        const topFoodsTitle = locale === 'ru'
          ? 'Популярные блюда'
          : locale === 'kk'
          ? 'Танымал тағамдар'
          : 'Top foods';

        doc.fontSize(14).text(topFoodsTitle, { underline: true });
        doc.moveDown(0.5);

        summary.topFoods.slice(0, 10).forEach((food: any, idx: number) => {
          const line = locale === 'ru'
            ? `${idx + 1}. ${food.label} — ${Math.round(food.totalCalories)} ккал (${food.count} записей)`
            : locale === 'kk'
            ? `${idx + 1}. ${food.label} — ${Math.round(food.totalCalories)} ккал (${food.count} жазба)`
            : `${idx + 1}. ${food.label} — ${Math.round(food.totalCalories)} kcal (${food.count} entries)`;
          doc.fontSize(12).text(line);
        });
      }

      doc.end();

      return stream;
    } catch (error: any) {
      // Log the error for debugging
      console.error('[StatsService] generateMonthlyReportPDF error:', error);
      
      // If it's a known error (e.g., no data), return null
      if (error?.message?.includes('No data') || error?.message?.includes('no data')) {
        return null;
      }

      // For other errors, throw ServiceUnavailableException
      throw new ServiceUnavailableException('Failed to generate monthly report PDF');
    }
  }
}
