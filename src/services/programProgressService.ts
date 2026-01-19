import ApiService from './apiService';
import type { ProgramProgress, DailyLog, ProgramType } from '../stores/ProgramProgressStore';

/**
 * Calculate current day index based on start date and paused days
 */
function calculateCurrentDayIndex(
  startDate: string,
  pausedDays: string[],
  today: string = new Date().toISOString().split('T')[0]
): number {
  const start = new Date(startDate);
  const end = new Date(today);

  // Calculate difference in days
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Subtract paused days
  const activeDays = diffDays - pausedDays.length;

  // Day 1 is the start date
  return Math.max(1, activeDays + 1);
}

/**
 * Calculate days left
 */
function calculateDaysLeft(currentDayIndex: number, durationDays: number): number {
  return Math.max(0, durationDays - (currentDayIndex - 1));
}

/**
 * Transform API response to ProgramProgress format
 */
function transformDietProgress(apiData: any): ProgramProgress {
  const startDate = apiData.startedAt
    ? new Date(apiData.startedAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const pausedDays: string[] = []; // TODO: Get from API if available
  const today = new Date().toISOString().split('T')[0];

  // FIX 2026-01-19: Use server's currentDay if available, otherwise calculate locally
  // This fixes the bug where completing a day shows "0 meals" and "0 days" because
  // the frontend was recalculating instead of using the server's updated value
  const currentDayIndex = apiData.currentDay || calculateCurrentDayIndex(startDate, pausedDays, today);
  const durationDays = apiData.program?.duration || 30;
  const daysLeft = calculateDaysLeft(currentDayIndex, durationDays);

  // Build logs from dailyLogs
  const logs: Record<string, DailyLog> = {};
  if (apiData.dailyLogs) {
    apiData.dailyLogs.forEach((log: any) => {
      const date = new Date(log.date).toISOString().split('T')[0];
      const checklist = (log.checklist as Record<string, boolean>) || {};
      const completedCount = Object.values(checklist).filter(Boolean).length;
      const totalCount = apiData.program?.dailyTracker?.length || 0;

      logs[date] = {
        date,
        completedCount,
        totalCount,
        completionRate: totalCount > 0 ? completedCount / totalCount : 0,
        completed: log.completed || false,
        celebrationShown: log.celebrationShown || false,
        checklist,
      };
    });
  }

  // Get today's log
  const todayLog = logs[today] || {
    date: today,
    completedCount: 0,
    totalCount: apiData.program?.dailyTracker?.length || 0,
    completionRate: 0,
    completed: false,
    celebrationShown: false,
    checklist: {},
  };

  return {
    id: apiData.id,
    type: 'diet',
    programId: apiData.programId,
    programName: apiData.program?.name,
    startDate,
    currentDayIndex,
    daysLeft,
    durationDays: apiData.program?.duration || 30,
    status: apiData.status || 'active',
    pausedDays,
    streak: {
      current: apiData.currentStreak || 0,
      longest: apiData.longestStreak || 0,
      threshold: apiData.program?.streakThreshold || 0.6,
    },
    logs,
    todayLog,
    todayPlan: apiData.todayPlan || [],
  };
}

/**
 * Transform Lifestyle API response to ProgramProgress format
 */
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function _transformLifestyleProgress(apiData: any): ProgramProgress {
  const startDate = apiData.startedAt
    ? new Date(apiData.startedAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const pausedDays: string[] = apiData.pausedDays || [];
  const today = new Date().toISOString().split('T')[0];

  const currentDayIndex = calculateCurrentDayIndex(startDate, pausedDays, today);
  const daysLeft = calculateDaysLeft(currentDayIndex, apiData.durationDays || 14);

  // Build logs
  const logs: Record<string, DailyLog> = {};
  if (apiData.dailyLogs) {
    apiData.dailyLogs.forEach((log: any) => {
      const date = new Date(log.date).toISOString().split('T')[0];
      const checklist = (log.checklist as Record<string, boolean>) || {};
      const completedCount = Object.values(checklist).filter(Boolean).length;
      const totalCount = log.totalCount || 0;

      // Use completionPercent from log if available, otherwise calculate
      const logCompletionPercent = log.completionPercent !== null && log.completionPercent !== undefined
        ? log.completionPercent
        : (totalCount > 0 ? completedCount / totalCount : 0);

      logs[date] = {
        date,
        completedCount,
        totalCount,
        completionRate: logCompletionPercent,
        completed: log.completed || false,
        celebrationShown: log.celebrationShown || false,
        checklist,
      };
    });
  }

  // Get today's log
  const todayLog = logs[today] || {
    date: today,
    completedCount: 0,
    totalCount: apiData.dailyInspiration?.length || 0,
    completionRate: 0,
    completed: false,
    celebrationShown: false,
    checklist: {},
  };

  return {
    id: apiData.id,
    type: 'lifestyle',
    programId: apiData.programId,
    programName: apiData.program?.name,
    startDate,
    currentDayIndex,
    daysLeft,
    durationDays: apiData.durationDays || 14,
    status: apiData.status || 'active',
    pausedDays,
    streak: {
      current: apiData.streak || 0,
      longest: apiData.longestStreak || 0,
      threshold: 0.6, // Default for lifestyle
    },
    logs,
    todayLog,
    dailyInspiration: apiData.dailyInspiration || [],
  };
}

class ProgramProgressService {
  /**
   * Get active program (diet or lifestyle)
   */
  async getActiveProgram(): Promise<ProgramProgress | null> {
    try {
      // Try diet first
      const dietData = await ApiService.getActiveDiet();
      console.log('[ProgramProgressService] getActiveDiet response:', {
        hasDietData: !!dietData,
        hasProgram: !!dietData?.program,
        programId: dietData?.programId,
        status: dietData?.status,
      });

      if (dietData && dietData.program) {
        const transformed = transformDietProgress(dietData);
        console.log('[ProgramProgressService] Transformed progress:', {
          id: transformed.id,
          programId: transformed.programId,
          status: transformed.status,
          currentDayIndex: transformed.currentDayIndex,
        });
        return transformed;
      }

      // Try lifestyle
      // TODO: Implement when lifestyle API is ready
      // const lifestyleData = await ApiService.get('/lifestyles/active');
      // if (lifestyleData) {
      //   return transformLifestyleProgress(lifestyleData);
      // }

      console.log('[ProgramProgressService] No active program found');
      return null;
    } catch (error: any) {
      console.log('[ProgramProgressService] Error:', error.status || error.message);
      // If 404, no active program
      if (error.status === 404 || error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get today's tracker state
   */
  async getTodayTracker(type: ProgramType): Promise<any> {
    if (type === 'diet') {
      return ApiService.get('/diets/active/today');
    } else {
      // TODO: Implement lifestyle tracker
      return ApiService.get('/lifestyles/active/today');
    }
  }

  /**
   * Update checklist
   */
  async updateChecklist(type: ProgramType, _programId: string, checklist: Record<string, boolean>): Promise<void> {
    if (type === 'diet') {
      await ApiService.patch('/diets/active/checklist', { checklist });
    } else {
      // TODO: Implement lifestyle checklist update
      await ApiService.patch('/lifestyles/active/checklist', { checklist });
    }
  }

  /**
   * Complete current day
   */
  /**
   * Complete current day
   * Returns the result so UI can react to updated values
   */
  async completeDay(type: ProgramType, _programId: string): Promise<{
    success: boolean;
    alreadyCompleted?: boolean;
    currentDay: number;
    daysCompleted: number;
    streak: number;
    isComplete: boolean;
    completionRate: number;
  }> {
    // Use dedicated complete-day endpoint
    const result = await ApiService.request('/diets/active/complete-day', {
      method: 'POST',
    });

    // Return the result so UI can react
    return {
      success: result.success,
      alreadyCompleted: result.alreadyCompleted,
      currentDay: result.currentDay,
      daysCompleted: result.daysCompleted,
      streak: result.streak,
      isComplete: result.isComplete,
      completionRate: result.completionRate,
    };
  }

  /**
   * Mark celebration as shown for today
   */
  async markCelebrationShown(type: ProgramType): Promise<void> {
    if (type === 'diet') {
      await ApiService.patch('/diets/active/mark-celebration-shown', {});
    } else {
      // TODO: Implement lifestyle celebration
      await ApiService.patch('/lifestyles/active/mark-celebration-shown', {});
    }
  }
}

export const programProgressService = new ProgramProgressService();
