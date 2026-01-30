/**
 * Shared types for Programs components
 */

import type React from 'react';

export interface Program {
  id: string;
  name: string | Record<string, string>;
  shortDescription?: string | Record<string, string>;
  description?: string | Record<string, string>;
  subtitle?: string | Record<string, string>;
  imageUrl?: string;
  iconUrl?: string;
  color?: string;
  duration?: number;
  type?: string;
  difficulty?: string;
  category?: string;
  uiGroup?: string;
  isFeatured?: boolean;
  averageRating?: number;
  ratingCount?: number;
  userCount?: number;
  disclaimerKey?: string;
  emoji?: string;
}

export type RenderItemFunction = (_: Program, __: number) => React.ReactNode;

export interface Recommendation {
  diet: Program;
  reason: string | Record<string, string>;
  matchScore: number;
}

export interface ActiveDiet {
  programId: string;
  currentDay: number;
  program?: Program;
  progress?: {
    percentComplete: number;
    totalDays: number;
    daysCompleted: number;
  };
}

export type LocalizedText = string | Record<string, string>;

/**
 * Helper to extract localized string from object or return string directly
 * FIX: Improved fallback chain to ensure proper translations for all languages
 * 
 * Prevents showing translation keys by using robust fallback chain
 */
export function getLocalizedText(
  value: LocalizedText | undefined,
  language: string,
  t?: (_key: string) => string
): string {
  if (!value) return '';

  // Helper to translate if t provided
  const translateIfNeeded = (text: string) => {
    if (t && text && /^[a-z_][a-z0-9_.]*\.[a-z0-9_.]+$/i.test(text) && text.includes('.')) {
      return t(text);
    }
    return text;
  };

  if (typeof value === 'string') {
    return translateIfNeeded(value);
  }

  if (typeof value === 'object') {
    // FIX: Improved fallback chain: try requested language, then en, ru, kk, fr, then first available
    const result = value[language] || value['en'] || value['ru'] || value['kk'] || value['fr'] || Object.values(value)[0] || '';

    // FIX: Log warning in dev mode if we had to use fallback
    if (__DEV__ && !value[language] && result) {
      const usedFallback = value['en'] || value['ru'] || value['kk'] || value['fr'] || 'first available';
      if (usedFallback !== 'first available') {
        // console.warn(`[getLocalizedText] Using fallback translation for language "${language}". Used: ${Object.keys(value).find(k => value[k] === result) || 'unknown'}`);
      }
    }

    return translateIfNeeded(result);
  }

  return String(value);
}
