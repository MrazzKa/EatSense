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

export interface AnalyzedItem {
  id?: string;
  // Localized display name for UI (short, in user's locale)
  name: string;
  // Normalized English base name (for FDC / internal logic)
  originalName?: string;
  // Original raw label from Vision / source
  label?: string;
  portion_g: number;   // фактический вес порции в граммах
  nutrients: Nutrients;
  source: 'fdc' | 'vision_fallback' | 'manual' | 'canonical_water' | 'canonical_plain_coffee' | 'canonical_plain_tea' | 'canonical_milk_coffee_fallback' | 'unknown_drink_low_calorie_fallback' | 'usda' | 'swiss' | 'openfoodfacts' | 'rag' | 'eurofir';
  fdcId?: string | number;
  fdcScore?: number;
  dataType?: string;   // USDA dataType (Branded, Foundation, etc.)
  // Locale used for localization (optional, for debug)
  locale?: 'en' | 'ru' | 'kk';
  // Flag indicating if nutrition data is available (false = no data, show "No nutrition data")
  hasNutrition?: boolean;
}

export interface AnalysisTotals extends Nutrients {
  // Total grams for the whole analysis
  portion_g: number;
  // Alias for external naming if needed
  weight?: number;
}

export interface HealthScore {
  score: number; // 0–100
  // Existing fields used internally / by current API
  grade?: string; // A, B, C, D, F
  label?: string;
  factors: Record<string, any>;
  feedback?: string[];
  // Additional fields to align with high-level spec
  category?: string;
  message?: string;
  details?: any;
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
    | 'portion_clamped';
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
  // Localized dish name for UI (short, in user's locale)
  dishNameLocalized?: string;
  // Normalized English dish name base (for internal use)
  originalDishName?: string;
}

