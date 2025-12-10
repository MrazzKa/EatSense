// apps/api/src/analysis/food-compatibility.service.ts

import { Injectable } from '@nestjs/common';
import {
  AnalysisData,
  FoodCompatibilityResult,
  FoodCompatibilityIssue,
  FoodCompatibilityPositiveHighlight,
  FoodCompatibilityScore,
  FoodCompatibilityScoreLabel,
} from './analysis.types';

@Injectable()
export class FoodCompatibilityService {
  /**
   * Основная точка входа: на основе уже готовых AnalysisData (items + totals)
   * вернуть результат сочетаемости блюда.
   */
  evaluateFromAnalysisData(
    data: AnalysisData,
    options?: {
      /** Локаль нужна для более тонких правил (пока можем игнорировать) */
      locale?: string;
      /** Тип приёма пищи (может учесть time-of-day, тяжесть ужина и т.п.) */
      mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      /** Локальное время приёма пищи, если есть */
      localDateTime?: Date;
    },
  ): FoodCompatibilityResult {
    const totals = data.total;
    const items = data.items || [];

    // Защитный код
    if (!totals || !items.length) {
      return this.buildFallbackResult();
    }

    // Шаг 1: соберём базовые показатели (калории, макросы, сахар, клетчатка, насыщенные жиры)
    const {
      calories,
      protein,
      carbs,
      fat,
      fiber_g,
      sugars_g,
      satFat_g,
      weight_g,
    } = this.extractMacroSnapshot(data);

    // Нормализуем показатели на порцию / на 100 г
    const energyDensity = this.computeEnergyDensity(calories, weight_g);

    // Шаг 2: соберём положительные моменты и проблемы по простым правилам
    const positives: FoodCompatibilityPositiveHighlight[] = [];
    const issues: FoodCompatibilityIssue[] = [];

    this.applyPositiveRules({
      calories,
      protein,
      carbs,
      fat,
      fiber_g,
      sugars_g,
      satFat_g,
      energyDensity,
      items,
      positives,
    });

    this.applyIssueRules({
      calories,
      protein,
      carbs,
      fat,
      fiber_g,
      sugars_g,
      satFat_g,
      energyDensity,
      items,
      issues,
      options,
    });

    // Шаг 3: соберём итоговый score на основе баллов/штрафов
    const score = this.buildScore(
      calories,
      protein,
      fiber_g,
      sugars_g,
      satFat_g,
      energyDensity,
      positives,
      issues,
    );

    return {
      score,
      positives,
      issues,
    };
  }

  private buildFallbackResult(): FoodCompatibilityResult {
    return {
      score: {
        value: 50,
        label: 'moderate',
        reasons: ['insufficient_data'],
      },
      positives: [],
      issues: [
        {
          code: 'other',
          severity: 'low',
          title: 'Not enough data',
          description:
            'We could not evaluate food compatibility because the analysis data is incomplete.',
          advice: 'Try to reanalyze the meal with a clear photo or description.',
        },
      ],
    };
  }

  private extractMacroSnapshot(data: AnalysisData) {
    // Предполагаем, что totals уже содержит нужные поля. Если чего-то нет — подставь 0.
    const t: any = data.total || {};

    const calories = Number(t.calories || t.kcal || 0);
    const protein = Number(t.protein || t.protein_g || 0);
    const carbs = Number(t.carbs || t.carbs_g || 0);
    const fat = Number(t.fat || t.fat_g || 0);
    const fiber_g = Number(t.fiber || t.fiber_g || 0);
    const sugars_g = Number(t.sugars || t.sugars_g || 0);
    const satFat_g = Number(t.satFat || t.saturatedFat || t.satFat_g || 0);
    const weight_g = Number(t.portion_g || t.totalWeight_g || 0);

    return {
      calories,
      protein,
      carbs,
      fat,
      fiber_g,
      sugars_g,
      satFat_g,
      weight_g,
    };
  }

  private computeEnergyDensity(calories: number, weight_g: number): number {
    if (!calories || !weight_g || weight_g <= 0) return 0;
    return calories / weight_g; // ккал / грамм
  }

  // ───────────── ПЛЮСЫ ─────────────

