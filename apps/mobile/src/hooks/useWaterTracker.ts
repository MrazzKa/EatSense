import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WATER_PREFIX = 'tracker:water:';
const GOAL_KEY = 'tracker:water:goal';
const DEFAULT_GOAL = 8;

/** Local YYYY-MM-DD (not UTC) so "today" matches the user's calendar day. */
function localDate(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Simple local water tracker — one count per calendar day in AsyncStorage.
 * No backend; resets naturally each day (new date key). Goal is shared.
 */
export function useWaterTracker() {
  const [glasses, setGlasses] = useState(0);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [loading, setLoading] = useState(true);
  const dateRef = useRef(localDate());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [g, goalRaw] = await Promise.all([
          AsyncStorage.getItem(WATER_PREFIX + dateRef.current),
          AsyncStorage.getItem(GOAL_KEY),
        ]);
        if (!cancelled) {
          setGlasses(g ? (parseInt(g, 10) || 0) : 0);
          if (goalRaw) setGoal(parseInt(goalRaw, 10) || DEFAULT_GOAL);
        }
      } catch {
        // ignore — fall back to defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((n: number) => {
    AsyncStorage.setItem(WATER_PREFIX + dateRef.current, String(n)).catch(() => {});
  }, []);

  const add = useCallback(() => {
    setGlasses((prev) => {
      const n = Math.min(prev + 1, 30);
      persist(n);
      return n;
    });
  }, [persist]);

  const remove = useCallback(() => {
    setGlasses((prev) => {
      const n = Math.max(prev - 1, 0);
      persist(n);
      return n;
    });
  }, [persist]);

  return { glasses, goal, loading, add, remove };
}

export default useWaterTracker;
