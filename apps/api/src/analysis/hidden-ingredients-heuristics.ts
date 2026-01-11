/**
 * Heuristics and canonical values for hidden ingredients
 */

import { HiddenIngredientEstimate, HiddenIngredientCategory } from './analysis.types';
import { AnalyzedItem } from './analysis.types';

export const CANONICAL_HIDDEN_INGREDIENTS = {
  // STEP 5: Added 5g oil for grilled items (configurable via GRILLED_OIL_GRAMS env)
  cooking_oil_5g: {
    name: 'Cooking oil (approx. 5 g)',
    category: 'cooking_oil' as HiddenIngredientCategory,
    calories: 45, // 9 kcal * ~5g
    protein: 0,
    carbs: 0,
    fat: 5,
  },
  cooking_oil_10g: {
    name: 'Cooking oil (approx. 10 g)',
    category: 'cooking_oil' as HiddenIngredientCategory,
    calories: 90, // 9 kcal * ~10g
    protein: 0,
    carbs: 0,
    fat: 10,
  },
  cooking_oil_15g: {
    name: 'Cooking oil (approx. 15 g)',
    category: 'cooking_oil' as HiddenIngredientCategory,
    calories: 135,
    protein: 0,
    carbs: 0,
    fat: 15,
  },
  salad_dressing_10g: {
    name: 'Salad dressing (approx. 10 g)',
    category: 'sauce_or_dressing' as HiddenIngredientCategory,
    calories: 60,
    protein: 0,
    carbs: 2,
    fat: 6,
  },
  added_sugar_10g: {
    name: 'Added sugar (approx. 10 g)',
    category: 'added_sugar' as HiddenIngredientCategory,
    calories: 40,
    protein: 0,
    carbs: 10,
    fat: 0,
  },
  cream_or_butter_10g: {
    name: 'Butter/cream (approx. 10 g)',
    category: 'butter_or_cream' as HiddenIngredientCategory,
    calories: 75,
    protein: 0,
    carbs: 0,
    fat: 8.3,
  },
};

/**
 * Apply hidden ingredients heuristics to an analyzed item
 */
