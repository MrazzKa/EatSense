import {
  HealthProvider,
  HealthDailySummary,
  HealthBodyMetrics,
  HealthMealPayload,
  HealthPermissionState,
  emptyDailySummary,
} from './types';

/**
 * Apple Health (HealthKit) implementation.
 *
 * Everything here is defensive on purpose:
 *  - the native module is required lazily, so a build without the pod (or Expo
 *    Go) degrades to the null provider instead of crashing at import time;
 *  - iOS never tells an app which READ permissions were granted — a denied type
 *    simply returns no samples. So every read is wrapped and falls back to null
 *    rather than treating "no data" as an error.
 */

type HK = typeof import('@kingstinct/react-native-healthkit');

let hk: HK | null = null;
let hkLoadFailed = false;

function healthkit(): HK | null {
  if (hk || hkLoadFailed) return hk;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    hk = require('@kingstinct/react-native-healthkit') as HK;
  } catch {
    hkLoadFailed = true;
    hk = null;
  }
  return hk;
}

/** Types we ask to READ. The user may grant any subset. */
const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBasalEnergyBurned',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierHeight',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
] as const;

/** Types we ask to WRITE — the nutrition we log. */
const WRITE_TYPES = [
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
  'HKQuantityTypeIdentifierDietaryFiber',
  'HKQuantityTypeIdentifierDietarySugar',
  'HKQuantityTypeIdentifierDietarySodium',
  'HKQuantityTypeIdentifierDietaryWater',
] as const;

/**
 * HKCategoryValueSleepAnalysis values that count as actually asleep.
 *
 * The library reports these as the raw numeric enum (inBed 0, asleepUnspecified 1,
 * awake 2, asleepCore 3, asleepDeep 4, asleepREM 5), NOT as the symbolic name —
 * so matching on the string "asleep" never matched anything and sleep silently
 * came back empty for every user. Strings are still accepted in case a future
 * version of the binding switches representation.
 */
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

function isAsleepValue(value: unknown): boolean {
  if (typeof value === 'number') return ASLEEP_VALUES.has(value);
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    if (v.includes('asleep')) return true;
    const asNumber = Number(v);
    return Number.isFinite(asNumber) && ASLEEP_VALUES.has(asNumber);
  }
  return false;
}

function dayBounds(date: Date): { startDate: Date; endDate: Date } {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);
  return { startDate, endDate };
}

/** Sum of a cumulative quantity over a day, or null if nothing/denied. */
async function sumForDay(
  identifier: any,
  unit: any,
  date: Date,
): Promise<number | null> {
  const api = healthkit();
  if (!api) return null;
  try {
    const { startDate, endDate } = dayBounds(date);
    const res = await api.queryStatisticsForQuantity(identifier, ['cumulativeSum'], {
      unit,
      filter: { date: { startDate, endDate } },
    });
    const value = res?.sumQuantity?.quantity;
    return typeof value === 'number' ? Math.round(value) : null;
  } catch {
    return null;
  }
}

