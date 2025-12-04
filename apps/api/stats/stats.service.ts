import { Injectable, BadRequestException } from '@nestjs/common';
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

  async generateMonthlyReportPDF(userId: string, year: number, month: number): Promise<Readable> {
    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0, 23, 59, 59, 999);

    const summary = await this.getPersonalStats(
      userId,
      fromDate.toISOString(),
      toDate.toISOString(),
    );

    const doc = new PDFDocument({ margin: 40 });
    const stream = new Readable();
    stream._read = () => {};

    doc.on('data', (chunk) => {
      stream.push(chunk);
    });

    doc.on('end', () => {
      stream.push(null);
    });

    const title = `EatSense Monthly Report - ${year}-${String(month).padStart(2, '0')}`;

    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Total calories: ${Math.round(summary.totals.calories)}`);
    doc.text(`Average calories per day: ${Math.round(summary.totals.calories / 30)}`);
    
    const totalMacroCalories = summary.totals.protein * 4 + summary.totals.carbs * 4 + summary.totals.fat * 9;
    const avgProteinPerc = totalMacroCalories > 0 ? (summary.totals.protein * 4 / totalMacroCalories) * 100 : 0;
    const avgFatPerc = totalMacroCalories > 0 ? (summary.totals.fat * 9 / totalMacroCalories) * 100 : 0;
    const avgCarbPerc = totalMacroCalories > 0 ? (summary.totals.carbs * 4 / totalMacroCalories) * 100 : 0;

    doc.text(`Average protein: ${Math.round(avgProteinPerc)}%`);
    doc.text(`Average fat: ${Math.round(avgFatPerc)}%`);
    doc.text(`Average carbs: ${Math.round(avgCarbPerc)}%`);
    doc.moveDown();

    doc.fontSize(14).text('Top foods:', { underline: true });
    doc.moveDown(0.5);

    summary.topFoods.slice(0, 10).forEach((food: any, idx: number) => {
      doc.fontSize(12).text(
        `${idx + 1}. ${food.label} — ${Math.round(food.totalCalories)} kcal (${food.count} entries)`,
      );
    });

    doc.end();

    return stream;
  }
}
