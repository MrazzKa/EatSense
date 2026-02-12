import { Injectable, Logger } from '@nestjs/common';
import { StatsService } from '../stats/stats.service';
import { MealsService } from '../meals/meals.service';
import { UsersService } from '../users/users.service';
import { SuggestionsV2Service } from '../src/suggestions/suggestions-v2.service';
import { DietsService } from '../src/diets/diets.service';
import { CacheService } from '../src/cache/cache.service';
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
        private readonly cacheService: CacheService,
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
            // FIX: Run ALL requests in parallel (including suggestions) but with individual timing
            // Suggestions have their own timeout — they won't block the dashboard response
            const timed = async <T>(label: string, fn: () => Promise<T>): Promise<{ result: T; ms: number }> => {
                const t = Date.now();
                const result = await fn();
                return { result, ms: Date.now() - t };
            };

            // Check if suggestions should be skipped (recent timeout)
            const skipKey = `suggestions_skip:${userId}`;
            const cachedSuggestionsKey = `suggestions_result:${userId}`;
            const shouldSkip = await this.cacheService.get(skipKey, 'suggestions');

            // Build suggestions promise (non-blocking, with reduced 12s timeout)
            const suggestionsPromise = (async () => {
                if (shouldSkip) {
                    const cachedResult = await this.cacheService.get<any>(cachedSuggestionsKey, 'suggestions');
                    return cachedResult
                        ? cachedResult
                        : { status: 'skipped', sections: [], message: 'Suggestions temporarily unavailable' };
                }

                const result = await Promise.race([
                    this.suggestionsService.getSuggestionsV2(userId, normalizedLocale)
                        .catch(e => {
                            this.logger.warn(`Failed to get suggestions: ${e.message}`);
                            return { status: 'error', sections: [], error: e.message };
                        }),
                    new Promise<any>(resolve => setTimeout(() => {
                        this.logger.warn(`Suggestions timeout for user ${userId} after 12s`);
                        resolve({ status: 'timeout', sections: [], message: 'Suggestions are taking longer than expected' });
                    }, 12000)), // Reduced from 25s to 12s — fast path handles new users instantly
                ]);

                if (result.status === 'timeout') {
                    // Skip suggestions for this user for 3 minutes
                    await this.cacheService.set(skipKey, 'true', 'suggestions', 180).catch(() => {});
                } else if (result.sections?.length > 0) {
                    // Cache successful result for 5 minutes
                    await this.cacheService.set(cachedSuggestionsKey, result, 'suggestions', 300).catch(() => {});
                }
                return result;
            })();

            // Run ALL in parallel — suggestions won't delay critical data
            const [statsT, mealsT, userStatsT, activeDietT, todayTrackerT, suggestionsT] = await Promise.all([
                timed('stats', () => this.getStatsForDate(userId, date)),

                timed('meals', () => this.mealsService.getMeals(userId, date.toISOString())),

                timed('userStats', () => this.usersService.getUserStats(userId).catch(e => {
                    this.logger.error(`Failed to get user stats: ${e.message}`);
                    return { totalPhotosAnalyzed: 0, todayPhotosAnalyzed: 0, dailyLimit: 3 };
                })),

                timed('activeDiet', () => this.dietsService.getActiveDiet(userId, locale, true).catch(e => null)),

                timed('todayTracker', () => this.dietsService.getTodayTracker(userId, locale).catch(e => null)),

                timed('suggestions', () => suggestionsPromise),
            ]);

            const duration = Date.now() - start;
            if (duration > 2000) {
                this.logger.warn(`Slow dashboard load: ${duration}ms for user ${userId} — stats=${statsT.ms}ms meals=${mealsT.ms}ms userStats=${userStatsT.ms}ms diet=${activeDietT.ms}ms tracker=${todayTrackerT.ms}ms suggestions=${suggestionsT.ms}ms`);
            }

            return {
                stats: statsT.result,
                meals: mealsT.result,
                userStats: userStatsT.result,
                suggestions: suggestionsT.result,
                activeDiet: activeDietT.result ? { ...activeDietT.result, todayTracker: todayTrackerT.result } : null,
            };

        } catch (error) {
            this.logger.error(`Error aggregating dashboard data: ${error.message}`, error.stack);
            return {
                stats: { today: {}, goals: {} },
                meals: [],
                userStats: { totalPhotosAnalyzed: 0, todayPhotosAnalyzed: 0, dailyLimit: 3 },
                suggestions: { status: 'error', sections: [] },
                activeDiet: null,
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
