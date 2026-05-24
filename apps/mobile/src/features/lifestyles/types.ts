/**
 * TypeScript types for Lifestyle Programs
 * Lifestyle Programs are NOT diets - they are inspiration-based programs
 */

export type LifestyleCategoryId =
  | 'FREE'
  | 'TRENDING'
  | 'GOAL_LOSE_WEIGHT'
  | 'GOAL_BUILD_MUSCLE'
  | 'GOAL_CLEAR_SKIN'
  | 'GOAL_MORE_ENERGY'
  | 'DESTINATIONS'
  | 'AESTHETICS'
  | 'WARRIOR_MODE'
  | 'SEASONAL';

export type LifestyleTarget = 'male' | 'female' | 'all';

export interface LocalizedText {
  en: string;
  ru: string;
  kk: string;
  fr?: string;
  de?: string;
  es?: string;
}

export interface LocalizedTextArray {
  en: string[];
  ru: string[];
  kk: string[];
  fr?: string[];
  de?: string[];
  es?: string[];
}

export interface SampleDay {
  morning: LocalizedText;
  midday: LocalizedText;
  evening: LocalizedText;
}

/** One step in morning/evening ritual (icon + text) */
export interface RitualStep {
  icon: string;
  text: LocalizedText;
}

/** One meal in sample day v2 (dish + description) */
export interface SampleDayMeal {
  dish: LocalizedText;
  description: LocalizedText;
}

/** Full sample day v2: day number + morning/midday/evening meals */
export interface SampleDayV2 {
  day: number;
  morning: SampleDayMeal;
  midday: SampleDayMeal;
  evening: SampleDayMeal;
}

/** Pairs well with another diet/lifestyle */
export interface PairsWellWith {
  label: LocalizedText;
  description: LocalizedText;
}

/**
 * Lifestyle Program interface
 * Based on EatSense_Lifestyles_V2 specification
 */
export interface LifestyleProgram {
  id: string; // snake_case
  categoryId: LifestyleCategoryId;
  categoryEmoji: string;
  emoji: string;
  name: LocalizedText;
  tagline: LocalizedText;
  mantra: LocalizedText;
  philosophy: LocalizedText;
  embrace: LocalizedTextArray; // Things to embrace
  minimize: LocalizedTextArray; // Things to minimize
  dailyInspiration: LocalizedTextArray;
  sampleDay: SampleDay;
  vibe: string; // Keywords
  target: LifestyleTarget;
  ageRange: string;
  durationDays?: number; // Default 14 if not specified
  imageUrl?: string;
  category?: string;
  difficulty?: string;
  rules?: {
    mantra?: LocalizedText;
    mantras?: LocalizedTextArray | string[];
    philosophy?: LocalizedText;
    embrace?: string[] | LocalizedTextArray;
    minimize?: string[] | LocalizedTextArray;
    dailyInspiration?: LocalizedTextArray;
    sampleDay?: SampleDay;
    sampleDays?: SampleDayV2[];
    vibe?: string;
    morningRitual?: RitualStep[];
    eveningRitual?: RitualStep[];
    diningOut?: LocalizedTextArray | string[];
    pairsWellWith?: PairsWellWith[];
    [key: string]: any;
  };

  // Alternative/DB fields
  subtitle?: LocalizedText;
  description?: LocalizedText;
  shortDescription?: LocalizedText;
  allowedFoods?: string[];
  restrictedFoods?: string[];
  [key: string]: any;
}
