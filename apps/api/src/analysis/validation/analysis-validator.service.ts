import { Injectable, Logger } from '@nestjs/common';

// ============================================
// ТИПЫ
// ============================================

interface RawAnalyzedItem {
  name: string;
  portion_g: number;
  confidence: number;
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  reasoning?: string;
  // Source info for provider bypass
  hasNutrition?: boolean;
  provider?: 'usda' | 'openfoodfacts' | 'swiss' | 'vision' | 'hybrid' | 'unknown';
  sourceInfo?: { nutrients: 'provider' | 'vision' | 'derived' };
}

interface ValidationIssue {
  itemIndex: number;
  itemName: string;
  issueType: 'non_food' | 'impossible_calories' | 'unrealistic_portion' | 'macro_mismatch' | 'unknown_food';
  severity: 'error' | 'warning' | 'info';
  message: string;
  originalValue: any;
  correctedValue?: any;
  autoFixed: boolean;
}

interface ValidatedItem extends RawAnalyzedItem {
  wasValidated: boolean;
  validationIssues: string[];
  originalValues?: Partial<RawAnalyzedItem>;
}

interface ValidationResult {
  items: ValidatedItem[];
  issues: ValidationIssue[];
  overallConfidence: number;
  needsReview: boolean;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

// ============================================
// КОНСТАНТЫ
// ============================================

// Non-food keywords in multiple languages
const NON_FOOD_KEYWORDS = [
  // English
  'plastic', 'container', 'packaging', 'wrapper', 'foil', 'box', 'bag',
  'fork', 'knife', 'spoon', 'chopstick', 'cutlery', 'utensil',
  'plate', 'bowl', 'cup', 'glass', 'mug', 'dish', 'tray',
  'napkin', 'tissue', 'towel', 'paper',
  'hand', 'finger', 'arm',
  'table', 'tablecloth', 'placemat',

  // Russian
  'пластик', 'контейнер', 'упаковка', 'обёртка', 'фольга', 'коробка', 'пакет',
  'вилка', 'нож', 'ложка', 'палочки', 'столовые приборы',
  'тарелка', 'миска', 'чашка', 'стакан', 'кружка', 'блюдо', 'поднос',
  'салфетка', 'полотенце', 'бумага',
  'рука', 'палец',
  'стол', 'скатерть',
];

// Calorie ranges per 100g for food categories
const CALORIE_RANGES: Record<string, { min: number; max: number; typical: number; keywords: string[] }> = {
  // Vegetables (very low calorie)
  'leafy_greens': { min: 10, max: 30, typical: 20, keywords: ['lettuce', 'spinach', 'салат', 'шпинат', 'зелень', 'leaf', 'greens'] },
  'watery_vegetables': { min: 10, max: 25, typical: 15, keywords: ['cucumber', 'огурец', 'celery', 'сельдерей', 'radish', 'редис'] },
  'root_vegetables_raw': { min: 25, max: 50, typical: 40, keywords: ['carrot raw', 'морковь сырая', 'beet raw', 'свекла сырая'] },
  'vegetables_cooked': { min: 20, max: 60, typical: 35, keywords: ['broccoli', 'брокколи', 'cauliflower', 'цветная капуста', 'zucchini', 'кабачок', 'eggplant', 'баклажан'] },
  'tomato': { min: 15, max: 25, typical: 18, keywords: ['tomato', 'помидор', 'томат', 'cherry tomato'] },
  'potato_boiled': { min: 70, max: 95, typical: 86, keywords: ['boiled potato', 'варёный картофель', 'картошка варёная'] },
  'potato_mashed': { min: 80, max: 130, typical: 105, keywords: ['mashed potato', 'пюре', 'картофельное пюре'] },
  'potato_fried': { min: 150, max: 320, typical: 270, keywords: ['fried potato', 'жареный картофель', 'fries', 'фри', 'chips'] },

  // Fruits
  'berries': { min: 25, max: 60, typical: 40, keywords: ['berry', 'ягода', 'strawberry', 'клубника', 'raspberry', 'малина', 'blueberry', 'черника'] },
  'apple': { min: 45, max: 60, typical: 52, keywords: ['apple', 'яблоко'] },
  'banana': { min: 85, max: 100, typical: 89, keywords: ['banana', 'банан'] },
  'citrus': { min: 30, max: 50, typical: 40, keywords: ['orange', 'апельсин', 'lemon', 'лимон', 'grapefruit', 'грейпфрут', 'mandarin', 'мандарин'] },
  'tropical': { min: 40, max: 90, typical: 60, keywords: ['mango', 'манго', 'pineapple', 'ананас', 'papaya', 'папайя'] },
  'grapes': { min: 60, max: 80, typical: 69, keywords: ['grape', 'виноград'] },
  'dried_fruit': { min: 250, max: 350, typical: 280, keywords: ['dried', 'сушёный', 'raisin', 'изюм', 'date', 'финик', 'prune', 'чернослив'] },

  // Proteins - Meat
  'chicken_breast': { min: 100, max: 170, typical: 165, keywords: ['chicken breast', 'куриная грудка', 'грудка куриная'] },
  'chicken_thigh': { min: 170, max: 220, typical: 190, keywords: ['chicken thigh', 'куриное бедро', 'бедро куриное'] },
  'chicken_wing': { min: 200, max: 280, typical: 240, keywords: ['chicken wing', 'куриное крыло', 'крыло', 'крылышко'] },
  'beef_lean': { min: 150, max: 200, typical: 175, keywords: ['beef lean', 'говядина постная', 'tenderloin', 'вырезка'] },
  'beef_fatty': { min: 250, max: 350, typical: 290, keywords: ['beef ribeye', 'рибай', 'steak', 'стейк', 'beef fatty'] },
  'pork_lean': { min: 140, max: 200, typical: 170, keywords: ['pork loin', 'свиная корейка', 'pork tenderloin'] },
  'pork_fatty': { min: 250, max: 400, typical: 300, keywords: ['pork belly', 'свиная грудинка', 'bacon', 'бекон', 'сало'] },
  'lamb': { min: 200, max: 300, typical: 250, keywords: ['lamb', 'баранина', 'ягнёнок'] },
  'cutlet_meat': { min: 180, max: 280, typical: 220, keywords: ['cutlet', 'котлета', 'patty', 'биточек'] },
  'sausage': { min: 250, max: 380, typical: 300, keywords: ['sausage', 'сосиска', 'колбаса', 'frankfurter', 'wiener', 'hot dog'] },
  'processed_meat': { min: 200, max: 350, typical: 270, keywords: ['ham', 'ветчина', 'salami', 'салями', 'bologna', 'докторская'] },

  // Proteins - Fish & Seafood
  'white_fish': { min: 70, max: 120, typical: 95, keywords: ['cod', 'треска', 'tilapia', 'тилапия', 'haddock', 'пикша', 'sole', 'камбала', 'white fish'] },
  'fatty_fish': { min: 150, max: 250, typical: 200, keywords: ['salmon', 'лосось', 'сёмга', 'mackerel', 'скумбрия', 'tuna', 'тунец', 'trout', 'форель'] },
  'shrimp': { min: 80, max: 110, typical: 99, keywords: ['shrimp', 'креветка', 'prawn'] },
  'squid': { min: 75, max: 100, typical: 85, keywords: ['squid', 'кальмар', 'calamari'] },

  // Proteins - Other
  'egg': { min: 140, max: 180, typical: 155, keywords: ['egg', 'яйцо', 'omelet', 'омлет', 'scrambled', 'fried egg', 'яичница'] },
  'tofu': { min: 70, max: 100, typical: 80, keywords: ['tofu', 'тофу'] },

  // Dairy
  'milk_whole': { min: 55, max: 70, typical: 61, keywords: ['whole milk', 'молоко цельное', 'milk 3.2%'] },
  'milk_skim': { min: 30, max: 40, typical: 35, keywords: ['skim milk', 'обезжиренное молоко', 'milk 0.5%', 'milk 1%'] },
  'yogurt_plain': { min: 50, max: 80, typical: 60, keywords: ['yogurt plain', 'йогурт натуральный', 'greek yogurt', 'греческий йогурт'] },
  'yogurt_sweetened': { min: 80, max: 130, typical: 100, keywords: ['yogurt fruit', 'йогурт фруктовый', 'йогурт сладкий'] },
  'cheese_hard': { min: 350, max: 450, typical: 400, keywords: ['cheddar', 'чеддер', 'parmesan', 'пармезан', 'gouda', 'гауда', 'swiss cheese'] },
  'cheese_soft': { min: 200, max: 320, typical: 260, keywords: ['mozzarella', 'моцарелла', 'feta', 'фета', 'brie', 'бри', 'cottage', 'творог'] },
  'cream': { min: 200, max: 350, typical: 290, keywords: ['cream', 'сливки', 'sour cream', 'сметана'] },
  'butter': { min: 700, max: 750, typical: 717, keywords: ['butter', 'масло сливочное'] },

  // Grains & Carbs (COOKED values)
  'rice_cooked': { min: 110, max: 150, typical: 130, keywords: ['rice', 'рис', 'cooked rice', 'варёный рис'] },
  'pasta_cooked': { min: 120, max: 160, typical: 140, keywords: ['pasta', 'паста', 'макароны', 'spaghetti', 'спагетти', 'noodle', 'лапша'] },
  'buckwheat_cooked': { min: 90, max: 120, typical: 100, keywords: ['buckwheat', 'гречка', 'гречневая каша'] },
  'oatmeal_cooked': { min: 60, max: 90, typical: 70, keywords: ['oatmeal', 'овсянка', 'porridge', 'каша овсяная'] },
  'bread': { min: 240, max: 300, typical: 265, keywords: ['bread', 'хлеб', 'toast', 'тост', 'baguette', 'багет'] },
  'croissant': { min: 380, max: 450, typical: 406, keywords: ['croissant', 'круассан'] },

  // Fats & Oils
  'oil': { min: 850, max: 900, typical: 884, keywords: ['oil', 'масло растительное', 'olive oil', 'оливковое масло', 'sunflower', 'подсолнечное'] },
  'mayonnaise': { min: 600, max: 750, typical: 680, keywords: ['mayo', 'майонез', 'mayonnaise'] },

  // Sweets & Desserts
  'chocolate': { min: 500, max: 600, typical: 545, keywords: ['chocolate', 'шоколад', 'chocolate bar'] },
  'chocolate_covered': { min: 180, max: 300, typical: 230, keywords: ['chocolate covered', 'в шоколаде', 'chocolate dipped'] },
  'ice_cream': { min: 180, max: 280, typical: 210, keywords: ['ice cream', 'мороженое'] },
  'cake': { min: 280, max: 450, typical: 350, keywords: ['cake', 'торт', 'пирожное'] },
  'cookie': { min: 400, max: 520, typical: 460, keywords: ['cookie', 'печенье', 'biscuit'] },
  'candy': { min: 350, max: 550, typical: 400, keywords: ['candy', 'конфета', 'sweet', 'сладость'] },
  'honey': { min: 300, max: 330, typical: 304, keywords: ['honey', 'мёд'] },
  'sugar': { min: 380, max: 400, typical: 387, keywords: ['sugar', 'сахар'] },

  // Drinks
  'water': { min: 0, max: 5, typical: 0, keywords: ['water', 'вода', 'sparkling water', 'газированная вода', 'mineral water'] },
  'coffee_black': { min: 0, max: 5, typical: 2, keywords: ['black coffee', 'чёрный кофе', 'espresso', 'эспрессо', 'americano', 'американо'] },
  'coffee_milk': { min: 30, max: 80, typical: 50, keywords: ['latte', 'латте', 'cappuccino', 'капучино', 'coffee with milk', 'кофе с молоком'] },
  'tea_plain': { min: 0, max: 5, typical: 1, keywords: ['tea', 'чай', 'green tea', 'зелёный чай', 'black tea', 'чёрный чай'] },
  'juice': { min: 35, max: 55, typical: 45, keywords: ['juice', 'сок', 'orange juice', 'апельсиновый сок', 'apple juice', 'яблочный сок'] },
  'soda': { min: 35, max: 50, typical: 42, keywords: ['soda', 'газировка', 'cola', 'кола', 'fanta', 'sprite', 'lemonade', 'лимонад'] },
  'smoothie': { min: 50, max: 100, typical: 70, keywords: ['smoothie', 'смузи'] },
  'beer': { min: 35, max: 55, typical: 43, keywords: ['beer', 'пиво'] },
  'wine': { min: 70, max: 90, typical: 83, keywords: ['wine', 'вино'] },

  // Sauces & Condiments
  'ketchup': { min: 90, max: 120, typical: 100, keywords: ['ketchup', 'кетчуп'] },
  'mustard': { min: 50, max: 80, typical: 66, keywords: ['mustard', 'горчица'] },
  'soy_sauce': { min: 50, max: 70, typical: 60, keywords: ['soy sauce', 'соевый соус'] },
  'salad_dressing': { min: 200, max: 500, typical: 350, keywords: ['dressing', 'заправка', 'vinaigrette', 'винегрет', 'ranch', 'caesar dressing'] },
  'tomato_sauce': { min: 25, max: 50, typical: 35, keywords: ['tomato sauce', 'томатный соус', 'marinara'] },
  'cream_sauce': { min: 150, max: 280, typical: 200, keywords: ['cream sauce', 'сливочный соус', 'alfredo', 'бешамель', 'bechamel'] },

  // Soups
  'soup_broth': { min: 10, max: 30, typical: 20, keywords: ['broth', 'бульон', 'consomme'] },
  'soup_vegetable': { min: 25, max: 60, typical: 40, keywords: ['vegetable soup', 'овощной суп', 'minestrone'] },
  'soup_cream': { min: 80, max: 180, typical: 120, keywords: ['cream soup', 'крем-суп', 'cream of', 'bisque'] },
  'soup_meat': { min: 40, max: 100, typical: 60, keywords: ['chicken soup', 'куриный суп', 'beef soup', 'борщ', 'borscht', 'щи'] },

  // Nuts & Seeds
  'nuts': { min: 550, max: 700, typical: 600, keywords: ['nut', 'орех', 'almond', 'миндаль', 'walnut', 'грецкий', 'peanut', 'арахис', 'cashew', 'кешью'] },
  'seeds': { min: 500, max: 600, typical: 550, keywords: ['seed', 'семечки', 'sunflower seed', 'подсолнечные семечки', 'pumpkin seed', 'тыквенные семечки'] },
};

// Minimum realistic portions by category
const MIN_PORTIONS: Record<string, number> = {
  'meat': 40,
  'fish': 40,
  'vegetable': 20,
  'fruit': 25,
  'grain': 30,
  'dairy': 15,
  'sauce': 10,
  'drink': 50,
  'soup': 100,
  'bread': 20,
  'egg': 40,
  'nut': 10,
  'dessert': 20,
  'other': 15,
};

// ============================================
// СЕРВИС ВАЛИДАЦИИ
// ============================================

@Injectable()
export class AnalysisValidatorService {
  private readonly logger = new Logger(AnalysisValidatorService.name);

