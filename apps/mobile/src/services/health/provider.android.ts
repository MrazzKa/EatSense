import {
  HealthProvider,
  HealthDailySummary,
  HealthBodyMetrics,
  HealthMealPayload,
  HealthPermissionState,
  emptyDailySummary,
} from './types';

/**
 * Health Connect implementation — the Android counterpart of HealthKit.
 *
 * Differences worth knowing when reading this file:
 *  - Health Connect is a separate app. It may be missing or out of date, hence
 *    `getSdkStatus` before anything else (SDK_AVAILABLE === 3).
 *  - `initialize()` must succeed before any read/write.
 *  - Unlike iOS, Android DOES tell us which permissions were granted.
 */

type HC = typeof import('react-native-health-connect');

let hc: HC | null = null;
let hcLoadFailed = false;
let initialized = false;

const SDK_AVAILABLE = 3;

function healthConnect(): HC | null {
  if (hc || hcLoadFailed) return hc;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    hc = require('react-native-health-connect') as HC;
  } catch {
    hcLoadFailed = true;
    hc = null;
  }
  return hc;
}

const READ_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'Height' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
] as const;

const WRITE_PERMISSIONS = [
  { accessType: 'write', recordType: 'Nutrition' },
  { accessType: 'write', recordType: 'Hydration' },
] as const;

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    operator: 'between' as const,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

/** Health Connect throws when a record type has no granted permission. */
async function safeAggregate(api: HC, request: any): Promise<any | null> {
  try {
    return await api.aggregateRecord(request);
  } catch {
    return null;
  }
}

async function ensureReady(): Promise<HC | null> {
  const api = healthConnect();
  if (!api) return null;
  try {
    const status = await api.getSdkStatus();
    if (status !== SDK_AVAILABLE) return null;
    if (!initialized) {
      initialized = await api.initialize();
    }
    return initialized ? api : null;
  } catch {
    return null;
  }
}

