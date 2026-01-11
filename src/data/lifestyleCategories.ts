/**
 * Lifestyle Program Categories
 * Based on EatSense_Lifestyles_V2 specification
 */

export interface LifestyleCategory {
  id: string;
  emoji: string;
  nameKey: string;
  count: number;
}

export const LIFESTYLE_CATEGORIES: LifestyleCategory[] = [
  { id: 'TRENDING', emoji: '🔥', nameKey: 'diets.lifestyle.categories.TRENDING', count: 8 },
  { id: 'GOAL_LOSE_WEIGHT', emoji: '🎯', nameKey: 'diets.lifestyle.categories.GOAL_LOSE_WEIGHT', count: 4 },
  { id: 'GOAL_BUILD_MUSCLE', emoji: '🎯', nameKey: 'diets.lifestyle.categories.GOAL_BUILD_MUSCLE', count: 4 },
  { id: 'GOAL_CLEAR_SKIN', emoji: '🎯', nameKey: 'diets.lifestyle.categories.GOAL_CLEAR_SKIN', count: 3 },
  { id: 'GOAL_MORE_ENERGY', emoji: '🎯', nameKey: 'diets.lifestyle.categories.GOAL_MORE_ENERGY', count: 3 },
  { id: 'DESTINATIONS', emoji: '🌍', nameKey: 'diets.lifestyle.categories.DESTINATIONS', count: 5 },
  { id: 'AESTHETICS', emoji: '👗', nameKey: 'diets.lifestyle.categories.AESTHETICS', count: 5 },
  { id: 'WARRIOR_MODE', emoji: '⚔️', nameKey: 'diets.lifestyle.categories.WARRIOR_MODE', count: 6 },
  { id: 'SEASONAL', emoji: '📅', nameKey: 'diets.lifestyle.categories.SEASONAL', count: 4 },
];

/**
 * Map category ID to uiGroup for backend compatibility
 */
export function categoryToUiGroup(categoryId: string): string {
  const mapping: Record<string, string> = {
    'TRENDING': 'Trending',
    'GOAL_LOSE_WEIGHT': 'Weight loss',
    'GOAL_BUILD_MUSCLE': 'Performance',
    'GOAL_CLEAR_SKIN': 'Health',
    'GOAL_MORE_ENERGY': 'Health',
    'DESTINATIONS': 'Historical',
    'AESTHETICS': 'Aesthetic',
    'WARRIOR_MODE': 'Performance',
    'SEASONAL': 'Seasonal',
  };
  return mapping[categoryId] || categoryId;
}
