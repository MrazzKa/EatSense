import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../src/cache/cache.service';
import { MealLogMealType } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import { Readable } from 'stream';
import PDFDocument from 'pdfkit';
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

      // Получаем данные
      const summary = await this.getPersonalStats(
        userId,
        fromDate.toISOString(),
        toDate.toISOString(),
      );

      // Получаем профиль пользователя
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: { user: true },
      });

      const hasData = summary.totals.calories > 0 ||
        (summary.topFoods && summary.topFoods.length > 0);

      if (!hasData) {
        return null;
      }

      // Создаём PDF с настройками
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: this.t(locale, 'reportTitle', { year, month }),
          Author: 'EatSense',
          Subject: 'Monthly Nutrition Report',
        },
      });

      const stream = new Readable();
      stream._read = () => {};

      doc.on('data', (chunk) => stream.push(chunk));
      doc.on('end', () => stream.push(null));
      doc.on('error', (error) => stream.destroy(error));

      // Регистрируем шрифты с поддержкой кириллицы
      const fontsPath = path.join(__dirname, '..', 'assets', 'fonts', 'Roboto', 'static');
      doc.registerFont('Roboto', path.join(fontsPath, 'Roboto-Regular.ttf'));
      doc.registerFont('Roboto-Bold', path.join(fontsPath, 'Roboto-Bold.ttf'));
      doc.registerFont('Roboto-Light', path.join(fontsPath, 'Roboto-Light.ttf'));

      // Цвета бренда
      const colors = {
        primary: '#3B82F6',      // Синий EatSense
        secondary: '#10B981',    // Зелёный
        warning: '#F59E0B',      // Оранжевый
        danger: '#EF4444',       // Красный
        text: '#1F2937',         // Тёмно-серый
        textLight: '#6B7280',    // Серый
        background: '#F3F4F6',   // Светло-серый фон
        white: '#FFFFFF',
      };

      const pageWidth = doc.page.width - 100; // 50 margin с каждой стороны

      // ===== HEADER =====
      this.drawHeader(doc, locale, year, month, colors, pageWidth);

      // ===== ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ =====
      if (userProfile) {
        this.drawUserInfo(doc, userProfile, locale, colors);
      }

      doc.moveDown(1);

      // ===== СВОДКА ЗА МЕСЯЦ =====
      this.drawMonthlySummary(doc, summary, locale, colors, pageWidth);

      doc.moveDown(1);

      // ===== МАКРОНУТРИЕНТЫ (график) =====
      this.drawMacrosChart(doc, summary.totals, locale, colors, pageWidth);

      doc.moveDown(1);

      // ===== ТОП ПРОДУКТЫ =====
      if (summary.topFoods && summary.topFoods.length > 0) {
        this.drawTopFoods(doc, summary.topFoods, locale, colors, pageWidth);
      }

      // ===== ФУТЕР =====
      this.drawFooter(doc, locale, colors);

      doc.end();
      return stream;

    } catch (error: any) {
      console.error('[StatsService] generateMonthlyReportPDF error:', error);
      throw new ServiceUnavailableException('Failed to generate monthly report PDF');
    }
  }

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

  private t(locale: string, key: string, params?: Record<string, any>): string {
    const translations: Record<string, Record<string, string>> = {
      reportTitle: {
        en: `EatSense — Monthly Nutrition Report`,
        ru: `EatSense — Отчёт о питании за месяц`,
        kk: `EatSense — Айлық тамақтану есебі`,
      },
      period: {
        en: 'Report Period',
        ru: 'Период отчёта',
        kk: 'Есеп кезеңі',
      },
      summary: {
        en: 'Monthly Summary',
        ru: 'Сводка за месяц',
        kk: 'Айлық қорытынды',
      },
      totalCalories: {
        en: 'Total Calories',
        ru: 'Всего калорий',
        kk: 'Барлық калориялар',
      },
      avgCalories: {
        en: 'Daily Average',
        ru: 'В среднем в день',
        kk: 'Күнделікті орташа',
      },
      protein: {
        en: 'Protein',
        ru: 'Белки',
        kk: 'Ақуыз',
      },
      carbs: {
        en: 'Carbohydrates',
        ru: 'Углеводы',
        kk: 'Көмірсулар',
      },
      fat: {
        en: 'Fat',
        ru: 'Жиры',
        kk: 'Май',
      },
      topFoods: {
        en: 'Most Consumed Foods',
        ru: 'Популярные продукты',
        kk: 'Танымал тағамдар',
      },
      macros: {
        en: 'Macronutrients',
        ru: 'Макронутриенты',
        kk: 'Макронутриенттер',
      },
      entries: {
        en: 'entries',
        ru: 'записей',
        kk: 'жазба',
      },
      generatedAt: {
        en: 'Generated',
        ru: 'Сформирован',
        kk: 'Жасалған',
      },
      shareWithDoctor: {
        en: 'Share this report with your healthcare provider',
        ru: 'Поделитесь этим отчётом с вашим врачом',
        kk: 'Бұл есепті дәрігеріңізбен бөлісіңіз',
      },
      goal: {
        en: 'Daily Goal',
        ru: 'Дневная цель',
        kk: 'Күнделікті мақсат',
      },
      achieved: {
        en: 'of goal achieved',
        ru: 'от цели достигнуто',
        kk: 'мақсатқа жетті',
      },
    };

    return translations[key]?.[locale] || translations[key]?.['en'] || key;
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    locale: string,
    year: number,
    month: number,
    colors: Record<string, string>,
    pageWidth: number,
  ): void {
    const monthNames: Record<string, string[]> = {
      en: ['January', 'February', 'March', 'April', 'May', 'June',
           'July', 'August', 'September', 'October', 'November', 'December'],
      ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
           'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
      kk: ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым',
           'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'],
    };

    const monthName = monthNames[locale]?.[month - 1] || monthNames['en'][month - 1];

    // Фон заголовка
    doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);

    // Логотип / название
    doc.font('Roboto-Bold')
       .fontSize(28)
       .fillColor(colors.white)
       .text('EatSense', 50, 35);

    // Подзаголовок
    doc.font('Roboto-Light')
       .fontSize(12)
       .fillColor(colors.white)
       .text('Smart nutrition, Swiss precision', 50, 70);

    // Период справа
    doc.font('Roboto-Bold')
       .fontSize(18)
       .fillColor(colors.white)
       .text(`${monthName} ${year}`, 50, 35, {
         width: pageWidth,
         align: 'right',
       });

    doc.font('Roboto')
       .fontSize(10)
       .text(this.t(locale, 'period'), 50, 60, {
         width: pageWidth,
         align: 'right',
       });

    // Сбрасываем позицию после header
    doc.y = 140;
    doc.fillColor(colors.text);
  }

  private drawUserInfo(
    doc: PDFKit.PDFDocument,
    profile: any,
    locale: string,
    colors: Record<string, string>,
  ): void {
    const userName = profile.user?.email?.split('@')[0] || 'User';

    doc.font('Roboto')
       .fontSize(12)
       .fillColor(colors.textLight)
       .text(`${locale === 'ru' ? 'Пользователь' : locale === 'kk' ? 'Пайдаланушы' : 'User'}: ${userName}`);

    if (profile.dailyCalories) {
      doc.text(`${this.t(locale, 'goal')}: ${profile.dailyCalories} ${locale === 'en' ? 'kcal' : 'ккал'}`);
    }
  }

  private drawMonthlySummary(
    doc: PDFKit.PDFDocument,
    summary: any,
    locale: string,
    colors: Record<string, string>,
    pageWidth: number,
  ): void {
    // Считаем количество дней в диапазоне
    let daysCount = 1;
    if (summary.range?.from && summary.range?.to) {
      const from = new Date(summary.range.from);
      const to = new Date(summary.range.to);
      const diffMs = to.getTime() - from.getTime();
      if (!Number.isNaN(diffMs) && diffMs >= 0) {
        // +1, чтобы учесть оба дня включительно
        daysCount = Math.max(
          1,
          Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1,
        );
      }
    } else if (summary.totals?.entries) {
      // Запасной вариант — делить хотя бы на количество записей
      daysCount = summary.totals.entries;
    }

    const avgCalories = Math.round(
      (summary.totals.calories || 0) / (daysCount || 1),
    );

    // Заголовок секции
    doc.font('Roboto-Bold')
       .fontSize(16)
       .fillColor(colors.primary)
       .text(this.t(locale, 'summary'));

    doc.moveDown(0.5);

    // Карточки с данными
    const cardWidth = (pageWidth - 30) / 4;
    const cardHeight = 70;
    const startX = 50;
    const startY = doc.y;

    const stats = [
      {
        label: this.t(locale, 'totalCalories'),
        value: Math.round(summary.totals.calories).toLocaleString(),
        unit: locale === 'en' ? 'kcal' : 'ккал',
        color: colors.primary,
      },
      {
        label: this.t(locale, 'avgCalories'),
        value: avgCalories.toLocaleString(),
        unit: locale === 'en' ? 'kcal/day' : 'ккал/день',
        color: colors.secondary,
      },
      {
        label: this.t(locale, 'protein'),
        value: Math.round(summary.totals.protein),
        unit: locale === 'en' ? 'g' : 'г',
        color: colors.warning,
      },
      {
        label: this.t(locale, 'fat'),
        value: Math.round(summary.totals.fat),
        unit: locale === 'en' ? 'g' : 'г',
        color: colors.danger,
      },
    ];

    stats.forEach((stat, idx) => {
      const x = startX + idx * (cardWidth + 10);

      // Фон карточки
      doc.roundedRect(x, startY, cardWidth, cardHeight, 8)
         .fill(colors.background);

      // Значение
      doc.font('Roboto-Bold')
         .fontSize(20)
         .fillColor(stat.color)
         .text(String(stat.value), x + 10, startY + 12, {
           width: cardWidth - 20,
           align: 'center',
         });

      // Единица измерения
      doc.font('Roboto-Light')
         .fontSize(10)
         .fillColor(colors.textLight)
         .text(stat.unit, x + 10, startY + 35, {
           width: cardWidth - 20,
           align: 'center',
         });

      // Название
      doc.font('Roboto')
         .fontSize(9)
         .fillColor(colors.text)
         .text(stat.label, x + 10, startY + 50, {
           width: cardWidth - 20,
           align: 'center',
         });
    });

    doc.y = startY + cardHeight + 20;
  }

  private drawMacrosChart(
    doc: PDFKit.PDFDocument,
    totals: any,
    locale: string,
    colors: Record<string, string>,
    pageWidth: number,
  ): void {
    // Заголовок
    doc.font('Roboto-Bold')
       .fontSize(16)
       .fillColor(colors.primary)
       .text(this.t(locale, 'macros'));

    doc.moveDown(0.5);

    const protein = totals.protein || 0;
    const carbs = totals.carbs || 0;
    const fat = totals.fat || 0;
    const total = protein + carbs + fat || 1;

    const proteinPct = Math.round((protein / total) * 100);
    const carbsPct = Math.round((carbs / total) * 100);
    const fatPct = Math.round((fat / total) * 100);

    const barHeight = 25;
    const startX = 50;
    const startY = doc.y;

    // Прогресс-бар для белков
    doc.roundedRect(startX, startY, pageWidth * (proteinPct / 100), barHeight, 4)
       .fill('#3B82F6'); // синий

    // Прогресс-бар для углеводов
    doc.roundedRect(startX + pageWidth * (proteinPct / 100), startY,
                    pageWidth * (carbsPct / 100), barHeight, 0)
       .fill('#10B981'); // зелёный

    // Прогресс-бар для жиров
    doc.roundedRect(startX + pageWidth * ((proteinPct + carbsPct) / 100), startY,
                    pageWidth * (fatPct / 100), barHeight, 4)
       .fill('#F59E0B'); // оранжевый

    doc.y = startY + barHeight + 10;

    // Легенда
    const legendY = doc.y;
    const legendItems = [
      { label: `${this.t(locale, 'protein')} ${proteinPct}%`, color: '#3B82F6' },
      { label: `${this.t(locale, 'carbs')} ${carbsPct}%`, color: '#10B981' },
      { label: `${this.t(locale, 'fat')} ${fatPct}%`, color: '#F59E0B' },
    ];

    legendItems.forEach((item, idx) => {
      const x = startX + idx * 150;
      doc.circle(x + 5, legendY + 5, 5).fill(item.color);
      doc.font('Roboto')
         .fontSize(10)
         .fillColor(colors.text)
         .text(item.label, x + 15, legendY);
    });

    doc.y = legendY + 25;
  }

  private drawTopFoods(
    doc: PDFKit.PDFDocument,
    topFoods: any[],
    locale: string,
    colors: Record<string, string>,
    pageWidth: number,
  ): void {
    // Проверяем нужна ли новая страница
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    // Заголовок
    doc.font('Roboto-Bold')
       .fontSize(16)
       .fillColor(colors.primary)
       .text(this.t(locale, 'topFoods'));

    doc.moveDown(0.5);

    const startX = 50;
    const maxCalories = Math.max(...topFoods.map(f => f.totalCalories || 0));

    topFoods.slice(0, 10).forEach((food, idx) => {
      const y = doc.y;
      const barWidth = ((food.totalCalories || 0) / maxCalories) * (pageWidth * 0.5);

      // Номер
      doc.font('Roboto-Bold')
         .fontSize(11)
         .fillColor(colors.primary)
         .text(`${idx + 1}.`, startX, y);

      // Название продукта
      doc.font('Roboto')
         .fontSize(11)
         .fillColor(colors.text)
         .text(food.label || 'Unknown', startX + 25, y, {
           width: pageWidth * 0.4,
           ellipsis: true,
         });

      // Прогресс-бар
      doc.roundedRect(startX + pageWidth * 0.45, y + 2, barWidth, 12, 3)
         .fill(colors.secondary);

      // Калории
      doc.font('Roboto')
         .fontSize(10)
         .fillColor(colors.textLight)
         .text(
           `${Math.round(food.totalCalories || 0)} ${locale === 'en' ? 'kcal' : 'ккал'} (${food.count} ${this.t(locale, 'entries')})`,
           startX + pageWidth * 0.45 + barWidth + 10,
           y + 1,
         );

      doc.y = y + 22;
    });
  }

  private drawFooter(
    doc: PDFKit.PDFDocument,
    locale: string,
    colors: Record<string, string>,
  ): void {
    const bottomY = doc.page.height - 60;

    // Линия
    doc.moveTo(50, bottomY)
       .lineTo(doc.page.width - 50, bottomY)
       .strokeColor(colors.background)
       .lineWidth(1)
       .stroke();

    // Текст "Поделитесь с врачом"
    doc.font('Roboto')
       .fontSize(9)
       .fillColor(colors.textLight)
       .text(this.t(locale, 'shareWithDoctor'), 50, bottomY + 10, {
         width: doc.page.width - 100,
         align: 'center',
       });

    // Дата генерации
    const now = new Date().toLocaleDateString(locale === 'ru' ? 'ru-RU' : locale === 'kk' ? 'kk-KZ' : 'en-US');
    doc.text(`${this.t(locale, 'generatedAt')}: ${now}`, 50, bottomY + 25, {
      width: doc.page.width - 100,
      align: 'center',
    });

    // EatSense
    doc.font('Roboto-Light')
       .fontSize(8)
       .text('© EatSense — Smart nutrition, Swiss precision', 50, bottomY + 40, {
         width: doc.page.width - 100,
         align: 'center',
       });
  }
}
