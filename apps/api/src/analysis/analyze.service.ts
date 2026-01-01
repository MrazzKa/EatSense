import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VisionService, VisionComponent } from './vision.service';
import { PortionService } from './portion.service';
import { CacheService } from '../cache/cache.service';
import { normalizeFoodName } from './text-utils';
import {
  AnalysisData,
  AnalyzedItem,
  AnalysisTotals,
  Nutrients,
  HealthScore,
  AnalysisDebug,
  AnalysisSanityIssue,
} from './analysis.types';

// Local type definitions for Health Score (matching analysis.types.ts)
type HealthScoreLevel = 'poor' | 'average' | 'good' | 'excellent';

interface HealthScoreFactors {
  protein: number;
  fiber: number;
  saturatedFat: number;
  sugars: number;
  energyDensity: number;
}

type HealthFeedbackType = 'positive' | 'warning';

interface HealthFeedbackItem {
  type: HealthFeedbackType;
  code: string;
  message: string;
}
import { FoodLocalizationService } from './food-localization.service';
import { NutritionOrchestrator } from './providers/nutrition-orchestrator.service';
import { HiddenIngredientsService } from './hidden-ingredients.service';
import { FoodCompatibilityService } from './food-compatibility.service';
import { CarcinogenicRiskService } from './carcinogenic-risk.service';
import { HiddenIngredientEstimate } from './analysis.types';
import { AnalysisValidatorService } from './validation/analysis-validator.service';
// Import types - interfaces are exported from nutrition-provider.interface.ts
// Note: If TypeScript shows import errors, restart TS server or check that file is saved
import type {
  NutritionLookupContext,
  NutritionProviderResult,
  CanonicalFood,
  CanonicalNutrients,
} from './providers/nutrition-provider.interface';
import * as crypto from 'crypto';

type HealthWeights = {
  protein: number;
  fiber: number;
  satFat: number;
  sugar: number;
  energyDensity: number;
};

// Тип результата детектора напитка
interface BeverageDetectionResult {
  isBeverage: boolean;
  kind: 'water' | 'black_coffee' | 'tea' | 'milk_coffee' | 'other';
  // стандартная порция в мл
  volume_ml?: number;
  // канонические значения на всю порцию
  calories?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  fiber_g?: number;
  sugars_g?: number;
  satFat_g?: number;
}

/**
 * Main service for analyzing food images and text descriptions.
 * Orchestrates Vision extraction, FDC matching, portion estimation, and HealthScore calculation.
 * 
 * TODO: Future enhancement - barcode-based product lookup:
 * - When a barcode is detected in an image or provided by user, use OpenFoodFactsService
 *   to look up product data directly, bypassing vision/FDC matching for known products.
 * - This would provide more accurate nutrition data for packaged foods.
 */
