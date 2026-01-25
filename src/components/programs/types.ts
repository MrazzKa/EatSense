/**
 * Shared types for Programs components
 */

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
  language: string
): string {
  if (!value) return '';
  
  if (typeof value === 'string') {
    // FIX: Check if string looks like a translation key (e.g., "common.save" or "onboarding.welcome")
    // If it does, log warning in dev mode
    if (__DEV__ && /^[a-z_][a-z0-9_.]*\.[a-z0-9_.]+$/i.test(value) && value.includes('.')) {
      console.warn(`[getLocalizedText] Possible translation key used as value: "${value}". This might indicate a missing translation.`);
    }
    return value;
  }
  
  if (typeof value === 'object') {
    // FIX: Improved fallback chain: try requested language, then en, ru, kk, fr, then first available
    // This ensures we always get a translation, not an English key
    const result = value[language] || value['en'] || value['ru'] || value['kk'] || value['fr'] || Object.values(value)[0] || '';
    
    // FIX: Log warning in dev mode if we had to use fallback
    if (__DEV__ && !value[language] && result) {
      const usedFallback = value['en'] || value['ru'] || value['kk'] || value['fr'] || 'first available';
      if (usedFallback !== 'first available') {
        console.warn(`[getLocalizedText] Using fallback translation for language "${language}". Used: ${Object.keys(value).find(k => value[k] === result) || 'unknown'}`);
      }
    }
    
    // FIX: Check if result looks like a translation key
    if (__DEV__ && typeof result === 'string' && /^[a-z_][a-z0-9_.]*\.[a-z0-9_.]+$/i.test(result) && result.includes('.')) {
      console.warn(`[getLocalizedText] Translation result looks like a key: "${result}". This might indicate a missing translation in database.`);
    }
    
    return result;
  }
  
  return String(value);
}
