/**
 * Lifestyle Program Categories
 * Based on EatSense_Lifestyles_V2 specification
 */

import type { LifestyleCategoryId } from './types';

export interface LifestyleCategory {
  id: LifestyleCategoryId;
  emoji: string;
  nameKey: string; // Translation key: lifestyles.categories.{ID}
}

export const LIFESTYLE_CATEGORIES: LifestyleCategory[] = [
  { id: 'TRENDING', emoji: '🔥', nameKey: 'lifestyles.categories.TRENDING' },
  { id: 'GOAL_LOSE_WEIGHT', emoji: '🎯', nameKey: 'lifestyles.categories.GOAL_LOSE_WEIGHT' },
  { id: 'GOAL_BUILD_MUSCLE', emoji: '🎯', nameKey: 'lifestyles.categories.GOAL_BUILD_MUSCLE' },
  { id: 'GOAL_CLEAR_SKIN', emoji: '🎯', nameKey: 'lifestyles.categories.GOAL_CLEAR_SKIN' },
  { id: 'GOAL_MORE_ENERGY', emoji: '🎯', nameKey: 'lifestyles.categories.GOAL_MORE_ENERGY' },
  { id: 'DESTINATIONS', emoji: '🌍', nameKey: 'lifestyles.categories.DESTINATIONS' },
  { id: 'AESTHETICS', emoji: '👗', nameKey: 'lifestyles.categories.AESTHETICS' },
  { id: 'WARRIOR_MODE', emoji: '⚔️', nameKey: 'lifestyles.categories.WARRIOR_MODE' },
  { id: 'SEASONAL', emoji: '📅', nameKey: 'lifestyles.categories.SEASONAL' },
];

/**
 * Get category count dynamically from data
 * This function should be called with the lifestyle programs array
 */
export function getCategoryCount(
  programs: Array<{ categoryId: LifestyleCategoryId }>,
  categoryId: LifestyleCategoryId
): number {
  return programs.filter(p => p.categoryId === categoryId).length;
}
