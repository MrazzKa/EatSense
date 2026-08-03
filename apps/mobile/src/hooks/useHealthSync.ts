import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/apiService';
import type { HealthDailySummary, HealthMealPayload } from '../services/health';
import HealthService from '../services/health';

const LAST_SYNC_KEY = 'health:lastSyncAt';
/** Don't hammer the health store on every screen focus. */
const MIN_INTERVAL_MS = 15 * 60 * 1000;
/** How many days back to re-upload — covers a phone that was offline a while. */
const BACKFILL_DAYS = 7;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Keeps the device health store and our server in step, in both directions.
 *
 * Pull: activity for the last few days → our API, which is what makes the daily
 * calorie target follow real movement.
 * Push: meals logged in the app → the health store, so EatSense shows up in
 * Apple Health / Health Connect alongside everything else.
 *
 * Every call is a no-op when the user has not switched sync on, so callers do
 * not need to check anything first.
 */
export function useHealthSync() {
  const [summary, setSummary] = useState<HealthDailySummary | null>(null);
  const [syncing, setSyncing] = useState(false);
  /**
   * Bumped after activity has actually been uploaded. The dashboard watches this
   * to refetch: the calorie bonus is computed server-side, so without a refetch
   * the ring keeps showing the pre-sync goal until the next app launch.
   */
  const [uploadedAt, setUploadedAt] = useState<number | null>(null);
  const inFlight = useRef(false);

  const runSync = useCallback(async (force = false) => {
    if (inFlight.current) return null;
    if (!(await HealthService.isEnabled())) {
      // Drop whatever we were showing. Turning sync off happens on a different
      // screen, so without this the dashboard would keep rendering the activity
      // card from before — data the user just revoked.
      setSummary(null);
      return null;
    }

    if (!force) {
      try {
        const last = Number((await AsyncStorage.getItem(LAST_SYNC_KEY)) || 0);
        if (last && Date.now() - last < MIN_INTERVAL_MS) {
          // Still fresh — reuse today's numbers without touching the store.
          const today = await HealthService.getDailySummary();
          setSummary(today);
          return today;
        }
      } catch {
        /* fall through and sync */
      }
    }

    inFlight.current = true;
    setSyncing(true);
    try {
      const days: any[] = [];
      let today: HealthDailySummary | null = null;

      for (let i = 0; i < BACKFILL_DAYS; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const daySummary = await HealthService.getDailySummary(d);
        if (!daySummary) continue;
        if (i === 0) today = daySummary;

        const entry: any = { date: dateKey(d) };
        if (daySummary.steps != null) entry.steps = daySummary.steps;
        if (daySummary.activeEnergyKcal != null) entry.activeEnergyKcal = daySummary.activeEnergyKcal;
        if (daySummary.restingEnergyKcal != null) entry.restingEnergyKcal = daySummary.restingEnergyKcal;
        if (daySummary.workoutMinutes != null) entry.workoutMinutes = daySummary.workoutMinutes;
        if (daySummary.sleepMinutes != null) entry.sleepMinutes = daySummary.sleepMinutes;
        if (daySummary.restingHeartRate != null) entry.restingHeartRate = daySummary.restingHeartRate;

        // Skip days the user granted nothing for.
        if (Object.keys(entry).length > 1) days.push(entry);
      }

      setSummary(today);

      const body: any = {
        source: HealthService.providerId === 'health-connect' ? 'health-connect' : 'apple-health',
        days,
      };

      const bodyMetrics = await HealthService.getBodyMetrics();
      if (bodyMetrics?.weightKg) {
        body.weightKg = bodyMetrics.weightKg;
        if (bodyMetrics.weightAt) body.weightAt = bodyMetrics.weightAt;
      }

      if (days.length > 0 || body.weightKg) {
        const uploaded = await ApiService.syncHealthMetrics(body).catch(() => null);
        if (uploaded) setUploadedAt(Date.now());
      }

      await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now())).catch(() => {});
      return today;
    } catch {
      return null;
    } finally {
      inFlight.current = false;
      setSyncing(false);
    }
  }, []);

  // Sync on mount and whenever the app comes back to the foreground — that is
  // when the health store has new data (steps accumulate while the app is away).
  useEffect(() => {
    runSync();
    const listener = (state: AppStateStatus) => {
      if (state === 'active') runSync();
    };
    const sub = AppState.addEventListener('change', listener);
    return () => sub.remove();
  }, [runSync]);

  return { summary, syncing, uploadedAt, runSync };
}

/**
 * Push meals into the health store, skipping any already written.
 *
 * Call this after the diary loads: meals are created server-side (from an
 * analysis, from a fridge recipe, or by hand), so there is no single client-side
 * "meal created" moment to hook into. De-duplication lives in HealthService, so
 * calling this repeatedly with the same meals is safe.
 */
export async function syncMealsToHealth(meals: any[]): Promise<number> {
  if (!Array.isArray(meals) || meals.length === 0) return 0;
  if (!(await HealthService.isEnabled())) return 0;

  let written = 0;
  for (const meal of meals) {
    const id = meal?.id;
    if (!id) continue;

    const items: any[] = Array.isArray(meal.items) ? meal.items : [];
    const totals = items.reduce(
      (acc, it) => {
        acc.calories += Number(it?.calories) || 0;
        acc.protein += Number(it?.protein) || 0;
        acc.carbs += Number(it?.carbs) || 0;
        acc.fat += Number(it?.fat) || 0;
        acc.fiber += Number(it?.fiber) || 0;
        acc.sugar += Number(it?.sugars) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    );

    // Nothing to write for an empty meal.
    if (totals.calories <= 0 && totals.protein <= 0 && totals.carbs <= 0 && totals.fat <= 0) continue;

    const consumedAt = meal.consumedAt || meal.createdAt;
    const payload: HealthMealPayload = {
      name: meal.name || 'Meal',
      consumedAt: consumedAt ? new Date(consumedAt) : new Date(),
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      fiber: totals.fiber > 0 ? Math.round(totals.fiber * 10) / 10 : undefined,
      sugar: totals.sugar > 0 ? Math.round(totals.sugar * 10) / 10 : undefined,
    };

    if (await HealthService.syncMeal(String(id), payload)) written++;
  }
  return written;
}

export default useHealthSync;
