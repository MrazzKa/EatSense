/**
 * Local lifestyle program images mapping
 * Maps program names/IDs to local asset images
 */

// Map of lifestyle program names to their local asset images
// Keys are normalized (lowercase, spaces to underscores) for matching
export const LIFESTYLE_IMAGES: Record<string, any> = {
  // Trending / Popular
  'summer_beach_body': require('../../../assets/lifestyles/Summer beach body.jpeg'),
  'tomato_girl_summer': require('../../../assets/lifestyles/Tomato girl summer.jpeg'),
  'that_girl': require('../../../assets/lifestyles/That girl.jpeg'),
  'clean_girl': require('../../../assets/lifestyles/Clean girl.jpeg'),
  'soft_life': require('../../../assets/lifestyles/Soft life.jpeg'),
  'french_girl': require('../../../assets/lifestyles/French girl.jpeg'),
  'coastal_grandmother': require('../../../assets/lifestyles/Coastal grandmother.jpeg'),
  'old_money': require('../../../assets/lifestyles/Old money.jpeg'),
  'pilates_princess': require('../../../assets/lifestyles/Pilates princess.jpeg'),
  'hot_girl_walk': require('../../../assets/lifestyles/Hot girl walks.jpeg'),
  'hot_girl_walks': require('../../../assets/lifestyles/Hot girl walks.jpeg'), // Alias
  'lazy_girl_weight_loss': require('../../../assets/lifestyles/Lazy girl weight loss.jpeg'),
  'cat_mom': require('../../../assets/lifestyles/Cat mom.jpeg'),
  'dog_mom': require('../../../assets/lifestyles/Dog mom.jpeg'),
  'slavic_girl': require('../../../assets/lifestyles/Slavic girl.jpeg'),
  'jet_woman': require('../../../assets/lifestyles/Jet woman.jpeg'),
  'horse_riders': require('../../../assets/lifestyles/Horse rider\'s.jpeg'),
  'horse_rider': require('../../../assets/lifestyles/Horse rider\'s.jpeg'), // Alias

  // Goals / Health
  'acne_clear': require('../../../assets/lifestyles/Clear acne.jpeg'),
  'clear_acne': require('../../../assets/lifestyles/Clear acne.jpeg'), // Alias
  'glass_skin': require('../../../assets/lifestyles/Glass skin.jpeg'),
  'lean_bulk': require('../../../assets/lifestyles/Lean bulk.jpeg'),
  'adrenal_recovery': require('../../../assets/lifestyles/Adrenal recovery.jpeg'),
  'summer_shred': require('../../../assets/lifestyles/Summer shred.jpeg'),
  'sustainable_slim': require('../../../assets/lifestyles/Sustainable slim.jpg'),
  'anti_aging': require('../../../assets/lifestyles/Anti aging.jpeg'),
  'all_day_energy': require('../../../assets/lifestyles/All day energy.jpeg'),
  'high_energy': require('../../../assets/lifestyles/High energy.jpeg'),
  'brain_fuel': require('../../../assets/lifestyles/Brain fuel.jpeg'),
  'functional_fitness': require('../../../assets/lifestyles/Functional fitness.jpeg'),

  // Warriors / Fitness
  'mma_fighter': require('../../../assets/lifestyles/MMA fighter.jpeg'),
  'athletic_performance': require('../../../assets/lifestyles/Athletic performance.jpeg'),
  'strength_athlete': require('../../../assets/lifestyles/Strength athlete.jpeg'),
  'navy_seal': require('../../../assets/lifestyles/Navy seal.jpeg'),
  'spartan_warrior': require('../../../assets/lifestyles/Spartan Warrior.jpeg'),
  'viking_raider': require('../../../assets/lifestyles/Viking raider.jpeg'),
  'ceo_warrior': require('../../../assets/lifestyles/CEO Warrior.jpeg'),

  // Aesthetics
  'prima_ballerina': require('../../../assets/lifestyles/Prima Ballerina.jpeg'),
  '1950s_bombshell': require('../../../assets/lifestyles/1950s bombshell.jpeg'),
  'mob_wife': require('../../../assets/lifestyles/Mob wife.jpeg'),
  'pin_up_retro': require('../../../assets/lifestyles/Pin up retro.jpeg'),
  'wedding_ready': require('../../../assets/lifestyles/Wedding ready.jpeg'),
  'diamond_baby': require('../../../assets/lifestyles/Diamond baby.jpeg'),
  'tennis_girl': require('../../../assets/lifestyles/Tennis girl.jpeg'),

  // Destinations
  'amalfi_coast': require('../../../assets/lifestyles/Amalfi coast.jpeg'),
  'greek_islands': require('../../../assets/lifestyles/Greek islands.jpeg'),
  'tokyo_energy': require('../../../assets/lifestyles/Tokyo energy.jpeg'),
  'okinawa_longevity': require('../../../assets/lifestyles/Okinawa.jpeg'),
  'okinawa': require('../../../assets/lifestyles/Okinawa.jpeg'), // Alias
  'scandi_hygge': require('../../../assets/lifestyles/Scandi hygge.jpeg'),
  'swiss_girl': require('../../../assets/lifestyles/Swiss girl.jpeg'),

  // Seasonal
  'ramadan_fasting': require('../../../assets/lifestyles/Ramadan Fasting.jpeg'),
  'ramadan': require('../../../assets/lifestyles/Ramadan Fasting.jpeg'), // Alias
  'navruz_spring': require('../../../assets/lifestyles/Navruz spring.jpeg'),
  'navruz': require('../../../assets/lifestyles/Navruz spring.jpeg'), // Alias
  'new_year_reset': require('../../../assets/lifestyles/New Year Reset.jpeg'),
  'holiday_balance': require('../../../assets/lifestyles/Holiday balance.jpeg'),

  // Philosophical
  'stoic_monk': require('../../../assets/lifestyles/Stoic monk.jpeg'),
};

/**
 * Normalize a string for matching (lowercase, replace spaces with underscores)
 */
function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/['']/g, '')
    .trim();
}

/**
 * Get local image for a lifestyle program
 * @param programId - Program ID or name
 * @param programName - Optional program name (English) for fallback matching
 * @returns Local image source or null if not found
 */
export function getLifestyleImage(
  programId: string,
  programName?: string | { en?: string }
): any | null {
  // Try to match by ID first
  const normalizedId = normalizeKey(programId);
  if (LIFESTYLE_IMAGES[normalizedId]) {
    return LIFESTYLE_IMAGES[normalizedId];
  }

  // Try to match by name
  if (programName) {
    const nameStr = typeof programName === 'string' ? programName : programName.en;
    if (nameStr) {
      const normalizedName = normalizeKey(nameStr);
      if (LIFESTYLE_IMAGES[normalizedName]) {
        return LIFESTYLE_IMAGES[normalizedName];
      }
    }
  }

  return null;
}
