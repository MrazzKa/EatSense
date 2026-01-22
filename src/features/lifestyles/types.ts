/**
 * TypeScript types for Lifestyle Programs
 * Lifestyle Programs are NOT diets - they are inspiration-based programs
 */

export type LifestyleCategoryId =
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
}

export interface LocalizedTextArray {
  en: string[];
  ru: string[];
  kk: string[];
}

export interface SampleDay {
  morning: LocalizedText;
  midday: LocalizedText;
  evening: LocalizedText;
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
}