@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  // Versioned cache key to avoid conflicts with legacy cached shapes
  // v6: Added validation ranges for salmon/avocado/quinoa/sesame/nori, increased USDA minScore
  private readonly ANALYSIS_CACHE_VERSION = 'v6';

  // Keywords to detect drinks in food names
  private readonly DRINK_KEYWORDS = [
    'coffee', 'latte', 'cappuccino', 'espresso', 'mocha',
    'tea', 'chai', 'matcha',
    'juice', 'smoothie', 'shake',
    'soda', 'cola', 'fanta', 'sprite', 'pepsi',
    'energy drink', 'red bull',
    'water', 'sparkling water',
    'milk', 'almond milk', 'soy milk',
    'beer', 'wine', 'cocktail', 'drink', 'beverage',
    'кофе', 'чай', 'сок', 'газировка', 'напиток', 'молоко',
  ];

  private readonly FOOD_SYNONYMS: Map<string, string> = new Map([
    // Яйца
    ['egg', 'egg'], ['яйц', 'egg'], ['желток', 'egg'], ['белок яйц', 'egg'],
    ['yolk', 'egg'], ['omelet', 'egg'], ['омлет', 'egg'], ['scrambled', 'egg'],
    ['boiled egg', 'egg'], ['fried egg', 'egg'], ['вкрутую', 'egg'],

    // Курица
    ['chicken', 'chicken'], ['курин', 'chicken'], ['куриц', 'chicken'],
    ['курятин', 'chicken'], ['грудка', 'chicken'], ['breast', 'chicken'],
    ['бедро кур', 'chicken'], ['крыл', 'chicken'], ['wing', 'chicken'],

    // Говядина
    ['beef', 'beef'], ['говядин', 'beef'], ['говяж', 'beef'],
    ['стейк', 'beef'], ['steak', 'beef'], ['фарш', 'beef'],

    // Свинина
    ['pork', 'pork'], ['свинин', 'pork'], ['свиной', 'pork'],
    ['бекон', 'pork'], ['bacon', 'pork'], ['ветчин', 'pork'], ['ham', 'pork'],
    ['сосиск', 'pork'], ['sausage', 'pork'], ['колбас', 'pork'],

    // Рыба
    ['fish', 'fish'], ['рыб', 'fish'], ['salmon', 'fish'], ['лосось', 'fish'],
    ['сёмга', 'fish'], ['тунец', 'fish'], ['tuna', 'fish'], ['треска', 'fish'],
    ['cod', 'fish'], ['форель', 'fish'], ['trout', 'fish'],

    // Морепродукты
    ['shrimp', 'shrimp'], ['креветк', 'shrimp'], ['prawn', 'shrimp'],
    ['морепродукт', 'seafood'], ['seafood', 'seafood'], ['кальмар', 'seafood'],

    // Сыр
    ['cheese', 'cheese'], ['сыр', 'cheese'], ['моцарел', 'cheese'],
    ['пармезан', 'cheese'], ['чеддер', 'cheese'], ['фета', 'cheese'],

    // Молочка
    ['milk', 'milk'], ['молок', 'milk'], ['молоч', 'milk'],
    ['сливк', 'cream'], ['cream', 'cream'], ['сметан', 'cream'],
    ['yogurt', 'yogurt'], ['йогурт', 'yogurt'], ['кефир', 'yogurt'],
    ['творог', 'cottage'], ['cottage', 'cottage'],
    ['butter', 'butter'], ['масло слив', 'butter'],
    ['oil', 'oil'], ['масло раст', 'oil'], ['оливк', 'oil'],

    // Гарниры
    ['potato', 'potato'], ['картоф', 'potato'], ['картош', 'potato'],
    ['fries', 'potato'], ['фри', 'potato'], ['пюре картоф', 'potato'],
    ['rice', 'rice'], ['рис', 'rice'], ['ризотто', 'rice'],
    ['pasta', 'pasta'], ['макарон', 'pasta'], ['спагетти', 'pasta'],
    ['noodle', 'pasta'], ['лапша', 'pasta'], ['пенне', 'pasta'],
    ['bread', 'bread'], ['хлеб', 'bread'], ['тост', 'bread'], ['булк', 'bread'],
    ['батон', 'bread'], ['багет', 'bread'], ['лаваш', 'bread'],
    ['buckwheat', 'buckwheat'], ['гречк', 'buckwheat'],
    ['oat', 'oatmeal'], ['овсян', 'oatmeal'], ['porridge', 'oatmeal'],
    ['мюсли', 'oatmeal'], ['granola', 'oatmeal'],

    // Овощи
    ['tomato', 'tomato'], ['помидор', 'tomato'], ['томат', 'tomato'], ['черри', 'tomato'],
    ['cucumber', 'cucumber'], ['огурец', 'cucumber'],
    ['carrot', 'carrot'], ['морков', 'carrot'],
    ['beet', 'beetroot'], ['свекл', 'beetroot'], ['свёкл', 'beetroot'],
    ['cabbage', 'cabbage'], ['капуст', 'cabbage'], ['coleslaw', 'cabbage'],
    ['onion', 'onion'], ['лук', 'onion'],
    ['pepper', 'pepper'], ['перец', 'pepper'], ['паприк', 'pepper'],
    ['broccoli', 'broccoli'], ['брокколи', 'broccoli'],
    ['spinach', 'spinach'], ['шпинат', 'spinach'],
    ['lettuce', 'lettuce'], ['салат лист', 'lettuce'], ['латук', 'lettuce'],
    ['руккола', 'lettuce'], ['arugula', 'lettuce'], ['зелен', 'greens'],
    ['corn', 'corn'], ['кукуруз', 'corn'],
    ['peas', 'peas'], ['горох', 'peas'],
    ['beans', 'beans'], ['фасоль', 'beans'],
    ['mushroom', 'mushroom'], ['гриб', 'mushroom'],
    ['zucchini', 'zucchini'], ['кабачок', 'zucchini'],
    ['eggplant', 'eggplant'], ['баклажан', 'eggplant'],
    ['avocado', 'avocado'], ['авокадо', 'avocado'],

    // Фрукты
    ['apple', 'apple'], ['яблок', 'apple'],
    ['banana', 'banana'], ['банан', 'banana'],
    ['orange', 'orange'], ['апельсин', 'orange'], ['мандарин', 'orange'],
    ['grape', 'grape'], ['виноград', 'grape'],
    ['berry', 'berry'], ['ягод', 'berry'], ['клубник', 'berry'],
    ['черник', 'berry'], ['голубик', 'berry'],

    // Соусы
    ['sauce', 'sauce'], ['соус', 'sauce'],
    ['mayo', 'mayo'], ['майонез', 'mayo'],
    ['ketchup', 'ketchup'], ['кетчуп', 'ketchup'],
    ['dressing', 'dressing'], ['заправк', 'dressing'],

    // Напитки
    ['coffee', 'coffee'], ['кофе', 'coffee'], ['латте', 'coffee'],
    ['капучино', 'coffee'], ['эспрессо', 'coffee'], ['американо', 'coffee'],
    ['tea', 'tea'], ['чай', 'tea'],
    ['juice', 'juice'], ['сок', 'juice'],
    ['water', 'water'], ['вода', 'water'],

    // Прочее
    ['crab stick', 'crab_stick'], ['крабов', 'crab_stick'], ['сурими', 'crab_stick'],
  ]);

  /**
   * Normalize text for comparison
   */
  private normalizeText(value?: string | null): string {
    return (value || '').trim().toLowerCase();
  }

  private getNormalizedFoodKey(name: string): string {
    const lower = name.toLowerCase();

    // Use Array.from to iterate Map for better TypeScript compatibility
    for (const [pattern, group] of Array.from(this.FOOD_SYNONYMS.entries())) {
      if (lower.includes(pattern)) {
        return group;
      }
    }

    const words = lower
      .replace(/[^a-zа-яё0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (words.length > 0) {
      const longest = words.reduce((a, b) => (a.length > b.length ? a : b));
      const isRussian = /[а-яё]/.test(longest);
      return longest.slice(0, isRussian ? 5 : 4);
    }

    return lower.slice(0, 8);
  }

  private deduplicateComponents(components: VisionComponent[]): VisionComponent[] {
    const groups = new Map<string, VisionComponent>();

    for (const comp of components) {
      const key = this.getNormalizedFoodKey(comp.name);
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, { ...comp });
      } else {
        existing.est_portion_g = (existing.est_portion_g || 0) + (comp.est_portion_g || 0);

        if ((comp as any).confidence > ((existing as any).confidence || 0)) {
          existing.name = comp.name;
          (existing as any).confidence = (comp as any).confidence;
        }

        this.logger.debug(
          `[Dedupe] Merged "${comp.name}" into "${existing.name}", total: ${existing.est_portion_g}g`
        );
      }
    }

    const result = Array.from(groups.values());

    if (result.length < components.length) {
      this.logger.log(`[Dedupe] Reduced ${components.length} → ${result.length} components`);
    }

    return result;
  }

  /**
   * Detect plain water and return canonical values
   */
  private detectPlainWater(name: string, category?: string): BeverageDetectionResult | null {
    const n = this.normalizeText(name);
    const c = this.normalizeText(category);

    // Ключевые слова
    const waterKeywords = [
      'water',
      'still water',
      'sparkling water',
      'mineral water',
      'вода',
      'питьевая вода',
      'минеральная вода',
      'газированная вода',
    ];

    const isWaterByName = waterKeywords.some((kw) => n.includes(kw));
    const isWaterByCategory = c.includes('water');

    if (!isWaterByName && !isWaterByCategory) {
      return null;
    }

    // Negative indicators: contains flavoring/sweetening keywords
    const excludeKeywords = [
      'juice', 'cola', 'soda', 'lemonade', 'sweet', 'syrup', 'flavor', 'flavored',
      'сок', 'лимонад', 'газировка', 'со вкусом', 'подслащ', 'сироп',
      'vitamin', 'electrolyte', 'sports drink', 'energy',
      'витамин', 'электролит', 'спортивный напиток',
    ];

    const hasExcludeKeyword = excludeKeywords.some((kw) => n.includes(kw));
    if (hasExcludeKeyword) {
      return null;
    }

    // Каноническая порция 250 мл
    return {
      isBeverage: true,
      kind: 'water',
      volume_ml: 250,
      calories: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      fiber_g: 0,
      sugars_g: 0,
      satFat_g: 0,
    };
  }

  /**
   * Check if a food name represents plain water (not flavored, not sweetened)
   * Legacy method for backward compatibility
   * 
   * @param name - Food name to check (can be vision label, baseName, or displayName)
   * @returns true if the name represents plain water
   */
  private isPlainWater(name: string): boolean {
    return this.detectPlainWater(name) !== null;
  }

  /**
   * STEP 1: Helper to detect plain water based on name and drink status
   * Used before computeHealthScore to force zero macros and high score for water
   */
  /**
   * Объединяющий детектор напитка - проверяет все типы напитков в правильном порядке
   */
  private detectBeverageForItem(component: {
    name: string;
    category?: string;
    volume_ml?: number;
    portion_g?: number;
  }): BeverageDetectionResult | null {
    const { name, category, volume_ml } = component;

    // 1) Вода
    const water = this.detectPlainWater(name, category);
    if (water) return water;

    // 2) Чёрный кофе / чай
    const plainCoffeeOrTea = this.detectPlainCoffeeOrTea(name, category);
    if (plainCoffeeOrTea) return plainCoffeeOrTea;

    // 3) Молочные кофейные напитки
    const milkCoffee = this.detectMilkCoffeeDrink(name, category, volume_ml);
    if (milkCoffee) return milkCoffee;

    return null;
  }

  private isLikelyPlainWater(
    name?: string | null,
    isDrink?: boolean,
  ): boolean {
    if (!isDrink) return false;
    if (!name) return false;
    return this.detectPlainWater(name) !== null;
  }

  /**
   * Detect plain coffee or tea (without sugar/milk/dessert) and return canonical values
   */
  private detectPlainCoffeeOrTea(name: string, category?: string): BeverageDetectionResult | null {
    const n = this.normalizeText(name);
    const c = this.normalizeText(category);

    const coffeeKeywords = ['black coffee', 'espresso', 'americano', 'кофе', 'эспрессо', 'американо', 'черный кофе'];
    const teaKeywords = ['tea', 'чай', 'black tea', 'green tea', 'green чай'];

    // Если найдена "milk", "latte", "капучино" и т.п. — это уже не plain coffee/tea
    const milkIndicators = ['latte', 'капучино', 'cappuccino', 'flat white', 'raf', 'раф', 'milk', 'молоко', 'сливки'];

    const hasMilkIndicator = milkIndicators.some((kw) => n.includes(kw));
    if (hasMilkIndicator) {
      return null;
    }

    const isCoffee = coffeeKeywords.some((kw) => n.includes(kw));
    const isTea = teaKeywords.some((kw) => n.includes(kw));

    if (!isCoffee && !isTea && !c.includes('coffee') && !c.includes('tea')) {
      return null;
    }

    // Каноническая порция 200 мл
    // ~2-5 ккал, примем 4 ккал
    return {
      isBeverage: true,
      kind: isCoffee ? 'black_coffee' : 'tea',
      volume_ml: 200,
      calories: 4,
      protein_g: 0.3,
      fat_g: 0.1,
      carbs_g: 0.7,
      fiber_g: 0,
      sugars_g: 0,
      satFat_g: 0,
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  private detectPlainCoffeeOrTeaLegacy(name: string): { isPlain: boolean; type: 'coffee' | 'tea' | null } {
    const result = this.detectPlainCoffeeOrTea(name);
    if (!result) {
      return { isPlain: false, type: null };
    }
    return {
      isPlain: true,
      type: result.kind === 'black_coffee' ? 'coffee' : 'tea',
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  private isLikelyPlainCoffeeOrTea(name: string): boolean {
    return this.detectPlainCoffeeOrTea(name) !== null;
  }

  /**
   * Detect milk coffee drinks (cappuccino, latte, etc.) and return canonical values
   */
  private detectMilkCoffeeDrink(
    name: string,
    category?: string,
    volumeFromVision?: number,
  ): BeverageDetectionResult | null {
    const n = this.normalizeText(name);
    const c = this.normalizeText(category);

    const milkCoffeeKeywords = [
      'latte',
      'cappuccino',
      'flat white',
      'raf',
      'раф',
      'капучино',
      'латте',
      'молочный кофе',
    ];

    const isMilkCoffee =
      milkCoffeeKeywords.some((kw) => n.includes(kw)) ||
      c.includes('latte') ||
      c.includes('cappuccino');

    if (!isMilkCoffee) {
      return null;
    }

    // Определяем объем (если Vision дал volume_ml, используем его)
    const baseVolume = volumeFromVision && volumeFromVision > 0 ? volumeFromVision : 250;

    // Примерная энергетическая плотность капучино/латте на коровьем молоке:
    // ~60 ккал на 100 мл (на молоке 2-3.2%).
    const caloriesPer100ml = 60;
    const calories = (caloriesPer100ml * baseVolume) / 100;

    // Примерный БЖУ на 100 мл
    const proteinPer100ml = 3.2;
    const fatPer100ml = 3.5;
    const carbsPer100ml = 4.5;

    const protein_g = (proteinPer100ml * baseVolume) / 100;
    const fat_g = (fatPer100ml * baseVolume) / 100;
    const carbs_g = (carbsPer100ml * baseVolume) / 100;

    return {
      isBeverage: true,
      kind: 'milk_coffee',
      volume_ml: baseVolume,
      calories: Math.round(calories),
      protein_g: this.round(protein_g, 1),
      fat_g: this.round(fat_g, 1),
      carbs_g: this.round(carbs_g, 1),
      fiber_g: 0,
      sugars_g: this.round((4.5 * baseVolume) / 100, 1), // ~4.5g per 100ml
      satFat_g: this.round((2.0 * baseVolume) / 100, 1), // ~2.0g per 100ml
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  private detectMilkCoffeeDrinkLegacy(name: string): boolean {
    return this.detectMilkCoffeeDrink(name) !== null;
  }

  /**
   * Get predefined nutrients for plain coffee or tea
   */
  private getPlainCoffeeOrTeaNutrients(portionG: number): Nutrients {
    // Plain black coffee: ~2-5 kcal per 200ml
    // Plain tea: ~2 kcal per 200ml
    // Using conservative estimate: 3 kcal per 200ml = 0.015 kcal/ml
    const kcalPerMl = 0.015;
    const calories = Math.round(portionG * kcalPerMl);

    return {
      calories: Math.max(0, Math.min(calories, 10)), // Cap at 10 kcal for safety
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugars: 0,
      satFat: 0,
      energyDensity: calories > 0 ? (calories / portionG) * 100 : 0,
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly nutrition: NutritionOrchestrator,
    private readonly vision: VisionService,
    private readonly portion: PortionService,
    private readonly cache: CacheService,
    private readonly foodLocalization: FoodLocalizationService,
    private readonly hiddenIngredients: HiddenIngredientsService,
    private readonly foodCompatibility: FoodCompatibilityService,
    private readonly carcinogenicRisk: CarcinogenicRiskService,
    private readonly validator: AnalysisValidatorService,
  ) { }

  /**
   * Helper: Estimate portion in grams
   * Priority: Vision > FDC serving > default 150g
   * Enhanced with category-based clamping:
   * - Minor items (seeds, toppings): 1-15g
   * - Proteins: 30-500g  
   * - Grains: 50-400g
   * - Vegetables: 20-400g
   * - Default: 10-800g
   */
  private estimatePortionInGrams(
    component: VisionComponent,
    fdcServingSizeG: number | null,
    debug?: AnalysisDebug,
  ): number {
    const originalEstimate = component.est_portion_g && component.est_portion_g > 0
      ? component.est_portion_g
      : fdcServingSizeG && fdcServingSizeG > 0
        ? fdcServingSizeG
        : 150;

    // Determine min/max based on category and is_minor flag
    let minPortion = 10;
    let maxPortion = 800;

    const isMinor = (component as any).is_minor === true;
    const category = ((component as any).category_hint as string) || '';
    const nameLower = (component.name || '').toLowerCase();

    // Minor items: seeds, sesame, nori, sprinkles
    if (isMinor || nameLower.includes('sesame') || nameLower.includes('кунжут') ||
      nameLower.includes('nori') || nameLower.includes('нори') ||
      nameLower.includes('seed') || nameLower.includes('семен')) {
      minPortion = 1;
      maxPortion = 15;
    }
    // Proteins
    else if (category === 'protein' || nameLower.includes('chicken') || nameLower.includes('курица') ||
      nameLower.includes('salmon') || nameLower.includes('лосось') ||
      nameLower.includes('beef') || nameLower.includes('говядина') ||
      nameLower.includes('fish') || nameLower.includes('рыба') ||
      nameLower.includes('meat') || nameLower.includes('мясо')) {
      minPortion = 30;
      maxPortion = 500;
    }
    // Grains
    else if (category === 'grain' || nameLower.includes('rice') || nameLower.includes('рис') ||
      nameLower.includes('buckwheat') || nameLower.includes('гречк') ||
      nameLower.includes('quinoa') || nameLower.includes('киноа') ||
      nameLower.includes('pasta') || nameLower.includes('макарон')) {
      minPortion = 50;
      maxPortion = 400;
    }
    // Vegetables
    else if (category === 'veg' || nameLower.includes('salad') || nameLower.includes('салат') ||
      nameLower.includes('vegetable') || nameLower.includes('овощ') ||
      nameLower.includes('cucumber') || nameLower.includes('огурец') ||
      nameLower.includes('tomato') || nameLower.includes('помидор')) {
      minPortion = 20;
      maxPortion = 400;
    }

    // Apply clamping
    let portion = originalEstimate;
    if (portion < minPortion) portion = minPortion;
    if (portion > maxPortion) portion = maxPortion;

    // Log clamping in debug mode
    if (process.env.ANALYSIS_DEBUG === 'true' && debug && portion !== originalEstimate) {
      debug.components = debug.components || [];
      debug.components.push({
        type: 'portion_clamped',
        componentName: component.name,
        originalPortionG: originalEstimate,
        finalPortionG: portion,
        category: category || (isMinor ? 'minor' : 'default'),
        minPortion,
        maxPortion,
      });
    }

    return portion;
  }

  /**
   * Helper: Round number to 1 decimal or integer
   */
  private round(value: number, decimals: number = 1): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Process a single component asynchronously
   */
  private async processComponentAsync(
    component: VisionComponent,
    locale: 'en' | 'ru' | 'kk',
    debug: AnalysisDebug,
  ): Promise<AnalyzedItem[]> {
    const items: AnalyzedItem[] = [];

    try {
      const {
        name,
        preparation,
        est_portion_g,
      } = component;

      // category and volume_ml may not exist in VisionComponent type
      const category = (component as any).category;
      const volume_ml = (component as any).volume_ml;

      // 1) Проверяем напиток ПЕРЕД вызовом провайдеров
      const beverageDetection = this.detectBeverageForItem({
        name: name,
        category: category,
        volume_ml: volume_ml || (est_portion_g && est_portion_g > 0 ? est_portion_g : undefined),
        portion_g: est_portion_g,
      });

      if (beverageDetection && beverageDetection.isBeverage) {
        // Создать "канонический" AnalyzedItem без вызова провайдеров
        const volume = beverageDetection.volume_ml ?? volume_ml ?? (est_portion_g && est_portion_g > 0 ? est_portion_g : 250);
        const portionG = est_portion_g && est_portion_g > 0
          ? (est_portion_g < 50 ? volume : (est_portion_g > 800 ? 800 : est_portion_g))
          : volume;

        // Определяем source в зависимости от типа напитка
        let source: AnalyzedItem['source'];
        let baseNameEn: string;

        switch (beverageDetection.kind) {
          case 'water':
            source = 'canonical_water';
            baseNameEn = 'Water';
            break;
          case 'black_coffee':
            source = 'canonical_plain_coffee';
            baseNameEn = normalizeFoodName(this.buildBaseFoodName(name)) || 'Black Coffee';
            break;
          case 'tea':
            source = 'canonical_plain_tea';
            baseNameEn = normalizeFoodName(this.buildBaseFoodName(name)) || 'Tea';
            break;
          case 'milk_coffee':
            source = 'canonical_milk_coffee_fallback';
            baseNameEn = normalizeFoodName(this.buildBaseFoodName(name)) || 'Cappuccino';
            break;
          default:
            source = 'canonical_beverage';
            baseNameEn = normalizeFoodName(this.buildBaseFoodName(name)) || 'Beverage';
        }

        const localizedName = await this.foodLocalization.localizeName(baseNameEn, locale);

        const beverageItem: AnalyzedItem = {
          name: localizedName || baseNameEn,
          originalName: baseNameEn,
          label: name,
          portion_g: portionG,
          nutrients: {
            calories: beverageDetection.calories ?? 0,
            protein: beverageDetection.protein_g ?? 0,
            carbs: beverageDetection.carbs_g ?? 0,
            fat: beverageDetection.fat_g ?? 0,
            fiber: beverageDetection.fiber_g ?? 0,
            sugars: beverageDetection.sugars_g ?? 0,
            satFat: beverageDetection.satFat_g ?? 0,
            energyDensity: beverageDetection.calories && portionG > 0
              ? (beverageDetection.calories / portionG) * 100
              : 0,
          },
          source,
          locale,
          hasNutrition: beverageDetection.kind !== 'water',
          cookingMethodHints: this.extractCookingMethodHints(component),
        };

        items.push(beverageItem);
        debug.components.push({
          type: 'matched',
          vision: component,
          beverageDetected: true,
          beverageKind: beverageDetection.kind,
          skippedProvider: true,
          provider: source,
        });

        if (process.env.ANALYSIS_DEBUG === 'true') {
          this.logger.debug('[AnalyzeService] Detected beverage, using canonical values', {
            componentName: name,
            kind: beverageDetection.kind,
            portionG,
            calories: beverageDetection.calories,
          });
        }
        return items; // Переходим к следующему компоненту, провайдеров не трогаем
      }

      const query = `${component.name} ${component.preparation || ''}`.trim();

      // Detect if component is likely a drink based on name
      const componentNameLower = component.name.toLowerCase();
      const isDrinkComponent = this.DRINK_KEYWORDS.some(keyword => componentNameLower.includes(keyword));
      const expectedCategory: 'drink' | 'solid' | 'unknown' = isDrinkComponent ? 'drink' : 'unknown';

      // Build lookup context
      // TODO: Get user region from profile/preferences
      const lookupContext: NutritionLookupContext = {
        locale,
        region: locale === 'en' ? 'US' : 'EU', // Simple mapping for now
        expectedCategory,
      };

      // Try to find nutrition data via orchestrator
      const nutritionStartTime = Date.now();
      const providerResult: NutritionProviderResult | null = await this.nutrition.findNutrition(
        query,
        lookupContext,
      );
      const nutritionDuration = Date.now() - nutritionStartTime;
      if (nutritionDuration > 1000) {
        this.logger.debug(`[AnalyzeService] Nutrition lookup for "${query}" took ${nutritionDuration}ms`);
      }

      if (!providerResult || !providerResult.food) {
        debug.components.push({
          type: 'no_match',
          vision: component,
          provider: null,
        });
        if (process.env.ANALYSIS_DEBUG === 'true' && isDrinkComponent) {
          this.logger.debug('[AnalyzeService] No provider matches for drink component', {
            componentName: component.name,
            query,
          });
        }
        // Use fallback (will handle beverages appropriately)
        await this.addVisionFallback(component, items, debug, locale, isDrinkComponent);
        return items;
      }

      const canonicalFood = providerResult.food;
      const isDrink = canonicalFood.category === 'drink';

      // Estimate portion (with clamping)
      const portionG = this.estimatePortionInGrams(
        component,
        canonicalFood.defaultPortionG || null,
        debug,
      );

      // Calculate nutrients for portion (provider data is per 100g/ml)
      let nutrients = this.calculateNutrientsFromCanonical(canonicalFood.per100g, portionG);

      // CORRECTION: If provider returns 0/low calories but we have Vision estimates, use Vision
      // This fixes the "0/0/0" bug for foods found in DB but with missing data
      if (nutrients.calories < 5 && component.estimated_nutrients && !isDrink) {
        const est = component.estimated_nutrients;
        if (est.calories && est.calories > 10) {
          this.logger.warn(`[AnalyzeService] Provider returned ~0 kcal for "${component.name}", falling back to Vision estimates`);
          nutrients = {
            calories: est.calories,
            protein: est.protein_g || 0,
            fat: est.fat_g || 0,
            carbs: est.carbs_g || 0,
            fiber: est.fiber_g || 0,
            sugars: 0,
            satFat: 0,
            energyDensity: (est.calories / portionG) * 100
          };
        }
      }

      // Special handling for milk coffee drinks: sanity check and fallback
      const isMilkCoffee = this.detectMilkCoffeeDrink(component.name, (component as any).category, (component as any).volume_ml) !== null;
      if (isMilkCoffee && isDrink) {
        const kcalPer100 = canonicalFood.per100g.calories || 0;
        const kcalPerPortion = nutrients.calories;

        // If calories seem too high (> 150 kcal/100ml or > 400 kcal/300ml), use canonical values
        if (kcalPer100 > 150 || (kcalPerPortion > 400 && portionG <= 300)) {
          if (process.env.ANALYSIS_DEBUG === 'true') {
            this.logger.warn('[AnalyzeService] Milk coffee calories too high, using canonical fallback', {
              componentName: component.name,
              originalKcalPer100: kcalPer100,
              originalKcalPerPortion: kcalPerPortion,
              portionG,
              provider: canonicalFood.providerId,
            });
          }

          // Use conservative canonical values for cappuccino/latte
          const canonicalKcalPer250ml = 90; // Average: 60-120 kcal
          const scale = portionG / 250;
          nutrients.calories = Math.round(canonicalKcalPer250ml * scale);
          nutrients.protein = this.round(3 * scale, 1); // ~3g per 250ml
          nutrients.carbs = this.round(9 * scale, 1); // ~9g per 250ml
          nutrients.fat = this.round(4.5 * scale, 1); // ~4.5g per 250ml
          nutrients.fiber = 0;
          nutrients.sugars = this.round(8 * scale, 1); // ~8g per 250ml
          nutrients.satFat = this.round(2.5 * scale, 1); // ~2.5g per 250ml
          nutrients.energyDensity = this.round((nutrients.calories / portionG) * 100, 1);

          // Update source to indicate canonical fallback
          const item = await this.createAnalyzedItemFromCanonical(
            component,
            canonicalFood,
            portionG,
            nutrients,
            locale,
            'canonical_milk_coffee_fallback',
          );

          items.push(item);
          debug.components.push({
            type: 'matched',
            vision: component,
            provider: canonicalFood.providerId,
            providerId: canonicalFood.providerFoodId,
            foodName: canonicalFood.displayName,
            canonicalFallback: true,
            reason: 'milk_coffee_calories_too_high',
            originalCalories: kcalPerPortion,
            originalProvider: canonicalFood.providerId,
          });
          return items;
        }
      }

      // Debug logging
      if (process.env.ANALYSIS_DEBUG === 'true' || nutrients.calories === 0) {
        this.logger.debug('[AnalyzeService] Provider match for component', {
          componentName: component.name,
          providerId: canonicalFood.providerId,
          foodId: canonicalFood.providerFoodId,
          foodName: canonicalFood.displayName,
          portionG: portionG,
          calculatedCalories: nutrients.calories,
          calculatedProtein: nutrients.protein,
          calculatedCarbs: nutrients.carbs,
          calculatedFat: nutrients.fat,
          confidence: providerResult.confidence,
          isSuspicious: providerResult.isSuspicious,
        });
      }

      // Create AnalyzedItem from canonical food
      const item = await this.createAnalyzedItemFromCanonical(
        component,
        canonicalFood,
        portionG,
        nutrients,
        locale,
        canonicalFood.providerId === 'usda' ? 'fdc' : canonicalFood.providerId,
      );

      // Add cookingMethodHints from Vision component
      item.cookingMethodHints = this.extractCookingMethodHints(component);

      items.push(item);
      debug.components.push({
        type: 'matched',
        vision: component,
        provider: canonicalFood.providerId,
        providerId: canonicalFood.providerFoodId,
        foodName: canonicalFood.displayName,
        confidence: providerResult.confidence,
        isSuspicious: providerResult.isSuspicious,
        kcalPer100: canonicalFood.per100g.calories || 0,
      });
    } catch (error: any) {
      this.logger.error(`Error analyzing component ${component.name}:`, error.message);
      debug.components.push({ type: 'no_match', vision: component, error: error.message });
      // Only use fallback for non-beverages
      const componentNameLower = component.name.toLowerCase();
      const isBeverage = this.DRINK_KEYWORDS.some(keyword => componentNameLower.includes(keyword));
      if (!isBeverage) {
        await this.addVisionFallback(component, items, debug, locale);
      }
    }

    return items;
  }

  /**
   * Analyze image and return normalized nutrition data
   */
  async analyzeImage(params: { imageUrl?: string; imageBase64?: string; locale?: 'en' | 'ru' | 'kk'; mode?: 'default' | 'review'; foodDescription?: string }): Promise<AnalysisData> {
    const isDebugMode = process.env.ANALYSIS_DEBUG === 'true';
    const locale = (params.locale as 'en' | 'ru' | 'kk' | undefined) || 'en';
    const mode = params.mode || 'default';

    // Check cache (skip for review mode to ensure fresh analysis)
    if (mode !== 'review') {
      const imageHash = this.hashImage(params);
      const cacheKey = `${this.ANALYSIS_CACHE_VERSION}:${imageHash}`;
      const cached = await this.cache.get<AnalysisData>(cacheKey, 'analysis');
      if (cached) {
        this.logger.debug('Cache hit for image analysis');
        return cached;
      }
    }

    // Extract components via Vision (with caching)
    // Use getOrExtractComponents for better cache support with Buffer
    let visionComponents: VisionComponent[];
    const visionStartTime = Date.now();
    try {
      const visionResult = await this.vision.getOrExtractComponents({
        imageUrl: params.imageUrl,
        imageBase64: params.imageBase64,
        locale,
        mode,
        foodDescription: params.foodDescription,
      });
      visionComponents = visionResult.components;
      const visionDuration = Date.now() - visionStartTime;
      this.logger.debug(`[AnalyzeService] Vision extraction took ${visionDuration}ms`);
    } catch (error: any) {
      // Handle Vision API errors gracefully
      this.logger.error('[AnalyzeService] Vision extraction failed', {
        error: error.message,
        status: error?.status,
        imageUrl: params.imageUrl ? (params.imageUrl.startsWith('/') ? 'relative' : params.imageUrl.substring(0, 50)) : 'none',
        hasBase64: Boolean(params.imageBase64),
      });

      // Transform into a controlled error that can be handled by FoodProcessor
      if (error?.status === 400 || error?.message?.includes('Failed to download image') || error?.message?.includes('Image URL is invalid')) {
        throw new BadRequestException('Failed to process image. Please ensure the image is valid and accessible.');
      }

      // Re-throw other errors
      throw error;
    }

    // Initialize debug object
    const debug: AnalysisDebug = {
      componentsRaw: visionComponents,
      components: [],
      timestamp: new Date().toISOString(),
      model: process.env.OPENAI_MODEL || process.env.VISION_MODEL || 'gpt-4o',
    };

    // Дедупликация: объединяем похожие продукты
    const uniqueComponents = this.deduplicateComponents(visionComponents);

    (debug as any).deduplication = {
      before: visionComponents.length,
      after: uniqueComponents.length,
      removed: visionComponents.length - uniqueComponents.length,
    };

    // Analyze each component in parallel
    const items: AnalyzedItem[] = [];

    const componentPromises = uniqueComponents.map(component =>
      this.processComponentAsync(component, locale, debug)
    );
    const processedItemsArrays = await Promise.all(componentPromises);

    // Flatten the results
    for (const processedItems of processedItemsArrays) {
      items.push(...processedItems);
    }

    // P3.2: Apply hidden ingredients heuristics to items (integrate into existing items)
    // Extract hidden items from Vision response if available
    const globalHiddenFromVision: HiddenIngredientEstimate[] = [];
    // TODO: Extract hidden items from Vision response when available

    // Apply heuristics to each item
    const itemsWithHidden = this.hiddenIngredients.applyHiddenIngredientsToItems(
      items,
      globalHiddenFromVision,
    );

    // Update items array with hidden ingredients integrated
    items.length = 0;
    items.push(...itemsWithHidden);

    // Legacy: Also detect separate hidden items for backward compatibility
    const hiddenItems = this.hiddenIngredients.detectHiddenIngredients(items);
    if (hiddenItems.length > 0 && process.env.ENABLE_LEGACY_HIDDEN_ITEMS === 'true') {
      items.push(...hiddenItems);
    }

    if (debug) {
      const allHidden = items.flatMap((item) => item.hiddenIngredients || []);
      if (allHidden.length > 0) {
        debug.hiddenIngredients = allHidden.map((h) => ({
          name: h.name,
          category: h.category,
          calories: h.calories,
          estimated_grams: h.estimated_grams,
        }));
      }
    }

    // Calculate totals (including hidden ingredients integrated into items)
    const total: AnalysisTotals = items.reduce(
      (acc, item) => {
        acc.portion_g += item.portion_g;
        acc.calories += item.nutrients.calories;
        acc.protein += item.nutrients.protein;
        acc.carbs += item.nutrients.carbs;
        acc.fat += item.nutrients.fat;
        acc.fiber += item.nutrients.fiber;
        acc.sugars += item.nutrients.sugars;
        acc.satFat += item.nutrients.satFat;
        acc.energyDensity += item.nutrients.energyDensity;
        return acc;
      },
      {
        portion_g: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
        satFat: 0,
        energyDensity: 0,
      },
    );

    // Recalculate energyDensity as calories per 100g
    if (total.portion_g > 0) {
      total.energyDensity = this.round((total.calories / total.portion_g) * 100, 1);
    }

    // STEP 1: Check for plain water before computing health score
    const isDrink = (total as any).isDrink ?? items.some((i) => (i as any).isDrink === true);
    const dishNameForWaterCheck = this.buildDishNameEn(items);
    const displayName = dishNameForWaterCheck;
    const looksLikePlainWater = this.isLikelyPlainWater(displayName, isDrink);

    let healthScore: HealthScore;
    if (looksLikePlainWater) {
      // Force zero macros for plain water if they look suspiciously non-zero
      if (
        total.calories > 5 ||
        (total as any).protein > 1 ||
        (total as any).carbs > 1 ||
        (total as any).fat > 1
      ) {
        total.calories = 0;
        (total as any).protein = 0;
        (total as any).carbs = 0;
        (total as any).fat = 0;
        (total as any).fiber = 0;
        (total as any).sugars = 0;
      }

      const score = 95; // A-grade for plain water
      healthScore = {
        total: score,
        level: 'excellent' as HealthScoreLevel,
        score, // legacy
        grade: this.deriveGrade(score), // legacy
        factors: {
          protein: 0,
          fiber: 0,
          saturatedFat: 0,
          sugars: 0,
          energyDensity: 0,
        },
        feedback: [],
      };

      (healthScore as any).flags = {
        isPlainWater: true,
      };

      (healthScore as any).explanations = [
        {
          type: 'info',
          code: 'plain_water',
          message: 'Plain drinking water detected. Calories and macros set to zero.',
        },
      ];
    } else {
      healthScore = this.computeHealthScore(total, total.portion_g, items, locale);
    }

    // Q1: Run sanity check
    const sanity = this.runSanityCheck({ items, total, healthScore, debug });
    if (debug) {
      debug.sanity = sanity;
    }

    // Q3: Mark suspicious analyses
    const hasSeriousIssues = sanity.some(
      (i) => i.type === 'macro_kcal_mismatch' || i.type === 'suspicious_energy_density',
    );
    const isSuspicious = hasSeriousIssues;

    // Q4: Check for all-zero macros (needsReview flag)
    const allMacrosZero = total.calories === 0 && total.protein === 0 && total.carbs === 0 && total.fat === 0;
    const hasItemsButNoData = items.length > 0 && allMacrosZero;

    // Check for any item with weight > 0 but all macros zero
    const anyItemHasWeightAndZeroMacros = items.some(item =>
      item.portion_g > 0 &&
      item.nutrients.calories === 0 &&
      item.nutrients.protein === 0 &&
      item.nutrients.carbs === 0 &&
      item.nutrients.fat === 0
    );

    let needsReview = hasItemsButNoData || anyItemHasWeightAndZeroMacros;

    // Log sanity issues in debug mode
    if (process.env.ANALYSIS_DEBUG === 'true' && sanity.length > 0) {
      this.logger.warn('[AnalysisSanity] Issues detected', {
        issues: sanity,
        total: total,
      });
    }

    // Debug instrumentation for zero-calorie analyses
    if (total.calories === 0 && items.length > 0) {
      this.logger.warn('[AnalyzeService] Zero-calorie analysis detected', {
        componentCount: visionComponents.length,
        itemCount: items.length,
        needsReview,
        sampleComponents: visionComponents.slice(0, 5).map((c) => ({
          name: c.name,
          preparation: c.preparation,
          est_portion_g: c.est_portion_g,
          confidence: c.confidence,
        })),
        sampleItems: items.slice(0, 5).map((it) => ({
          name: it.name,
          portion_g: it.portion_g,
          nutrients: it.nutrients,
        })),
      });
    }

    // Task 3: Check if ALL items have 0 calories and log ERROR with full details
    const allItemsZeroCalories = items.length > 0 && items.every(item => (item.nutrients?.calories || 0) === 0);
    if (allItemsZeroCalories) {
      // imageHash and cacheKey are defined earlier in analyzeImage method
      const imageHash = this.hashImage({ imageUrl: params.imageUrl, imageBase64: params.imageBase64 });
      const cacheKey = `${this.ANALYSIS_CACHE_VERSION}:${imageHash}`;
      this.logger.error('[AnalyzeService] All items have zero calories - analysis needs review', {
        imageHash,
        cacheKey,
        itemCount: items.length,
        componentCount: visionComponents.length,
        items: items.map(item => ({
          name: item.name,
          portion_g: item.portion_g,
          calories: item.nutrients?.calories,
          protein: item.nutrients?.protein,
          fat: item.nutrients?.fat,
          carbs: item.nutrients?.carbs,
          source: item.source,
          fdcId: item.fdcId,
          dataType: item.dataType,
        })),
        total: {
          calories: total.calories,
          protein: total.protein,
          fat: total.fat,
          carbs: total.carbs,
        },
        visionComponents: visionComponents.slice(0, 10).map(c => ({
          name: c.name,
          preparation: c.preparation,
          est_portion_g: c.est_portion_g,
          confidence: c.confidence,
        })),
      });

      // Mark as needsReview if all items have zero calories
      needsReview = true;
    }

    // Log final analysis in debug mode or for first N analyses
    if (isDebugMode) {
      this.logger.log('[AnalysisDebug] Final analysis', {
        totals: total,
        items: items.map((i) => ({
          name: i.name,
          originalName: i.originalName,
          portion_g: i.portion_g,
          calories: i.nutrients.calories,
          protein: i.nutrients.protein,
          carbs: i.nutrients.carbs,
          fat: i.nutrients.fat,
        })),
      });
    }

    // Build English base dish name from items and localize it
    const originalDishName = this.buildDishNameEn(items);
    const dishNameLocalized = await this.foodLocalization.localizeName(originalDishName, locale);

    const result: AnalysisData = {
      items,
      total,
      healthScore,
      debug: isDebugMode ? debug : undefined,
      locale,
      dishNameLocalized: dishNameLocalized || originalDishName,
      originalDishName,
      isSuspicious,
      needsReview,
      imageUrl: params.imageUrl,
      imageUri: params.imageUrl, // For backward compatibility
    };

    // Evaluate food compatibility
    // Note: metadata is not available in this context, using defaults
    const mealType = 'lunch';
    const localDateTime = undefined;

    result.foodCompatibility = this.foodCompatibility.evaluateFromAnalysisData(
      result,
      {
        mealType,
        localDateTime,
        locale,
      },
    );

    // Evaluate carcinogenic risk
    result.carcinogenicRisk = this.carcinogenicRisk.evaluateFromAnalysisData(
      result,
    );

    // Cache for 24 hours (only if not in review mode)
    if (mode !== 'review') {
      const imageHash = this.hashImage(params);
      const cacheKey = `${this.ANALYSIS_CACHE_VERSION}:${imageHash}`;
      await this.cache.set(cacheKey, result, 'analysis');
    }

    return result;
  }

  /**
   * Analyze text description
   */
  public async analyzeText(text: string, locale?: 'en' | 'ru' | 'kk'): Promise<AnalysisData> {
    const isDebugMode = process.env.ANALYSIS_DEBUG === 'true';
    // Normalize locale
    const normalizedLocale: 'en' | 'ru' | 'kk' =
      (locale as any) || 'en';

    // Simple parsing: split by commas, newlines, etc.
    const components: VisionComponent[] = text
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(name => ({
        name,
        preparation: 'unknown',
        est_portion_g: 100,
        confidence: 0.7,
      }));

    const debug: AnalysisDebug = {
      componentsRaw: components,
      components: [],
      timestamp: new Date().toISOString(),
      model: 'text-input',
    };

    // Use the same processing logic as analyzeImage for consistency
    const items: AnalyzedItem[] = [];
    const componentPromises = components.map(component =>
      this.processComponentAsync(component, normalizedLocale, debug)
    );
    const processedItemsArrays = await Promise.all(componentPromises);

    // Flatten the results
    for (const processedItems of processedItemsArrays) {
      items.push(...processedItems);
    }

    // P3.2: Apply hidden ingredients heuristics to items (integrate into existing items)
    // Extract hidden items from Vision response if available
    const globalHiddenFromVision: HiddenIngredientEstimate[] = [];
    // TODO: Extract hidden items from Vision response when available

    // Apply heuristics to each item
    const itemsWithHidden = this.hiddenIngredients.applyHiddenIngredientsToItems(
      items,
      globalHiddenFromVision,
    );

    // Update items array with hidden ingredients integrated
    items.length = 0;
    items.push(...itemsWithHidden);

    // Legacy: Also detect separate hidden items for backward compatibility
    const hiddenItems = this.hiddenIngredients.detectHiddenIngredients(items);
    if (hiddenItems.length > 0 && process.env.ENABLE_LEGACY_HIDDEN_ITEMS === 'true') {
      items.push(...hiddenItems);
    }

    if (debug) {
      const allHidden = items.flatMap((item) => item.hiddenIngredients || []);
      if (allHidden.length > 0) {
        debug.hiddenIngredients = allHidden.map((h) => ({
          name: h.name,
          category: h.category,
          calories: h.calories,
          estimated_grams: h.estimated_grams,
        }));
      }
    }

    // Calculate totals (including hidden ingredients integrated into items)
    const total: AnalysisTotals = items.reduce(
      (acc, item) => {
        acc.portion_g += item.portion_g;
        acc.calories += item.nutrients.calories;
        acc.protein += item.nutrients.protein;
        acc.carbs += item.nutrients.carbs;
        acc.fat += item.nutrients.fat;
        acc.fiber += item.nutrients.fiber;
        acc.sugars += item.nutrients.sugars;
        acc.satFat += item.nutrients.satFat;
        acc.energyDensity += item.nutrients.energyDensity;
        return acc;
      },
      {
        portion_g: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
        satFat: 0,
        energyDensity: 0,
      },
    );

    if (total.portion_g > 0) {
      total.energyDensity = this.round((total.calories / total.portion_g) * 100, 1);
    }

    // STEP 1: Check for plain water before computing health score
    const isDrink = (total as any).isDrink ?? items.some((i) => (i as any).isDrink === true);
    const dishNameForWaterCheck = this.buildDishNameEn(items);
    const displayName = dishNameForWaterCheck;
    const looksLikePlainWater = this.isLikelyPlainWater(displayName, isDrink);

    let healthScore: HealthScore;
    if (looksLikePlainWater) {
      // Force zero macros for plain water if they look suspiciously non-zero
      if (
        total.calories > 5 ||
        (total as any).protein > 1 ||
        (total as any).carbs > 1 ||
        (total as any).fat > 1
      ) {
        total.calories = 0;
        (total as any).protein = 0;
        (total as any).carbs = 0;
        (total as any).fat = 0;
        (total as any).fiber = 0;
        (total as any).sugars = 0;
      }

      const score = 95; // A-grade for plain water
      healthScore = {
        total: score,
        level: 'excellent' as HealthScoreLevel,
        score, // legacy
        grade: this.deriveGrade(score), // legacy
        factors: {
          protein: 0,
          fiber: 0,
          saturatedFat: 0,
          sugars: 0,
          energyDensity: 0,
        },
        feedback: [],
      };

      (healthScore as any).flags = {
        isPlainWater: true,
      };

      (healthScore as any).explanations = [
        {
          type: 'info',
          code: 'plain_water',
          message: 'Plain drinking water detected. Calories and macros set to zero.',
        },
      ];
    } else {
      healthScore = this.computeHealthScore(total, total.portion_g, items, locale);
    }

    // Q1: Run sanity check
    const sanity = this.runSanityCheck({ items, total, healthScore, debug });
    if (debug) {
      debug.sanity = sanity;
    }

    // Q3: Mark suspicious analyses
    const hasSeriousIssues = sanity.some(
      (i) => i.type === 'macro_kcal_mismatch' || i.type === 'suspicious_energy_density',
    );
    const isSuspicious = hasSeriousIssues;

    // Q4: Check for all-zero macros (needsReview flag)
    const allMacrosZero = total.calories === 0 && total.protein === 0 && total.carbs === 0 && total.fat === 0;
    const hasItemsButNoData = items.length > 0 && allMacrosZero;

    // Check for any item with weight > 0 but all macros zero
    const anyItemHasWeightAndZeroMacros = items.some(item =>
      item.portion_g > 0 &&
      item.nutrients.calories === 0 &&
      item.nutrients.protein === 0 &&
      item.nutrients.carbs === 0 &&
      item.nutrients.fat === 0
    );

    const needsReview = hasItemsButNoData || anyItemHasWeightAndZeroMacros;

    // Log sanity issues in debug mode
    if (process.env.ANALYSIS_DEBUG === 'true' && sanity.length > 0) {
      this.logger.warn('[AnalysisSanity] Issues detected', {
        issues: sanity,
        total: total,
      });
    }

    // Build English base dish name from original names
    const originalDishName = this.buildDishNameEn(items);
    const dishNameLocalized = await this.foodLocalization.localizeName(originalDishName, normalizedLocale);

    return {
      items,
      total,
      healthScore,
      debug: isDebugMode ? debug : undefined,
      locale: normalizedLocale,
      dishNameLocalized: dishNameLocalized || originalDishName,
      originalDishName,
      isSuspicious,
      needsReview,
    };
  }

  /**
   * Calculate nutrients for portion from canonical nutrients (per 100g/ml)
   */
  private calculateNutrientsFromCanonical(
    canonical: CanonicalNutrients,
    portionG: number,
  ): Nutrients {
    const scale = portionG / 100;

    let calculatedCalories = Math.round((canonical.calories || 0) * scale);

    // Fallback: if calories is 0 but macros exist, calculate from macros
    if (!calculatedCalories && (canonical.protein || canonical.carbs || canonical.fat)) {
      const protein = (canonical.protein || 0) * scale;
      const carbs = (canonical.carbs || 0) * scale;
      const fat = (canonical.fat || 0) * scale;
      const fromMacros = protein * 4 + carbs * 4 + fat * 9;
      calculatedCalories = Math.max(1, Math.round(fromMacros));
    }

    return {
      calories: calculatedCalories,
      protein: this.round((canonical.protein || 0) * scale, 1),
      carbs: this.round((canonical.carbs || 0) * scale, 1),
      fat: this.round((canonical.fat || 0) * scale, 1),
      fiber: canonical.fiber !== undefined ? this.round(canonical.fiber * scale, 1) : undefined,
      sugars: canonical.sugars !== undefined ? this.round(canonical.sugars * scale, 1) : undefined,
      satFat: canonical.satFat !== undefined ? this.round(canonical.satFat * scale, 1) : undefined,
      energyDensity: this.round((canonical.calories || 0), 1),
    };
  }

  /**
   * Create AnalyzedItem from CanonicalFood
   */
  private async createAnalyzedItemFromCanonical(
    component: VisionComponent,
    canonicalFood: CanonicalFood,
    portionG: number,
    nutrients: Nutrients,
    locale: 'en' | 'ru' | 'kk',
    source: string,
  ): Promise<AnalyzedItem & { baseName?: string; displayNameLocalized?: string; providerId?: string }> {
    const baseName = this.buildBaseFoodName(component.name, canonicalFood.displayName);
    const originalNameEn = normalizeFoodName(baseName);
    const localizedName = await this.foodLocalization.localizeName(originalNameEn, locale);

    const hasNutrition = nutrients.calories > 0 || nutrients.protein > 0 || nutrients.carbs > 0 || nutrients.fat > 0;

    return {
      name: localizedName || originalNameEn,
      originalName: originalNameEn,
      baseName: baseName,
      displayNameLocalized: locale !== 'en' ? localizedName : undefined,
      label: component.name,
      portion_g: portionG,
      nutrients,
      source: source as any,
      locale,
      hasNutrition,
      providerId: canonicalFood.providerId,
    };
  }

  /**
   * Q4: Add vision fallback item when provider match fails
   */
  private async addVisionFallback(
    component: VisionComponent,
    items: AnalyzedItem[],
    debug: AnalysisDebug,
    locale: 'en' | 'ru' | 'kk' = 'en',
    isBeverage: boolean = false,
  ): Promise<void> {
    // Если Vision уверен (confidence >= 0.7) и имя не слишком общее
    if (!component.confidence || component.confidence < 0.7) {
      return;
    }

    const genericNames = ['food', 'meal', 'dish', 'item', 'ingredient', 'something'];
    const isGeneric = genericNames.some((g) => component.name.toLowerCase().includes(g));
    if (isGeneric) {
      return;
    }

    const baseName = this.buildBaseFoodName(component.name);
    const originalNameEn = normalizeFoodName(baseName);
    const localizedName = await this.foodLocalization.localizeName(originalNameEn, locale);
    const nameLower = (originalNameEn || component.name || '').toLowerCase();

    // NEVER use fallback for water - should be handled earlier
    const isWater = this.isPlainWater(originalNameEn || component.name || localizedName || '');
    if (isWater) {
      if (process.env.ANALYSIS_DEBUG === 'true') {
        this.logger.warn('[AnalyzeService] Water detected in fallback - should not happen', {
          componentName: component.name,
        });
      }
      return; // Skip fallback for water
    }

    // Handle beverages with safe fallback
    if (isBeverage) {
      // Try to classify beverage type
      const plainCoffeeTea = this.detectPlainCoffeeOrTeaLegacy(component.name);
      if (plainCoffeeTea.isPlain) {
        // Should have been handled earlier, but if we're here, use canonical values
        const portionG = component.est_portion_g && component.est_portion_g > 0
          ? component.est_portion_g
          : 200;
        const clampedPortion = portionG < 50 ? 200 : (portionG > 800 ? 800 : portionG);
        const sourceType = (plainCoffeeTea.type === 'coffee' ? 'canonical_plain_coffee' : 'canonical_plain_tea') as AnalyzedItem['source'];

        const coffeeTeaItem: AnalyzedItem = {
          name: localizedName || originalNameEn,
          originalName: originalNameEn,
          label: component.name,
          portion_g: clampedPortion,
          nutrients: this.getPlainCoffeeOrTeaNutrients(clampedPortion),
          source: sourceType,
          locale,
          hasNutrition: true,
        };

        items.push(coffeeTeaItem);
        debug.components.push({
          type: 'vision_fallback',
          vision: component,
          message: 'Added plain coffee/tea from fallback',
          provider: sourceType,
        });
        return;
      }

      // For unknown beverages, use very conservative fallback
      const fallbackPortion = component.est_portion_g && component.est_portion_g > 0
        ? component.est_portion_g
        : 250;
      const clampedPortion = fallbackPortion < 50 ? 250 : (fallbackPortion > 800 ? 800 : fallbackPortion);

      // Detect if it's a sweetened drink (cola, juice, lemonade, etc.)
      const sweetDrinkKeywords = [
        'cola', 'soda', 'juice', 'сок', 'лимонад', 'sweet', 'sweetened',
        'sugar', 'сахар', 'подслащ', 'газировка',
      ];
      const isSweetDrink = sweetDrinkKeywords.some(kw => nameLower.includes(kw));

      // Very conservative estimates:
      // - Sweet drinks: 80-120 kcal per 250ml (use 100 as average)
      // - Unknown drinks: 0-20 kcal per 250ml
      const kcalPer250ml = isSweetDrink ? 100 : 20;
      const calories = Math.round((clampedPortion / 250) * kcalPer250ml);

      const fallbackNutrients: Nutrients = {
        calories,
        protein: 0,
        carbs: isSweetDrink ? this.round((clampedPortion / 250) * 25, 1) : 0, // ~25g carbs per 250ml for sweet drinks
        fat: 0,
        fiber: 0,
        sugars: isSweetDrink ? this.round((clampedPortion / 250) * 24, 1) : 0, // ~24g sugars per 250ml for sweet drinks
        satFat: 0,
        energyDensity: calories > 0 ? (calories / clampedPortion) * 100 : 0,
      };

      const fallbackItem: AnalyzedItem = {
        name: localizedName || originalNameEn,
        originalName: originalNameEn,
        label: component.name,
        portion_g: clampedPortion,
        nutrients: fallbackNutrients,
        source: 'unknown_drink_low_calorie_fallback' as AnalyzedItem['source'],
        locale,
        hasNutrition: true,
      };

      items.push(fallbackItem);
      debug.components.push({
        type: 'vision_fallback',
        vision: component,
        message: 'Added very conservative fallback for unknown beverage',
        provider: 'unknown_drink_low_calorie_fallback',
        isEstimate: true,
      });
      return;
    }

    // Only use fallback for solid foods
    const fallbackPortion = this.estimatePortionInGrams(component, null, debug);

    // Check if GPT Vision provided estimated nutrients
    const gptEstimate = (component as any).estimated_nutrients;
    let fallbackNutrients: Nutrients;
    let fallbackSource: string = 'vision_fallback';

    if (gptEstimate && (gptEstimate.calories || gptEstimate.protein_g || gptEstimate.carbs_g || gptEstimate.fat_g)) {
      // Use GPT-estimated nutrients (already for the estimated portion)
      const gptPortion = component.est_portion_g || 100;
      const portionScale = fallbackPortion / gptPortion;

      fallbackNutrients = {
        calories: Math.round((gptEstimate.calories || 0) * portionScale),
        protein: this.round((gptEstimate.protein_g || 0) * portionScale, 1),
        carbs: this.round((gptEstimate.carbs_g || 0) * portionScale, 1),
        fat: this.round((gptEstimate.fat_g || 0) * portionScale, 1),
        fiber: this.round((gptEstimate.fiber_g || 0) * portionScale, 1),
        sugars: 0,
        satFat: 0,
        energyDensity: (gptEstimate.calories || 0) > 0 && gptPortion > 0
          ? this.round((gptEstimate.calories / gptPortion) * 100, 1)
          : 0,
      };
      fallbackSource = 'gpt_vision_estimate';

      if (process.env.ANALYSIS_DEBUG === 'true') {
        this.logger.debug('[AnalyzeService] Using GPT Vision estimated nutrients for fallback', {
          componentName: component.name,
          gptEstimate,
          portionScale,
          finalNutrients: fallbackNutrients,
        });
      }
    } else {
      // Default fallback nutrients for solid foods when GPT doesn't provide estimates
      fallbackNutrients = {
        calories: Math.round(fallbackPortion * 1.2), // условно 1.2 ккал/г — "средне"
        protein: this.round(fallbackPortion * 0.04, 1), // ~4 г белка на 100г
        carbs: this.round(fallbackPortion * 0.15, 1), // ~15 г углеводов на 100г
        fat: this.round(fallbackPortion * 0.06, 1), // ~6 г жиров на 100г
        fiber: 0,
        sugars: 0,
        satFat: 0,
        energyDensity: 120, // 120 ккал/100г
      };
    }

    // Sanity check: ensure calories per gram is reasonable (0.1-7 kcal/g)
    const kcalPerGram = fallbackNutrients.calories / fallbackPortion;
    if (kcalPerGram < 0.1 || kcalPerGram > 7) {
      // Clamp to reasonable range: 0.1-7 kcal/g
      const clampedKcalPerGram = Math.max(0.1, Math.min(7, kcalPerGram));
      const maxKcal = Math.round(fallbackPortion * clampedKcalPerGram);
      const scale = maxKcal / fallbackNutrients.calories;

      if (process.env.ANALYSIS_DEBUG === 'true') {
        this.logger.warn(
          `[AnalyzeService] Clamping fallback energy density: ${kcalPerGram.toFixed(2)} → ${clampedKcalPerGram.toFixed(2)} kcal/g`,
          { componentName: component.name, originalKcal: fallbackNutrients.calories, clampedKcal: maxKcal },
        );
      }

      fallbackNutrients.calories = maxKcal;
      fallbackNutrients.protein = this.round(fallbackNutrients.protein * scale, 1);
      fallbackNutrients.carbs = this.round(fallbackNutrients.carbs * scale, 1);
      fallbackNutrients.fat = this.round(fallbackNutrients.fat * scale, 1);
      fallbackNutrients.energyDensity = this.round(clampedKcalPerGram * 100, 1);
    }

    const fallbackItem: AnalyzedItem & { baseName?: string; displayNameLocalized?: string } = {
      name: localizedName || originalNameEn,
      originalName: originalNameEn,
      baseName: baseName,
      displayNameLocalized: locale !== 'en' ? localizedName : undefined,
      label: component.name,
      portion_g: fallbackPortion,
      nutrients: fallbackNutrients,
      source: fallbackSource as AnalyzedItem['source'],
      locale,
      hasNutrition: true, // Fallback always has estimated nutrition
    };

    items.push(fallbackItem);
    debug.components = debug.components || [];
    debug.components.push({
      type: 'vision_fallback',
      vision: component,
      message: `Added fallback item (${fallbackSource}) due to provider match failure`,
      provider: fallbackSource,
      usedGptEstimate: fallbackSource === 'gpt_vision_estimate',
    });
  }


  /**
   * Q1: Run sanity check on analysis data
   * Public method for re-analysis use cases
   */
  public runSanityCheck(input: {
    items: AnalyzedItem[];
    total: AnalysisTotals;
    healthScore?: HealthScore | null;
    debug?: AnalysisDebug;
  }): AnalysisSanityIssue[] {
    const { items, total } = input;
    const issues: AnalysisSanityIssue[] = [];

    items.forEach((item, index) => {
      const { portion_g, nutrients } = item;
      const { calories, protein, carbs, fat } = nutrients;

      // 1) Порция слишком маленькая или слишком большая
      if (portion_g > 0 && portion_g < 5) {
        issues.push({
          type: 'portion_too_small',
          level: 'warning',
          message: `Portion ${portion_g}g looks too small for a meal component`,
          itemIndex: index,
          itemName: item.name,
        });
      }

      if (portion_g > 0 && portion_g > 800) {
        issues.push({
          type: 'portion_too_large',
          level: 'warning',
          message: `Portion ${portion_g}g looks too large for a single component`,
          itemIndex: index,
          itemName: item.name,
        });
      }

      // 2) Калории на грамм
      if (portion_g > 0 && calories > 0) {
        const kcalPerGram = calories / portion_g;
        // Типичный диапазон ~0.2–4.5 ккал/г (очень грубо)
        if (kcalPerGram < 0.1 || kcalPerGram > 7) {
          issues.push({
            type: 'calories_per_gram_out_of_range',
            level: 'warning',
            message: `kcal/g=${kcalPerGram.toFixed(2)} is outside expected range`,
            itemIndex: index,
            itemName: item.name,
          });
        }
      }

      // 3) Связь калорий и макросов (4/4/9 правило)
      if (protein >= 0 && carbs >= 0 && fat >= 0 && calories > 0) {
        const kcalFromMacros = protein * 4 + carbs * 4 + fat * 9;
        const diff = Math.abs(kcalFromMacros - calories);

        if (diff > Math.max(50, calories * 0.25)) {
          issues.push({
            type: 'macro_kcal_mismatch',
            level: 'warning',
            message: `Calories ${calories} vs macros-derived ${Math.round(
              kcalFromMacros,
            )} differ too much`,
            itemIndex: index,
            itemName: item.name,
          });
        }
      }

      // 4) Нулевая калорийность при ненулевой порции (skip for canonical water/coffee/tea)
      const source = item.source as string;
      const isCanonicalZeroCalorie =
        source === 'canonical_water' ||
        source === 'canonical_plain_coffee' ||
        source === 'canonical_plain_tea';

      if (portion_g > 0 && calories === 0 && !isCanonicalZeroCalorie) {
        issues.push({
          type: 'zero_calories_nonzero_portion',
          level: 'warning',
          message: `Portion ${portion_g}g has 0 kcal`,
          itemIndex: index,
          itemName: item.name,
        });
      }
    });

    // 5) Sanity по totals
    if (total.portion_g > 0 && total.calories > 0) {
      const kcalPerGramTotal = total.calories / total.portion_g;
      if (kcalPerGramTotal < 0.1 || kcalPerGramTotal > 7) {
        issues.push({
          type: 'suspicious_energy_density',
          level: 'warning',
          message: `Total kcal/g=${kcalPerGramTotal.toFixed(2)} looks suspicious`,
        });
      }
    }

    return issues;
  }

  /**
   * Build a clean, human-readable base food name from raw vision name and FDC description.
   * Prefers generic, non-branded descriptions when available.
   */
  private buildBaseFoodName(rawName: string, fdcDescription?: string): string {
    const desc = (fdcDescription || '').toLowerCase();
    const raw = (rawName || '').toLowerCase();

    // Prefer generic, non-branded description if it looks clean
    if (desc && !desc.includes('yogurt') && !desc.includes('yoghurt') && !desc.includes('ice cream')) {
      // Strip brand stuff like ", company name" if present
      const cleaned = desc.replace(/\s*,\s*[^,]+$/i, '').trim();
      if (cleaned.length > 0 && cleaned.length <= 60) {
        return cleaned;
      }
    }

    // Fallback to raw vision name
    return raw || desc || 'food';
  }

  /**
   * Build a concise English dish name from analyzed items (using baseName when available).
   * Picks 1-3 main items (ignoring small portions like sauces).
   * Generates descriptive names like "Chicken breast with rice and vegetables"
   * Public method for re-analysis use cases
   */
  public buildDishNameEn(items: AnalyzedItem[]): string {
    // Sort by calorie contribution (descending) for deterministic, nutritionally-meaningful naming
    const sortedByCalories = [...items]
      .filter(item => item.portion_g > 0)
      .sort((a, b) => {
        const aCal = a.nutrients?.calories ?? 0;
        const bCal = b.nutrients?.calories ?? 0;
        return bCal - aCal;
      });

    if (sortedByCalories.length === 0) return 'Meal';

    // Use display_name (from Vision) if available, otherwise baseName/originalName
    const getName = (item: AnalyzedItem): string => {
      const displayName = (item as any).display_name;
      if (displayName && typeof displayName === 'string') return displayName;
      return (item as any).baseName || item.originalName || item.name || '';
    };

    const names = sortedByCalories
      .map(getName)
      .map(n => n.trim())
      .filter(Boolean);

    if (names.length === 0) return 'Meal';

    // Remove duplicates while preserving order (calorie-sorted)
    const unique = Array.from(new Set(names));

    // Single item - just return it
    if (unique.length === 1) return unique[0];

    // Two items - use "with" connector
    if (unique.length === 2) return `${unique[0]} with ${unique[1]}`;

    // Three or more items - use top-2 by calories + "and more"
    return `${unique[0]} with ${unique[1]} and more`;
  }

  private hashImage(params: { imageUrl?: string; imageBase64?: string }): string {
    const str = params.imageUrl || params.imageBase64 || '';
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Check if analysis represents a drink based on item names
   */
  private isDrinkAnalysis(items: AnalyzedItem[]): boolean {
    const itemNames = items.map(item =>
      (item.name || item.originalName || item.label || '').toLowerCase()
    ).join(' ');

    return this.DRINK_KEYWORDS.some(keyword => itemNames.includes(keyword));
  }

  /**
   * Internal method for calculating HealthScore with proper normalization.
   * Accepts totals and list of items to calculate energy density.
   */
  /**
   * Map value to score (0-100) with optional reverse logic
   */
  private mapToScore(value: number, min: number, max: number, reverse = false): number {
    if (!Number.isFinite(value)) return 0;
    const clamped = this.clamp(value, min, max);
    const ratio = (clamped - min) / (max - min || 1);
    const score = reverse
      ? 100 * (1 - ratio) // меньше = лучше
      : 100 * ratio;      // больше = лучше
    return this.clamp(score, 0, 100);
  }

  private computeHealthScoreInternal(
    totals: { calories: number; protein: number; carbs: number; fat: number; fiber?: number; satFat?: number; sugars?: number },
    items: AnalyzedItem[],
  ): HealthScore {
    const calories = totals.calories || 0;
    const protein_g = totals.protein || 0;
    const carbs_g = totals.carbs || 0;
    const fat_g = totals.fat || 0;
    const fiber_g = totals.fiber || 0;

    // Total weight of the dish (if portion_g is set for components)
    const portion_g = items.reduce(
      (sum, item) => sum + (item.portion_g || 0),
      0,
    ) || 250; // fallback to 250g if no portion data

    // Saturated fats and sugars - use actual values if available, otherwise estimate
    const saturatedFat_g = totals.satFat > 0
      ? totals.satFat
      : (fat_g > 0 ? fat_g * 0.4 : 0); // ~40% of fats are saturated
    const sugars_g = totals.sugars > 0
      ? totals.sugars
      : (carbs_g > 0 ? carbs_g * 0.5 : 0); // ~50% of carbs are sugars

    const safeCalories = calories > 0 ? calories : 1;
    const safePortion = portion_g > 0 ? portion_g : 1;
    const safeFat = fat_g > 0 ? fat_g : 1;

    // 1) Плотность питательных веществ (g / 1000 kcal)
    const proteinPer1000kcal = (protein_g * 1000) / safeCalories;
    const fiberPer1000kcal = (fiber_g * 1000) / safeCalories;

    // 2) Доли "рисковых" факторов
    // saturated fat share (доля сат. жиров в общем жире)
    const satFatShare = saturatedFat_g / safeFat;      // 0..1+
    // sugars share in calories (доля ккал из сахара)
    const sugarsKcal = sugars_g * 4;
    const sugarsShare = sugarsKcal / safeCalories;     // 0..1+

    // 3) Энергетическая плотность (kcal / g)
    const energyDensityKcalPerGram = calories / safePortion;

    // Нормализация по факторам (0–100)
    // Протеин: 0–15 г/1000ккал => 0–100 (выше 15 уже считаем 100)
    const proteinScore = this.mapToScore(proteinPer1000kcal, 0, 15, false);
    // Клетчатка: 0–14 г/1000ккал => 0–100
    const fiberScore = this.mapToScore(fiberPer1000kcal, 0, 14, false);
    // Сатурированные жиры: 0–40% => 100–0 (чем больше доля, тем хуже)
    const satFatScore = this.mapToScore(satFatShare, 0, 0.4, true);
    // Сахара: 0–25% ккал => 100–0
    const sugarsScore = this.mapToScore(sugarsShare, 0, 0.25, true);
    // Энерго-плотность: 0.5–3.0 ккал/г => 100–0
    const energyDensityScore = this.mapToScore(energyDensityKcalPerGram, 0.5, 3.0, true);

    // Веса факторов (сумма ≈ 1.0)
    const weights = {
      protein: 0.25,
      fiber: 0.20,
      saturatedFat: 0.20,
      sugars: 0.15,
      energyDensity: 0.20,
    };

    const totalRaw =
      proteinScore * weights.protein +
      fiberScore * weights.fiber +
      satFatScore * weights.saturatedFat +
      sugarsScore * weights.sugars +
      energyDensityScore * weights.energyDensity;

    const total = this.clamp(Math.round(totalRaw), 0, 100);

    let level: 'poor' | 'average' | 'good' | 'excellent';
    if (total < 40) {
      level = 'poor';
    } else if (total < 60) {
      level = 'average';
    } else if (total < 80) {
      level = 'good';
    } else {
      level = 'excellent';
    }

    const factors: HealthScoreFactors = {
      protein: Math.round(proteinScore),
      fiber: Math.round(fiberScore),
      saturatedFat: Math.round(satFatScore),
      sugars: Math.round(sugarsScore),
      energyDensity: Math.round(energyDensityScore),
    };

    return {
      total,
      score: total, // backward compatibility
      level: level as HealthScoreLevel,
      grade: this.deriveGrade(total),
      factors,
      feedback: [], // will be filled by buildHealthFeedback
    } as HealthScore;
  }

  /**
   * Compute health score from totals and items
   * Public method for re-analysis use cases
   */
  public computeHealthScore(total: AnalysisTotals, totalPortion: number, items?: AnalyzedItem[], locale: 'en' | 'ru' | 'kk' = 'en'): HealthScore {
    // Use new internal method for proper calculation
    const itemsArray = items || [];
    const totalsForInternal = {
      calories: total.calories || 0,
      protein: total.protein || 0,
      carbs: total.carbs || 0,
      fat: total.fat || 0,
      fiber: total.fiber || 0,
      satFat: total.satFat || 0,
      sugars: total.sugars || 0,
    };

    const baseHealthScore = this.computeHealthScoreInternal(totalsForInternal, itemsArray);
    const feedback = this.buildHealthFeedback(baseHealthScore, totalsForInternal, locale);

    // Convert feedback to legacy format for backward compatibility
    const feedbackLegacy = feedback.map(item => item.message);

    return {
      ...baseHealthScore,
      feedback,
      feedbackLegacy, // backward compatibility
    } as any as HealthScore & { feedbackLegacy?: string[] };
  }

  private getHealthWeights(): HealthWeights {
    const fallback: HealthWeights = {
      protein: 0.25,
      fiber: 0.2,
      satFat: 0.2,
      sugar: 0.2,
      energyDensity: 0.15,
    };
    try {
      const parsed = JSON.parse(process.env.HEALTH_SCORE_WEIGHTS || '{}') as Partial<HealthWeights>;
      return { ...fallback, ...parsed };
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Clamp value between min and max, handling NaN
   */
  private clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  /**
   * For nutrients where higher is better (e.g., protein, fiber).
   * minValue ~ 0, maxValue ~ "enough".
   * At value >= maxValue → 100, at 0 → 0.
   */
  private scoreHigherIsBetter(value: number, maxValue: number): number {
    if (value <= 0) return 0;
    if (value >= maxValue) return 100;
    return this.clamp((value / maxValue) * 100, 0, 100);
  }

  /**
   * For nutrients where lower is better (sugar, saturated fats, energy density).
   * If value <= bestThreshold → 100
   * If value >= worstThreshold → 0
   * Linear interpolation between them.
   */
  private scoreLowerIsBetter(
    value: number,
    bestThreshold: number,
    worstThreshold: number,
  ): number {
    if (value <= bestThreshold) return 100;
    if (value >= worstThreshold) return 0;
    const ratio = (value - bestThreshold) / (worstThreshold - bestThreshold);
    const score = 100 * (1 - ratio);
    return this.clamp(score, 0, 100);
  }

  /**
   * Legacy methods for backward compatibility
   */
  private positiveScore(value: number, target: number) {
    if (target <= 0) return 0;
    const ratio = Math.min(1.5, value / target);
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  }

  private negativeScore(value: number, threshold: number) {
    if (threshold <= 0) return 100;
    if (value <= threshold) {
      return 100;
    }
    const ratio = Math.min(2, (value - threshold) / threshold);
    return Math.max(0, Math.round(100 - ratio * 100));
  }

  private deriveGrade(score: number) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private buildFeedback(
    factors: Record<string, { label: string; score: number; weight: number }>,
    locale: 'en' | 'ru' | 'kk' = 'en',
  ): Array<{ key: string; label: string; action: 'celebrate' | 'increase' | 'reduce' | 'monitor'; message: string }> {
    const entries: Array<{ key: string; label: string; action: 'celebrate' | 'increase' | 'reduce' | 'monitor'; message: string }> = [];
    const penaltyKeys = ['satFat', 'sugar', 'energyDensity'];

    // Localized feedback messages
    const feedbackI18n = {
      en: {
        reduce: (label: string) => `Reduce ${label.toLowerCase()} to improve overall score.`,
        monitor: (label: string) => `Keep an eye on ${label.toLowerCase()} to stay on track.`,
        increase: (label: string) => `Increase ${label.toLowerCase()} to improve overall score.`,
        celebrate: 'Great job! This meal looks well balanced.',
        overallBalance: 'Overall balance',
      },
      ru: {
        reduce: (label: string) => `Уменьшите ${this.translateLabel(label, 'ru').toLowerCase()} для улучшения общего балла.`,
        monitor: (label: string) => `Следите за ${this.translateLabel(label, 'ru').toLowerCase()}, чтобы оставаться на правильном пути.`,
        increase: (label: string) => `Увеличьте ${this.translateLabel(label, 'ru').toLowerCase()} для улучшения общего балла.`,
        celebrate: 'Отличная работа! Это блюдо выглядит хорошо сбалансированным.',
        overallBalance: 'Общий баланс',
      },
      kk: {
        reduce: (label: string) => `Жалпы баллды жақсарту үшін ${this.translateLabel(label, 'kk').toLowerCase()} азайтыңыз.`,
        monitor: (label: string) => `Дұрыс жолда қалу үшін ${this.translateLabel(label, 'kk').toLowerCase()} бақылаңыз.`,
        increase: (label: string) => `Жалпы баллды жақсарту үшін ${this.translateLabel(label, 'kk').toLowerCase()} арттырыңыз.`,
        celebrate: 'Тамаша! Бұл тағам жақсы теңгерілген сияқты.',
        overallBalance: 'Жалпы теңгерім',
      },
    };

    const dict = feedbackI18n[locale] || feedbackI18n.en;

    Object.entries(factors).forEach(([key, factor]) => {
      const label = factor.label || key;
      const labelLower = label.toLowerCase();

      if (penaltyKeys.includes(key)) {
        if (factor.score < 70) {
          entries.push({
            key,
            label,
            action: 'reduce',
            message: dict.reduce(label),
          });
        } else if (factor.score < 85) {
          entries.push({
            key,
            label,
            action: 'monitor',
            message: dict.monitor(label),
          });
        }
      } else if (factor.score < 70) {
        entries.push({
          key,
          label,
          action: 'increase',
          message: dict.increase(label),
        });
      }
    });

    if (entries.length === 0) {
      entries.push({
        key: 'overall',
        label: dict.overallBalance,
        action: 'celebrate',
        message: dict.celebrate,
      });
    }

    return entries;
  }

  private translateLabel(label: string, locale: 'en' | 'ru' | 'kk'): string {
    const translations: Record<string, Record<string, string>> = {
      Protein: { ru: 'Белок', kk: 'Ақуыз' },
      Fiber: { ru: 'Клетчатка', kk: 'Талшық' },
      'Saturated fat': { ru: 'Насыщенные жиры', kk: 'Қаныққан майлар' },
      Sugar: { ru: 'Сахар', kk: 'Қант' },
      'Energy density': { ru: 'Энергетическая плотность', kk: 'Энергия тығыздығы' },
    };
    return translations[label]?.[locale] || label;
  }

  /**
   * Build localized health feedback messages based on health score and totals
   */
  private buildHealthFeedback(
    healthScore: { total: number; level: HealthScoreLevel; factors: HealthScoreFactors } | HealthScore,
    totals: { calories: number; protein: number; carbs: number; fat: number; fiber?: number; satFat?: number; sugars?: number },
    locale: string,
  ): HealthFeedbackItem[] {
    let total: number;
    if ('total' in healthScore) {
      total = healthScore.total;
    } else if ('score' in healthScore) {
      const hs = healthScore as HealthScore;
      total = typeof hs.score === 'number' ? hs.score : 0;
    } else {
      total = 0;
    }
    const level = 'level' in healthScore ? healthScore.level : (total >= 80 ? 'excellent' : total >= 60 ? 'good' : total >= 40 ? 'average' : 'poor');
    const factors = healthScore.factors;
    const { calories, protein, fiber, sugars, satFat } = totals;

    // Приводим locale к базовым ('en' | 'ru' | 'kk')
    const lang = (locale || 'en').split('-')[0] as 'en' | 'ru' | 'kk';

    // Хелпер для текстов
    const t = (code: string): string => {
      const dict: Record<typeof lang, Record<string, string>> = {
        en: {
          overall_excellent: 'This looks like a very balanced and nutrient-dense meal.',
          overall_good: 'Overall this meal looks fairly balanced.',
          overall_average: 'This meal is okay, but there is room for improvement.',
          overall_poor: 'This meal is quite unbalanced. Try to improve it next time.',
          high_protein: 'Good protein content — this helps preserve muscle mass.',
          low_protein: 'Protein is relatively low. Consider adding meat, fish, eggs, or legumes.',
          high_fiber: 'Nice amount of fiber — good for digestion and blood sugar control.',
          low_fiber: 'Fiber is low. Try to add vegetables, fruits, or whole grains.',
          low_saturated_fat: 'Saturated fat is within reasonable limits.',
          high_saturated_fat: 'Saturated fat is high. Try to reduce fatty meat, butter, or pastries.',
          low_sugar: 'Free sugar is within a sensible range.',
          high_sugar: 'Free sugar is relatively high — be careful with sweets and sugary drinks.',
          low_energy_density: 'Energy density is low, which usually means more volume for fewer calories.',
          high_energy_density: 'Energy density is high. Such meals are easy to overeat without noticing.',
          caloric_surplus_warning: 'The total calories of this meal are relatively high; watch your overall daily intake.',
          caloric_low_warning: 'Calories are low — this looks more like a snack than a full meal.',
        },
        ru: {
          overall_excellent: 'По составу это очень сбалансированный и питательный приём пищи.',
          overall_good: 'В целом приём пищи выглядит достаточно сбалансированным.',
          overall_average: 'Приём пищи в порядке, но есть куда улучшать.',
          overall_poor: 'Приём пищи довольно несбалансированный. В следующий раз можно улучшить состав.',
          high_protein: 'Хорошее содержание белка — это помогает сохранять мышечную массу.',
          low_protein: 'Белка относительно мало. Подумайте о том, чтобы добавить мясо, рыбу, яйца или бобовые.',
          high_fiber: 'Неплохое количество клетчатки — это полезно для пищеварения и сахара крови.',
          low_fiber: 'Клетчатки маловато. Попробуйте добавить овощи, фрукты или цельнозерновые продукты.',
          low_saturated_fat: 'Насыщенные жиры находятся в разумных пределах.',
          high_saturated_fat: 'Много насыщенных жиров. Стоит сократить жирное мясо, сливочное масло и выпечку.',
          low_sugar: 'Свободные сахара в разумных пределах.',
          high_sugar: 'Доля сахара достаточно высока — аккуратнее со сладостями и сладкими напитками.',
          low_energy_density: 'Невысокая энергетическая плотность — обычно это значит больше объёма за меньшее число калорий.',
          high_energy_density: 'Энергетическая плотность высокая — такие блюда легко переесть, не заметив.',
          caloric_surplus_warning: 'Общая калорийность приёма пищи довольно высокая — следите за суточным потреблением.',
          caloric_low_warning: 'Калорийность невысокая — это больше похоже на перекус, чем на полноценный приём пищи.',
        },
        kk: {
          overall_excellent: 'Бұл өте теңгерілген және қоректік тамақтану болып көрінеді.',
          overall_good: 'Жалпы алғанда бұл тамақтану жеткілікті теңгерілген.',
          overall_average: 'Тамақтану жаман емес, бірақ жақсартуға мүмкіндік бар.',
          overall_poor: 'Бұл тамақтану онша теңгерілмеген. Келесі жолы сәл жақсартуға тырысыңыз.',
          high_protein: 'Ақуыз мөлшері жақсы — бұлшықет массасын сақтауға көмектеседі.',
          low_protein: 'Ақуыз аздау. Ет, балық, жұмыртқа немесе бұршақ тұқымдастарын қосуды ойластырыңыз.',
          high_fiber: 'Клетчатка мөлшері жақсы — ас қорытуға және қантты бақылауға пайдалы.',
          low_fiber: 'Клетчатка аз. Көкөністер, жемістер немесе тұтас дәнді өнімдер қосып көріңіз.',
          low_saturated_fat: 'Қаныққан майлар мөлшері ақылға қонымды шектерде.',
          high_saturated_fat: 'Қаныққан майлар көп. Майлы етті, сары майды және қамырлы тағамдарды азайтқан дұрыс.',
          low_sugar: 'Бос қанттар адекватты деңгейде.',
          high_sugar: 'Қанттың үлесі жоғарырақ — тәттілер мен тәтті сусындарға абай болыңыз.',
          low_energy_density: 'Энергетикалық тығыздық төмен — әдетте бұл аз калорияға көбірек көлем дегенді білдіреді.',
          high_energy_density: 'Энергетикалық тығыздық жоғары — мұндай тағамдарды байқамай-ақ артық жеуге болады.',
          caloric_surplus_warning: 'Бұл тамақтанудың жалпы калориясы жоғары — тәуліктік норманы бақылаңыз.',
          caloric_low_warning: 'Калориясы төмен — бұл толыққанды тамақтанудан гөрі жеңіл жеңілдеу сияқты.',
        },
      };
      return dict[lang]?.[code] ?? dict.en[code] ?? code;
    };

    const feedback: HealthFeedbackItem[] = [];

    // 1) Общая оценка
    if (total >= 80) {
      feedback.push({ type: 'positive', code: 'overall_excellent', message: t('overall_excellent') });
    } else if (total >= 60) {
      feedback.push({ type: 'positive', code: 'overall_good', message: t('overall_good') });
    } else if (total >= 40) {
      feedback.push({ type: 'warning', code: 'overall_average', message: t('overall_average') });
    } else {
      feedback.push({ type: 'warning', code: 'overall_poor', message: t('overall_poor') });
    }

    // 2) Белок
    if (factors.protein >= 70) {
      feedback.push({ type: 'positive', code: 'high_protein', message: t('high_protein') });
    } else if (factors.protein <= 40) {
      feedback.push({ type: 'warning', code: 'low_protein', message: t('low_protein') });
    }

    // 3) Клетчатка
    if (factors.fiber >= 70) {
      feedback.push({ type: 'positive', code: 'high_fiber', message: t('high_fiber') });
    } else if (factors.fiber <= 40) {
      feedback.push({ type: 'warning', code: 'low_fiber', message: t('low_fiber') });
    }

    // 4) Насыщенные жиры
    if (factors.saturatedFat >= 70) {
      feedback.push({
        type: 'positive',
        code: 'low_saturated_fat',
        message: t('low_saturated_fat'),
      });
    } else if (factors.saturatedFat <= 40) {
      feedback.push({
        type: 'warning',
        code: 'high_saturated_fat',
        message: t('high_saturated_fat'),
      });
    }

    // 5) Сахара
    if (factors.sugars >= 70) {
      feedback.push({ type: 'positive', code: 'low_sugar', message: t('low_sugar') });
    } else if (factors.sugars <= 40) {
      feedback.push({ type: 'warning', code: 'high_sugar', message: t('high_sugar') });
    }

    // 6) Энергетическая плотность
    if (factors.energyDensity >= 70) {
      feedback.push({
        type: 'positive',
        code: 'low_energy_density',
        message: t('low_energy_density'),
      });
    } else if (factors.energyDensity <= 40) {
      feedback.push({
        type: 'warning',
        code: 'high_energy_density',
        message: t('high_energy_density'),
      });
    }

    // 7) Дополнительные замечания по калорийности
    if (calories >= 800) {
      feedback.push({
        type: 'warning',
        code: 'caloric_surplus_warning',
        message: t('caloric_surplus_warning'),
      });
    } else if (calories <= 300) {
      feedback.push({
        type: 'warning',
        code: 'caloric_low_warning',
        message: t('caloric_low_warning'),
      });
    }

    // Можно ограничить вывод, чтобы не перегружать пользователя
    // Например, показать не больше 6 сообщений
    return feedback.slice(0, 6);
  }

  /**
   * Helper method for cases when we only have totals and items
   * (e.g., during manual-reanalyze after manual ingredient editing).
   */
  public async computeHealthScoreFromTotals(params: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    satFat?: number;
    sugars?: number;
    items: AnalyzedItem[];
    locale?: string;
  }): Promise<HealthScore> {
    const { calories, protein, carbs, fat, fiber, satFat, sugars, items, locale } = params;

    const totals = { calories, protein, carbs, fat, fiber, satFat, sugars };

    const baseHealthScore = this.computeHealthScoreInternal(totals, items);
    const feedback = this.buildHealthFeedback(
      baseHealthScore,
      totals,
      locale || 'en',
    );

    // Convert feedback to legacy format for backward compatibility
    const feedbackLegacy = feedback.map(item => item.message);

    return {
      ...baseHealthScore,
      feedback,
      feedbackLegacy, // backward compatibility
    } as any as HealthScore & { feedbackLegacy?: string[] };
  }

  /**
   * Re-analyze with manually edited component names and portions
   * Does NOT call Vision - uses user-provided names directly
   */
  public async reanalyzeWithManualComponents(
    input: {
      analysisId: string;
      components: Array<{ id: string; name: string; portion_g: number }>;
      locale?: 'en' | 'ru' | 'kk';
      region?: 'US' | 'CH' | 'EU' | 'OTHER';
    },
    userId: string,
  ): Promise<AnalysisData> {
    const locale = input.locale || 'en';
    const region = input.region;

    // Build lookup context
    const lookupContext: NutritionLookupContext = {
      locale,
      region,
      expectedCategory: undefined, // Will be determined per component
    };

    const items: AnalyzedItem[] = [];
    const debug: AnalysisDebug = {
      components: [],
      timestamp: new Date().toISOString(),
      model: 'manual_reanalysis',
    };

    // Process each manually edited component
    for (const component of input.components) {
      try {
        const name = component.name.trim();
        const portionG = component.portion_g;

        if (!name || portionG <= 0) {
          continue;
        }

        // Check for special cases (water, plain coffee/tea) BEFORE provider lookup
        const isWater = this.isPlainWater(name);
        if (isWater) {
          const waterNameEn = 'Water';
          const waterNameLocalized = await this.foodLocalization.localizeName(waterNameEn, locale);

          const waterItem: AnalyzedItem = {
            name: waterNameLocalized || waterNameEn,
            originalName: waterNameEn,
            label: name,
            portion_g: portionG,
            nutrients: {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              sugars: 0,
              satFat: 0,
              energyDensity: 0,
            },
            source: 'canonical_water',
            locale,
            hasNutrition: false,
            userEditedName: name,
            userEditedPortionG: portionG,
            wasManuallyEdited: true,
          };

          items.push(waterItem);
          debug.components.push({
            type: 'matched',
            componentName: name,
            waterDetected: true,
            skippedProvider: true,
            provider: 'canonical_water',
          });
          continue;
        }

        // Check for plain coffee/tea
        const plainCoffeeTea = this.detectPlainCoffeeOrTeaLegacy(name);
        if (plainCoffeeTea.isPlain) {
          const baseName = this.buildBaseFoodName(name);
          const originalNameEn = normalizeFoodName(baseName);
          const localizedName = await this.foodLocalization.localizeName(originalNameEn, locale);

          const sourceType = (plainCoffeeTea.type === 'coffee' ? 'canonical_plain_coffee' : 'canonical_plain_tea') as AnalyzedItem['source'];

          const coffeeTeaItem: AnalyzedItem = {
            name: localizedName || originalNameEn,
            originalName: originalNameEn,
            label: name,
            portion_g: portionG,
            nutrients: this.getPlainCoffeeOrTeaNutrients(portionG),
            source: sourceType,
            locale,
            hasNutrition: true,
            userEditedName: name,
            userEditedPortionG: portionG,
            wasManuallyEdited: true,
          };

          items.push(coffeeTeaItem);
          debug.components.push({
            type: 'matched',
            componentName: name,
            plainCoffeeTea: true,
            coffeeTeaType: plainCoffeeTea.type,
            skippedProvider: true,
            provider: sourceType,
          });
          continue;
        }

        // 1) Проверяем напиток ПЕРЕД вызовом провайдеров
        const beverageDetection = this.detectBeverageForItem({
          name: name,
          category: undefined,
          volume_ml: portionG && portionG > 0 ? portionG : undefined,
          portion_g: portionG,
        });

        if (beverageDetection && beverageDetection.isBeverage) {
          // Создать "канонический" AnalyzedItem без вызова провайдеров
          const volume = beverageDetection.volume_ml ?? (portionG && portionG > 0 ? portionG : 250);
          const finalPortionG = portionG && portionG > 0
            ? (portionG < 50 ? volume : (portionG > 800 ? 800 : portionG))
            : volume;

          // Определяем source в зависимости от типа напитка
          let source: AnalyzedItem['source'];
          let baseNameEn: string;

          switch (beverageDetection.kind) {
            case 'water':
              source = 'canonical_water';
              baseNameEn = 'Water';
              break;
            case 'black_coffee':
              source = 'canonical_plain_coffee';
              baseNameEn = normalizeFoodName(this.buildBaseFoodName(name)) || 'Black Coffee';
              break;
            case 'tea':
              source = 'canonical_plain_tea';
              baseNameEn = normalizeFoodName(this.buildBaseFoodName(name)) || 'Tea';
              break;
            case 'milk_coffee':
              source = 'canonical_milk_coffee_fallback';
              baseNameEn = normalizeFoodName(this.buildBaseFoodName(name)) || 'Cappuccino';
              break;
            default:
              source = 'canonical_beverage';
              baseNameEn = normalizeFoodName(this.buildBaseFoodName(name)) || 'Beverage';
          }

          const localizedName = await this.foodLocalization.localizeName(baseNameEn, locale);

          const beverageItem: AnalyzedItem = {
            name: localizedName || baseNameEn,
            originalName: baseNameEn,
            label: name,
            portion_g: finalPortionG,
            nutrients: {
              calories: beverageDetection.calories ?? 0,
              protein: beverageDetection.protein_g ?? 0,
              carbs: beverageDetection.carbs_g ?? 0,
              fat: beverageDetection.fat_g ?? 0,
              fiber: beverageDetection.fiber_g ?? 0,
              sugars: beverageDetection.sugars_g ?? 0,
              satFat: beverageDetection.satFat_g ?? 0,
              energyDensity: beverageDetection.calories && finalPortionG > 0
                ? (beverageDetection.calories / finalPortionG) * 100
                : 0,
            },
            source,
            locale,
            hasNutrition: beverageDetection.kind !== 'water',
            userEditedName: name,
            userEditedPortionG: portionG,
            wasManuallyEdited: true,
          };

          items.push(beverageItem);
          debug.components.push({
            type: 'matched',
            componentName: name,
            beverageDetected: true,
            beverageKind: beverageDetection.kind,
            skippedProvider: true,
            provider: source,
          });
          continue; // Переходим к следующему компоненту, провайдеров не трогаем
        }

        // 2) Если не напиток — обычный пайплайн (NutritionOrchestrator)
        // Detect if it's a drink
        const nameLower = name.toLowerCase();
        const isDrinkComponent = this.DRINK_KEYWORDS.some(keyword => nameLower.includes(keyword));
        const expectedCategory: 'drink' | 'solid' | 'unknown' = isDrinkComponent ? 'drink' : 'unknown';
        const contextWithCategory = { ...lookupContext, expectedCategory };

        // Try to find nutrition data via orchestrator
        const providerResult = await this.nutrition.findNutrition(name, contextWithCategory);

        if (!providerResult || !providerResult.food) {
          // Fallback for unknown items
          if (isDrinkComponent) {
            // Use conservative beverage fallback
            const sweetDrinkKeywords = ['cola', 'soda', 'juice', 'сок', 'лимонад', 'sweet', 'sweetened'];
            const isSweetDrink = sweetDrinkKeywords.some(kw => nameLower.includes(kw));
            const kcalPer250ml = isSweetDrink ? 100 : 20;
            const calories = Math.round((portionG / 250) * kcalPer250ml);

            const fallbackNutrients: Nutrients = {
              calories,
              protein: 0,
              carbs: isSweetDrink ? this.round((portionG / 250) * 25, 1) : 0,
              fat: 0,
              fiber: 0,
              sugars: isSweetDrink ? this.round((portionG / 250) * 24, 1) : 0,
              satFat: 0,
              energyDensity: calories > 0 ? (calories / portionG) * 100 : 0,
            };

            const baseName = this.buildBaseFoodName(name);
            const originalNameEn = normalizeFoodName(baseName);
            const localizedName = await this.foodLocalization.localizeName(originalNameEn, locale);

            const fallbackItem: AnalyzedItem = {
              name: localizedName || originalNameEn,
              originalName: originalNameEn,
              label: name,
              portion_g: portionG,
              nutrients: fallbackNutrients,
              source: 'unknown_drink_low_calorie_fallback',
              locale,
              hasNutrition: true,
              userEditedName: name,
              userEditedPortionG: portionG,
              wasManuallyEdited: true,
            };

            items.push(fallbackItem);
            debug.components.push({
              type: 'vision_fallback',
              componentName: name,
              message: 'Added conservative fallback for unknown beverage',
              provider: 'unknown_drink_low_calorie_fallback',
            });
          } else {
            // Solid food fallback
            const fallbackNutrients: Nutrients = {
              calories: Math.round(portionG * 1.2),
              protein: this.round(portionG * 0.04, 1),
              carbs: this.round(portionG * 0.15, 1),
              fat: this.round(portionG * 0.06, 1),
              fiber: 0,
              sugars: 0,
              satFat: 0,
              energyDensity: 120,
            };

            const baseName = this.buildBaseFoodName(name);
            const originalNameEn = normalizeFoodName(baseName);
            const localizedName = await this.foodLocalization.localizeName(originalNameEn, locale);

            const fallbackItem: AnalyzedItem = {
              name: localizedName || originalNameEn,
              originalName: originalNameEn,
              label: name,
              portion_g: portionG,
              nutrients: fallbackNutrients,
              source: 'vision_fallback',
              locale,
              hasNutrition: true,
              userEditedName: name,
              userEditedPortionG: portionG,
              wasManuallyEdited: true,
            };

            items.push(fallbackItem);
            debug.components.push({
              type: 'vision_fallback',
              componentName: name,
              message: 'Added fallback for unknown solid food',
              provider: 'vision_fallback',
            });
          }
          continue;
        }

        const canonicalFood = providerResult.food;
        const isDrink = canonicalFood.category === 'drink';

        // Calculate nutrients for portion
        const nutrients = this.calculateNutrientsFromCanonical(canonicalFood.per100g, portionG);

        // Special handling for milk coffee drinks
        const isMilkCoffee = this.detectMilkCoffeeDrink(component.name, (component as any).category, (component as any).volume_ml) !== null;
        if (isMilkCoffee && isDrink) {
          const kcalPer100 = canonicalFood.per100g.calories || 0;
          const kcalPerPortion = nutrients.calories;

          if (kcalPer100 > 150 || (kcalPerPortion > 400 && portionG <= 300)) {
            // Use canonical fallback
            const canonicalKcalPer250ml = 90;
            const scale = portionG / 250;
            nutrients.calories = Math.round(canonicalKcalPer250ml * scale);
            nutrients.protein = this.round(3 * scale, 1);
            nutrients.carbs = this.round(9 * scale, 1);
            nutrients.fat = this.round(4.5 * scale, 1);
            nutrients.fiber = 0;
            nutrients.sugars = this.round(8 * scale, 1);
            nutrients.satFat = this.round(2.5 * scale, 1);
            nutrients.energyDensity = this.round((nutrients.calories / portionG) * 100, 1);

            const item = await this.createAnalyzedItemFromCanonical(
              { name, preparation: 'unknown', est_portion_g: portionG, confidence: 0.8 },
              canonicalFood,
              portionG,
              nutrients,
              locale,
              'canonical_milk_coffee_fallback',
            );

            item.userEditedName = name;
            item.userEditedPortionG = portionG;
            item.wasManuallyEdited = true;

            items.push(item);
            debug.components.push({
              type: 'matched',
              componentName: name,
              provider: canonicalFood.providerId,
              canonicalFallback: true,
              reason: 'milk_coffee_calories_too_high',
            });
            continue;
          }
        }

        // Create item from canonical food
        const item = await this.createAnalyzedItemFromCanonical(
          { name, preparation: 'unknown', est_portion_g: portionG, confidence: 0.8 },
          canonicalFood,
          portionG,
          nutrients,
          locale,
          canonicalFood.providerId === 'usda' ? 'fdc' : canonicalFood.providerId,
        );

        item.userEditedName = name;
        item.userEditedPortionG = portionG;
        item.wasManuallyEdited = true;

        items.push(item);
        debug.components.push({
          type: 'matched',
          componentName: name,
          provider: canonicalFood.providerId,
          providerId: canonicalFood.providerFoodId,
          foodName: canonicalFood.displayName,
          confidence: providerResult.confidence,
        });
      } catch (error: any) {
        this.logger.error(`Error processing manual component ${component.name}:`, error.message);
        debug.components.push({
          type: 'no_match',
          componentName: component.name,
          error: error.message,
        });
      }
    }

    // Calculate totals
    const total: AnalysisTotals = items.reduce(
      (acc, item) => {
        acc.portion_g += item.portion_g;
        acc.calories += item.nutrients.calories;
        acc.protein += item.nutrients.protein;
        acc.carbs += item.nutrients.carbs;
        acc.fat += item.nutrients.fat;
        acc.fiber += item.nutrients.fiber || 0;
        acc.sugars += item.nutrients.sugars || 0;
        acc.satFat += item.nutrients.satFat || 0;
        return acc;
      },
      {
        portion_g: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
        satFat: 0,
        energyDensity: 0,
      },
    );

    if (total.portion_g > 0) {
      total.energyDensity = this.round((total.calories / total.portion_g) * 100, 1);
    }

    // Calculate HealthScore
    const healthScore = this.computeHealthScore(total, total.portion_g, items, locale);

    // Run sanity check
    const sanity = this.runSanityCheck({ items, total, healthScore, debug });

    // Build dish name
    const dishNameEn = this.buildDishNameEn(items);
    const dishNameLocalized = await this.foodLocalization.localizeName(dishNameEn, locale);

    return {
      items,
      total,
      healthScore,
      debug,
      isSuspicious: sanity.some(i => i.level === 'error'),
      needsReview: items.length > 0 && total.calories === 0 && total.protein === 0 && total.carbs === 0 && total.fat === 0,
      locale,
      dishNameLocalized,
      originalDishName: dishNameEn,
    };
  }

  /**
   * Re-analyze from original input (image/text)
   * Finds original analysis, extracts input, and runs full analysis again
   */
  async reanalyzeFromOriginalInput(
    analysisId: string,
    options: { mode?: 'default' | 'review' },
    userId: string,
  ): Promise<AnalysisData> {
    // 1. Find analysis record
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
      include: {
        results: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!analysis) {
      throw new BadRequestException('Analysis not found or access denied');
    }

    // 2. Extract original input from metadata
    const metadata = analysis.metadata as any;
    const analysisType = analysis.type;
    const locale = metadata?.locale || 'en';

    let result: AnalysisData;

    if (analysisType === 'IMAGE') {
      // For image analysis, try to get imageUrl from:
      // 1. Latest result data (if stored there)
      // 2. Metadata
      let imageUrl: string | undefined;
      let imageBase64: string | undefined;

      // Try to get from latest result
      if (analysis.results && analysis.results.length > 0) {
        const resultData = analysis.results[0].data as any;
        imageUrl = resultData?.imageUrl || resultData?.imageUri;
      }

      // Fallback to metadata
      if (!imageUrl) {
        imageUrl = metadata?.imageUrl || metadata?.imageUri;
      }

      if (!imageUrl) {
        throw new BadRequestException('Original image URL not available for reanalysis. Please upload a new image.');
      }

      result = await this.analyzeImage({
        imageUrl,
        imageBase64,
        locale,
        mode: options.mode || 'review',
      });
    } else if (analysisType === 'TEXT') {
      const textQuery = metadata?.textQuery || metadata?.description;
      if (!textQuery) {
        throw new BadRequestException('Original text query not available for reanalysis');
      }

      result = await this.analyzeText(textQuery, locale);
    } else {
      throw new BadRequestException(`Unsupported analysis type: ${analysisType}`);
    }

    // 3. Mark as reanalysis
    result.debug = result.debug || {
      components: [],
      timestamp: new Date().toISOString(),
    };
    (result.debug as any).reanalysisOf = analysisId;
    (result.debug as any).reanalysisMode = options.mode || 'review';

    // Update source for items to indicate reanalysis
    result.items = result.items.map(item => ({
      ...item,
      source: item.source === 'fdc' ? 'fdc' : (item.source === 'manual' ? 'manual' : 'reanalysis') as AnalyzedItem['source'],
    }));

    return result;
  }

  /**
   * Extract cooking method hints from Vision component
   */
  private extractCookingMethodHints(component: VisionComponent): AnalyzedItem['cookingMethodHints'] {
    const cookingMethod = component.cooking_method;
    const tags = component.tags || [];
    const notes = component.notes || '';

    return {
      method: cookingMethod as any,
      hasVisibleOil: tags.includes('visible_oil') || notes.toLowerCase().includes('oil'),
      hasCreamOrButter: tags.includes('creamy_sauce') || tags.includes('creamy') || notes.toLowerCase().includes('cream') || notes.toLowerCase().includes('butter'),
      hasSauceOrDressing: tags.includes('salad_with_dressing') || tags.includes('sauce') || notes.toLowerCase().includes('dressing') || notes.toLowerCase().includes('sauce'),
      looksSugary: tags.includes('sweet_dessert') || tags.includes('sugary_drink') || notes.toLowerCase().includes('sweet') || notes.toLowerCase().includes('sugar'),
      hasBreadingOrBatter: tags.includes('breaded') || tags.includes('batter') || notes.toLowerCase().includes('breaded') || notes.toLowerCase().includes('batter'),
    };
  }
}

