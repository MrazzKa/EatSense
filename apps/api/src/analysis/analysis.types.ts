/**
 * Unified data model for food analysis pipeline
 */

export interface Nutrients {
  // Per-portion nutrients (main fields kept required for internal calculations)
  calories: number;  // ккал per portion
  protein: number;   // g per portion
  carbs: number;     // g per portion
  fat: number;       // g per portion
  fiber: number;
  sugars: number;
  satFat: number;
  energyDensity: number; // kcal / 100g
  // Allow additional numeric nutrients by key without breaking typing
  [key: string]: number | undefined;
}

export type HiddenIngredientCategory =
  | 'cooking_oil'
  | 'butter_or_cream'
  | 'sauce_or_dressing'
  | 'added_sugar'
  | 'breaded_or_batter'
  | 'processed_meat_fillers'
  | 'other';

export interface HiddenIngredientEstimate {
  /** Человекочитаемое название: "Оливковое масло", "Салатная заправка", "Добавленный сахар" */
  name: string;
  /** Категория для логики и UI */
  category: HiddenIngredientCategory;
  /** Краткое объяснение, почему мы добавили этот ингредиент */
  reason: string; // "fried_pan", "deep_fried", "salad_with_dressing", "sweet_drink", ...
  /** Оценка уверенности (0-1) */
  confidence: number;
  /** Оценка массы скрытого ингредиента (в граммах) — не обязательно 100% точная */
  estimated_grams: number;
  /** Оценка КБЖУ, которые добавляет этот ингредиент */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AnalyzedItem {
  /** Stable unique ID (uuid) - persists through entire pipeline */
  id: string;
  // Localized display name for UI (short, in user's locale)
  name: string;
  // Normalized English base name (for FDC / internal logic)
  originalName?: string;
  // Original raw label from Vision / source
  label?: string;
  portion_g: number;   // фактический вес порции в граммах
  nutrients: Nutrients;
  source: 'fdc' | 'vision_fallback' | 'manual' | 'canonical_water' | 'canonical_plain_coffee' | 'canonical_plain_tea' | 'canonical_milk_coffee_fallback' | 'unknown_drink_low_calorie_fallback' | 'usda' | 'swiss' | 'openfoodfacts' | 'rag' | 'eurofir' | 'reanalysis' | 'canonical_beverage' | 'hidden_ingredient' | 'gpt_trusted';
  fdcId?: string | number;
  fdcScore?: number;
  dataType?: string;   // USDA dataType (Branded, Foundation, etc.)
  // Locale used for localization (optional, for debug)
  locale?: 'en' | 'ru' | 'kk';
  // Flag indicating if nutrition data is available (false = no data, show "No nutrition data")
  hasNutrition?: boolean;
  /** Food category from Vision or provider */
  category?: 'protein' | 'grain' | 'veg' | 'fruit' | 'fat' | 'seeds' | 'spice' | 'sauce' | 'drink' | 'dairy' | 'other';
  /** Confidence score from Vision/provider (0-1) */
  confidence?: number;
  /** Provider that supplied nutrition data */
  provider?: 'usda' | 'openfoodfacts' | 'swiss' | 'vision' | 'hybrid' | 'gpt' | 'unknown';
  /** Flag if this item has suspicious/implausible nutrition values */
  isSuspicious?: boolean;
  /** Flag if Vision fallback was used (provider match rejected) */
  isFallback?: boolean;
  /** Detailed source information for transparency */
  sourceInfo?: {
    /** Where the display name came from */
    name: 'vision' | 'provider';
    /** Where the nutrients came from */
    nutrients: 'vision' | 'provider' | 'derived';
    /** Provider ID if from provider */
    providerId?: string;
    /** Reason for fallback if isFallback=true */
    fallbackReason?: string;
  };
  // Manual edits by user:
  userEditedName?: string;      // If user renamed component (e.g., "рис" → "рыба хе")
  userEditedPortionG?: number;  // If user changed portion
  wasManuallyEdited?: boolean;  // Flag that this item was manually edited
  /** Список скрытых ингредиентов, которые мы добавили к этому элементу (масло, соусы, сахар и т.п.) */
  hiddenIngredients?: HiddenIngredientEstimate[];
  /** 
   * Флаг, что макросы/калории для этого элемента уже включают hiddenIngredients.
   * Нужен, чтобы не посчитать их ещё раз где-то выше.
   */
  includesHiddenIngredientsInMacros?: boolean;
  /** Дополнительные подсказки от модели Vision */
  cookingMethodHints?: {
    method?: 'fried' | 'deep_fried' | 'baked' | 'grilled' | 'boiled' | 'steamed' | 'raw' | 'mixed';
    hasVisibleOil?: boolean;
    hasCreamOrButter?: boolean;
    hasSauceOrDressing?: boolean;
    looksSugary?: boolean;
    hasBreadingOrBatter?: boolean;
  };
}

export interface AnalysisTotals extends Nutrients {
  // Total grams for the whole analysis
  portion_g: number;
  // Alias for external naming if needed
  weight?: number;
}

export type HealthScoreLevel = 'poor' | 'average' | 'good' | 'excellent';

export interface HealthScoreFactors {
  protein: number;        // 0–100
  fiber: number;          // 0–100
  saturatedFat: number;   // 0–100 (чем меньше сат.жир, тем выше субскор)
  sugars: number;         // 0–100 (чем меньше сахара, тем выше субскор)
  energyDensity: number;  // 0–100 (чем ниже калорийность на грамм, тем выше субскор)
}

export type HealthFeedbackType = 'positive' | 'warning';

export interface HealthFeedbackItem {
  type: HealthFeedbackType;
  code: string;        // machine-readable code, например "high_protein", "too_much_sugar"
  message: string;     // локализованное сообщение
}

export interface HealthScore {
  total: number;                // 0–100 (renamed from score for clarity)
  level: HealthScoreLevel;      // poor | average | good | excellent
  factors: HealthScoreFactors;
  // Legacy fields for backward compatibility
  score?: number;                // alias for total
  grade?: string;                // A, B, C, D, F (derived from total)
  label?: string;
  // New feedback format
  feedback?: HealthFeedbackItem[];
  // Legacy feedback format (string[]) - kept for backward compatibility
  feedbackLegacy?: string[];
  // Additional fields to align with high-level spec
  category?: string;
  message?: string;
  details?: any;
}

export interface AnalysisNutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugars_g: number;
  saturatedFat_g: number;
  portion_g: number; // общий вес блюда
}

