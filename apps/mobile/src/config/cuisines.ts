// src/config/cuisines.ts
// Cuisine taxonomy for community "best places" (map + filter).
// `key` is stored in post metadata.cuisine; `labelKey` resolves via i18n
// (community.cuisines.*). `icon` is an Ionicons name for chips/markers.

export type CuisineKey =
  | 'mexican'
  | 'italian'
  | 'asian'
  | 'japanese'
  | 'indian'
  | 'mediterranean'
  | 'healthy'
  | 'vegan'
  | 'vegetarian'
  | 'seafood'
  | 'american'
  | 'middle_eastern'
  | 'cafe'
  | 'bakery'
  | 'other';

export type Cuisine = {
  key: CuisineKey;
  labelKey: string;
  icon: string;
};

export const CUISINES: Cuisine[] = [
  { key: 'healthy', labelKey: 'community.cuisines.healthy', icon: 'leaf-outline' },
  { key: 'vegan', labelKey: 'community.cuisines.vegan', icon: 'nutrition-outline' },
  { key: 'vegetarian', labelKey: 'community.cuisines.vegetarian', icon: 'flower-outline' },
  { key: 'mexican', labelKey: 'community.cuisines.mexican', icon: 'flame-outline' },
  { key: 'italian', labelKey: 'community.cuisines.italian', icon: 'pizza-outline' },
  { key: 'asian', labelKey: 'community.cuisines.asian', icon: 'restaurant-outline' },
  { key: 'japanese', labelKey: 'community.cuisines.japanese', icon: 'fish-outline' },
  { key: 'indian', labelKey: 'community.cuisines.indian', icon: 'restaurant-outline' },
  { key: 'mediterranean', labelKey: 'community.cuisines.mediterranean', icon: 'sunny-outline' },
  { key: 'seafood', labelKey: 'community.cuisines.seafood', icon: 'fish-outline' },
  { key: 'american', labelKey: 'community.cuisines.american', icon: 'fast-food-outline' },
  { key: 'middle_eastern', labelKey: 'community.cuisines.middleEastern', icon: 'restaurant-outline' },
  { key: 'cafe', labelKey: 'community.cuisines.cafe', icon: 'cafe-outline' },
  { key: 'bakery', labelKey: 'community.cuisines.bakery', icon: 'cafe-outline' },
  { key: 'other', labelKey: 'community.cuisines.other', icon: 'ellipsis-horizontal' },
];

export const CUISINE_BY_KEY: Record<string, Cuisine> = CUISINES.reduce(
  (acc, c) => {
    acc[c.key] = c;
    return acc;
  },
  {} as Record<string, Cuisine>,
);

export function cuisineIcon(key?: string | null): string {
  if (!key) return 'restaurant-outline';
  return CUISINE_BY_KEY[key]?.icon || 'restaurant-outline';
}
