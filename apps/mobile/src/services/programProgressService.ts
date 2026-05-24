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
 * FIX: Correct calculation - if currentDayIndex is 2 and durationDays is 30, daysLeft should be 29
 * Formula: daysLeft = durationDays - currentDayIndex + 1
 * Example: Day 2 of 30 = 30 - 2 + 1 = 29 days left
 */
function calculateDaysLeft(currentDayIndex: number, durationDays: number): number {
  // FIX: Correct formula - daysLeft = totalDays - currentDay + 1
  // If on day 1 of 30: 30 - 1 + 1 = 30 days left
  // If on day 2 of 30: 30 - 2 + 1 = 29 days left
  // If on day 30 of 30: 30 - 30 + 1 = 1 day left
  // FIX: Ensure currentDayIndex doesn't exceed durationDays (after completion)
  const clampedDay = Math.min(currentDayIndex, durationDays);
  return Math.max(0, durationDays - clampedDay + 1);
}

/**
 * Detect if a program is a lifestyle based on its fields
 * Lifestyle programs have: mantra, embrace, minimize, dailyInspiration, sampleDay
 * Diet programs have: dailyTracker, mealPlan
 */
function isLifestyleProgram(program: any): boolean {
  if (!program) return false;

  // Check for explicit type field from backend
  if (program.type === 'lifestyle' || program.dietType === 'lifestyle') {
    return true;
  }

  // Check for lifestyle-specific fields in program or program.rules
  const hasLifestyleFields = !!(
    program.mantra ||
    program.embrace ||
    program.minimize ||
    program.dailyInspiration ||
    program.sampleDay ||
    program.rules?.mantra ||
    program.rules?.embrace ||
    program.rules?.minimize ||
    program.rules?.dailyInspiration ||
    program.rules?.sampleDay
  );

  // Check for diet-specific fields
  const hasDietFields = !!(
    program.dailyTracker?.length > 0 ||
    program.mealPlan
  );

  // If it has lifestyle fields but no diet fields, it's a lifestyle
  return hasLifestyleFields && !hasDietFields;
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

  // FIX: Detect if this is a lifestyle program based on its fields
  const programType: ProgramType = isLifestyleProgram(apiData.program) ? 'lifestyle' : 'diet';

  // Build logs from dailyLogs
  const logs: Record<string, DailyLog> = {};

  // For lifestyle programs, use dailyInspiration for total count
  const lifestyleTrackerCount = apiData.program?.dailyInspiration?.length ||
    apiData.program?.rules?.dailyInspiration?.length || 0;
  const dietTrackerCount = apiData.program?.dailyTracker?.length || 0;
  const trackerCount = programType === 'lifestyle' ? lifestyleTrackerCount : dietTrackerCount;

  if (apiData.dailyLogs) {
    apiData.dailyLogs.forEach((log: any) => {
      const date = new Date(log.date).toISOString().split('T')[0];
      const checklist = (log.checklist as Record<string, boolean>) || {};
      const completedCount = Object.values(checklist).filter(Boolean).length;
      const totalCount = trackerCount;

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
  // FIX: Always use today's date to get the correct log, not a cached/old log
  // This ensures completed status is checked for TODAY, not yesterday
  const todayLog = logs[today] || {
    date: today,
    completedCount: 0,
    totalCount: trackerCount,
    completionRate: 0,
    completed: false, // FIX: Always false for new day - prevents showing "Day completed" incorrectly
    celebrationShown: false,
    checklist: {},
  };

  // FIX: If API provides todayLog directly, use it (more reliable than parsing from dailyLogs)
  // This ensures we get the correct completed status from the server
  if (apiData.todayLog && apiData.todayLog.date === today) {
    todayLog.completed = apiData.todayLog.completed || false;
    todayLog.celebrationShown = apiData.todayLog.celebrationShown || false;
  }

  // Build base progress object
  const progress: ProgramProgress = {
    id: apiData.id,
    type: programType,
    programId: apiData.programId,
    programName: apiData.program?.name,
    programMetadata: apiData.program, // Include full program data for UI
    startDate,
    currentDayIndex,
    daysLeft,
    durationDays: apiData.program?.duration || (programType === 'lifestyle' ? 14 : 30),
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

  // Add lifestyle-specific data if it's a lifestyle program
  if (programType === 'lifestyle') {
    progress.dailyInspiration = apiData.program?.dailyInspiration ||
      apiData.program?.rules?.dailyInspiration || [];
  }

  return progress;
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
  async completeDay(_type: ProgramType, _programId: string): Promise<{
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
