// apps/api/src/analysis/carcinogenic-risk.service.ts

import { Injectable } from '@nestjs/common';
import {
  AnalysisData,
  CarcinogenicRiskLevel,
  CarcinogenicRiskResult,
  CarcinogenicRiskSummary,
  ItemCarcinogenRisk,
} from './analysis.types';

interface CarcinogenRuleContext {
  calories: number;
  fat: number;
  weight_g: number;
  tags: string[];
  name: string;
}

@Injectable()
export class CarcinogenicRiskService {
  /**
   * Главная точка входа:
   * На основе уже готовых AnalysisData (items + totals)
   * вернуть эвристическую оценку канцерогенного риска.
   */
  evaluateFromAnalysisData(data: AnalysisData): CarcinogenicRiskResult {
    const items = (data.items || []) as any[];

    if (!items.length) {
      const summary: CarcinogenicRiskSummary = {
        level: 'none',
        score: 0,
        reasonCodes: ['no_data'],
        summaryText:
          'We could not evaluate carcinogenic risk because there is not enough structured data for this meal.',
        disclaimer:
          'This is an educational heuristic estimate and not a medical diagnosis or treatment recommendation.',
      };

      return {
        summary,
        highRiskItems: [],
      };
    }

    // Анализ каждого компонента
    const perItem: ItemCarcinogenRisk[] = items.map((item) =>
      this.evaluateItem(item),
    );

    // Считаем общий score и уровень
    const summary = this.buildSummary(perItem);

    return {
      summary,
      highRiskItems: perItem
        .filter((i) => i.level === 'high' || i.level === 'moderate')
        .sort((a, b) => b.reasons.length - a.reasons.length)
        .slice(0, 5),
    };
  }

  /**
   * Оценка одного ингредиента.
   * Основа — теги (processed_meat, smoked, fried, ultra_processed и т.д.)
   * плюс простые проверки по имени.
   */
  private evaluateItem(rawItem: any): ItemCarcinogenRisk {
    const name: string = (rawItem.name || '').toString();
    const tags: string[] = Array.isArray(rawItem.tags) ? rawItem.tags : [];
    const calories = Number(
      (rawItem.nutrients?.calories || rawItem.calories || rawItem.kcal || 0),
    );
    const fat = Number(
      (rawItem.nutrients?.fat || rawItem.fat || rawItem.fat_g || 0),
    );
    const weight_g = Number(
      (rawItem.portion_g || rawItem.weight_g || rawItem.weight || 0),
    );

    const ctx: CarcinogenRuleContext = {
      calories,
      fat,
      weight_g,
      tags: tags.map((t) => t.toLowerCase()),
      name: name.toLowerCase(),
    };

    let score = 0;
    const reasonCodes: string[] = [];
    const reasons: string[] = [];

    // ───── Правило 1: обработанное мясо (processed_meat / колбаса / сосиски / бекон) ─────
    if (this.isProcessedMeat(ctx)) {
      score += 3;
      reasonCodes.push('processed_meat');
      reasons.push(
        'This ingredient looks like processed meat (sausages, ham, salami or similar), which is recommended to limit for long-term health.',
      );
    }

    // ───── Правило 2: красное мясо в достаточно большой порции ─────
    if (this.isRedMeat(ctx) && weight_g >= 80) {
      score += 2;
      reasonCodes.push('large_red_meat_portion');
      reasons.push(
        'This ingredient appears to be a relatively large portion of red meat.',
      );
    }

    // ───── Правило 3: жареное / сильно зажаренное / deep-fried ─────
    if (this.isHeavilyFriedOrCharred(ctx)) {
      score += 2;
      reasonCodes.push('fried_or_charred');
      reasons.push(
        'The cooking method seems to be deep-fried or heavily browned, which can increase formation of harmful compounds when eaten frequently.',
      );
    }

    // ───── Правило 4: ультра-переработанные снеки, чипсы и т.п. ─────
    if (this.isUltraProcessedSnack(ctx)) {
      score += 1;
      reasonCodes.push('ultra_processed_snack');
      reasons.push(
        'This ingredient looks like an ultra-processed snack or fast food item.',
      );
    }

    // ───── Правило 5: копчёное ─────
    if (this.isSmoked(ctx)) {
      score += 2;
      reasonCodes.push('smoked');
      reasons.push(
        'This ingredient appears to be smoked, which is recommended to eat in moderation.',
      );
    }

    // Общее приведение score -> level
    const level = this.scoreToLevel(score);

    return {
      itemName: name || rawItem.name || 'Unknown item',
      level,
      reasonCodes,
      reasons,
      tags,
    };
  }

  private scoreToLevel(score: number): CarcinogenicRiskLevel {
    if (score <= 0) return 'none';
    if (score === 1) return 'low';
    if (score === 2 || score === 3) return 'moderate';
    return 'high';
  }