  /**
   * Main validation entry point
   */
  validate(items: RawAnalyzedItem[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    const validatedItems: ValidatedItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemIssues: ValidationIssue[] = [];
      let currentItem = { ...item };

      // Layer 1: Non-food filter
      if (this.isNonFood(item.name)) {
        itemIssues.push({
          itemIndex: i,
          itemName: item.name,
          issueType: 'non_food',
          severity: 'error',
          message: `"${item.name}" is not food - removed from analysis`,
          originalValue: item,
          autoFixed: true,
        });
        continue; // Skip this item entirely
      }

      // Layer 2: Calorie validation
      const calorieValidation = this.validateCalories(currentItem, i);
      if (calorieValidation.issue) {
        itemIssues.push(calorieValidation.issue);
        if (calorieValidation.correctedItem) {
          currentItem = calorieValidation.correctedItem;
        }
      }

      // Layer 3: Portion validation
      const portionValidation = this.validatePortion(currentItem, i);
      if (portionValidation.issue) {
        itemIssues.push(portionValidation.issue);
        if (portionValidation.correctedItem) {
          currentItem = portionValidation.correctedItem;
        }
      }

      // Layer 4: Macro consistency
      const macroValidation = this.validateMacroConsistency(currentItem, i);
      if (macroValidation.issue) {
        itemIssues.push(macroValidation.issue);
        if (macroValidation.correctedItem) {
          currentItem = macroValidation.correctedItem;
        }
      }

      // Add validated item
      validatedItems.push({
        ...currentItem,
        wasValidated: true,
        validationIssues: itemIssues.map(iss => iss.message),
        originalValues: itemIssues.length > 0 ? {
          portion_g: item.portion_g,
          nutrients: { ...item.nutrients },
        } : undefined,
      });

      issues.push(...itemIssues);
    }

    // Calculate totals
    const totals = this.calculateTotals(validatedItems);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(validatedItems, issues);

    return {
      items: validatedItems,
      issues,
      overallConfidence,
      needsReview: overallConfidence < 0.7 || issues.some(i => i.severity === 'error' && !i.autoFixed),
      ...totals,
    };
  }

