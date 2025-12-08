import { Injectable, Logger } from '@nestjs/common';
import { AnalyzedItem } from './analysis.types';

/**
 * P3.2: Service for detecting hidden ingredients in food analysis
 * Detects oils, sauces, dressings, and other hidden components that may not be visible in images
 */
@Injectable()
export class HiddenIngredientsService {
  private readonly logger = new Logger(HiddenIngredientsService.name);

  /**
   * P3.2: Detect hidden ingredients based on cooking methods and food types
   */
  detectHiddenIngredients(items: AnalyzedItem[]): AnalyzedItem[] {
    const hidden: AnalyzedItem[] = [];

    for (const item of items) {
      const nameLower = item.name.toLowerCase();
      const originalNameLower = item.originalName?.toLowerCase() || nameLower;

      // Detect fried foods - likely contain cooking oil
      if (this.isFriedFood(nameLower, originalNameLower)) {
        const oilAmount = this.estimateCookingOil(item.portion_g);
        if (oilAmount > 0) {
          hidden.push({
            id: `hidden-oil-${item.id}`,
            name: 'Cooking oil',
            originalName: 'cooking oil',
            label: 'Hidden (cooking)',
            portion_g: oilAmount,
            nutrients: {
              calories: Math.round(oilAmount * 9), // ~9 kcal per gram of oil
              protein: 0,
              carbs: 0,
              fat: Math.round(oilAmount * 10) / 10,
              fiber: 0,
              sugars: 0,
              satFat: Math.round(oilAmount * 1.5 * 10) / 10, // ~15% saturated fat
              energyDensity: 900,
            },
            source: 'hidden_ingredient',
            confidence: 0.6,
            suspicious: false,
            locale: item.locale || 'en',
          });
        }
      }

      // Detect processed meats - likely contain hidden sodium and preservatives
      if (this.isProcessedMeat(nameLower, originalNameLower)) {
        const sodiumEstimate = this.estimateSodiumForProcessedMeat(item.portion_g);
        if (sodiumEstimate > 0 && !item.nutrients.sodium) {
          // Add sodium to existing item if not present
          item.nutrients.sodium = sodiumEstimate;
        }
      }

      // Detect sauces/dressings that might be hidden
      if (this.isLikelyToHaveHiddenSauce(nameLower, originalNameLower)) {
        const sauceEstimate = this.estimateHiddenSauce(item.portion_g);
        if (sauceEstimate > 0) {
          hidden.push({
            id: `hidden-sauce-${item.id}`,
            name: 'Hidden sauce/dressing',
            originalName: 'hidden sauce',
            label: 'Hidden (estimated)',
            portion_g: sauceEstimate,
            nutrients: {
              calories: Math.round(sauceEstimate * 2.5), // ~2.5 kcal per gram
              protein: 0,
              carbs: Math.round(sauceEstimate * 0.3 * 10) / 10,
              fat: Math.round(sauceEstimate * 0.2 * 10) / 10,
              fiber: 0,
              sugars: Math.round(sauceEstimate * 0.25 * 10) / 10,
              satFat: Math.round(sauceEstimate * 0.05 * 10) / 10,
              energyDensity: 250,
            },
            source: 'hidden_ingredient',
            confidence: 0.5,
            suspicious: false,
            locale: item.locale || 'en',
          });
        }
      }
    }

    if (hidden.length > 0) {
      this.logger.debug(`[HiddenIngredientsService] Detected ${hidden.length} hidden ingredients`);
    }

    return hidden;
  }

  /**
   * P3.2: Check if food is fried
   */
  private isFriedFood(name: string, originalName: string): boolean {
    const friedKeywords = [
      'fried',
      'pan-fried',
      'deep-fried',
      'stir-fried',
      'sautéed',
      'жарен',
      'обжарен',
      'фритюр',
    ];
    return friedKeywords.some((keyword) => name.includes(keyword) || originalName.includes(keyword));
  }

  /**
   * P3.2: Estimate cooking oil amount based on portion size
   */
  private estimateCookingOil(portionG: number): number {
    // Conservative estimate: 5-15g of oil per 100g of food for fried items
    // Smaller portions use less oil per gram
    if (portionG <= 50) return 3; // Small portion: ~3g
    if (portionG <= 150) return 8; // Medium portion: ~8g
    if (portionG <= 300) return 15; // Large portion: ~15g
    return Math.round(portionG * 0.05); // 5% of weight for very large portions
  }

  /**
   * P3.2: Check if food is processed meat
   */
  private isProcessedMeat(name: string, originalName: string): boolean {
    const processedKeywords = [
      'sausage',
      'salami',
      'bacon',
      'ham',
      'hot dog',
      'chorizo',
      'pepperoni',
      'колбаса',
      'сосиска',
      'бекон',
      'ветчина',
    ];
    return processedKeywords.some((keyword) => name.includes(keyword) || originalName.includes(keyword));
  }

  /**
   * P3.2: Estimate sodium for processed meats
   */
  private estimateSodiumForProcessedMeat(portionG: number): number {
    // Processed meats typically contain 800-1200mg sodium per 100g
    return Math.round(portionG * 10); // ~1000mg per 100g
  }

  /**
   * P3.2: Check if food is likely to have hidden sauce
   */
  private isLikelyToHaveHiddenSauce(name: string, originalName: string): boolean {
    const sauceKeywords = [
      'sandwich',
      'burger',
      'wrap',
      'pasta',
      'pizza',
      'сандвич',
      'бургер',
      'паста',
      'пицца',
    ];
    return sauceKeywords.some((keyword) => name.includes(keyword) || originalName.includes(keyword));
  }

  /**
   * P3.2: Estimate hidden sauce amount
   */
  private estimateHiddenSauce(portionG: number): number {
    // Conservative estimate: 10-20g of sauce per 100g of food
    if (portionG <= 100) return 10;
    if (portionG <= 250) return 20;
    return Math.round(portionG * 0.1); // 10% of weight
  }
}