const healthConnectProvider: HealthProvider = {
  id: 'health-connect',

  async isAvailable() {
    return (await ensureReady()) !== null;
  },

  async getPermissionState(): Promise<HealthPermissionState> {
    const api = await ensureReady();
    if (!api) return { available: false, requested: false, canWrite: false };
    try {
      const granted = await api.getGrantedPermissions();
      const list = Array.isArray(granted) ? (granted as any[]) : [];
      const canWrite = list.some(
        (p) => p?.accessType === 'write' && p?.recordType === 'Nutrition',
      );
      return { available: true, requested: list.length > 0, canWrite };
    } catch {
      return { available: true, requested: false, canWrite: false };
    }
  },

  async requestPermissions(): Promise<HealthPermissionState> {
    const api = await ensureReady();
    if (!api) return { available: false, requested: false, canWrite: false };
    try {
      await api.requestPermission([...READ_PERMISSIONS, ...WRITE_PERMISSIONS] as any);
    } catch {
      // Dismissing the sheet is not an error.
    }
    return healthConnectProvider.getPermissionState();
  },

  async readDailySummary(date: Date): Promise<HealthDailySummary> {
    const summary = emptyDailySummary(date);
    const api = await ensureReady();
    if (!api) return summary;

    const timeRangeFilter = dayBounds(date);

    const [steps, active, total, exercise, sleep, hr] = await Promise.all([
      safeAggregate(api, { recordType: 'Steps', timeRangeFilter }),
      safeAggregate(api, { recordType: 'ActiveCaloriesBurned', timeRangeFilter }),
      safeAggregate(api, { recordType: 'TotalCaloriesBurned', timeRangeFilter }),
      safeAggregate(api, { recordType: 'ExerciseSession', timeRangeFilter }),
      safeAggregate(api, { recordType: 'SleepSession', timeRangeFilter }),
      safeAggregate(api, { recordType: 'RestingHeartRate', timeRangeFilter }),
    ]);

    if (typeof steps?.COUNT_TOTAL === 'number') {
      summary.steps = Math.round(steps.COUNT_TOTAL);
    }

    const activeKcal = active?.ACTIVE_CALORIES_TOTAL?.inKilocalories;
    if (typeof activeKcal === 'number') {
      summary.activeEnergyKcal = Math.round(activeKcal);
    }

    // Health Connect has no direct "basal" aggregate here, but total − active is
    // exactly the resting portion when both are present.
    const totalKcal = total?.ENERGY_TOTAL?.inKilocalories;
    if (typeof totalKcal === 'number' && typeof activeKcal === 'number') {
      summary.restingEnergyKcal = Math.max(0, Math.round(totalKcal - activeKcal));
    }

    const exerciseSeconds = exercise?.EXERCISE_DURATION_TOTAL?.inSeconds;
    if (typeof exerciseSeconds === 'number') {
      summary.workoutMinutes = Math.round(exerciseSeconds / 60);
    }

    // SLEEP_DURATION_TOTAL is reported in seconds.
    if (typeof sleep?.SLEEP_DURATION_TOTAL === 'number') {
      summary.sleepMinutes = Math.round(sleep.SLEEP_DURATION_TOTAL / 60);
    }

    if (typeof hr?.BPM_AVG === 'number') {
      summary.restingHeartRate = Math.round(hr.BPM_AVG);
    }

    return summary;
  },

  async readBodyMetrics(): Promise<HealthBodyMetrics> {
    const out: HealthBodyMetrics = { weightKg: null, heightCm: null, weightAt: null };
    const api = await ensureReady();
    if (!api) return out;

    // Look back far enough to find a reading even for people who weigh in rarely.
    const end = new Date();
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 1);
    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };

    try {
      const res = await api.readRecords('Weight', { timeRangeFilter, ascendingOrder: false, pageSize: 1 } as any);
      const record = (res as any)?.records?.[0];
      const kg = record?.weight?.inKilograms;
      if (typeof kg === 'number') {
        out.weightKg = Math.round(kg * 10) / 10;
        out.weightAt = record?.time || record?.endTime || null;
      }
    } catch {
      /* denied or no data */
    }

    try {
      const res = await api.readRecords('Height', { timeRangeFilter, ascendingOrder: false, pageSize: 1 } as any);
      const record = (res as any)?.records?.[0];
      const meters = record?.height?.inMeters;
      if (typeof meters === 'number') {
        out.heightCm = Math.round(meters * 100);
      }
    } catch {
      /* denied or no data */
    }

    return out;
  },

  async writeMeal(meal: HealthMealPayload): Promise<boolean> {
    const api = await ensureReady();
    if (!api) return false;

    const at = meal.consumedAt instanceof Date ? meal.consumedAt : new Date(meal.consumedAt);
    // Health Connect nutrition is an interval record; a meal is a point in time,
    // so give it a nominal one-minute window.
    const end = new Date(at.getTime() + 60_000);

    const grams = (v?: number) =>
      typeof v === 'number' && Number.isFinite(v) && v > 0 ? { value: v, unit: 'grams' as const } : undefined;

    const record: any = {
      recordType: 'Nutrition',
      startTime: at.toISOString(),
      endTime: end.toISOString(),
      name: meal.name,
    };
    if (Number.isFinite(meal.calories) && meal.calories > 0) {
      record.energy = { value: meal.calories, unit: 'kilocalories' };
    }
    const protein = grams(meal.protein);
    if (protein) record.protein = protein;
    const carbs = grams(meal.carbs);
    if (carbs) record.totalCarbohydrate = carbs;
    const fat = grams(meal.fat);
    if (fat) record.totalFat = fat;
    const fiber = grams(meal.fiber);
    if (fiber) record.dietaryFiber = fiber;
    const sugar = grams(meal.sugar);
    if (sugar) record.sugar = sugar;
    if (typeof meal.sodiumMg === 'number' && meal.sodiumMg > 0) {
      record.sodium = { value: meal.sodiumMg, unit: 'milligrams' };
    }

    try {
      await api.insertRecords([record]);
      return true;
    } catch {
      return false;
    }
  },

  async writeWater(milliliters: number, at: Date): Promise<boolean> {
    const api = await ensureReady();
    if (!api || !Number.isFinite(milliliters) || milliliters <= 0) return false;
    const end = new Date(at.getTime() + 60_000);
    try {
      await api.insertRecords([
        {
          recordType: 'Hydration',
          startTime: at.toISOString(),
          endTime: end.toISOString(),
          volume: { value: milliliters, unit: 'milliliters' },
        } as any,
      ]);
      return true;
    } catch {
      return false;
    }
  },
};

export default healthConnectProvider;