  /**
   * Check if item name indicates non-food
   */
  private isNonFood(name: string): boolean {
    const nameLower = name.toLowerCase();
    return NON_FOOD_KEYWORDS.some(keyword => nameLower.includes(keyword.toLowerCase()));
  }

  /**
   * Validate calories are within expected range for food type
   */
  private validateCalories(
    item: RawAnalyzedItem,
    index: number
  ): { issue?: ValidationIssue; correctedItem?: RawAnalyzedItem } {
    // BYPASS: Don't correct calories from trusted providers (USDA, OFF, Swiss)
    // Only apply corrections to generic estimates / fallback
    const trustedProviders = ['usda', 'openfoodfacts', 'swiss', 'hybrid'];
    if (item.hasNutrition && item.provider && trustedProviders.includes(item.provider)) {
      // Trust provider data - skip calorie range validation
      return {};
    }
    if (item.sourceInfo?.nutrients === 'provider') {
      // Provider data - skip validation
      return {};
    }

    const kcalPer100 = (item.nutrients.calories / item.portion_g) * 100;
    const nameLower = item.name.toLowerCase();

    // Find matching food category
    for (const [category, range] of Object.entries(CALORIE_RANGES)) {
      const matches = range.keywords.some(kw => nameLower.includes(kw.toLowerCase()));
      if (matches) {
        // Allow 30% tolerance
        const minAllowed = range.min * 0.7;
        const maxAllowed = range.max * 1.3;

        if (kcalPer100 < minAllowed || kcalPer100 > maxAllowed) {
          const correctedCalories = Math.round((range.typical * item.portion_g) / 100);

          return {
            issue: {
              itemIndex: index,
              itemName: item.name,
              issueType: 'impossible_calories',
              severity: 'warning',
              message: `${item.name}: ${kcalPer100.toFixed(0)} kcal/100g is outside expected range (${range.min}-${range.max}). Auto-corrected to ${range.typical} kcal/100g.`,
              originalValue: item.nutrients.calories,
              correctedValue: correctedCalories,
              autoFixed: true,
            },
            correctedItem: {
              ...item,
              nutrients: {
                ...item.nutrients,
                calories: correctedCalories,
              },
            },
          };
        }
        break;
      }
    }

    return {};
  }

