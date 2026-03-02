import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, HabitCompletion } from '../types/tracker';

const HABITS_KEY = 'tracker:habits';
const COMPLETIONS_PREFIX = 'tracker:completions:';

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
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
  const date = new Date(dateStr);
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

  const weekDates = getWeekDates();
  const today = getDateString();

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
  }, [weekDates.join(',')]);

  const calculateStreak = useCallback(async (currentHabits: Habit[]) => {
    if (currentHabits.length === 0) {
      setStreak(0);
      return;
    }

    let count = 0;
    const d = new Date();
    // Start from yesterday (today is still in progress)
    d.setDate(d.getDate() - 1);

    for (let i = 0; i < 365; i++) {
      const dateStr = getDateString(d);
      const activeHabits = currentHabits.filter(h => isHabitActiveOnDate(h, dateStr));
      if (activeHabits.length === 0) {
        d.setDate(d.getDate() - 1);
        continue;
      }

      const raw = await AsyncStorage.getItem(COMPLETIONS_PREFIX + dateStr);
      const dayCompletions: HabitCompletion[] = raw ? JSON.parse(raw) : [];
      const allDone = activeHabits.every(h =>
        dayCompletions.some(c => c.habitId === h.id && c.completed)
      );

      if (allDone) {
        count++;
        d.setDate(d.getDate() - 1);
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
  }, []);

  const saveHabits = useCallback(async (updated: Habit[]) => {
    setHabits(updated);
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(updated));
  }, []);

  const addHabit = useCallback(async (habit: Omit<Habit, 'id' | 'createdAt' | 'order'>) => {
    const newHabit: Habit = {
      ...habit,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      order: habits.length,
    };
    const updated = [...habits, newHabit];
    await saveHabits(updated);
    return newHabit;
  }, [habits, saveHabits]);

  const updateHabit = useCallback(async (id: string, changes: Partial<Habit>) => {
    const updated = habits.map(h => h.id === id ? { ...h, ...changes } : h);
    await saveHabits(updated);
  }, [habits, saveHabits]);

  const deleteHabit = useCallback(async (id: string) => {
    const updated = habits.filter(h => h.id !== id);
    await saveHabits(updated);
  }, [habits, saveHabits]);

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
    await calculateStreak(habits);
  }, [habits, calculateStreak]);

  const weeklyPercentage = (() => {
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
  })();

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
