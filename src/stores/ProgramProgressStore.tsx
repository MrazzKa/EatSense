import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { programProgressService } from '../services/programProgressService';
import { createCache } from '../utils/cacheUtils';

export type ProgramType = 'diet' | 'lifestyle';

export interface DailyLog {
  date: string; // YYYY-MM-DD
  completedCount: number;
  totalCount: number;
  completionRate: number; // 0-1
  completed: boolean;
  celebrationShown?: boolean;
  checklist?: Record<string, boolean>;
}

export interface ProgramProgress {
  id: string;
  type: ProgramType;
  programId: string;
  programName?: string;
  startDate: string; // YYYY-MM-DD (local)
  currentDayIndex: number;
  daysLeft: number;
  durationDays: number;
  status: 'active' | 'completed' | 'paused';
  pausedDays?: string[]; // YYYY-MM-DD dates when paused
  streak: {
    current: number;
    longest: number;
    threshold: number; // 0.6 default
  };
  logs: Record<string, DailyLog>; // date -> log
  todayLog?: DailyLog;
  // For diets
  todayPlan?: any[];
  // For lifestyle
  dailyInspiration?: string[];
}

interface ProgramProgressContextValue {
  activeProgram: ProgramProgress | null;
  loading: boolean;
  error: string | null;
  loadProgress: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  invalidateCache: () => void;
  updateChecklist: (_checklist: Record<string, boolean>) => Promise<void>;
  completeDay: () => Promise<{ alreadyCompleted?: boolean }>;
  markCelebrationShown: () => Promise<void>;
  setProgram: (_program: ProgramProgress | null) => void;
}

const ProgramProgressContext = createContext<ProgramProgressContextValue | undefined>(undefined);

const CACHE_KEY = 'program_progress';
const CACHE_TTL = 5000; // 5 seconds - keep short to prevent stale data issues

