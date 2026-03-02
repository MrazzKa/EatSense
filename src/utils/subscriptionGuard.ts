import { ENABLE_PREMIUM_LOCK } from '../config/freeContent';

export type Feature =
  | 'reports'
  | 'advancedSettings'
  | 'unlimitedHabits'
  | 'unlimitedShopping'
  | 'shoppingRecommendations';

const FREE_LIMITS: Record<string, number> = {
  habits: 3,
  shopping: 10,
};

export function isPro(plan: string | null | undefined): boolean {
  return plan !== 'free' && plan !== null && plan !== undefined;
}

export function canUseFeature(feature: Feature, plan: string | null | undefined): boolean {
  if (!ENABLE_PREMIUM_LOCK) return true;
  if (isPro(plan)) return true;

  switch (feature) {
    case 'reports':
    case 'advancedSettings':
    case 'shoppingRecommendations':
      return false;
    case 'unlimitedHabits':
    case 'unlimitedShopping':
      return true; // allowed with limits
    default:
      return true;
  }
}

export function getFeatureLimit(feature: Feature, plan: string | null | undefined): number | null {
  if (!ENABLE_PREMIUM_LOCK) return null;
  if (isPro(plan)) return null;

  switch (feature) {
    case 'unlimitedHabits':
      return FREE_LIMITS.habits;
    case 'unlimitedShopping':
      return FREE_LIMITS.shopping;
    default:
      return null;
  }
}