export type AnalysisSanityIssueType =
  | 'portion_too_small'
  | 'portion_too_large'
  | 'calories_per_gram_out_of_range'
  | 'macro_kcal_mismatch'
  | 'zero_calories_nonzero_portion'
  | 'suspicious_energy_density';

export type AnalysisSanityLevel = 'warning' | 'error';

export interface AnalysisSanityIssue {
  type: AnalysisSanityIssueType;
  level: AnalysisSanityLevel;
  message: string;
  itemIndex?: number;
  itemName?: string;
}

export interface AnalysisDebugComponentEntry {
  type:
  | 'matched'
  | 'no_match'
  | 'low_score'
  | 'no_overlap'
  | 'food_not_found'
  | 'vision_fallback'
  | 'portion_clamped'
  | 'weight_provenance'; // STEP 3: Added for weight tracking
  vision?: any;
  bestMatch?: any;
  score?: number;
  componentName?: string;
  originalPortionG?: number;
  finalPortionG?: number;
  // Optional debug fields / extension data
  reason?: string;
  error?: string;
  message?: string;
  [key: string]: any;
}

export interface AnalysisDebug {
  componentsRaw?: any[];  // raw Vision components
  components?: AnalysisDebugComponentEntry[];
  sanity?: AnalysisSanityIssue[];
  timestamp: string;
  model?: string;
  hiddenIngredients?: any[];
}

// Food Compatibility Types
export type FoodCompatibilitySeverity = 'low' | 'medium' | 'high';

export type FoodCompatibilityScoreLabel =
  | 'excellent'
  | 'good'
  | 'moderate'
  | 'problematic';

