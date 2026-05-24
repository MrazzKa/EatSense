import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Habit, HabitCompletion } from '../types/tracker';

const HABITS_KEY = 'tracker:habits';
const COMPLETIONS_PREFIX = 'tracker:completions:';

/** Returns local date string YYYY-MM-DD (not UTC) */
function getDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(getDateString(d));
  }
  return dates;
}

function isHabitActiveOnDate(habit: Habit, dateStr: string): boolean {
  const date = new Date(dateStr + 'T12:00:00');
  const jsDay = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const day = (jsDay + 6) % 7; // convert to 0=Mon, ..., 6=Sun

  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekdays') return day < 5;
  if (habit.frequency === 'custom' && habit.customDays) {
    return habit.customDays.includes(day);
  }
  return true;
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Record<string, HabitCompletion[]>>({});
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // Ref to always have latest habits for streak calculation & callbacks
  const habitsRef = useRef<Habit[]>(habits);
  habitsRef.current = habits;

  // Track current date — refreshes on screen focus to handle midnight crossing
  const [dateKey, setDateKey] = useState(() => getDateString());

  useFocusEffect(
    useCallback(() => {
      const now = getDateString();
      setDateKey(prev => prev !== now ? now : prev);
    }, [])
  );

  const weekDates = useMemo(() => getWeekDates(), [dateKey]);
  const today = useMemo(() => getDateString(), [dateKey]);
  const weekDatesKey = useMemo(() => weekDates.join(','), [weekDates]);

  const loadHabits = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(HABITS_KEY);
      const loaded: Habit[] = raw ? JSON.parse(raw) : [];
      loaded.sort((a, b) => a.order - b.order);
      setHabits(loaded);
      return loaded;
    } catch {
      return [];
    }
  }, []);

  const loadCompletions = useCallback(async () => {
    try {
      const keys = weekDates.map(d => COMPLETIONS_PREFIX + d);
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, HabitCompletion[]> = {};
      for (const [key, value] of pairs) {
        const date = key.replace(COMPLETIONS_PREFIX, '');
        result[date] = value ? JSON.parse(value) : [];
      }
      setCompletions(result);
      return result;
    } catch {
      return {};
    }
  }, [weekDatesKey]);

  // Batch read completions for streak — up to 365 days in one multiGet
  const calculateStreak = useCallback(async (currentHabits: Habit[]) => {
    if (currentHabits.length === 0) {
      setStreak(0);
      return;
    }

    // Build all date keys we might need (max 365, starting from yesterday)
    const dateKeys: string[] = [];
    const d = new Date();
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      dateKeys.push(getDateString(d));
      d.setDate(d.getDate() - 1);
    }

    // Batch read in chunks of 50
    const allCompletions: Record<string, HabitCompletion[]> = {};
    const CHUNK = 50;
    for (let start = 0; start < dateKeys.length; start += CHUNK) {
      const chunk = dateKeys.slice(start, start + CHUNK);
      const storageKeys = chunk.map(dk => COMPLETIONS_PREFIX + dk);
      try {
        const pairs = await AsyncStorage.multiGet(storageKeys);
        for (const [key, value] of pairs) {
          const date = key.replace(COMPLETIONS_PREFIX, '');
          allCompletions[date] = value ? JSON.parse(value) : [];
        }
      } catch {
        break;
      }

      // Check streak so far — if already broken, no need to fetch more
      let brokenInChunk = false;
      for (const dk of chunk) {
        const activeHabits = currentHabits.filter(h => isHabitActiveOnDate(h, dk));
        if (activeHabits.length === 0) continue;
        const dayC = allCompletions[dk] || [];
        const allDone = activeHabits.every(h =>
          dayC.some(c => c.habitId === h.id && c.completed)
        );
        if (!allDone) {
          brokenInChunk = true;
          break;
        }
      }
      if (brokenInChunk) break;
    }

    // Calculate final streak count
    let count = 0;
    for (const dk of dateKeys) {
      const activeHabits = currentHabits.filter(h => isHabitActiveOnDate(h, dk));
      if (activeHabits.length === 0) continue;
      const dayC = allCompletions[dk] || [];
      const allDone = activeHabits.every(h =>
        dayC.some(c => c.habitId === h.id && c.completed)
      );
      if (allDone) {
        count++;
      } else {
        break;
      }
    }
    setStreak(count);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const h = await loadHabits();
      await loadCompletions();
      await calculateStreak(h);
      setLoading(false);
    })();
  }, [dateKey]);

  const saveHabits = useCallback(async (updated: Habit[]) => {
    setHabits(updated);
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(updated));
  }, []);

  // Use functional updates via setHabits to avoid stale closures
  const addHabit = useCallback(async (habit: Omit<Habit, 'id' | 'createdAt' | 'order'>) => {
    const newHabit: Habit = {
      ...habit,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      order: habitsRef.current.length,
    };
    const updated = [...habitsRef.current, newHabit];
    await saveHabits(updated);
    return newHabit;
  }, [saveHabits]);

  const updateHabit = useCallback(async (id: string, changes: Partial<Habit>) => {
    const updated = habitsRef.current.map(h => h.id === id ? { ...h, ...changes } : h);
    await saveHabits(updated);
  }, [saveHabits]);

  const deleteHabit = useCallback(async (id: string) => {
    const updated = habitsRef.current.filter(h => h.id !== id);
    await saveHabits(updated);
  }, [saveHabits]);

  const reorderHabits = useCallback(async (reordered: Habit[]) => {
    const updated = reordered.map((h, i) => ({ ...h, order: i }));
    await saveHabits(updated);
  }, [saveHabits]);

  const toggleCompletion = useCallback(async (habitId: string, date: string) => {
    const key = COMPLETIONS_PREFIX + date;
    const raw = await AsyncStorage.getItem(key);
    const dayCompletions: HabitCompletion[] = raw ? JSON.parse(raw) : [];

    const existing = dayCompletions.find(c => c.habitId === habitId);
    let updated: HabitCompletion[];
    if (existing) {
      updated = dayCompletions.map(c =>
        c.habitId === habitId ? { ...c, completed: !c.completed } : c
      );
    } else {
      updated = [...dayCompletions, { habitId, date, completed: true }];
    }

    await AsyncStorage.setItem(key, JSON.stringify(updated));
    setCompletions(prev => ({ ...prev, [date]: updated }));
    // Use ref to get latest habits for streak
    await calculateStreak(habitsRef.current);
  }, [calculateStreak]);

  // Memoize weeklyPercentage
  const weeklyPercentage = useMemo(() => {
    if (habits.length === 0) return 0;
    let total = 0;
    let done = 0;
    for (const date of weekDates) {
      if (date > today) continue;
      const active = habits.filter(h => isHabitActiveOnDate(h, date));
      total += active.length;
      const dayC = completions[date] || [];
      done += active.filter(h => dayC.some(c => c.habitId === h.id && c.completed)).length;
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [habits, weekDates, today, completions]);

  return {
    habits,
    completions,
    streak,
    weeklyPercentage,
    weekDates,
    today,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    reorderHabits,
    toggleCompletion,
    isHabitActiveOnDate,
  };
}
