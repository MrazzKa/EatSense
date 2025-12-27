import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../src/cache/cache.service';
import { MealLogMealType } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import { Readable } from 'stream';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import type * as PDFKit from 'pdfkit';

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
  ) { }

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

  // Helper to safely convert Prisma Decimal / string / number to number
  private toNum(value: any): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value) || 0;
    // Prisma Decimal has toJSON / valueOf returning string
    const asNumber = Number((value as any).valueOf?.() ?? (value as any).toJSON?.());
    return Number.isFinite(asNumber) ? asNumber : 0;
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
        acc[date].calories += this.toNum(item.calories);
        acc[date].protein += this.toNum(item.protein);
        acc[date].fat += this.toNum(item.fat);
        acc[date].carbs += this.toNum(item.carbs);
      });

      return acc;
    }, {} as Record<string, any>);

    const days = Object.values(dailyStats) as Array<{
      calories: any;
      protein: any;
      fat: any;
      carbs: any;
    }>;
    const daysCount = days.length || 1;

    return {
      dailyStats,
      average: {
        calories:
          days.reduce((sum, day) => sum + this.toNum(day.calories), 0) /
          (days.length || 1),
        protein:
          days.reduce((sum, day) => sum + this.toNum(day.protein), 0) /
          daysCount,
        fat:
          days.reduce((sum, day) => sum + this.toNum(day.fat), 0) /
          daysCount,
        carbs:
          days.reduce((sum, day) => sum + this.toNum(day.carbs), 0) /
          daysCount,
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

  async getPersonalStats(userId: string, from?: string, to?: string, locale: string = 'en') {
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

    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const dailyGoal = calculateDailyCalories(userProfile);

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
      // Ignore foods that have effectively zero calories (less than 1)
      .filter((entry) => Math.round(entry.calories) >= 1)
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

    // Fix: Calculate percentage based on CALORIES, not entry count
    const distributionList = (Object.keys(mealTypeDistribution) as MealLogMealType[]).map((mealType) => {
      const data = mealTypeDistribution[mealType];
      return {
        mealType,
        count: data.count,
        totalCalories: data.calories,
        percentage: totals.calories > 0 ? (data.calories / totals.calories) * 100 : 0,
      };
    });

    // Calculate Adherence
    const daysDiff = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Note: loggedDays is calculated AFTER filtering zero-calorie days from dailyBreakdown

    // Calculate daily calories and macros for min/max/compliance and daily breakdown table
    const dailyDataMap: Record<string, { calories: number; protein: number; fat: number; carbs: number }> = {};
    meals.forEach((meal) => {
      const date = (meal.consumedAt || meal.createdAt).toISOString().split('T')[0];
      if (!dailyDataMap[date]) {
        dailyDataMap[date] = { calories: 0, protein: 0, fat: 0, carbs: 0 };
      }
      meal.items.forEach((item) => {
        dailyDataMap[date].calories += item.calories || 0;
        dailyDataMap[date].protein += item.protein || 0;
        dailyDataMap[date].fat += item.fat || 0;
        dailyDataMap[date].carbs += item.carbs || 0;
      });
    });

    // Create dailyBreakdown array for Days table - FILTER OUT ZERO-CALORIE DAYS
    // A day is only considered "with data" if it has > 0 calories
    const dailyBreakdown = Object.entries(dailyDataMap)
      .map(([date, data]) => ({ date, ...data }))
      .filter(d => d.calories > 0) // Critical: exclude days with 0 calories
      .sort((a, b) => b.date.localeCompare(a.date));

    // Recalculate loggedDays based on actual data (days with > 0 calories)
    const loggedDays = dailyBreakdown.length;

    const dailyValues = dailyBreakdown.map(d => d.calories);
    const minCalories = dailyValues.length > 0 ? Math.min(...dailyValues) : 0;
    const maxCalories = dailyValues.length > 0 ? Math.max(...dailyValues) : 0;

    // Days in goal range (±10%)
    const goalLow = dailyGoal * 0.9;
    const goalHigh = dailyGoal * 1.1;
    const daysInRange = dailyGoal > 0
      ? dailyValues.filter(v => v >= goalLow && v <= goalHigh).length
      : 0;
    const daysOver = dailyGoal > 0
      ? dailyValues.filter(v => v > goalHigh).length
      : 0;
    const daysUnder = dailyGoal > 0
      ? dailyValues.filter(v => v < goalLow).length
      : 0;

    // Protein per kg bodyweight
    const userWeight = userProfile?.weight || 0;
    const avgProteinPerDay = loggedDays > 0 ? totals.protein / loggedDays : 0;
    const proteinPerKg = userWeight > 0 ? avgProteinPerDay / userWeight : 0;

    // Average calories per logged day (NOT calendar days!)
    const avgCaloriesPerLoggedDay = loggedDays > 0 ? totals.calories / loggedDays : 0;

    // Generate Conclusions with actual data (using LOGGED DAYS for averages)
    const conclusions: string[] = [];

    // 1. Calorie summary with actual numbers (using loggedDays average)
    if (dailyGoal > 0 && loggedDays > 0) {
      const avgCal = Math.round(avgCaloriesPerLoggedDay);
      const diff = Math.round(avgCal - dailyGoal);
      if (Math.abs(diff) <= dailyGoal * 0.1) {
        conclusions.push(locale === 'ru'
          ? `Среднее: ${avgCal} ккал/день (цель ${dailyGoal} ккал, ±10%).`
          : locale === 'kk'
            ? `Орташа: ${avgCal} ккал/күн (мақсат ${dailyGoal} ккал).`
            : `Average: ${avgCal} kcal/day (goal ${dailyGoal} kcal, ±10%).`);
      } else if (diff > 0) {
        conclusions.push(locale === 'ru'
          ? `Среднее: ${avgCal} ккал/день (+${diff} к цели ${dailyGoal}).`
          : locale === 'kk'
            ? `Орташа: ${avgCal} ккал/күн (+${diff} мақсаттан).`
            : `Average: ${avgCal} kcal/day (+${diff} vs goal ${dailyGoal}).`);
      } else {
        conclusions.push(locale === 'ru'
          ? `Среднее: ${avgCal} ккал/день (${diff} от цели ${dailyGoal}).`
          : locale === 'kk'
            ? `Орташа: ${avgCal} ккал/күн (${diff} мақсаттан).`
            : `Average: ${avgCal} kcal/day (${diff} vs goal ${dailyGoal}).`);
      }
    }

    // 2. Protein with g/kg (using loggedDays average)
    const proteinCals = totals.protein * 4;
    const proteinPct = totals.calories > 0 ? (proteinCals / totals.calories) * 100 : 0;
    if (totals.protein > 0 && loggedDays > 0) {
      const proteinGPerDay = Math.round(totals.protein / loggedDays);
      const proteinGPerKg = userWeight > 0 ? (proteinGPerDay / userWeight).toFixed(1) : '—';
      conclusions.push(locale === 'ru'
        ? `Белок: ${proteinGPerDay} г/день (${proteinGPerKg} г/кг, ${Math.round(proteinPct)}% калорий).`
        : locale === 'kk'
          ? `Ақуыз: ${proteinGPerDay} г/күн (${proteinGPerKg} г/кг, ${Math.round(proteinPct)}% калория).`
          : `Protein: ${proteinGPerDay} g/day (${proteinGPerKg} g/kg, ${Math.round(proteinPct)}% of cal).`);
    }

    // Note: Corridor breakdown is shown in Data Quality section, not duplicated in conclusions

    const payload = {
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      totals,
      average: {
        calories: avgCaloriesPerLoggedDay, // Changed: per logged day, not calendar day
        protein: loggedDays > 0 ? totals.protein / loggedDays : 0,
        fat: loggedDays > 0 ? totals.fat / loggedDays : 0,
        carbs: loggedDays > 0 ? totals.carbs / loggedDays : 0,
      },
      goals: {
        calories: dailyGoal,
      },
      adherence: {
        percentage: dailyGoal > 0 ? (avgCaloriesPerLoggedDay / dailyGoal) * 100 : 0,
        status: dailyGoal > 0
          ? (avgCaloriesPerLoggedDay > dailyGoal * 1.1 ? 'over' : avgCaloriesPerLoggedDay < dailyGoal * 0.9 ? 'under' : 'on_track')
          : 'unknown',
        daysInRange,
        daysOver,
        daysUnder,
      },
      dataQuality: {
        loggedDays,
        totalDays: daysDiff,
        entriesPerDay: loggedDays > 0 ? Math.round(totals.entries / loggedDays * 10) / 10 : 0,
        entriesCount: totals.entries, // Total number of food entries
      },
      nutrition: {
        proteinPerKg: Math.round(proteinPerKg * 10) / 10,
        minCalories: Math.round(minCalories),
        maxCalories: Math.round(maxCalories),
      },
      conclusions,
      topFoods,
      mealTypeDistribution: distributionList,
      dailyBreakdown, // Add daily breakdown for Days table
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

      // Get stats data
      const summary = await this.getPersonalStats(
        userId,
        fromDate.toISOString(),
        toDate.toISOString(),
        locale,
      );

      const hasData = summary.totals.calories > 0 ||
        (summary.topFoods && summary.topFoods.length > 0);

      if (!hasData) {
        console.log(`[StatsService] No data for ${year}-${month}, user ${userId}`);
        return null;
      }

      // Get user profile
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: { user: true },
      });

      // Create PDF - single page, no auto pages
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        autoFirstPage: true,
        bufferPages: false,
        info: {
          Title: `EatSense - ${this.getMonthName(locale, month)} ${year}`,
          Author: 'EatSense',
          Subject: 'Monthly Nutrition Report',
        },
      });

      const stream = new Readable();
      stream._read = () => { };
      doc.on('data', (chunk) => stream.push(chunk));
      doc.on('end', () => stream.push(null));
      doc.on('error', (error) => stream.destroy(error));

      // Register fonts
      const fontsDir = process.cwd().endsWith('api')
        ? path.join(process.cwd(), 'assets', 'fonts', 'Roboto', 'static')
        : path.join(process.cwd(), 'apps', 'api', 'assets', 'fonts', 'Roboto', 'static');

      let fontsRegistered = false;
      try {
        doc.registerFont('Roboto', path.join(fontsDir, 'Roboto-Regular.ttf'));
        doc.registerFont('Roboto-Bold', path.join(fontsDir, 'Roboto-Bold.ttf'));
        doc.registerFont('Roboto-Light', path.join(fontsDir, 'Roboto-Light.ttf'));
        fontsRegistered = true;
      } catch (e) {
        console.warn('[StatsService] Font registration failed, using Helvetica');
      }

      const font = (name: string) => {
        if (!fontsRegistered) {
          const fallback = name === 'Roboto-Bold' ? 'Helvetica-Bold' : 'Helvetica';
          return doc.font(fallback);
        }
        return doc.font(name);
      };

      // Colors - minimalist palette
      const c = {
        primary: '#2563EB',
        text: '#111827',
        muted: '#6B7280',
        border: '#E5E7EB',
        success: '#059669',
        warning: '#D97706',
        danger: '#DC2626',
        bg: '#F9FAFB',
      };

      const pageW = doc.page.width - 80;
      const leftX = 40;
      let y = 40;

      // ============ HEADER ============
      font('Roboto-Bold').fontSize(20).fillColor(c.primary);
      doc.text('EatSense', leftX, y);

      // Period on right
      font('Roboto-Bold').fontSize(14).fillColor(c.text);
      const periodText = `${this.getMonthName(locale, month)} ${year}`;
      doc.text(periodText, leftX, y, { width: pageW, align: 'right' });

      y += 50;

      // Thin divider
      doc.moveTo(leftX, y).lineTo(leftX + pageW, y).strokeColor(c.border).lineWidth(1).stroke();
      y += 16;

      // ============ PROFILE ROW ============
      if (userProfile) {
        font('Roboto').fontSize(9).fillColor(c.muted);
        const profileParts: string[] = [];

        if (userProfile.gender) {
          const genderLabel = userProfile.gender === 'male'
            ? this.t(locale, 'profile.male')
            : this.t(locale, 'profile.female');
          profileParts.push(genderLabel);
        }
        if (userProfile.age) profileParts.push(`${userProfile.age} ${this.t(locale, 'profile.years')}`);
        if (userProfile.height) profileParts.push(`${userProfile.height} ${this.t(locale, 'profile.cm')}`);
        if (userProfile.weight) profileParts.push(`${userProfile.weight} ${this.t(locale, 'profile.kg')}`);

        if (profileParts.length > 0) {
          doc.text(profileParts.join(' · '), leftX, y);
          y += 14;
        }

        // Goal - use summary.goals.calories as single source of truth
        if (userProfile.goal || summary.goals?.calories) {
          const goalText = userProfile.goal
            ? this.t(locale, `profile.goal.${userProfile.goal}`)
            : '';
          // Single source: use summary.goals.calories (already calculated from profile)
          const calorieGoal = summary.goals?.calories || 0;
          const goalLine = calorieGoal > 0
            ? `${this.t(locale, 'goal')}: ${calorieGoal} ${this.t(locale, 'kcal')}${goalText ? ` (${goalText})` : ''}`
            : '';
          if (goalLine) {
            doc.text(goalLine, leftX, y);
            y += 14;
          }
        }
      }
      y += 8;

      // ============ KPI ROW ============
      const kpiBoxW = (pageW - 24) / 4;
      const kpiBoxH = 56;

      const loggedDays = summary.dataQuality?.loggedDays || 0;
      const totalDays = summary.dataQuality?.totalDays || 31;
      const proteinPerKg = summary.nutrition?.proteinPerKg || 0;
      const daysInRange = summary.adherence?.daysInRange || 0;

      const kpiData = [
        {
          label: locale === 'ru' ? 'Среднее/день' : locale === 'kk' ? 'Орт/күн' : 'Avg/day',
          value: summary.average?.calories > 0 ? Math.round(summary.average.calories).toLocaleString() : '—',
          unit: this.t(locale, 'kcal'),
          color: c.primary,
        },
        {
          label: locale === 'ru' ? 'Дней с данными' : locale === 'kk' ? 'Деректермен күн' : 'Days with data',
          value: `${loggedDays}/${totalDays}`,
          unit: '',
          color: loggedDays > 20 ? c.success : loggedDays > 10 ? c.warning : c.danger,
        },
        {
          label: locale === 'ru' ? 'Белок г/кг' : locale === 'kk' ? 'Ақуыз г/кг' : 'Protein g/kg',
          value: proteinPerKg > 0 ? proteinPerKg.toFixed(1) : '—',
          unit: '',
          color: proteinPerKg >= 1.2 ? c.success : proteinPerKg >= 0.8 ? c.warning : c.danger,
        },
        {
          label: locale === 'ru' ? 'Дней в норме' : locale === 'kk' ? 'Қалыпты күн' : 'Days on track',
          // Show actual number (even 0) if we have logged days, only show — if no data at all
          value: loggedDays > 0 ? `${daysInRange}/${loggedDays}` : '—',
          unit: '',
          color: loggedDays > 0
            ? (daysInRange >= loggedDays * 0.7 ? c.success : daysInRange >= loggedDays * 0.3 ? c.warning : c.danger)
            : c.muted,
        },
      ];

      kpiData.forEach((kpi, i) => {
        const x = leftX + i * (kpiBoxW + 8);

        // Box background
        doc.roundedRect(x, y, kpiBoxW, kpiBoxH, 4).fill(c.bg);

        // Value (smaller font, just the number)
        font('Roboto-Bold').fontSize(16).fillColor(kpi.color);
        doc.text(String(kpi.value), x + 6, y + 8, { width: kpiBoxW - 12 });

        // Unit (separate line, smaller)
        if (kpi.unit) {
          font('Roboto').fontSize(8).fillColor(c.muted);
          doc.text(kpi.unit, x + 6, y + 26, { width: kpiBoxW - 12 });
        }

        // Label
        font('Roboto').fontSize(7).fillColor(c.muted);
        doc.text(kpi.label, x + 6, y + 40, { width: kpiBoxW - 12 });
      });

      y += kpiBoxH + 12;

      // ============ LOW DATA WARNING ============
      if (loggedDays < 7 && loggedDays > 0) {
        const warningText = locale === 'ru'
          ? `⚠️ Низкое покрытие дневника (${loggedDays} из ${totalDays} дней). Выводы ограничены.`
          : locale === 'kk'
            ? `⚠️ Күнделік толымсыз (${loggedDays}/${totalDays}). Қорытынды шектеулі.`
            : `⚠️ Limited diary coverage (${loggedDays} of ${totalDays} days). Conclusions limited.`;

        doc.roundedRect(leftX, y, pageW, 20, 3).fill('#FEF3C7'); // light yellow
        font('Roboto').fontSize(8).fillColor('#92400E'); // amber text
        doc.text(warningText, leftX + 8, y + 5, { width: pageW - 16 });
        y += 28;
      } else {
        y += 8;
      }

      // ============ TWO COLUMNS: MACROS + TOP FOODS ============
      const colW = (pageW - 16) / 2;

      // LEFT: Macros
      font('Roboto-Bold').fontSize(11).fillColor(c.text);
      doc.text(this.t(locale, 'macros'), leftX, y);
      y += 16;

      const protein = summary.totals.protein || 0;
      const carbs = summary.totals.carbs || 0;
      const fat = summary.totals.fat || 0;

      // FIX: Calculate macro percentages by CALORIES, not grams
      // Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g
      const proteinKcal = protein * 4;
      const carbsKcal = carbs * 4;
      const fatKcal = fat * 9;
      const totalMacroKcal = proteinKcal + carbsKcal + fatKcal || 1;

      const proteinPct = Math.round((proteinKcal / totalMacroKcal) * 100);
      const carbsPct = Math.round((carbsKcal / totalMacroKcal) * 100);
      const fatPct = 100 - proteinPct - carbsPct;

      // Stacked bar
      const barH = 16;
      const barY = y;
      let barX = leftX;

      if (proteinPct > 0) {
        doc.rect(barX, barY, colW * (proteinPct / 100), barH).fill('#3B82F6');
        barX += colW * (proteinPct / 100);
      }
      if (carbsPct > 0) {
        doc.rect(barX, barY, colW * (carbsPct / 100), barH).fill('#10B981');
        barX += colW * (carbsPct / 100);
      }
      if (fatPct > 0) {
        doc.rect(barX, barY, colW * (fatPct / 100), barH).fill('#F59E0B');
      }

      y += barH + 8;

      // Legend
      font('Roboto').fontSize(8).fillColor(c.text);
      const legendItems = [
        { label: `${this.t(locale, 'protein')} ${proteinPct}%`, color: '#3B82F6' },
        { label: `${this.t(locale, 'carbs')} ${carbsPct}%`, color: '#10B981' },
        { label: `${this.t(locale, 'fat')} ${fatPct}%`, color: '#F59E0B' },
      ];

      legendItems.forEach((item, i) => {
        const lx = leftX + i * 70;
        doc.circle(lx + 4, y + 4, 3).fill(item.color);
        font('Roboto').fontSize(8).fillColor(c.text);
        doc.text(item.label, lx + 10, y);
      });

      // Macros in grams/day (per days with data) with explicit label
      y += 14;
      if (loggedDays > 0) {
        // Calculate raw sums first (round at this level for consistency)
        const sumProtein = Math.round(protein);
        const sumCarbs = Math.round(carbs);
        const sumFat = Math.round(fat);

        // Calculate averages FROM the rounded sums to ensure consistency
        // avg * days = sum (no rounding discrepancy)
        const proteinGDay = Math.round(sumProtein / loggedDays);
        const carbsGDay = Math.round(sumCarbs / loggedDays);
        const fatGDay = Math.round(sumFat / loggedDays);

        // Label + average per day
        font('Roboto').fontSize(7).fillColor(c.muted);
        const avgLabel = locale === 'ru'
          ? `Среднее (${loggedDays} дн.):`
          : `Avg (${loggedDays} days):`;
        const avgLine = `${avgLabel} Б ${proteinGDay} · У ${carbsGDay} · Ж ${fatGDay} г/день`;
        doc.text(avgLine, leftX, y);

        // Sum line
        y += 10;
        const sumLabel = locale === 'ru' ? 'Σ за период:' : 'Total:';
        const sumLine = `${sumLabel} Б ${sumProtein} · У ${sumCarbs} · Ж ${sumFat} г`;
        doc.text(sumLine, leftX, y);
      }

      // RIGHT: Top Foods
      const rightX = leftX + colW + 16;
      let rightY = barY - 16;

      font('Roboto-Bold').fontSize(11).fillColor(c.text);
      doc.text(this.t(locale, 'topFoods'), rightX, rightY);
      rightY += 14;

      // Column header (small, muted) - clarify what % means
      font('Roboto').fontSize(6).fillColor(c.muted);
      const headerText = locale === 'ru' ? 'Раз | Σккал | % от общего' : 'Count | Σkcal | % of total';
      doc.text(headerText, rightX + colW - 90, rightY, { width: 85, align: 'right' });
      rightY += 10;

      const topFoodsToShow = (summary.topFoods || []).slice(0, 5);
      const totalKcal = summary.totals.calories || 1;

      // Helper: word-boundary truncation with capitalization
      const truncateWordBoundary = (text: string, maxLen: number): string => {
        // Capitalize first letter
        const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
        if (capitalized.length <= maxLen) return capitalized;
        const truncated = capitalized.substring(0, maxLen);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLen * 0.5) {
          return truncated.substring(0, lastSpace) + '…';
        }
        return truncated + '…';
      };

      if (topFoodsToShow.length > 0) {
        topFoodsToShow.forEach((food: any, i: number) => {
          font('Roboto').fontSize(8).fillColor(c.text);
          const foodLabel = food.label || this.t(locale, 'unknownFood');
          // Increased max length to 35 for better readability
          const truncatedLabel = truncateWordBoundary(foodLabel, 35);
          doc.text(`${i + 1}. ${truncatedLabel}`, rightX, rightY);

          // Show: count × kcal (contribution %)
          font('Roboto').fontSize(7).fillColor(c.muted);
          const count = food.count || 1;
          const sumCals = Math.round(food.totalCalories || 0);
          const contribution = Math.round((sumCals / totalKcal) * 100);
          const unit = locale === 'ru' ? 'ккал' : locale === 'kk' ? 'ккал' : 'kcal';
          const infoText = `${count}× · ${sumCals} ${unit} · ${contribution}%`;
          doc.text(infoText, rightX + colW - 90, rightY + 1, { width: 85, align: 'right' });
          rightY += 13;
        });
      } else {
        font('Roboto').fontSize(9).fillColor(c.muted);
        doc.text(this.t(locale, 'noData'), rightX, rightY);
      }

      y = Math.max(y + 20, rightY + 10);

      // Only show if there's valid meal data with at least 2 different meal types
      // (prevents false 100% from default mealType)
      const validMeals = (summary.mealTypeDistribution || []).filter((m: any) => m.totalCalories > 0);
      const uniqueMealTypes = validMeals.length;

      // Header always shown
      y += 8;
      font('Roboto-Bold').fontSize(11).fillColor(c.text);
      doc.text(this.t(locale, 'mealDistribution'), leftX, y);
      y += 16;

      if (validMeals.length >= 2 && summary.totals.calories > 0) {
        const mealColors: Record<string, string> = {
          breakfast: '#F59E0B',
          lunch: '#10B981',
          dinner: '#3B82F6',
          snack: '#8B5CF6',
        };

        validMeals.forEach((meal: any) => {
          const mealLabel = this.t(locale, `mealType.${meal.mealType}`) || meal.mealType;
          const pct = Math.round(meal.percentage || 0);
          if (pct >= 0 && pct <= 100) {
            const maxBarW = 150;
            const barWidth = Math.max(2, Math.min(maxBarW, (pct / 100) * maxBarW));

            font('Roboto').fontSize(9).fillColor(c.text);
            doc.text(mealLabel, leftX, y, { width: 70 });

            doc.rect(leftX + 75, y + 2, barWidth, 10).fill(mealColors[meal.mealType.toLowerCase()] || c.primary);

            font('Roboto').fontSize(8).fillColor(c.muted);
            doc.text(`${pct}%`, leftX + 75 + barWidth + 6, y + 1);
            y += 16;
          }
        });
      } else {
        // Not enough data for meaningful distribution
        font('Roboto').fontSize(9).fillColor(c.muted);
        const noDataMsg = locale === 'ru'
          ? 'Нет данных по типам приёмов пищи'
          : locale === 'kk'
            ? 'Тамақ түрлері бойынша деректер жоқ'
            : 'No meal type data available';
        doc.text(noDataMsg, leftX, y);
        y += 16;
      }

      y += 12;

      // ============ CONCLUSIONS ============
      if (summary.conclusions && summary.conclusions.length > 0) {
        font('Roboto-Bold').fontSize(11).fillColor(c.text);
        doc.text(this.t(locale, 'conclusions.title'), leftX, y);
        y += 14;

        summary.conclusions.forEach((text: string) => {
          doc.circle(leftX + 4, y + 5, 2).fill(c.muted);
          font('Roboto').fontSize(9).fillColor(c.text);
          doc.text(text, leftX + 14, y, { width: pageW - 14 });
          y += 16;
        });
      }

      // ============ DATA QUALITY SECTION ============
      font('Roboto-Bold').fontSize(10).fillColor(c.text);
      const dqHeader = locale === 'ru' ? 'Качество данных' : locale === 'kk' ? 'Деректер сапасы' : 'Data Quality';
      doc.text(dqHeader, leftX, y);
      y += 14;

      const dataQuality = summary.dataQuality || {};
      const nutrition = summary.nutrition || {};
      const adherence = summary.adherence || {};

      const loggedDaysCount = dataQuality.loggedDays || 0;
      const totalDaysCount = dataQuality.totalDays || new Date(year, month, 0).getDate();
      const coveragePct = totalDaysCount > 0 ? Math.round((loggedDaysCount / totalDaysCount) * 100) : 0;
      const minCal = nutrition.minCalories || 0;
      const maxCal = nutrition.maxCalories || 0;
      const daysInRangeVal = adherence.daysInRange || 0;
      const daysOverVal = adherence.daysOver || 0;
      const daysUnderVal = adherence.daysUnder || 0;

      font('Roboto').fontSize(8).fillColor(c.muted);

      // Row 1: Coverage (full width, single line)
      const coverageText = locale === 'ru'
        ? `Покрытие: ${loggedDaysCount}/${totalDaysCount} дней (${coveragePct}%)`
        : `Coverage: ${loggedDaysCount}/${totalDaysCount} days (${coveragePct}%)`;
      doc.text(coverageText, leftX, y);
      y += 11;

      // Row 2: Corridor compliance (only if goals exist)
      if (summary.goals?.calories > 0 && loggedDaysCount > 0) {
        const compText = locale === 'ru'
          ? `В коридоре ±10%: ${daysInRangeVal} из ${loggedDaysCount} дней (выше: ${daysOverVal}, ниже: ${daysUnderVal})`
          : `Within ±10%: ${daysInRangeVal} of ${loggedDaysCount} days (over: ${daysOverVal}, under: ${daysUnderVal})`;
        doc.text(compText, leftX, y);
        y += 11;
      }

      // Row 3: Min/Max range (if data exists)
      if (minCal > 0 && maxCal > 0) {
        const rangeText = locale === 'ru'
          ? `Диапазон ккал: ${minCal}–${maxCal} ккал/день`
          : `Calorie range: ${minCal}–${maxCal} kcal/day`;
        doc.text(rangeText, leftX, y);
        y += 11;
      }

      // Row 4: Entries count (if available)
      const entriesCount = summary.dataQuality?.entriesCount || 0;
      if (entriesCount > 0) {
        const entriesText = locale === 'ru'
          ? `Записей питания: ${entriesCount}`
          : `Food entries: ${entriesCount}`;
        doc.text(entriesText, leftX, y);
        y += 11;
      }

      y += 10;

      // ============ GOALS VS FACT ============
      font('Roboto-Bold').fontSize(10).fillColor(c.text);
      const goalsHeader = locale === 'ru' ? 'Цели vs Факт' : 'Goals vs Actual';
      doc.text(goalsHeader, leftX, y);
      y += 14;

      font('Roboto').fontSize(8).fillColor(c.muted);

      const goalCalories = summary.goals?.calories || 0;
      const totalCals = Math.round(summary.totals.calories || 0);
      const factCalories = loggedDaysCount > 0 ? Math.round(totalCals / loggedDaysCount) : 0;

      if (goalCalories > 0) {
        const diffCals = factCalories - goalCalories;
        const diffPct = Math.round((diffCals / goalCalories) * 100);
        const diffSign = diffCals >= 0 ? '+' : '';
        const goalsRow1 = locale === 'ru'
          ? `Калории: ${factCalories} vs ${goalCalories} ккал/день (${diffSign}${diffCals}; ${diffSign}${diffPct}%)`
          : `Calories: ${factCalories} vs ${goalCalories} kcal/day (${diffSign}${diffCals}; ${diffSign}${diffPct}%)`;
        doc.text(goalsRow1, leftX, y);
        y += 11;

        // Protein goal (if we have weight)
        const factProtein = loggedDaysCount > 0 ? Math.round((summary.totals.protein || 0) / loggedDaysCount) : 0;
        const proteinGKg = summary.nutrition?.proteinPerKg || 0;
        if (factProtein > 0) {
          const proteinRow = locale === 'ru'
            ? `Белок: ${factProtein} г/день (${proteinGKg.toFixed(1)} г/кг)`
            : `Protein: ${factProtein} g/day (${proteinGKg.toFixed(1)} g/kg)`;
          doc.text(proteinRow, leftX, y);
          y += 11;
        }

        // Fats and Carbs
        const factFat = loggedDaysCount > 0 ? Math.round((summary.totals.fat || 0) / loggedDaysCount) : 0;
        const factCarbs = loggedDaysCount > 0 ? Math.round((summary.totals.carbs || 0) / loggedDaysCount) : 0;
        if (factFat > 0) {
          const fatRow = locale === 'ru'
            ? `Жиры: ${factFat} г/день`
            : `Fat: ${factFat} g/day`;
          doc.text(fatRow, leftX, y);
          y += 11;
        }
        if (factCarbs > 0) {
          const carbsRow = locale === 'ru'
            ? `Углеводы: ${factCarbs} г/день`
            : `Carbs: ${factCarbs} g/day`;
          doc.text(carbsRow, leftX, y);
          y += 11;
        }
      } else {
        // No goals configured
        const noGoalsText = locale === 'ru'
          ? 'Цели по калориям не настроены в профиле'
          : 'Calorie goals not configured in profile';
        doc.text(noGoalsText, leftX, y);
        y += 11;
      }

      y += 8;

      // ============ FOOTER (declare early for space checks) ============
      const footerY = doc.page.height - 50;

      // ============ DAYS WITH LOGS TABLE ============
      // Only show if we have individual day data and space
      const dailyData = summary.dailyBreakdown || [];
      if (dailyData.length > 0 && y < footerY - 100) {
        font('Roboto-Bold').fontSize(10).fillColor(c.text);
        const daysHeader = locale === 'ru' ? 'Дни с записями питания' : 'Days with nutrition data';
        doc.text(daysHeader, leftX, y);
        y += 12;

        // Show corridor info
        const corridorLow = Math.round(goalCalories * 0.9);
        const corridorHigh = Math.round(goalCalories * 1.1);
        font('Roboto').fontSize(6).fillColor(c.muted);
        if (goalCalories > 0) {
          const corridorText = locale === 'ru'
            ? `Коридор: ${corridorLow}–${corridorHigh} ккал (±10% от ${goalCalories})`
            : `Corridor: ${corridorLow}–${corridorHigh} kcal (±10% of ${goalCalories})`;
          doc.text(corridorText, leftX, y);
          y += 10;
        }

        // Table header
        font('Roboto').fontSize(7).fillColor(c.muted);
        const tableHeader = locale === 'ru' ? 'Дата       | Ккал  | Б/Ж/У     | Статус' : 'Date       | Kcal  | P/F/C     | Status';
        doc.text(tableHeader, leftX, y);
        y += 10;

        // Table rows (show up to 5 most recent)
        const recentDays = dailyData.slice(0, 5);
        recentDays.forEach((day: any) => {
          const dateStr = new Date(day.date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' });
          const cals = Math.round(day.calories || 0);
          const dayP = Math.round(day.protein || 0);
          const dayF = Math.round(day.fat || 0);
          const dayC = Math.round(day.carbs || 0);

          let status = '—';
          if (goalCalories > 0) {
            if (cals >= corridorLow && cals <= corridorHigh) {
              status = locale === 'ru' ? '✓ норма' : '✓ on track';
            } else if (cals > corridorHigh) {
              status = locale === 'ru' ? '↑ выше' : '↑ over';
            } else {
              status = locale === 'ru' ? '↓ ниже' : '↓ under';
            }
          }

          font('Roboto').fontSize(7).fillColor('#374151'); // Use gray directly instead of c.text
          const row = `${dateStr.padEnd(10)} | ${String(cals).padStart(4)} | ${dayP}/${dayF}/${dayC}${' '.repeat(Math.max(0, 7 - `${dayP}/${dayF}/${dayC}`.length))} | ${status}`;
          doc.text(row, leftX, y);
          y += 9;
        });
      }

      y += 8;

      // ============ KCAL BAR CHART ============
      // Simple bar chart showing kcal per logged day with goal line
      if (dailyData.length > 0 && y < footerY - 80) {
        font('Roboto-Bold').fontSize(10).fillColor(c.text);
        const chartHeader = locale === 'ru' ? 'Калорийность по дням' : 'Calories by Day';
        doc.text(chartHeader, leftX, y);
        y += 14;

        // Chart dimensions - compact and professional
        const chartW = Math.min(pageW - 60, 300); // Limit max width
        const chartH = 60;
        const yAxisW = 35; // Space for Y-axis labels
        const chartX = leftX + yAxisW;
        const chartY = y;

        // Fixed Y-axis scale for consistency (max 4000 or higher if needed)
        const maxVal = Math.max(4000, Math.ceil(Math.max(...dailyData.map((d: any) => d.calories), goalCalories * 1.15) / 1000) * 1000);

        // Slim bar width - max 20px, evenly distributed
        const numBars = Math.min(dailyData.length, 10);
        const totalBarsW = chartW - 20;
        const barSpacing = 4;
        const barWidth = Math.min(18, (totalBarsW - (numBars - 1) * barSpacing) / numBars);

        // Draw Y-axis labels (0, 1000, 2000, 3000, 4000)
        font('Roboto').fontSize(6).fillColor(c.muted);
        const ySteps = [0, 1000, 2000, 3000, 4000].filter(v => v <= maxVal);
        ySteps.forEach(val => {
          const yPos = chartY + chartH - (val / maxVal) * chartH;
          doc.text(String(val), leftX, yPos - 3, { width: yAxisW - 5, align: 'right' });
          // Faint horizontal grid line
          doc.moveTo(chartX, yPos).lineTo(chartX + chartW, yPos)
            .strokeColor('#E5E7EB').lineWidth(0.5).stroke();
        });

        // Draw corridor zone (light green background for ±10%)
        if (goalCalories > 0) {
          const corridorLow = goalCalories * 0.9;
          const corridorHigh = goalCalories * 1.1;
          const zoneTop = chartY + chartH - (corridorHigh / maxVal) * chartH;
          const zoneBottom = chartY + chartH - (corridorLow / maxVal) * chartH;
          doc.rect(chartX, zoneTop, chartW, zoneBottom - zoneTop).fill('#D1FAE5'); // Light green zone

          // Goal line (red dashed)
          const goalY = chartY + chartH - (goalCalories / maxVal) * chartH;
          doc.moveTo(chartX, goalY).lineTo(chartX + chartW, goalY)
            .strokeColor('#DC2626').lineWidth(1).dash(4, { space: 3 }).stroke();
          doc.undash();

          // Goal label on right side
          font('Roboto').fontSize(6).fillColor('#DC2626');
          doc.text(`цель ${goalCalories}`, chartX + chartW + 3, goalY - 4);
        }

        // Draw bars - centered in chart area
        const barsStartX = chartX + 10;
        dailyData.slice(0, numBars).forEach((day: any, i: number) => {
          const barH = (day.calories / maxVal) * chartH;
          const barX = barsStartX + i * (barWidth + barSpacing);
          const barY = chartY + chartH - barH;

          // Bar color based on status
          let barColor = '#94A3B8'; // Neutral gray default
          if (goalCalories > 0) {
            if (day.calories >= goalCalories * 0.9 && day.calories <= goalCalories * 1.1) {
              barColor = '#10B981'; // Green - in range
            } else if (day.calories > goalCalories * 1.1) {
              barColor = '#F59E0B'; // Orange - over
            } else {
              barColor = '#EF4444'; // Red - under
            }
          }

          doc.rect(barX, barY, barWidth, barH).fill(barColor);

          // Date label below bar (day of month)
          font('Roboto').fontSize(6).fillColor(c.muted);
          const dayNum = new Date(day.date).getDate();
          doc.text(String(dayNum), barX + barWidth / 2 - 4, chartY + chartH + 3);
        });

        // Legend - draw colored squares instead of bullet characters (font doesn't support ●)
        y = chartY + chartH + 16;
        const squareSize = 6;
        const legendY = y + 1;

        // Green square (in range)
        doc.rect(leftX, legendY, squareSize, squareSize).fill('#10B981');
        font('Roboto').fontSize(6).fillColor(c.muted);
        const inRangeText = locale === 'ru' ? 'в диапазоне' : locale === 'kk' ? 'диапазонда' : 'in range';
        doc.text(inRangeText, leftX + 9, y);

        // Orange square (over)
        doc.rect(leftX + 55, legendY, squareSize, squareSize).fill('#F59E0B');
        const overText = locale === 'ru' ? 'выше' : locale === 'kk' ? 'жоғары' : 'over';
        doc.text(overText, leftX + 64, y);

        // Red square (under)
        doc.rect(leftX + 100, legendY, squareSize, squareSize).fill('#EF4444');
        const underText = locale === 'ru' ? 'ниже' : locale === 'kk' ? 'төмен' : 'under';
        doc.text(underText, leftX + 109, y);

        // Note about data
        const noteText = locale === 'ru'
          ? '| Дни с записями питания'
          : locale === 'kk'
            ? '| Тамақтану жазбалары бар күндер'
            : '| Days with nutrition data';
        doc.text(noteText, leftX + 145, y);
        y += 12;
      }

      y += 6;

      // ============ FOOTER ============

      // ============ METHODOLOGY NOTES ============
      // Ensure we don't overflow the page - use absolute positioning
      const methodologyY = Math.min(y + 12, footerY - 55);
      font('Roboto').fontSize(6).fillColor(c.muted);
      const methodNote = locale === 'ru'
        ? '* Среднее = по дням с записями питания. Целевой диапазон = ±10% от цели.'
        : locale === 'kk'
          ? '* Орташа = тамақтану жазбалары бар күндер бойынша. Мақсат диапазоны = ±10%.'
          : '* Average = calculated per days with nutrition data. Goal range = ±10%.';
      doc.text(methodNote, leftX, methodologyY, { width: pageW, lineBreak: false });

      // Footer separator line - absolute position to prevent overflow
      const actualFooterY = doc.page.height - 55;
      doc.moveTo(leftX, actualFooterY - 10).lineTo(leftX + pageW, actualFooterY - 10).strokeColor(c.border).lineWidth(0.5).stroke();

      // Footer text - use lineBreak:false to prevent auto-page creation
      font('Roboto').fontSize(7).fillColor(c.muted);
      doc.text(this.t(locale, 'disclaimer'), leftX, actualFooterY, { width: pageW, align: 'center', lineBreak: false });

      const generatedText = `${this.t(locale, 'generatedAt')}: ${new Date().toLocaleDateString(locale === 'ru' ? 'ru-RU' : locale === 'kk' ? 'kk-KZ' : 'en-US')}`;
      doc.text(generatedText, leftX, actualFooterY + 10, { width: pageW, align: 'center', lineBreak: false });

      font('Roboto-Light').fontSize(7).fillColor(c.muted);
      doc.text('© EatSense', leftX, actualFooterY + 20, { width: pageW, align: 'center', lineBreak: false });

      doc.end();
      return stream;

    } catch (error: any) {
      console.error('[StatsService] generateMonthlyReportPDF error:', error);
      throw new ServiceUnavailableException('Failed to generate monthly report PDF');
    }
  }

  // Helper: Get localized month name
  private getMonthName(locale: string, month: number): string {
    const months: Record<string, string[]> = {
      en: ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'],
      ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
      kk: ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым',
        'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'],
    };
    return months[locale]?.[month - 1] || months['en'][month - 1];
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  private t(locale: string, key: string, params?: Record<string, any>): string {
    const translations: Record<string, Record<string, string>> = {
      // Header removed - no subheader
      // Profile
      'profile.male': { en: 'Male', ru: 'Мужчина', kk: 'Ер' },
      'profile.female': { en: 'Female', ru: 'Женщина', kk: 'Әйел' },
      'profile.years': { en: 'years', ru: 'лет', kk: 'жас' },
      'profile.cm': { en: 'cm', ru: 'см', kk: 'см' },
      'profile.kg': { en: 'kg', ru: 'кг', kk: 'кг' },
      'profile.goal.lose_weight': { en: 'Weight loss', ru: 'Похудение', kk: 'Салмақ тастау' },
      'profile.goal.maintain_weight': { en: 'Maintain', ru: 'Поддержание', kk: 'Сақтау' },
      'profile.goal.gain_muscle': { en: 'Muscle gain', ru: 'Набор массы', kk: 'Бұлшықет жинау' },
      'profile.goal.gain_weight': { en: 'Weight gain', ru: 'Набор веса', kk: 'Салмақ жинау' },
      // Units
      kcal: { en: 'kcal', ru: 'ккал', kk: 'ккал' },
      g: { en: 'g', ru: 'г', kk: 'г' },
      day: { en: 'day', ru: 'день', kk: 'күн' },
      // KPI
      totalCalories: {
        en: 'Total',
        ru: 'Всего',
        kk: 'Барлығы',
      },
      avgCalories: {
        en: 'Daily Avg',
        ru: 'В среднем',
        kk: 'Орташа',
      },
      protein: { en: 'Protein', ru: 'Белки', kk: 'Ақуыз' },
      carbs: { en: 'Carbs', ru: 'Углеводы', kk: 'Көмірсулар' },
      fat: { en: 'Fat', ru: 'Жиры', kk: 'Май' },
      adherenceLabel: {
        en: 'Adherence',
        ru: 'Соблюдение',
        kk: 'Сақтау',
      },
      // Sections
      macros: { en: 'Macronutrients', ru: 'Макронутриенты', kk: 'Макронутриенттер' },
      topFoods: { en: 'Top Foods', ru: 'Популярные продукты', kk: 'Танымал тағамдар' },
      mealDistribution: {
        en: 'Meal Distribution',
        ru: 'Распределение приёмов пищи',
        kk: 'Тамақтану бөлімі',
      },
      // Meal types
      'mealType.breakfast': { en: 'Breakfast', ru: 'Завтрак', kk: 'Таңғы ас' },
      'mealType.lunch': { en: 'Lunch', ru: 'Обед', kk: 'Түскі ас' },
      'mealType.dinner': { en: 'Dinner', ru: 'Ужин', kk: 'Кешкі ас' },
      'mealType.snack': { en: 'Snack', ru: 'Перекус', kk: 'Жеңіл тамақ' },
      'mealType.BREAKFAST': { en: 'Breakfast', ru: 'Завтрак', kk: 'Таңғы ас' },
      'mealType.LUNCH': { en: 'Lunch', ru: 'Обед', kk: 'Түскі ас' },
      'mealType.DINNER': { en: 'Dinner', ru: 'Ужин', kk: 'Кешкі ас' },
      'mealType.SNACK': { en: 'Snack', ru: 'Перекус', kk: 'Жеңіл тамақ' },
      // Data
      unknownFood: { en: 'Unknown food', ru: 'Неизвестный продукт', kk: 'Белгісіз тағам' },
      noData: { en: 'No data', ru: 'Нет данных', kk: 'Деректер жоқ' },
      dataQuality: { en: 'Data quality', ru: 'Качество данных', kk: 'Деректер сапасы' },
      daysLogged: { en: 'days logged', ru: 'дней с записями', kk: 'күн жазылды' },
      // Goal
      goal: { en: 'Goal', ru: 'Цель', kk: 'Мақсат' },
      // Footer
      disclaimer: {
        en: 'This report is for informational purposes only. Consult a healthcare provider for medical advice.',
        ru: 'Этот отчёт носит информационный характер. За медицинскими рекомендациями обратитесь к врачу.',
        kk: 'Бұл есеп тек ақпараттық мақсатта. Медициналық кеңес алу үшін дәрігерге жүгініңіз.',
      },
      generatedAt: { en: 'Generated', ru: 'Создан', kk: 'Жасалды' },
      // Conclusions
      'conclusions.title': { en: 'Key Insights', ru: 'Ключевые выводы', kk: 'Негізгі қорытындылар' },
      'conclusions.caloriesGood': {
        en: 'Calorie intake is near goal ({percent}% adherence).',
        ru: 'Калорийность близка к цели ({percent}% от нормы).',
        kk: 'Калория мөлшері мақсатқа жақын ({percent}%).',
      },
      'conclusions.caloriesOver': {
        en: 'Calorie intake is {percent}% over goal.',
        ru: 'Калорийность превышает цель на {percent}%.',
        kk: 'Калория мөлшері мақсаттан {percent}%-ға асты.',
      },
      'conclusions.caloriesUnder': {
        en: 'Calorie intake is {percent}% under goal.',
        ru: 'Калорийность ниже цели на {percent}%.',
        kk: 'Калория мөлшері мақсаттан {percent}%-ға төмен.',
      },
      'conclusions.proteinLow': {
        en: 'Protein intake is low (<15% of calories).',
        ru: 'Белок низкий (<15% от калорий).',
        kk: 'Ақуыз мөлшері төмен (<15%).',
      },
      'conclusions.proteinGood': {
        en: 'Protein intake is optimal (15-25%).',
        ru: 'Белок оптимальный (15-25%).',
        kk: 'Ақуыз мөлшері оңтайлы (15-25%).',
      },
      'conclusions.proteinHigh': {
        en: 'Protein intake is high (>25%).',
        ru: 'Белок высокий (>25%).',
        kk: 'Ақуыз мөлшері жоғары (>25%).',
      },
    };

    let text = translations[key]?.[locale] || translations[key]?.['en'] || key;

    // Replace placeholders like {percent}
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
      });
    }

    return text;
  }

}
