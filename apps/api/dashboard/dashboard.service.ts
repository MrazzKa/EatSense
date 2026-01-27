import { Injectable, Logger } from '@nestjs/common';
import { StatsService } from '../stats/stats.service';
import { MealsService } from '../meals/meals.service';
import { UsersService } from '../users/users.service';
import { SuggestionsV2Service } from '../src/suggestions/suggestions-v2.service';
import { DietsService } from '../src/diets/diets.service';
import { SupportedLocale } from '../src/suggestions/suggestions.types';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        private readonly statsService: StatsService,
        private readonly mealsService: MealsService,
        private readonly usersService: UsersService,
        private readonly suggestionsService: SuggestionsV2Service,
        private readonly dietsService: DietsService,
    ) { }

    async getDashboardData(userId: string, dateStr?: string, locale: string = 'en') {
        const start = Date.now();
        const normalizedLocale = (['en', 'ru', 'kk'].includes(locale) ? locale : 'en') as SupportedLocale;

        // Parse date or use today
        let date = new Date();
        if (dateStr) {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
                date = parsed;
            }
        }

        try {
            // FIX: Execute critical requests first, then non-critical in parallel
            // This prevents "Slow Dashboard Load" from blocking critical data
            // Critical: stats, meals, userStats, activeDiet
            // Non-critical: suggestions (can be slow due to AI processing)
            
            // Critical requests - these must complete for dashboard to be useful
            const [stats, meals, userStats, activeDiet, todayTracker] = await Promise.all([
                // 1. Stats (Calories, Macros for today)
                this.getStatsForDate(userId, date),

                // 2. Meals
                this.mealsService.getMeals(userId, date.toISOString()),

                // 3. User Stats (Photos analyzed count etc - mainly for limits)
                this.usersService.getUserStats(userId).catch(e => {
                    this.logger.error(`Failed to get user stats: ${e.message}`);
                    return { totalPhotosAnalyzed: 0, todayPhotosAnalyzed: 0, dailyLimit: 3 };
                }),

                // 5. Active Diet Program (critical - needed for tracker)
                this.dietsService.getActiveDiet(userId, locale, true).catch(e => {
                    // It's normal to not have an active diet, expecting null or catch 404
                    return null;
                }),

                // 6. Today Tracker (Checklist state) - often needed with Active Diet
                this.dietsService.getTodayTracker(userId, locale).catch(e => null),
            ]);

            // Non-critical requests - can timeout or fail without breaking dashboard
            // FIX #3/#13: Suggestions can be slow (AI processing), increased timeout and improved error handling
            const suggestionsPromise = this.suggestionsService.getSuggestionsV2(userId, normalizedLocale)
                .catch(e => {
                    this.logger.error(`Failed to get suggestions: ${e.message}`, e.stack);
                    return { status: 'error', sections: [], error: e.message };
                });

            // FIX #3/#13: Increased timeout to 20 seconds to reduce timeout warnings
            // Suggestions are important but non-critical - dashboard should load even if they fail
            const suggestions = await Promise.race([
                suggestionsPromise,
                new Promise(resolve => setTimeout(() => {
                    this.logger.warn(`Suggestions timeout for user ${userId} after 20s - returning error status`);
                    resolve({ status: 'timeout', sections: [], message: 'Suggestions are taking longer than expected' });
                }, 20000)),
            ]) as any;

            const duration = Date.now() - start;
            if (duration > 3000) {
                this.logger.warn(`Slow dashboard load: ${duration}ms for user ${userId}`);
                // FIX: Log which requests are slow to help identify bottlenecks
                this.logger.debug(`Dashboard timing breakdown for user ${userId}:`, {
                    total: duration,
                    // Individual timings would require Promise.allSettled with timing, but that's complex
                    // For now, just log the warning - frontend will preserve cached activeDiet
                });
            }

            return {
                stats,
                meals,
                userStats,
                suggestions,
                // FIX: Always return activeDiet structure, even if null
                // This prevents frontend from clearing activeDiet on partial errors
                // Frontend should preserve previous activeDiet value if this is null (during slow loads)
                activeDiet: activeDiet ? { ...activeDiet, todayTracker } : null,
            };

        } catch (error) {
            this.logger.error(`Error aggregating dashboard data: ${error.message}`, error.stack);
            // FIX: Return partial data instead of throwing - allows UI to show cached/partial data
            // This prevents tracker from disappearing during slow loads
            return {
                stats: { today: {}, goals: {} },
                meals: [],
                userStats: { totalPhotosAnalyzed: 0, todayPhotosAnalyzed: 0, dailyLimit: 3 },
                suggestions: { status: 'error', sections: [] },
                activeDiet: null, // Let frontend preserve previous activeDiet from cache/store
            };
        }
    }

    private async getStatsForDate(userId: string, date: Date) {
        try {
            const dateStr = date.toISOString().split('T')[0];
            // Use getPersonalStats which returns { totals: ... }
            const result = await this.statsService.getPersonalStats(userId, dateStr, dateStr);
            return {
                today: {
                    calories: result.totals.calories,
                    protein: result.totals.protein,
                    fat: result.totals.fat,
                    carbs: result.totals.carbs,
                    meals: result.totals.entries // map entries to meals count roughly
                },
                goals: result.goals
            };
        } catch (error) {
            this.logger.error(`Failed to get stats: ${error.message}`);
            return { today: {}, goals: {} };
        }
    }
}
