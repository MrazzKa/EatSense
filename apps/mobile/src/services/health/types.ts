/**
 * Platform-neutral shape of everything EatSense reads from / writes to the OS
 * health store (Apple Health on iOS, Health Connect on Android).
 *
 * Screens and hooks only ever see these types — nothing outside
 * `src/services/health/` imports a HealthKit or Health Connect symbol.
 */

/** Everything we can ask permission for. Users may grant any subset. */
export type HealthMetric =
  | 'steps'
  | 'activeEnergy'
  | 'restingEnergy'
  | 'workouts'
  | 'weight'
  | 'height'
  | 'sleep'
  | 'restingHeartRate';

export const READ_METRICS: HealthMetric[] = [
  'steps',
  'activeEnergy',
  'restingEnergy',
  'workouts',
  'weight',
  'height',
  'sleep',
  'restingHeartRate',
];

export interface HealthPermissionState {
  /** Does this device have a health store at all? (iPad, some Androids: no.) */
  available: boolean;
  /** Have we asked yet? iOS deliberately never tells us what was granted for reads. */
  requested: boolean;
  /** Can we write nutrition back? */
  canWrite: boolean;
}

/** One day's activity, already reduced to the numbers the app actually uses. */
export interface HealthDailySummary {
  date: string; // YYYY-MM-DD
  steps: number | null;
  /** kcal burned through movement, on top of resting metabolism. */
  activeEnergyKcal: number | null;
  /** kcal burned at rest, as measured by the device (not our BMR estimate). */
  restingEnergyKcal: number | null;
  workoutMinutes: number | null;
  sleepMinutes: number | null;
  restingHeartRate: number | null;
}

export interface HealthBodyMetrics {
  weightKg: number | null;
  heightCm: number | null;
  /** When the weight reading was taken — used to decide whether it is fresher
   *  than what the user typed into their profile. */
  weightAt: string | null;
}

/** A meal we push into the health store. All values are for the whole portion. */
export interface HealthMealPayload {
  name: string;
  consumedAt: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodiumMg?: number;
}

export interface HealthProvider {
  /** 'apple-health' | 'health-connect' | 'none' — for copy and analytics. */
  readonly id: 'apple-health' | 'health-connect' | 'none';

  isAvailable(): Promise<boolean>;
  getPermissionState(): Promise<HealthPermissionState>;
  /** Shows the OS permission sheet. Resolves once the user dismisses it. */
  requestPermissions(): Promise<HealthPermissionState>;

  readDailySummary(date: Date): Promise<HealthDailySummary>;
  readBodyMetrics(): Promise<HealthBodyMetrics>;

  writeMeal(meal: HealthMealPayload): Promise<boolean>;
  writeWater(milliliters: number, at: Date): Promise<boolean>;
}

export function emptyDailySummary(date: Date): HealthDailySummary {
  return {
    date: date.toISOString().split('T')[0],
    steps: null,
    activeEnergyKcal: null,
    restingEnergyKcal: null,
    workoutMinutes: null,
    sleepMinutes: null,
    restingHeartRate: null,
  };
}

/**
 * Used on platforms with no health store (web, older Androids) and whenever the
 * native module fails to load. Every call succeeds and returns "nothing", so
 * callers never need a platform check.
 */
export const nullHealthProvider: HealthProvider = {
  id: 'none',
  isAvailable: async () => false,
  getPermissionState: async () => ({ available: false, requested: false, canWrite: false }),
  requestPermissions: async () => ({ available: false, requested: false, canWrite: false }),
  readDailySummary: async (date: Date) => emptyDailySummary(date),
  readBodyMetrics: async () => ({ weightKg: null, heightCm: null, weightAt: null }),
  writeMeal: async () => false,
  writeWater: async () => false,
};
