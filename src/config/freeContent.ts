/**
 * Free content configuration
 * Defines which diets and lifestyles are available for free users
 */

// Free diet program IDs (3 most basic/popular diets)
export const FREE_DIET_IDS: string[] = [
  'balanced-diet',     // Basic balanced diet
  'plate-method',      // Popular Plate Method
  'mediterranean',     // Popular Mediterranean diet
];

// Free lifestyle program IDs (3 most popular lifestyles)
export const FREE_LIFESTYLE_IDS: string[] = [
  'that_girl',         // Popular "That Girl" aesthetic
  'clean_girl',        // Clean girl lifestyle
  'old_money',         // Old Money lifestyle
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
 */
export function isFreeDiet(dietId: string): boolean {
  return FREE_DIET_IDS.includes(dietId.toLowerCase().replace(/\s+/g, '-'));
}

/**
 * Check if a lifestyle is free
 */
export function isFreeLifestyle(lifestyleId: string): boolean {
  const normalizedId = lifestyleId.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return FREE_LIFESTYLE_IDS.includes(normalizedId);
}

/**
 * Check if a program (diet or lifestyle) is free
 */
export function isFreeProgram(programId: string, type: 'diet' | 'lifestyle'): boolean {
  if (type === 'lifestyle') {
    return isFreeLifestyle(programId);
  }
  return isFreeDiet(programId);
}