  private buildSummary(items: ItemCarcinogenRisk[]): CarcinogenicRiskSummary {
    // Переводим уровни в числа
    const toNumeric = (level: CarcinogenicRiskLevel): number => {
      switch (level) {
        case 'none':
          return 0;
        case 'low':
          return 25;
        case 'moderate':
          return 60;
        case 'high':
          return 90;
        default:
          return 0;
      }
    };

    const numericScores = items.map((i) => toNumeric(i.level));
    const avgScore =
      numericScores.length > 0
        ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length
        : 0;

    let level: CarcinogenicRiskLevel = 'none';
    if (avgScore >= 80) level = 'high';
    else if (avgScore >= 50) level = 'moderate';
    else if (avgScore > 0) level = 'low';

    const allReasonCodes = Array.from(
      new Set(items.flatMap((i) => i.reasonCodes)),
    );

    const summaryText = this.buildSummaryText(level, allReasonCodes);

    return {
      level,
      score: Math.round(avgScore),
      reasonCodes: allReasonCodes,
      summaryText,
      disclaimer:
        'This is an educational heuristic estimate based on the types of foods in the meal. It is not a medical diagnosis and cannot replace professional medical advice.',
    };
  }

  private buildSummaryText(
    level: CarcinogenicRiskLevel,
    reasonCodes: string[],
  ): string {
    if (reasonCodes.includes('processed_meat') && level !== 'none') {
      return 'This meal includes processed meats or smoked items that are recommended to limit over the long term.';
    }

    if (reasonCodes.includes('fried_or_charred') && level !== 'none') {
      return 'Some components appear to be deep-fried or heavily browned. It is usually better not to rely on such foods too often.';
    }

    if (level === 'high') {
      return 'This meal contains several components that are recommended to limit for long-term health. It is okay occasionally, but better not to make it a daily pattern.';
    }

    if (level === 'moderate') {
      return 'This meal includes some components that are worth keeping in moderation over the long term.';
    }

    if (level === 'low') {
      return 'Only a small part of this meal looks like something to limit for long-term health.';
    }

    return 'No significant long-term carcinogenic risk factors were detected based on the available data.';
  }

  // ────────────────── Правила ──────────────────

  private isProcessedMeat(ctx: CarcinogenRuleContext): boolean {
    const { tags, name } = ctx;

    if (tags.includes('processed_meat') || tags.includes('sausage')) {
      return true;
    }

    const patterns = [
      'sausage',
      'salami',
      'bacon',
      'ham',
      'hot dog',
      'hotdog',
      'колбас',
      'сосиск',
      'ветчин',
      'бекон',
      'салями',
    ];

    return patterns.some((p) => name.includes(p));
  }

  private isRedMeat(ctx: CarcinogenRuleContext): boolean {
    const { tags, name } = ctx;

    if (tags.includes('red_meat')) return true;

    const patterns = [
      'beef',
      'pork',
      'veal',
      'говядина',
      'свинина',
      'телятина',
      'антрекот',
      'стейк',
    ];

    return patterns.some((p) => name.includes(p));
  }

  private isHeavilyFriedOrCharred(ctx: CarcinogenRuleContext): boolean {
    const { tags, name, fat } = ctx;

    if (
      tags.includes('fried') ||
      tags.includes('deep_fried') ||
      tags.includes('grilled') ||
      tags.includes('barbecue')
    ) {
      return true;
    }

    const patterns = ['fried', 'deep fried', 'гриль', 'жарен', 'панирован'];

    if (patterns.some((p) => name.includes(p))) return true;

    // Дополнительная эвристика: очень жирный маленький продукт (крылышки, наггетсы)
    if (fat >= 20 && ctx.weight_g <= 150) {
      return true;
    }

    return false;
  }

  private isUltraProcessedSnack(ctx: CarcinogenRuleContext): boolean {
    const { tags, name } = ctx;

    if (
      tags.includes('ultra_processed') ||
      tags.includes('fast_food') ||
      tags.includes('snack')
    ) {
      return true;
    }

    const patterns = [
      'chips',
      'crisps',
      'pringles',
      'чипсы',
      'сухарики',
      'krisp',
      'cracker',
      'печенье',
      'cookie',
      'donut',
      'пончик',
      'бургер',
      'burger',
      'nugget',
      'наггетс',
    ];

    return patterns.some((p) => name.includes(p));
  }

  private isSmoked(ctx: CarcinogenRuleContext): boolean {
    const { tags, name } = ctx;

    if (tags.includes('smoked')) return true;

    const patterns = ['копчен', 'smoked', 'копчё', 'копченость'];

    return patterns.some((p) => name.includes(p));
  }
}

