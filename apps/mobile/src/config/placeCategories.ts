// src/config/placeCategories.ts
// Category taxonomy for community "places" on the map — lets users add not only
// restaurants but gyms, shops, parks, etc. `key` is stored in post
// metadata.category; `labelKey` resolves via i18n (community.placeCategories.*);
// `icon` is an Ionicons name for chips/markers; `color` tints the map marker;
// `isFood` controls whether the cuisine selector is relevant.

export type PlaceCategoryKey =
  | 'restaurant'
  | 'cafe'
  | 'gym'
  | 'sports'
  | 'health_shop'
  | 'park'
  | 'other';

export type PlaceCategory = {
  key: PlaceCategoryKey;
  labelKey: string;
  icon: string;
  color: string;
  isFood: boolean;
};

export const DEFAULT_PLACE_CATEGORY: PlaceCategoryKey = 'restaurant';

export const PLACE_CATEGORIES: PlaceCategory[] = [
  { key: 'restaurant', labelKey: 'community.placeCategories.restaurant', icon: 'restaurant-outline', color: '#F59E0B', isFood: true },
  { key: 'cafe', labelKey: 'community.placeCategories.cafe', icon: 'cafe-outline', color: '#B45309', isFood: true },
  { key: 'gym', labelKey: 'community.placeCategories.gym', icon: 'barbell-outline', color: '#7C3AED', isFood: false },
  { key: 'sports', labelKey: 'community.placeCategories.sports', icon: 'basketball-outline', color: '#2563EB', isFood: false },
  { key: 'health_shop', labelKey: 'community.placeCategories.health_shop', icon: 'basket-outline', color: '#10B981', isFood: false },
  { key: 'park', labelKey: 'community.placeCategories.park', icon: 'leaf-outline', color: '#65A30D', isFood: false },
  { key: 'other', labelKey: 'community.placeCategories.other', icon: 'location-outline', color: '#6B7280', isFood: false },
];

export const PLACE_CATEGORY_BY_KEY: Record<string, PlaceCategory> = PLACE_CATEGORIES.reduce(
  (acc, c) => {
    acc[c.key] = c;
    return acc;
  },
  {} as Record<string, PlaceCategory>,
);

export function placeCategoryIcon(key?: string | null): string {
  if (!key) return 'restaurant-outline';
  return PLACE_CATEGORY_BY_KEY[key]?.icon || 'location-outline';
}

export function isFoodCategory(key?: string | null): boolean {
  if (!key) return true; // legacy places (no category) are treated as restaurants
  return PLACE_CATEGORY_BY_KEY[key]?.isFood ?? false;
}