  /**
   * Validate portion is realistic
   */
  private validatePortion(
    item: RawAnalyzedItem,
    index: number
  ): { issue?: ValidationIssue; correctedItem?: RawAnalyzedItem } {
    const category = this.detectFoodCategory(item.name);
    const minPortion = MIN_PORTIONS[category] || 15;

    if (item.portion_g < minPortion) {
      const scaleFactor = minPortion / item.portion_g;

      return {
        issue: {
          itemIndex: index,
          itemName: item.name,
          issueType: 'unrealistic_portion',
          severity: 'warning',
          message: `${item.name}: ${item.portion_g}g is unrealistically small. Minimum for ${category}: ${minPortion}g. Auto-corrected.`,
          originalValue: item.portion_g,
          correctedValue: minPortion,
          autoFixed: true,
        },
        correctedItem: {
          ...item,
          portion_g: minPortion,
          nutrients: {
            calories: Math.round(item.nutrients.calories * scaleFactor),
            protein: Math.round(item.nutrients.protein * scaleFactor * 10) / 10,
            carbs: Math.round(item.nutrients.carbs * scaleFactor * 10) / 10,
            fat: Math.round(item.nutrients.fat * scaleFactor * 10) / 10,
            fiber: item.nutrients.fiber ? Math.round(item.nutrients.fiber * scaleFactor * 10) / 10 : undefined,
          },
        },
      };
    }

    return {};
  }

