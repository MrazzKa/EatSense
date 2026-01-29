/**
 * Free content configuration
 * Defines which diets and lifestyles are available for free users
 */

// Free diet program IDs (3-5 most basic/popular diets)
export const FREE_DIET_IDS: string[] = [
  'balanced-diet',     // Basic balanced diet
  'mediterranean',     // Popular Mediterranean diet
  'high-protein',      // High protein diet
  'keto',              // Keto diet
];

// Free lifestyle program IDs (3-5 most popular lifestyles)
export const FREE_LIFESTYLE_IDS: string[] = [
  'that_girl',         // Popular "That Girl" aesthetic
  'clean_girl',        // Clean girl lifestyle
  'summer_beach_body', // Summer beach body
  'french_girl',       // French girl aesthetic
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