export interface FoodCompatibilityIssue {
  /** Машинный код правила: нужен для отладки и локализации на фронте */
  code:
  | 'sugar_plus_saturated_fat'
  | 'very_high_energy_density'
  | 'low_fiber_high_carbs'
  | 'low_protein_meal'
  | 'heavy_evening_meal'
  | 'too_many_processed_meats'
  | 'too_many_refined_carbs'
  | 'other';
  severity: FoodCompatibilitySeverity;
  /** Краткий заголовок на английском. На фронте можно локализовать по code. */
  title: string;
  /** Более подробное объяснение, почему это потенциальная проблема. */
  description: string;
  /** Практический совет: что можно улучшить. */
  advice: string;
  /** Какие компоненты/ингредиенты особенно участвуют в этой проблеме (по именам блюд). */
  relatedItems?: string[];
}

export interface FoodCompatibilityPositiveHighlight {
  code:
  | 'good_protein_fiber_balance'
  | 'moderate_energy_density'
  | 'low_sugar'
  | 'whole_grains'
  | 'good_veggie_portion'
  | 'balanced_macros'
  | 'other';
  title: string;
  description: string;
  relatedItems?: string[];
}

export interface FoodCompatibilityScore {
  /** 0–100, чем выше — тем более "здоровое" сочетание компонентов */
  value: number;
  label: FoodCompatibilityScoreLabel;
  /** Основные причины, почему score такой */
  reasons: string[];
}

export interface FoodCompatibilityResult {
  score: FoodCompatibilityScore;
  positives: FoodCompatibilityPositiveHighlight[];
  issues: FoodCompatibilityIssue[];
}

// Carcinogenic Risk Types
export type CarcinogenicRiskLevel = 'none' | 'low' | 'moderate' | 'high';

export interface ItemCarcinogenRisk {
  /** Имя ингредиента/компонента */
  itemName: string;
  /** Уровень риска для данного продукта */
  level: CarcinogenicRiskLevel;
  /** Краткие машинные причины (коды правил) */
  reasonCodes: string[];
  /** Человекочитаемые пояснения (на англ., на фронте можно локализовать по code) */
  reasons: string[];
  /** Теги, по которым продукт попал в "риск" (processed_meat, fried и т.д.) */
  tags: string[];
}

export interface CarcinogenicRiskSummary {
  /** Итоговый уровень риска для всего блюда */
  level: CarcinogenicRiskLevel;
  /** Числовой score 0–100, где выше — больше риска */
  score: number;
  /** Основные причины на уровне блюда (коды правил) */
  reasonCodes: string[];
  /** Краткое текстовое объяснение на английском */
  summaryText: string;
  /** Дисклеймер, что это образовательная оценка, а не диагноз */
  disclaimer: string;
}

export interface CarcinogenicRiskResult {
  summary: CarcinogenicRiskSummary;
  highRiskItems: ItemCarcinogenRisk[];
}

export interface AnalysisData {
  items: AnalyzedItem[];
  total: AnalysisTotals;
  healthScore: HealthScore | null;
  debug?: AnalysisDebug; // опциональный блок для логов
  isSuspicious?: boolean; // флаг сомнительных результатов
  needsReview?: boolean; // флаг: все макросы нулевые или анализ не уверен
  // Preferred locale used during analysis / localization
  locale?: 'en' | 'ru' | 'kk';
  
  // =====================================================
  // DISH NAME FIELDS (STEP 2: Stabilized naming)
  // =====================================================
  // displayName: Ready-to-use localized name for UI (PREFERRED)
  // Frontend should use this field directly without additional processing
  displayName?: string;
  // Localized dish name for UI (short, in user's locale) - alias for displayName
  dishNameLocalized?: string;
  // Normalized English dish name base (for internal use)
  originalDishName?: string;
  // Source of the dish name: 'vision' (from OpenAI), 'generated' (from items), 'neutral' (fallback)
  dishNameSource?: 'vision' | 'generated' | 'neutral';
  // Confidence score for the dish name (0-1)
  dishNameConfidence?: number;
  
  // Image URL for display (absolute URL or data URI)
  imageUrl?: string;
  // Image URI for backward compatibility
  imageUri?: string;
  // Food compatibility analysis
  foodCompatibility?: FoodCompatibilityResult;
  // Эвристическая оценка канцерогенного риска по составу блюда
  carcinogenicRisk?: CarcinogenicRiskResult;
}