  /**
   * Validate macro-calorie consistency
   */
  private validateMacroConsistency(
    item: RawAnalyzedItem,
    index: number
  ): { issue?: ValidationIssue; correctedItem?: RawAnalyzedItem } {
    const calculatedCal = (item.nutrients.protein * 4) + (item.nutrients.carbs * 4) + (item.nutrients.fat * 9);
    const reportedCal = item.nutrients.calories;
    const diff = Math.abs(calculatedCal - reportedCal);
    const tolerance = Math.max(30, reportedCal * 0.25); // 25% or 30 kcal

    if (reportedCal > 20 && diff > tolerance) {
      // Recalculate calories from macros
      const correctedCalories = Math.round(calculatedCal);

      return {
        issue: {
          itemIndex: index,
          itemName: item.name,
          issueType: 'macro_mismatch',
          severity: 'info',
          message: `${item.name}: Macros (P${item.nutrients.protein}×4 + C${item.nutrients.carbs}×4 + F${item.nutrients.fat}×9 = ${calculatedCal.toFixed(0)}) don't match calories (${reportedCal}). Using macro-calculated value.`,
          originalValue: reportedCal,
          correctedValue: correctedCalories,
          autoFixed: true,
        },
        correctedItem: {
          ...item,
          nutrients: {
            ...item.nutrients,
            calories: correctedCalories,
          },
        },
      };
    }

    return {};
  }

  /**
   * Detect food category from name
   */
  private detectFoodCategory(name: string): string {
    const nameLower = name.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
      'meat': ['chicken', 'beef', 'pork', 'lamb', 'cutlet', 'sausage', 'ham', 'bacon', 'курица', 'говядина', 'свинина', 'баранина', 'котлета', 'сосиска', 'ветчина', 'бекон', 'мясо'],
      'fish': ['fish', 'salmon', 'tuna', 'cod', 'shrimp', 'seafood', 'рыба', 'лосось', 'тунец', 'треска', 'креветка', 'морепродукты'],
      'vegetable': ['salad', 'carrot', 'tomato', 'cucumber', 'broccoli', 'cabbage', 'pepper', 'onion', 'салат', 'морковь', 'помидор', 'огурец', 'брокколи', 'капуста', 'перец', 'лук', 'овощ'],
      'fruit': ['apple', 'banana', 'orange', 'berry', 'grape', 'melon', 'яблоко', 'банан', 'апельсин', 'ягода', 'виноград', 'дыня', 'фрукт'],
      'grain': ['rice', 'pasta', 'bread', 'cereal', 'oat', 'buckwheat', 'рис', 'паста', 'хлеб', 'каша', 'овсянка', 'гречка', 'макароны'],
      'dairy': ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'молоко', 'сыр', 'йогурт', 'сливки', 'масло', 'творог', 'сметана'],
      'egg': ['egg', 'omelet', 'яйцо', 'омлет', 'яичница'],
      'soup': ['soup', 'broth', 'суп', 'бульон', 'борщ', 'щи'],
      'sauce': ['sauce', 'dressing', 'mayo', 'ketchup', 'соус', 'заправка', 'майонез', 'кетчуп'],
      'drink': ['coffee', 'tea', 'juice', 'water', 'milk', 'soda', 'кофе', 'чай', 'сок', 'вода', 'молоко', 'газировка', 'напиток'],
      'bread': ['bread', 'toast', 'bun', 'roll', 'хлеб', 'тост', 'булка', 'батон'],
      'nut': ['nut', 'almond', 'peanut', 'орех', 'миндаль', 'арахис', 'семечки'],
      'dessert': ['cake', 'cookie', 'chocolate', 'ice cream', 'candy', 'торт', 'печенье', 'шоколад', 'мороженое', 'конфета', 'десерт'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => nameLower.includes(kw))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Calculate total nutrition from validated items
   */
  private calculateTotals(items: ValidatedItem[]): {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  } {
    return items.reduce(
      (acc, item) => ({
        totalCalories: acc.totalCalories + item.nutrients.calories,
        totalProtein: acc.totalProtein + item.nutrients.protein,
        totalCarbs: acc.totalCarbs + item.nutrients.carbs,
        totalFat: acc.totalFat + item.nutrients.fat,
      }),
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
    );
  }

  /**
   * Calculate overall analysis confidence
   */
  private calculateOverallConfidence(items: ValidatedItem[], issues: ValidationIssue[]): number {
    if (items.length === 0) return 0;

    // Base confidence from items
    const avgItemConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / items.length;

    // Penalty for issues
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const penalty = (errorCount * 0.15) + (warningCount * 0.05);

    return Math.max(0, Math.min(1, avgItemConfidence - penalty));
  }

  // ============================================
  // POST-VALIDATION: Проверка данных после получения от AI/провайдеров
  // ============================================

  /**
   * Vegetable keywords for category detection
   */
  private readonly VEGETABLE_KEYWORDS = [
    'broccoli', 'брокколи',
    'cauliflower', 'цветная капуста',
    'zucchini', 'courgette', 'кабачок',
    'spinach', 'шпинат',
    'cabbage', 'капуста',
    'cucumber', 'огурец',
    'tomato', 'помидор', 'томат',
    'carrot', 'морковь',
    'pepper', 'перец',
    'eggplant', 'aubergine', 'баклажан',
    'lettuce', 'салат',
    'celery', 'сельдерей',
    'asparagus', 'спаржа',
    'green beans', 'стручковая фасоль',
  ];

  /**
   * Meat keywords for category detection - meat should have minimum 150 kcal/100g
   */
  private readonly MEAT_KEYWORDS = [
    'steak', 'стейк',
    'beef', 'говядина',
    'pork', 'свинина',
    'lamb', 'баранина', 'ягнёнок',
    'chicken', 'курица', 'куриц',
    'turkey', 'индейка',
    'duck', 'утка',
    'meat', 'мясо',
    'grilled', 'гриль', 'на гриле',
    'ribeye', 'рибай',
    'sirloin', 'филе',
    'tenderloin', 'вырезка',
    'cutlet', 'котлета',
    'schnitzel', 'шницель',
  ];

