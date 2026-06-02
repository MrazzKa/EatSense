/**
 * Lifestyle Program Categories
 * Based on EatSense_Lifestyles_V2 specification
 */

import type { LifestyleCategoryId } from './types';

export interface LifestyleCategory {
  id: LifestyleCategoryId;
  emoji: string;
  /** Ionicons name — preferred over emoji for a cleaner, consistent UI. */
  icon: string;
  nameKey: string; // Translation key: lifestyles.categories.{ID}
}

export const LIFESTYLE_CATEGORIES: LifestyleCategory[] = [
  { id: 'FREE', emoji: '🎁', icon: 'gift-outline', nameKey: 'lifestyles.categories.FREE' },
  { id: 'TRENDING', emoji: '🔥', icon: 'flame-outline', nameKey: 'lifestyles.categories.TRENDING' },
  { id: 'GOAL_LOSE_WEIGHT', emoji: '🎯', icon: 'trending-down-outline', nameKey: 'lifestyles.categories.GOAL_LOSE_WEIGHT' },
  { id: 'GOAL_BUILD_MUSCLE', emoji: '🎯', icon: 'barbell-outline', nameKey: 'lifestyles.categories.GOAL_BUILD_MUSCLE' },
  { id: 'GOAL_CLEAR_SKIN', emoji: '🎯', icon: 'sparkles-outline', nameKey: 'lifestyles.categories.GOAL_CLEAR_SKIN' },
  { id: 'GOAL_MORE_ENERGY', emoji: '🎯', icon: 'flash-outline', nameKey: 'lifestyles.categories.GOAL_MORE_ENERGY' },
  { id: 'DESTINATIONS', emoji: '🌍', icon: 'globe-outline', nameKey: 'lifestyles.categories.DESTINATIONS' },
  { id: 'AESTHETICS', emoji: '👗', icon: 'shirt-outline', nameKey: 'lifestyles.categories.AESTHETICS' },
  { id: 'WARRIOR_MODE', emoji: '⚔️', icon: 'shield-outline', nameKey: 'lifestyles.categories.WARRIOR_MODE' },
  { id: 'SEASONAL', emoji: '📅', icon: 'calendar-outline', nameKey: 'lifestyles.categories.SEASONAL' },
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
