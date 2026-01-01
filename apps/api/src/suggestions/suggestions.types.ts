/**
 * Suggested Food V2 Types
 * Real personalization based on user's meal history
 */

export type SuggestionStatus = 'ok' | 'insufficient_data' | 'error';
export type HealthLevel = 'poor' | 'average' | 'good' | 'excellent';
export type NutrientSeverity = 'very_low' | 'low' | 'ok' | 'high' | 'very_high';
export type SuggestionCategory = 'protein' | 'fiber' | 'healthy_fat' | 'carb' | 'general';
export type SupportedLocale = 'en' | 'ru' | 'kk';

export interface SuggestedFoodV2Response {
    status: SuggestionStatus;
    locale: SupportedLocale;

    /** Short personalized message for Dashboard card (1-2 sentences with real numbers) */
    summary: string;

    /** Health assessment based on 7-day analysis */
    health: {
        level: HealthLevel;
        score: number; // 0-100
        reasons: string[]; // 3-5 short reasons
    };

    /** Calculated metrics for the period */
    stats: {
        daysWithMeals: number;
        mealsCount: number;
        avgCalories: number;
        avgProteinG: number;
        avgFatG: number;
        avgCarbsG: number;
        avgFiberG: number;
        macroPercents: {
            protein: number;
            fat: number;
            carbs: number;
        };
    };

    /** Recommendation sections (1-4 sections) */
    sections: SuggestionSection[];
}

export interface SuggestionSection {
    id: string;
    category: SuggestionCategory;
    title: string;
    subtitle: string; // Why this matters + what's wrong (with numbers)
    items: SuggestionItem[];
}

export interface SuggestionItem {
    id: string;
    title: string;
    description: string;
    tags?: string[]; // '5min', 'budget', 'no_cook', 'high_protein'
    products?: { name: string; brand?: string }[];
}

/** Internal: severity classification for each nutrient */
export interface NutrientSeverities {
    protein: NutrientSeverity;
    fiber: NutrientSeverity;
    fat: NutrientSeverity;
    carbs: NutrientSeverity;
    variety: 'low' | 'ok';
    loggingQuality: 'low' | 'ok';
}

/** Internal: goal-based thresholds */
export interface NutritionTargets {
    proteinPercMin: number;
    fatPercMax: number;
    carbsPercMax: number;
    fiberGMin: number;
    proteinGPerKg?: number; // if weight is available
}
