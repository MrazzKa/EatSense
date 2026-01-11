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
 */
export function getLocalizedText(
  value: LocalizedText | undefined,
  language: string
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[language] || value['en'] || value[Object.keys(value)[0]] || '';
  }
  return String(value);
}
