/**
 * Daily calorie target from body metrics (Mifflin-St Jeor + activity + goal).
 *
 * Extracted from UserProfilesService so the health-store weight sync computes the
 * target with the exact same formula. Two copies of this would silently drift and
 * the user would see a different goal depending on how their weight got updated.
 */
export interface DailyCaloriesInput {
  height?: number | null;
  weight?: number | null;
  age?: number | null;
  gender?: string | null;
  activityLevel?: string | null;
  goal?: string | null;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

export function calculateDailyCalories(profile: DailyCaloriesInput): number {
  const { height, weight, age, gender, activityLevel } = profile;

  if (!height || !weight || !age || !gender || !activityLevel) {
    return 2000; // Default value
  }

  // Mifflin-St Jeor
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel || ''] || 1.2;
  const tdee = bmr * multiplier;

  // Goal-aware target: apply a moderate deficit/surplus so the calorie goal
  // actually reflects the user's weight goal. Previously this returned pure TDEE,
  // so weight-loss users got maintenance calories everywhere (dashboard ring,
  // AI assistant, reports). 15% deficit / 10% surplus, with a safe 1200 floor.
  const goalFactor = profile.goal === 'lose_weight' ? 0.85 : profile.goal === 'gain_weight' ? 1.1 : 1.0;
  return Math.max(1200, Math.round(tdee * goalFactor));
}