export const ProgramProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProgram, setActiveProgram] = useState<ProgramProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(createCache<ProgramProgress>(100, CACHE_TTL));
  const loadingRef = useRef(false);

  const loadProgress = useCallback(async () => {
    // Prevent concurrent loads
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = cache.current.get(CACHE_KEY);
      if (cached) {
        setActiveProgram(cached);
        setLoading(false);
        loadingRef.current = false;
        // Still refresh in background
        refreshProgressInBackground();
        return;
      }

      const progress = await programProgressService.getActiveProgram();
      if (progress) {
        setActiveProgram(progress);
        cache.current.set(CACHE_KEY, progress);
      } else {
        // FIX: Only clear if we have cached data to check - preserve during slow loads
        const cached = cache.current.get(CACHE_KEY);
        if (!cached) {
          // No cached data and no progress - truly no active program
          setActiveProgram(null);
          cache.current.delete(CACHE_KEY);
        }
        // If we have cached data, keep it (prevents flicker during slow loads)
      }
    } catch (err: any) {
      console.error('[ProgramProgressStore] Load failed:', err);
      setError(err.message || 'Failed to load progress');
      // FIX: Don't clear activeProgram on error - preserve previous value from cache
      // This prevents tracker from disappearing during slow loads or errors
      const cached = cache.current.get(CACHE_KEY);
      if (cached) {
        // Keep cached value if available
        setActiveProgram(cached);
      } else {
        setActiveProgram(null);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProgressInBackground = useCallback(async () => {
    try {
      const progress = await programProgressService.getActiveProgram();
      if (progress) {
        setActiveProgram(progress);
        cache.current.set(CACHE_KEY, progress);
      } else {
        // FIX: Don't clear activeProgram on null - preserve previous value during slow loads
        // Only clear if we're certain there's no active program (e.g., after explicit deletion)
        // This prevents tracker from disappearing during "Slow Dashboard Load"
        // cache.current.delete(CACHE_KEY); // Keep cache for now
      }
    } catch (err) {
      console.error('[ProgramProgressStore] Background refresh failed:', err);
      // FIX: Don't clear activeProgram on error - preserve previous value
      // This prevents tracker from disappearing during slow loads or errors
    }
  }, []);

  const refreshProgress = useCallback(async () => {
    // FIX: Don't delete cache before loadProgress - let loadProgress decide
    // This prevents clearing good data during refresh if API is slow or returns null
    // loadProgress will preserve cached value if API returns null (prevents tracker from disappearing)
    await loadProgress();
  }, [loadProgress]);

  const invalidateCache = useCallback(() => {
    cache.current.delete(CACHE_KEY);
    setActiveProgram(null);
  }, []);

  const updateChecklist = useCallback(async (checklist: Record<string, boolean>) => {
    if (!activeProgram) return;

    try {
      await programProgressService.updateChecklist(activeProgram.type, activeProgram.programId, checklist);
      // Optimistic update of local state instead of full refresh
      // This prevents screen flashing and improves UX
      const completedCount = Object.values(checklist).filter(Boolean).length;
      const totalCount = Object.keys(checklist).length;
      const completionRate = totalCount > 0 ? completedCount / totalCount : 0;

      setActiveProgram(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          todayLog: {
            ...prev.todayLog!,
            completedCount,
            totalCount,
            completionRate,
            checklist,
          },
        };
        // FIX: Update cache immediately with new data instead of deleting
        // This prevents losing data during refresh
        cache.current.set(CACHE_KEY, updated);
        return updated;
      });
    } catch (err: any) {
      console.error('[ProgramProgressStore] Update checklist failed:', err);
      setError(err.message || 'Failed to update checklist');
      throw err; // Re-throw so DailyDietTracker can handle revert
    }
  }, [activeProgram]);

  const completeDay = useCallback(async (): Promise<{ alreadyCompleted?: boolean }> => {
    if (!activeProgram) return {};

    try {
      const result = await programProgressService.completeDay(activeProgram.type, activeProgram.programId);
      if (result.alreadyCompleted) return { alreadyCompleted: true };

      setActiveProgram(prev => {
        if (!prev) return prev;
        const newCurrentDay = result.currentDay || prev.currentDayIndex + 1;
        const newDaysLeft = Math.max(0, prev.durationDays - newCurrentDay + 1);
        const updated = {
          ...prev,
          currentDayIndex: newCurrentDay,
          daysLeft: newDaysLeft,
          streak: { ...prev.streak, current: result.streak || prev.streak.current },
          todayLog: { ...prev.todayLog, completed: true, completionRate: result.completionRate || 1 },
        };
        cache.current.set(CACHE_KEY, updated);
        return updated;
      });
      return {};
    } catch (err: any) {
      console.error('[ProgramProgressStore] Complete day failed:', err);
      setError(err.message || 'Failed to complete day');
      await loadProgress();
      throw err;
    }
  }, [activeProgram, loadProgress]);

  const markCelebrationShown = useCallback(async () => {
    if (!activeProgram) return;

    try {
      await programProgressService.markCelebrationShown(activeProgram.type);
      // FIX: Use optimistic update instead of full refresh
      // This prevents screen reload after closing celebration modal
      setActiveProgram(prev => {
        if (!prev || !prev.todayLog) return prev;
        return {
          ...prev,
          todayLog: {
            ...prev.todayLog,
            celebrationShown: true,
          },
        };
      });
      // Update cache with optimistic value
      const updated = cache.current.get(CACHE_KEY);
      if (updated) {
        cache.current.set(CACHE_KEY, {
          ...updated,
          todayLog: {
            ...updated.todayLog,
            celebrationShown: true,
          },
        });
      }
      // FIX: Don't refresh immediately - optimistic update is enough
      // This prevents visual reload and screen flashing after closing celebration
      // Data will be refreshed naturally on next screen focus or manual refresh
    } catch (err: any) {
      console.error('[ProgramProgressStore] Mark celebration shown failed:', err);
      // Don't throw - celebration shown is not critical, just log error
    }
  }, [activeProgram]);

  // FIX: Don't load on mount - delay until actually needed
  // This prevents blocking app startup with API call
  // Load will happen when Dashboard or Diets screen needs it
  // useEffect(() => {
  //   loadProgress();
  // }, [loadProgress]);

  const value: ProgramProgressContextValue = {
    activeProgram,
    loading,
    error,
    loadProgress,
    refreshProgress,
    invalidateCache,
    updateChecklist,
    completeDay,
    markCelebrationShown,
    setProgram: useCallback((program: ProgramProgress | null) => {
      // FIX: Don't clear activeProgram if program is null - preserve previous value
      // This prevents tracker from disappearing during "Slow Dashboard Load" or errors
      // Only update if program is not null, or if we're explicitly clearing (program === null AND no cached value)
      if (program) {
        setActiveProgram(program);
        cache.current.set(CACHE_KEY, program);
      } else {
        // Only clear if we're certain there's no active program (no cached value)
        // This prevents clearing during slow loads when API temporarily returns null
        const cached = cache.current.get(CACHE_KEY);
        if (!cached) {
          // No cached value and null program - truly no active program
          setActiveProgram(null);
          cache.current.delete(CACHE_KEY);
        }
        // If we have cached value, keep it (prevents tracker from disappearing)
      }
    }, []),
  };

  return (
    <ProgramProgressContext.Provider value={value}>
      {children}
    </ProgramProgressContext.Provider>
  );
};

export const useProgramProgress = (): ProgramProgressContextValue => {
  const context = useContext(ProgramProgressContext);
  if (!context) {
    throw new Error('useProgramProgress must be used within ProgramProgressProvider');
  }
  return context;
};

/**
 * Hook to refresh progress when screen comes into focus
 * FIX: Use background refresh to prevent UI blocking and visual reloads
 */
export const useRefreshProgressOnFocus = () => {
  const { refreshProgress } = useProgramProgress();

  useFocusEffect(
    useCallback(() => {
      // FIX: Refresh in background - don't block UI or cause visual reloads
      // This ensures data is fresh but doesn't interrupt user experience
      refreshProgress().catch(err => {
        // Silent fail - we'll retry on next focus or user action
        console.warn('[useRefreshProgressOnFocus] Background refresh failed:', err);
      });
    }, [refreshProgress])
  );
};