export function applyHiddenIngredientsHeuristics(
  item: AnalyzedItem,
  globalHiddenFromVision: HiddenIngredientEstimate[] = [],
): AnalyzedItem {
  const hidden: HiddenIngredientEstimate[] = [];

  const hints = item.cookingMethodHints || {};
  const tags: string[] = (item as any).tags || [];

  // 1) ЖАРЕНАЯ ЕДА (fried, deep_fried)
  if (
    hints.method === 'fried' ||
    hints.method === 'deep_fried' ||
    tags.includes('fried') ||
    tags.includes('deep_fried')
  ) {
    const portion = item.portion_g || 0;

    let canonical;
    if (portion <= 80) canonical = CANONICAL_HIDDEN_INGREDIENTS.cooking_oil_10g;
    else if (portion <= 200) canonical = CANONICAL_HIDDEN_INGREDIENTS.cooking_oil_15g;
    else canonical = CANONICAL_HIDDEN_INGREDIENTS.cooking_oil_15g;

    hidden.push({
      name: canonical.name,
      category: canonical.category,
      reason: hints.method === 'deep_fried' ? 'deep_fried' : 'fried_pan',
      confidence: 0.8,
      estimated_grams: canonical.fat, // грубо: граммы жира ≈ грамм масла
      calories: canonical.calories,
      protein: canonical.protein,
      carbs: canonical.carbs,
      fat: canonical.fat,
    });
  }

  // STEP 5: GRILLED items get small amount of oil (5g default, configurable)
  if (
    hints.method === 'grilled' ||
    tags.includes('grilled') ||
    tags.includes('bbq')
  ) {
    // Use env variable or default 5g
    const grilledOilGrams = parseInt(process.env.GRILLED_OIL_GRAMS || '5', 10);
    const canonical = CANONICAL_HIDDEN_INGREDIENTS.cooking_oil_5g;
    const scale = grilledOilGrams / 5; // scale to env setting

    hidden.push({
      name: `Cooking oil (approx. ${grilledOilGrams} g)`,
      category: canonical.category,
      reason: 'grilled',
      confidence: 0.6, // Lower confidence than fried
      estimated_grams: grilledOilGrams,
      calories: canonical.calories * scale,
      protein: 0,
      carbs: 0,
      fat: canonical.fat * scale,
      isHiddenIngredient: true,
    } as HiddenIngredientEstimate);
  }

  // 2) САЛАТ С ЗАПРАВКОЙ / СОУСОМ
  if (
    hints.hasSauceOrDressing ||
    tags.includes('salad_with_dressing') ||
    tags.includes('creamy_sauce')
  ) {
    const canonical = CANONICAL_HIDDEN_INGREDIENTS.salad_dressing_10g;

    hidden.push({
      name: canonical.name,
      category: canonical.category,
      reason: 'salad_with_dressing',
      confidence: 0.7,
      estimated_grams: 10,
      calories: canonical.calories,
      protein: canonical.protein,
      carbs: canonical.carbs,
      fat: canonical.fat,
    });
  }

  // 3) СЛАДКИЕ ДЕСЕРТЫ / НАПИТКИ
  if (
    hints.looksSugary ||
    tags.includes('sweet_dessert') ||
    tags.includes('sugary_drink')
  ) {
    const canonical = CANONICAL_HIDDEN_INGREDIENTS.added_sugar_10g;

    hidden.push({
      name: canonical.name,
      category: canonical.category,
      reason: 'added_sugar',
      confidence: 0.7,
      estimated_grams: 10,
      calories: canonical.calories,
      protein: canonical.protein,
      carbs: canonical.carbs,
      fat: canonical.fat,
    });
  }

  // 4) СЛИВКИ/МАСЛО (пюре, сливочные соусы, каша)
  if (hints.hasCreamOrButter || tags.includes('creamy')) {
    const canonical = CANONICAL_HIDDEN_INGREDIENTS.cream_or_butter_10g;

    hidden.push({
      name: canonical.name,
      category: canonical.category,
      reason: 'cream_or_butter',
      confidence: 0.7,
      estimated_grams: 10,
      calories: canonical.calories,
      protein: canonical.protein,
      carbs: canonical.carbs,
      fat: canonical.fat,
    });
  }

  // 5) Дополнительно — мержим подсказки от Vision
  for (const h of globalHiddenFromVision) {
    const canonicalKey =
      h.category === 'cooking_oil'
        ? 'cooking_oil_10g'
        : h.category === 'sauce_or_dressing'
          ? 'salad_dressing_10g'
          : h.category === 'added_sugar'
            ? 'added_sugar_10g'
            : h.category === 'butter_or_cream'
              ? 'cream_or_butter_10g'
              : null;

    if (!canonicalKey) {
      continue;
    }

    const canonical = (CANONICAL_HIDDEN_INGREDIENTS as any)[canonicalKey];
    if (!canonical) continue;

    const scale = h.estimated_grams && h.estimated_grams > 0 ? h.estimated_grams / 10 : 1;

    hidden.push({
      name: h.name || canonical.name,
      category: h.category,
      reason: h.reason,
      confidence: h.confidence ?? 0.7,
      estimated_grams: h.estimated_grams || 10,
      calories: canonical.calories * scale,
      protein: canonical.protein * scale,
      carbs: canonical.carbs * scale,
      fat: canonical.fat * scale,
    });
  }

  if (!hidden.length) {
    return item;
  }

  // Подмешиваем скрытые ингредиенты в item
  const totalExtraCalories = hidden.reduce((sum, h) => sum + (h.calories || 0), 0);
  const totalExtraProtein = hidden.reduce((sum, h) => sum + (h.protein || 0), 0);
  const totalExtraCarbs = hidden.reduce((sum, h) => sum + (h.carbs || 0), 0);
  const totalExtraFat = hidden.reduce((sum, h) => sum + (h.fat || 0), 0);

  return {
    ...item,
    nutrients: {
      ...item.nutrients,
      calories: (item.nutrients.calories || 0) + totalExtraCalories,
      protein: (item.nutrients.protein || 0) + totalExtraProtein,
      carbs: (item.nutrients.carbs || 0) + totalExtraCarbs,
      fat: (item.nutrients.fat || 0) + totalExtraFat,
    },
    hiddenIngredients: [...(item.hiddenIngredients || []), ...hidden],
    includesHiddenIngredientsInMacros: true,
  };
}

