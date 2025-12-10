// src/types/foodCompatibility.ts

export type FoodCompatibilitySeverity = 'low' | 'medium' | 'high';

export type FoodCompatibilityScoreLabel =
  | 'excellent'
  | 'good'
  | 'moderate'
  | 'problematic';

export interface FoodCompatibilityIssue {
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
  title: string;
  description: string;
  advice: string;
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
  value: number;
  label: FoodCompatibilityScoreLabel;
  reasons: string[];
}

export interface FoodCompatibilityResult {
  score: FoodCompatibilityScore;
  positives: FoodCompatibilityPositiveHighlight[];
  issues: FoodCompatibilityIssue[];
}