const appleHealthProvider: HealthProvider = {
  id: 'apple-health',

  async isAvailable() {
    const api = healthkit();
    if (!api) return false;
    try {
      return await api.isHealthDataAvailableAsync();
    } catch {
      return false;
    }
  },

  async getPermissionState(): Promise<HealthPermissionState> {
    const api = healthkit();
    if (!api) return { available: false, requested: false, canWrite: false };
    try {
      const available = await api.isHealthDataAvailableAsync();
      if (!available) return { available: false, requested: false, canWrite: false };

      // Apple only exposes the status of WRITE permissions. For reads it
      // deliberately reports nothing, to avoid leaking that a user has data for
      // a type they declined — so "did we ask yet" is the best we can know.
      // AuthorizationRequestStatus: unknown = 0, shouldRequest = 1, unnecessary = 2.
      const status = await api.getRequestStatusForAuthorization({
        toRead: READ_TYPES as unknown as any,
        toShare: WRITE_TYPES as unknown as any,
      });
      const requested = Number(status) === 2;

      // AuthorizationStatus: notDetermined = 0, sharingDenied = 1, sharingAuthorized = 2.
      let canWrite = false;
      try {
        const writeStatus = api.authorizationStatusFor(
          'HKQuantityTypeIdentifierDietaryEnergyConsumed' as any,
        );
        canWrite = Number(writeStatus) === 2;
      } catch {
        canWrite = false;
      }

      return { available: true, requested, canWrite };
    } catch {
      return { available: false, requested: false, canWrite: false };
    }
  },

  async requestPermissions(): Promise<HealthPermissionState> {
    const api = healthkit();
    if (!api) return { available: false, requested: false, canWrite: false };
    try {
      await api.requestAuthorization({
        toRead: READ_TYPES as unknown as any,
        toShare: WRITE_TYPES as unknown as any,
      });
    } catch {
      // The user dismissing the sheet is not an error — fall through and report
      // whatever state we ended up in.
    }
    return appleHealthProvider.getPermissionState();
  },

  async readDailySummary(date: Date): Promise<HealthDailySummary> {
    const api = healthkit();
    const summary = emptyDailySummary(date);
    if (!api) return summary;

    const [steps, activeEnergy, restingEnergy] = await Promise.all([
      sumForDay('HKQuantityTypeIdentifierStepCount', 'count', date),
      sumForDay('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', date),
      sumForDay('HKQuantityTypeIdentifierBasalEnergyBurned', 'kcal', date),
    ]);
    summary.steps = steps;
    summary.activeEnergyKcal = activeEnergy;
    summary.restingEnergyKcal = restingEnergy;

    // Resting heart rate is a discrete value, so average rather than sum.
    try {
      const { startDate, endDate } = dayBounds(date);
      const hr = await api.queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierRestingHeartRate' as any,
        ['discreteAverage'],
        { unit: 'count/min' as any, filter: { date: { startDate, endDate } } },
      );
      const bpm = hr?.averageQuantity?.quantity;
      summary.restingHeartRate = typeof bpm === 'number' ? Math.round(bpm) : null;
    } catch {
      /* denied or no data */
    }

    // Workouts: total minutes of logged exercise for the day.
    try {
      const { startDate, endDate } = dayBounds(date);
      const workouts = await api.queryWorkoutSamples({
        limit: 0,
        filter: { date: { startDate, endDate } },
      } as any);
      if (Array.isArray(workouts) && workouts.length) {
        const minutes = workouts.reduce((acc: number, w: any) => {
          const start = w?.startDate ? new Date(w.startDate).getTime() : 0;
          const end = w?.endDate ? new Date(w.endDate).getTime() : 0;
          return acc + (end > start ? (end - start) / 60000 : 0);
        }, 0);
        summary.workoutMinutes = Math.round(minutes);
      }
    } catch {
      /* denied or no data */
    }

    // Sleep: HealthKit stores intervals with a category value; count only the
    // ones that represent actual asleep time, not "in bed".
    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      // Sleep for "today" really starts the previous evening.
      const from = new Date(start);
      from.setHours(-6, 0, 0, 0);
      const to = new Date(start);
      to.setHours(12, 0, 0, 0);

      const samples = await api.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis' as any, {
        limit: 0,
        filter: { date: { startDate: from, endDate: to } },
      } as any);

      if (Array.isArray(samples) && samples.length) {
        const asleep = samples.filter((s: any) => isAsleepValue(s?.value));
        const pool = asleep.length ? asleep : [];
        const minutes = pool.reduce((acc: number, s: any) => {
          const st = s?.startDate ? new Date(s.startDate).getTime() : 0;
          const en = s?.endDate ? new Date(s.endDate).getTime() : 0;
          return acc + (en > st ? (en - st) / 60000 : 0);
        }, 0);
        summary.sleepMinutes = minutes > 0 ? Math.round(minutes) : null;
      }
    } catch {
      /* denied or no data */
    }

    return summary;
  },

  async readBodyMetrics(): Promise<HealthBodyMetrics> {
    const api = healthkit();
    const out: HealthBodyMetrics = { weightKg: null, heightCm: null, weightAt: null };
    if (!api) return out;

    try {
      const samples = await api.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass' as any, {
        limit: 1,
        ascending: false,
        unit: 'kg' as any,
      } as any);
      const latest = samples?.[0] as any;
      if (latest && typeof latest.quantity === 'number') {
        out.weightKg = Math.round(latest.quantity * 10) / 10;
        out.weightAt = latest.endDate ? new Date(latest.endDate).toISOString() : null;
      }
    } catch {
      /* denied or no data */
    }

    try {
      const samples = await api.queryQuantitySamples('HKQuantityTypeIdentifierHeight' as any, {
        limit: 1,
        ascending: false,
        unit: 'cm' as any,
      } as any);
      const latest = samples?.[0] as any;
      if (latest && typeof latest.quantity === 'number') {
        out.heightCm = Math.round(latest.quantity);
      }
    } catch {
      /* denied or no data */
    }

    return out;
  },

  async writeMeal(meal: HealthMealPayload): Promise<boolean> {
    const api = healthkit();
    if (!api) return false;

    const at = meal.consumedAt instanceof Date ? meal.consumedAt : new Date(meal.consumedAt);
    // HealthKit models a meal as an instant, so start === end.
    const entries: [string, string, number | undefined][] = [
      ['HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal', meal.calories],
      ['HKQuantityTypeIdentifierDietaryProtein', 'g', meal.protein],
      ['HKQuantityTypeIdentifierDietaryCarbohydrates', 'g', meal.carbs],
      ['HKQuantityTypeIdentifierDietaryFatTotal', 'g', meal.fat],
      ['HKQuantityTypeIdentifierDietaryFiber', 'g', meal.fiber],
      ['HKQuantityTypeIdentifierDietarySugar', 'g', meal.sugar],
      ['HKQuantityTypeIdentifierDietarySodium', 'mg', meal.sodiumMg],
    ];

    let wroteSomething = false;
    for (const [identifier, unit, value] of entries) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue;
      try {
        await api.saveQuantitySample(identifier as any, unit as any, value, at, at, {
          HKFoodType: meal.name,
        } as any);
        wroteSomething = true;
      } catch {
        // A single denied nutrient must not abort the rest of the meal.
      }
    }
    return wroteSomething;
  },

  async writeWater(milliliters: number, at: Date): Promise<boolean> {
    const api = healthkit();
    if (!api || !Number.isFinite(milliliters) || milliliters <= 0) return false;
    try {
      await api.saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryWater' as any,
        'mL' as any,
        milliliters,
        at,
        at,
      );
      return true;
    } catch {
      return false;
    }
  },
};

// Always export the real provider: every method already falls back on its own
// when the native module is missing, so we never have to decide at import time
// (which would permanently pin us to the null provider after one bad require).
export default appleHealthProvider;