  /**
   * Check if item is meat based on name or category
   */
  private isMeat(name: string, category?: string): boolean {
    if (category === 'meat' || category === 'protein') {
      return true;
    }
    const nameLower = name.toLowerCase();
    return this.MEAT_KEYWORDS.some(kw => nameLower.includes(kw));
  }

  /**
   * Get calorie range for different meat/protein products.
   * Different meats have very different calorie densities.
   */
  private getMeatCalorieRange(name: string): { min: number; max: number; default: number } {
    const nameLower = name.toLowerCase();

    // Chicken breast — leanest meat (110-165 kcal/100g)
    if (nameLower.includes('chicken breast') || nameLower.includes('куриная грудка') ||
      nameLower.includes('грудка кур') || nameLower.includes('breast')) {
      return { min: 100, max: 180, default: 120 };
    }

    // Chicken general (with skin can be fattier)
    if (nameLower.includes('chicken') || nameLower.includes('курица') ||
      nameLower.includes('куриц') || nameLower.includes('курин')) {
      return { min: 100, max: 250, default: 150 };
    }

    // Turkey — lean
    if (nameLower.includes('turkey') || nameLower.includes('индейка') || nameLower.includes('индюш')) {
      return { min: 100, max: 200, default: 130 };
    }

    // Eggs (140-155 kcal/100g)
    if (nameLower.includes('egg') || nameLower.includes('яйц') ||
      nameLower.includes('пашот') || nameLower.includes('poach') ||
      nameLower.includes('омлет') || nameLower.includes('omelette') ||
      nameLower.includes('scrambled') || nameLower.includes('fried egg')) {
      return { min: 130, max: 200, default: 155 };
    }

    // Lean fish (cod, tuna, tilapia)
    if (nameLower.includes('cod') || nameLower.includes('треска') ||
      nameLower.includes('tuna') || nameLower.includes('тунец') ||
      nameLower.includes('tilapia') || nameLower.includes('минтай') ||
      nameLower.includes('haddock') || nameLower.includes('пикша')) {
      return { min: 70, max: 150, default: 100 };
    }

    // Fatty fish (salmon, mackerel, herring)
    if (nameLower.includes('salmon') || nameLower.includes('лосось') || nameLower.includes('сёмга') ||
      nameLower.includes('mackerel') || nameLower.includes('скумбрия') ||
      nameLower.includes('herring') || nameLower.includes('сельдь')) {
      return { min: 150, max: 280, default: 200 };
    }

    // Fish general
    if (nameLower.includes('fish') || nameLower.includes('рыба') || nameLower.includes('рыб')) {
      return { min: 80, max: 250, default: 130 };
    }

    // Seafood (shrimp, squid — low calorie)
    if (nameLower.includes('shrimp') || nameLower.includes('креветк') ||
      nameLower.includes('squid') || nameLower.includes('кальмар') ||
      nameLower.includes('prawn') || nameLower.includes('seafood')) {
      return { min: 70, max: 150, default: 100 };
    }

    // Lean beef
    if (nameLower.includes('beef tenderloin') || nameLower.includes('говяжья вырезка') ||
      nameLower.includes('lean beef') || nameLower.includes('нежирная говядина')) {
      return { min: 140, max: 220, default: 180 };
    }

    // Beef general / steak
    if (nameLower.includes('beef') || nameLower.includes('говядин') ||
      nameLower.includes('steak') || nameLower.includes('стейк')) {
      return { min: 150, max: 330, default: 220 };
    }

    // Pork (fattier)
    if (nameLower.includes('pork') || nameLower.includes('свинин')) {
      return { min: 180, max: 400, default: 260 };
    }

    // Bacon (very fatty)
    if (nameLower.includes('bacon') || nameLower.includes('бекон')) {
      return { min: 400, max: 550, default: 450 };
    }

    // Sausage / frankfurters
    if (nameLower.includes('sausage') || nameLower.includes('колбас') ||
      nameLower.includes('сосиск') || nameLower.includes('wiener') ||
      nameLower.includes('frankfurter')) {
      return { min: 250, max: 400, default: 300 };
    }

    // Lamb
    if (nameLower.includes('lamb') || nameLower.includes('баранин') || nameLower.includes('ягнят')) {
      return { min: 180, max: 350, default: 250 };
    }

    // Duck (fatty)
    if (nameLower.includes('duck') || nameLower.includes('утк') || nameLower.includes('утин')) {
      return { min: 200, max: 400, default: 280 };
    }

    // Default — average meat
    return { min: 120, max: 350, default: 180 };
  }

  /**
   * Check if item is a vegetable based on name or category
   */
  private isVegetable(name: string, category?: string): boolean {
    if (category === 'veg' || category === 'vegetable') {
      return true;
    }
    const nameLower = name.toLowerCase();
    return this.VEGETABLE_KEYWORDS.some(kw => nameLower.includes(kw));
  }

  /**
   * Validate and correct nutrition data after receiving from AI/providers
   * 
   * Checks:
   * 1. Minimum calories (10 kcal/100g for any food) - SKIPPED for provider data
   * 2. Vegetable-specific calorie range (20-60 kcal/100g) - DISABLED (caused issues with garlic, avocado)
   * 3. Macro formula verification - only WARNS for provider data, doesn't correct
   * 
   * FIX #4: Provider data is trusted - only sanitize obvious errors (negative, NaN)
   */

