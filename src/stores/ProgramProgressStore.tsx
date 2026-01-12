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
  completeDay: () => Promise<void>;
  markCelebrationShown: () => Promise<void>;
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
        setActiveProgram(null);
        cache.current.delete(CACHE_KEY);
      }
    } catch (err: any) {
      console.error('[ProgramProgressStore] Load failed:', err);
      setError(err.message || 'Failed to load progress');
      setActiveProgram(null);
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
        setActiveProgram(null);
        cache.current.delete(CACHE_KEY);
      }
    } catch (err) {
      console.error('[ProgramProgressStore] Background refresh failed:', err);
    }
  }, []);

  const refreshProgress = useCallback(async () => {
    cache.current.delete(CACHE_KEY);
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
      // Refresh to get updated progress
      await refreshProgress();
    } catch (err: any) {
      console.error('[ProgramProgressStore] Update checklist failed:', err);
      setError(err.message || 'Failed to update checklist');
    }
  }, [activeProgram, refreshProgress]);

  const completeDay = useCallback(async () => {
    if (!activeProgram) return;

    try {
      await programProgressService.completeDay(activeProgram.type, activeProgram.programId);
      // Invalidate cache and refresh
      invalidateCache();
      await loadProgress();
    } catch (err: any) {
      console.error('[ProgramProgressStore] Complete day failed:', err);
      setError(err.message || 'Failed to complete day');
      throw err;
    }
  }, [activeProgram, invalidateCache, loadProgress]);

  const markCelebrationShown = useCallback(async () => {
    if (!activeProgram) return;

    try {
      await programProgressService.markCelebrationShown(activeProgram.type);
      // Refresh to get updated celebrationShown flag
      await refreshProgress();
    } catch (err: any) {
      console.error('[ProgramProgressStore] Mark celebration shown failed:', err);
    }
  }, [activeProgram, refreshProgress]);

  // Load on mount
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

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
 */
export const useRefreshProgressOnFocus = () => {
  const { refreshProgress } = useProgramProgress();

  useFocusEffect(
    useCallback(() => {
      refreshProgress();
    }, [refreshProgress])
  );
};
