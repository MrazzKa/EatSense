/**
 * Free content configuration
 * Defines which diets and lifestyles are available for free users
 */

// ============================================================================
// FEATURE FLAG: Premium Lock System
// Set to false to disable all premium locks (all content available to everyone)
// Set to true to enable premium restrictions
// ============================================================================
export const ENABLE_PREMIUM_LOCK = false;

// Free diet program IDs (3 most basic/popular diets)
export const FREE_DIET_IDS: string[] = [
  'plate-method',      // Balanced Plate Method - easy for beginners
  'mediterranean',     // Popular Mediterranean diet
  'dash',              // DASH diet - heart healthy
];

// Free lifestyle program IDs (3 most popular lifestyles)
export const FREE_LIFESTYLE_IDS: string[] = [
  'that_girl',         // Popular "That Girl" aesthetic
  'clean_girl',        // Clean girl lifestyle
  'old_money',         // Old Money lifestyle
  'lean_bulk',         // Lean Bulk (Male focused)
];

// Number of free analyses per day for non-subscribers
export const FREE_DAILY_ANALYSES = 3;

// Trial period days
export const TRIAL_DAYS = {
  SHORT: 3,
  STANDARD: 7,
};

/**
 * Check if a diet is free
 * When ENABLE_PREMIUM_LOCK is false, all diets are considered free
 */
export function isFreeDiet(dietId: string): boolean {
  if (!ENABLE_PREMIUM_LOCK) return true; // All content free when premium lock disabled
  return FREE_DIET_IDS.includes(dietId.toLowerCase().replace(/\s+/g, '-'));
}

/**
 * Check if a lifestyle is free
 * When ENABLE_PREMIUM_LOCK is false, all lifestyles are considered free
 */
export function isFreeLifestyle(lifestyleId: string): boolean {
  if (!ENABLE_PREMIUM_LOCK) return true; // All content free when premium lock disabled
  const normalizedId = lifestyleId.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return FREE_LIFESTYLE_IDS.includes(normalizedId);
}

/**
 * Check if a program (diet or lifestyle) is free
 * When ENABLE_PREMIUM_LOCK is false, all programs are considered free
 */
export function isFreeProgram(programId: string, type: 'diet' | 'lifestyle'): boolean {
  if (!ENABLE_PREMIUM_LOCK) return true; // All content free when premium lock disabled
  if (type === 'lifestyle') {
    return isFreeLifestyle(programId);
  }
  return isFreeDiet(programId);
}