  // High-calorie "vegetables" that should NOT be corrected by vegetable range rules
  // These are often misclassified by Vision but have legitimately high calories per 100g
  private readonly HIGH_CALORIE_VEG_WHITELIST = new Set([
    // EN
    'garlic', 'avocado', 'olive', 'coconut', 'nut', 'almond', 'walnut', 'cashew',
    'pistachio', 'peanut', 'seed', 'sesame', 'sunflower', 'pumpkin seed', 'chia',
    'hummus', 'tahini', 'pesto', 'guacamole',
    // RU
    'чеснок', 'авокадо', 'оливк', 'кокос', 'орех', 'миндаль', 'грецк', 'кешью',
    'фисташк', 'арахис', 'семечк', 'семен', 'кунжут', 'тыквенн', 'чиа',
    'хумус', 'тахин', 'песто', 'гуакамоле',
    // KK (common borrowings)
    'сарымсақ', 'авокадо', 'жаңғақ',
  ]);

  private isHighCalorieVegetable(name: string): boolean {
    const nameLower = name.toLowerCase();
    return Array.from(this.HIGH_CALORIE_VEG_WHITELIST).some(kw => nameLower.includes(kw));
  }

  validateNutritionData(input: {
    name: string;
    portion_g: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    category?: string;
    // FIX #4: Source of nutrition data - if 'provider', trust the data more
    source?: 'vision' | 'provider' | 'hybrid' | 'gpt' | string;
  }): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    wasModified: boolean;
    corrections: Array<{
      field: string;
      originalValue: number;
      correctedValue: number;
      reason: string;
    }>;
    // NEW: Additional flags for transparency
    derivedCalories?: number; // Calories calculated from macros
    macroMismatch?: boolean; // True if calories don't match P*4+C*4+F*9
  } {
    const corrections: Array<{
      field: string;
      originalValue: number;
      correctedValue: number;
      reason: string;
    }> = [];

    let { calories, protein, carbs, fat, fiber } = input;
    const { name, portion_g, category, source } = input;

    // Skip validation for zero portion
    if (portion_g <= 0) {
      return { calories, protein, carbs, fat, fiber, wasModified: false, corrections };
    }

    // ============================================
    // FIX #4: PROVIDER DATA TRUST MODE
    // ============================================
    // If data comes from trusted provider, only sanitize obvious errors
    const trustedProviders = ['usda', 'openfoodfacts', 'swiss', 'hybrid', 'provider'];
    const isProviderData = source && trustedProviders.includes(source.toLowerCase());

    if (isProviderData) {
      // Only fix critical issues: negative values, NaN
      const sanitizedCalories = Math.max(0, Number.isNaN(calories) ? 0 : calories);
      const sanitizedProtein = Math.max(0, Number.isNaN(protein) ? 0 : protein);
      const sanitizedCarbs = Math.max(0, Number.isNaN(carbs) ? 0 : carbs);
      const sanitizedFat = Math.max(0, Number.isNaN(fat) ? 0 : fat);
      const sanitizedFiber = fiber !== undefined ? Math.max(0, Number.isNaN(fiber) ? 0 : fiber) : undefined;

      // Calculate derived calories for transparency
      const derivedCalories = Math.round(sanitizedProtein * 4 + sanitizedCarbs * 4 + sanitizedFat * 9);
      const macroMismatch = sanitizedCalories > 10 && Math.abs(sanitizedCalories - derivedCalories) > sanitizedCalories * 0.25;

      // Log if there's a big mismatch but DON'T correct it
      if (macroMismatch) {
        this.logger.debug(`[NutritionValidator] Provider data macro mismatch (not corrected)`, {
          name,
          source,
          reportedKcal: sanitizedCalories,
          derivedKcal: derivedCalories,
          diff: Math.abs(sanitizedCalories - derivedCalories),
        });
      }

      // Track if we made any sanitization
      const wasSanitized =
        calories !== sanitizedCalories ||
        protein !== sanitizedProtein ||
        carbs !== sanitizedCarbs ||
        fat !== sanitizedFat;

      return {
        calories: sanitizedCalories,
        protein: sanitizedProtein,
        carbs: sanitizedCarbs,
        fat: sanitizedFat,
        fiber: sanitizedFiber,
        wasModified: wasSanitized,
        corrections: wasSanitized ? [{ field: 'multiple', originalValue: calories, correctedValue: sanitizedCalories, reason: 'sanitized_negative_or_nan' }] : [],
        derivedCalories,
        macroMismatch,
      };
    }

    // ============================================
    // NON-PROVIDER PATH: Apply stricter corrections (Vision/GPT estimates)
    // ============================================
    const kcalPer100g = (calories / portion_g) * 100;
    const isVeg = this.isVegetable(name, category);
    const isHighCalVeg = this.isHighCalorieVegetable(name);

    // ============================================
    // CHECK 1: Minimum calories (10 kcal/100g)
    // ============================================
    const MIN_KCAL_PER_100G = 10;
    const minExpectedKcal = (MIN_KCAL_PER_100G * portion_g) / 100;

    if (calories < minExpectedKcal && calories >= 0) {
      // For vegetables, use 35 kcal/100g as default
      // For other foods, use minimum 10 kcal/100g
      const defaultKcalPer100g = isVeg ? 35 : MIN_KCAL_PER_100G;
      const correctedCalories = Math.round((defaultKcalPer100g * portion_g) / 100);

      corrections.push({
        field: 'calories',
        originalValue: calories,
        correctedValue: correctedCalories,
        reason: `kcal_below_minimum: ${kcalPer100g.toFixed(1)} kcal/100g < ${MIN_KCAL_PER_100G} minimum`,
      });

      this.logger.warn(`[NutritionValidator] Corrected low calories`, {
        name,
        portion_g,
        was: calories,
        now: correctedCalories,
        reason: 'kcal below minimum threshold',
      });

      calories = correctedCalories;
    }

    // ============================================
    // CHECK 2: Vegetable-specific range (20-60 kcal/100g)
    // DISABLED FOR HIGH-CALORIE VEGETABLES (garlic, avocado, nuts, etc.)
    // This rule was incorrectly capping calories for legitimate high-calorie items
    // ============================================
    if (isVeg && !isHighCalVeg) {
      const VEG_MIN_KCAL = 20;
      const VEG_MAX_KCAL = 60;
      const VEG_DEFAULT_KCAL = 35;
      const currentKcalPer100g = (calories / portion_g) * 100;

      if (currentKcalPer100g < VEG_MIN_KCAL || currentKcalPer100g > VEG_MAX_KCAL) {
        const correctedCalories = Math.round((VEG_DEFAULT_KCAL * portion_g) / 100);

        corrections.push({
          field: 'calories',
          originalValue: calories,
          correctedValue: correctedCalories,
          reason: `vegetable_kcal_out_of_range: ${currentKcalPer100g.toFixed(1)} kcal/100g not in [${VEG_MIN_KCAL}-${VEG_MAX_KCAL}]`,
        });

        this.logger.warn(`[NutritionValidator] Corrected vegetable calories`, {
          name,
          portion_g,
          was: calories,
          wasPer100g: currentKcalPer100g.toFixed(1),
          now: correctedCalories,
          nowPer100g: VEG_DEFAULT_KCAL,
          reason: 'vegetable calories out of expected range (not in high-cal whitelist)',
        });

        calories = correctedCalories;
      }
    } else if (isHighCalVeg) {
      this.logger.debug(`[NutritionValidator] Skipping vegetable range check for high-calorie item: ${name}`);
    }

    // ============================================
    // CHECK 3: Macro formula verification (P*4 + C*4 + F*9 ≈ kcal)
    // ============================================
    const calculatedKcal = Math.round(protein * 4 + carbs * 4 + fat * 9);
    const TOLERANCE_PERCENT = 0.15; // 15% tolerance

    if (calories > 10) { // Only check if calories are significant
      const diff = Math.abs(calculatedKcal - calories);
      const tolerance = Math.max(10, calories * TOLERANCE_PERCENT);

      if (diff > tolerance && calculatedKcal > 0) {
        corrections.push({
          field: 'calories',
          originalValue: calories,
          correctedValue: calculatedKcal,
          reason: `macro_formula_mismatch: reported=${calories}, calculated=${calculatedKcal} (P${protein}*4 + C${carbs}*4 + F${fat}*9)`,
        });

        this.logger.warn(`[NutritionValidator] Corrected macro-calorie mismatch`, {
          name,
          portion_g,
          was: calories,
          now: calculatedKcal,
          protein,
          carbs,
          fat,
          reason: 'macro formula mismatch > 15%',
        });

        calories = calculatedKcal;
      }
    }

    // ============================================
    // CHECK 4: Meat-specific range (150-350 kcal/100g)
    // Meat products should never be less than 150 kcal/100g
    // ============================================
    const isMeatProduct = this.isMeat(name, category);
    if (isMeatProduct) {
      const range = this.getMeatCalorieRange(name);
      const currentKcalPer100g = (calories / portion_g) * 100;

      if (currentKcalPer100g < range.min) {
        const correctedCalories = Math.round((range.default * portion_g) / 100);
        corrections.push({
          field: 'calories',
          originalValue: calories,
          correctedValue: correctedCalories,
          reason: `meat_kcal_too_low: ${currentKcalPer100g.toFixed(1)} kcal/100g < ${range.min} minimum`,
        });
        this.logger.warn(`[NutritionValidator] Corrected meat calories - was too low`, {
          name,
          portion_g,
          was: calories,
          wasPerv100g: currentKcalPer100g.toFixed(1),
          now: correctedCalories,
          nowPer100g: range.default,
          reason: 'meat calories below minimum threshold',
        });
        calories = correctedCalories;
      } else if (currentKcalPer100g > range.max) {
        const correctedCalories = Math.round((range.max * portion_g) / 100);
        corrections.push({
          field: 'calories',
          originalValue: calories,
          correctedValue: correctedCalories,
          reason: `meat_kcal_too_high: ${currentKcalPer100g.toFixed(1)} kcal/100g > ${range.max} maximum`,
        });
        this.logger.warn(`[NutritionValidator] Corrected meat calories - was too high`, {
          name,
          portion_g,
          was: calories,
          wasPerv100g: currentKcalPer100g.toFixed(1),
          now: correctedCalories,
          nowPer100g: range.max,
        });
        calories = correctedCalories;
      }
    }

    return {
      calories,
      protein,
      carbs,
      fat,
      fiber,
      wasModified: corrections.length > 0,
      corrections,
    };
  }
}