  private applyPositiveRules(args: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber_g: number;
    sugars_g: number;
    satFat_g: number;
    energyDensity: number;
    items: any[];
    positives: FoodCompatibilityPositiveHighlight[];
  }) {
    const { calories, protein, fiber_g, sugars_g, energyDensity, items, positives } = args;

    // Правило 1: хороший баланс белка и клетчатки
    if (protein >= 20 && fiber_g >= 8 && sugars_g <= 20) {
      positives.push({
        code: 'good_protein_fiber_balance',
        title: 'Good protein and fiber balance',
        description:
          'This meal has a solid amount of protein and fiber with controlled sugar, which supports satiety and stable energy.',
        relatedItems: this.pickTopItemsBy('protein', items, 2),
      });
    }

    // Правило 2: умеренная калорийность при нормальной массе
    if (calories >= 350 && calories <= 700 && energyDensity > 0 && energyDensity <= 1.8) {
      positives.push({
        code: 'moderate_energy_density',
        title: 'Moderate energy density',
        description:
          'Calorie density is moderate, which is generally good for maintaining energy without overeating.',
        relatedItems: [],
      });
    }

    // Правило 3: низкий сахар
    if (sugars_g <= 10) {
      positives.push({
        code: 'low_sugar',
        title: 'Low added sugar',
        description: 'Sugar content is relatively low for this meal.',
        relatedItems: this.pickTopItemsBy('sugars', items, 2),
      });
    }

    // Правило 4: овощи / цельные продукты
    const veggieItems = items.filter(
      (i) =>
        (i.name?.toLowerCase().includes('vegetable') ||
          i.name?.toLowerCase().includes('salad') ||
          i.name?.toLowerCase().includes('овощ') ||
          i.name?.toLowerCase().includes('салат')) &&
        fiber_g >= 5,
    );
    if (veggieItems.length > 0) {
      positives.push({
        code: 'good_veggie_portion',
        title: 'Nice portion of vegetables',
        description: 'The meal includes vegetables that add fiber, vitamins and volume.',
        relatedItems: veggieItems.map((i) => i.name).slice(0, 3),
      });
    }
  }

  // ───────────── ПРОБЛЕМЫ ─────────────

  private applyIssueRules(args: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber_g: number;
    sugars_g: number;
    satFat_g: number;
    energyDensity: number;
    items: any[];
    issues: FoodCompatibilityIssue[];
    options?: {
      mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      localDateTime?: Date;
    };
  }) {
    const {
      calories,
      protein,
      carbs,
      fat,
      fiber_g,
      sugars_g,
      satFat_g,
      energyDensity,
      items,
      issues,
      options,
    } = args;

    // Issue 1: сахар + насыщенные жиры
    if (sugars_g >= 25 && satFat_g >= 15) {
      issues.push({
        code: 'sugar_plus_saturated_fat',
        severity: 'high',
        title: 'High sugar plus saturated fat',
        description:
          'This meal has a lot of fast sugar together with saturated fat, which can be hard on metabolic health if eaten frequently.',
        advice:
          'Try to separate very sweet foods and high-fat foods into different meals, or reduce one of these components.',
        relatedItems: this.pickTopItemsByCombined(['sugars', 'satFat'], items, 3),
      });
    }

    // Issue 2: очень высокая калорийность и плотность
    if (calories >= 900 && energyDensity >= 2.5) {
      issues.push({
        code: 'very_high_energy_density',
        severity: 'high',
        title: 'Very high energy density',
        description:
          'This meal is very calorie-dense relative to its weight, which makes it easy to overeat without feeling full.',
        advice:
          'Try to add more low-calorie volume (vegetables, salads, soups) and reduce fried or ultra-processed components.',
        relatedItems: this.pickTopItemsBy('calories', items, 3),
      });
    }

    // Issue 3: мало клетчатки при высоких углеводах
    if (fiber_g < 5 && carbs >= 60) {
      issues.push({
        code: 'low_fiber_high_carbs',
        severity: 'medium',
        title: 'High carbs with low fiber',
        description:
          'There are quite a lot of carbohydrates but not much fiber, which can lead to faster spikes of blood sugar.',
        advice: 'Add more vegetables, legumes or whole grains to increase fiber in this meal.',
        relatedItems: this.pickTopItemsBy('carbs', items, 3),
      });
    }

    // Issue 4: мало белка
    if (protein < 15) {
      issues.push({
        code: 'low_protein_meal',
        severity: 'medium',
        title: 'Low protein content',
        description:
          'Protein is relatively low for a full meal, which can reduce satiety and recovery after training.',
        advice:
          'Add a source of lean protein (eggs, fish, poultry, dairy, tofu, legumes) to balance the meal.',
        relatedItems: [],
      });
    }

    // Issue 5: тяжёлый поздний ужин
    if (options?.mealType === 'dinner' || this.isLateEvening(options?.localDateTime)) {
      if (calories >= 800 || fat >= 40) {
        issues.push({
          code: 'heavy_evening_meal',
          severity: 'medium',
          title: 'Heavy late evening meal',
          description:
            'This dinner is quite heavy in calories and/or fats for a late time, which can disturb sleep and digestion.',
          advice:
            'Try to keep late dinners lighter, and move larger or high-fat meals earlier in the day if possible.',
          relatedItems: this.pickTopItemsBy('fat', items, 3),
        });
      }
    }

    // Issue 6: много обработанного мяса
    const processedMeatItems = items.filter((i) => {
      const nameLower = (i.name || '').toLowerCase();
      return (
        nameLower.includes('sausage') ||
        nameLower.includes('salami') ||
        nameLower.includes('bacon') ||
        nameLower.includes('колбаса') ||
        nameLower.includes('сосиска') ||
        nameLower.includes('бекон')
      );
    });
    if (processedMeatItems.length >= 2) {
      issues.push({
        code: 'too_many_processed_meats',
        severity: 'medium',
        title: 'A lot of processed meats',
        description:
          'The meal contains several processed meat items, which are recommended to limit for long-term health.',
        advice:
          'Try replacing some processed meats with fresh meat, fish, legumes or plant-based proteins.',
        relatedItems: processedMeatItems.map((i) => i.name).slice(0, 4),
      });
    }
  }

  private isLateEvening(date?: Date): boolean {
    if (!date) return false;
    const hour = date.getHours();
    return hour >= 21; // условно считаем "поздно вечером" после 21:00
  }

  private buildScore(
    calories: number,
    protein: number,
    fiber_g: number,
    sugars_g: number,
    satFat_g: number,
    energyDensity: number,
    positives: FoodCompatibilityPositiveHighlight[],
    issues: FoodCompatibilityIssue[],
  ): FoodCompatibilityScore {
    let score = 70; // базовый старт

    // Бонусы за плюсы
    if (positives.some((p) => p.code === 'good_protein_fiber_balance')) {
      score += 8;
    }
    if (positives.some((p) => p.code === 'moderate_energy_density')) {
      score += 5;
    }
    if (positives.some((p) => p.code === 'low_sugar')) {
      score += 4;
    }
    if (positives.some((p) => p.code === 'good_veggie_portion')) {
      score += 5;
    }

    // Штрафы за проблемы (по степени тяжести)
    for (const issue of issues) {
      if (issue.severity === 'high') score -= 15;
      if (issue.severity === 'medium') score -= 8;
      if (issue.severity === 'low') score -= 3;
    }

    // Нормализация в диапазон 0–100
    score = Math.max(0, Math.min(100, score));

    let label: FoodCompatibilityScoreLabel = 'moderate';
    if (score >= 85) label = 'excellent';
    else if (score >= 70) label = 'good';
    else if (score >= 50) label = 'moderate';
    else label = 'problematic';

    const reasons: string[] = [];
    if (issues.length === 0) {
      reasons.push('no_significant_issues_detected');
    } else {
      reasons.push(...issues.map((i) => i.code));
    }

    return {
      value: score,
      label,
      reasons,
    };
  }

  // ───────────── УТИЛИТЫ ─────────────

  private pickTopItemsBy(field: string, items: any[], limit: number): string[] {
    return [...items]
      .filter((i) => {
        const nutrients = i.nutrients || {};
        return typeof nutrients[field] === 'number' || typeof i[field] === 'number';
      })
      .sort((a, b) => {
        const aVal = (a.nutrients || {})[field] || a[field] || 0;
        const bVal = (b.nutrients || {})[field] || b[field] || 0;
        return bVal - aVal;
      })
      .slice(0, limit)
      .map((i) => i.name)
      .filter(Boolean);
  }

  private pickTopItemsByCombined(fields: string[], items: any[], limit: number): string[] {
    return [...items]
      .map((i) => {
        const nutrients = i.nutrients || {};
        const score = fields.reduce((s, f) => s + (nutrients[f] || i[f] || 0), 0);
        return { item: i, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.item.name)
      .filter(Boolean);
  }
}

