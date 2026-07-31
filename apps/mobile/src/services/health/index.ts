import AsyncStorage from '@react-native-async-storage/async-storage';
import provider from './provider';
import {
  HealthDailySummary,
  HealthMealPayload,
  HealthPermissionState,
  HealthBodyMetrics,
} from './types';

export * from './types';

/**
 * The app's single entry point to Apple Health / Health Connect.
 *
 * Screens talk to this, never to a platform provider. Two things live here that
 * do not belong in a platform binding:
 *
 *  1. **The user's own on/off switch.** OS permission is not consent to sync —
 *     the user can grant HealthKit access and still turn EatSense sync off. We
 *     never read or write while `enabled` is false.
 *  2. **De-duplication of writes.** Logging the same meal twice (edit, re-save,
 *     re-open) must not create two entries in Apple Health.
 */

const ENABLED_KEY = 'health:enabled';
const WRITTEN_MEALS_KEY = 'health:writtenMealIds';
const MAX_REMEMBERED_MEALS = 500;

let enabledCache: boolean | null = null;

async function isEnabled(): Promise<boolean> {
  if (enabledCache !== null) return enabledCache;
  try {
    enabledCache = (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
  } catch {
    enabledCache = false;
  }
  return enabledCache;
}

async function readWrittenMealIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(WRITTEN_MEALS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const HealthService = {
  /** Which store we are talking to — drives the copy on the settings screen. */
  providerId: provider.id,

  /** Is there a health store on this device at all? */
  isAvailable(): Promise<boolean> {
    return provider.isAvailable();
  },

  isEnabled,

  /**
   * Turn sync on or off. Turning it ON requests OS permission first; if the user
   * declines everything we leave the switch off rather than pretending it worked.
   */
  async setEnabled(next: boolean): Promise<HealthPermissionState & { enabled: boolean }> {
    if (!next) {
      enabledCache = false;
      await AsyncStorage.setItem(ENABLED_KEY, 'false');
      const state = await provider.getPermissionState();
      return { ...state, enabled: false };
    }

    const state = await provider.requestPermissions();
    const enabled = state.available;
    enabledCache = enabled;
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
    return { ...state, enabled };
  },

  async getPermissionState(): Promise<HealthPermissionState> {
    return provider.getPermissionState();
  },

  /** Activity for a day. Returns null when sync is off — callers show nothing. */
  async getDailySummary(date: Date = new Date()): Promise<HealthDailySummary | null> {
    if (!(await isEnabled())) return null;
    try {
      return await provider.readDailySummary(date);
    } catch {
      return null;
    }
  },

  async getBodyMetrics(): Promise<HealthBodyMetrics | null> {
    if (!(await isEnabled())) return null;
    try {
      return await provider.readBodyMetrics();
    } catch {
      return null;
    }
  },

  /**
   * Push a logged meal into the health store, at most once per meal id.
   *
   * `mealId` is what makes this idempotent: the diary re-saves meals on edit, and
   * without a guard Apple Health would accumulate duplicate calories — which the
   * user would notice immediately in their Activity rings.
   */
  async syncMeal(mealId: string, meal: HealthMealPayload): Promise<boolean> {
    if (!mealId || !(await isEnabled())) return false;

    const written = await readWrittenMealIds();
    if (written.includes(mealId)) return false;

    const ok = await provider.writeMeal(meal).catch(() => false);
    if (!ok) return false;

    try {
      const next = [...written, mealId].slice(-MAX_REMEMBERED_MEALS);
      await AsyncStorage.setItem(WRITTEN_MEALS_KEY, JSON.stringify(next));
    } catch {
      // Losing the bookkeeping only risks a duplicate later; the write itself
      // already succeeded, so do not report failure.
    }
    return true;
  },

  async syncWater(milliliters: number, at: Date = new Date()): Promise<boolean> {
    if (!(await isEnabled())) return false;
    return provider.writeWater(milliliters, at).catch(() => false);
  },

  /** Forget which meals we already wrote — used when the user turns sync off. */
  async resetWriteHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WRITTEN_MEALS_KEY);
    } catch {
      /* ignore */
    }
  },
};

export default HealthService;
