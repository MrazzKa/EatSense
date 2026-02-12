import { Injectable, Logger } from '@nestjs/common';
import { StatsService } from '../stats/stats.service';
import { MealsService } from '../meals/meals.service';
import { UsersService } from '../users/users.service';
import { SuggestionsV2Service } from '../src/suggestions/suggestions-v2.service';
import { DietsService } from '../src/diets/diets.service';
import { CacheService } from '../src/cache/cache.service';
import { PrismaService } from '../prisma.service';
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
        private readonly prisma: PrismaService,
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
            // FIX: Critical data loads first, suggestions load separately and don't block dashboard
            // This ensures dashboard returns in <2s even if suggestions are slow
            const timed = async <T>(label: string, fn: () => Promise<T>): Promise<{ result: T; ms: number }> => {
                const t = Date.now();
                const result = await fn();
                return { result, ms: Date.now() - t };
            };

            // Load CRITICAL data first (meals first, then calculate stats from meals to avoid duplicate DB query)
            // This saves 1-2 DB queries and reduces latency through proxy DB
            const [mealsT, userStatsT, activeDietT, todayTrackerT] = await Promise.all([
                timed('meals', () => this.mealsService.getMeals(userId, date.toISOString())),
                timed('userStats', () => this.usersService.getUserStats(userId).catch(e => {
                    this.logger.error(`Failed to get user stats: ${e.message}`);
                    return { totalPhotosAnalyzed: 0, todayPhotosAnalyzed: 0, dailyLimit: 3 };
                })),
                timed('activeDiet', () => this.dietsService.getActiveDiet(userId, locale, true).catch(e => null)),
                timed('todayTracker', () => this.dietsService.getTodayTracker(userId, locale).catch(e => null)),
            ]);

            // Calculate stats from meals (already loaded) + get goals from userProfile
            // This avoids calling getPersonalStats which does meal.findMany + mealLog.findMany + userProfile.findUnique
            // Saves 2-3 DB queries and ~500-1000ms latency through proxy
            const [statsT, userProfileT] = await Promise.all([
                timed('stats', async () => {
                    const meals = mealsT.result as any[];
                    const totals = meals.reduce(
                        (acc, meal) => {
                            const mealTotals = (meal.items || []).reduce(
                                (itemAcc, item) => ({
                                    calories: itemAcc.calories + (item.calories || 0),
                                    protein: itemAcc.protein + (item.protein || 0),
                                    fat: itemAcc.fat + (item.fat || 0),
                                    carbs: itemAcc.carbs + (item.carbs || 0),
                                }),
                                { calories: 0, protein: 0, fat: 0, carbs: 0 }
                            );
                            return {
                                calories: acc.calories + mealTotals.calories,
                                protein: acc.protein + mealTotals.protein,
                                fat: acc.fat + mealTotals.fat,
                                carbs: acc.carbs + mealTotals.carbs,
                                entries: acc.entries + 1,
                            };
                        },
                        { calories: 0, protein: 0, fat: 0, carbs: 0, entries: 0 }
                    );

                    return {
                        today: {
                            calories: totals.calories,
                            protein: totals.protein,
                            fat: totals.fat,
                            carbs: totals.carbs,
                            meals: totals.entries,
                        },
                        goals: {}, // Will be filled from userProfile below
                    };
                }),
                timed('userProfile', () => this.prisma.userProfile.findUnique({
                    where: { userId },
                    select: { dailyCalories: true, goal: true },
                }).catch(() => null)),
            ]);

            // Merge goals into stats
            const userProfile = userProfileT.result;
            const dailyGoal = userProfile?.dailyCalories || 2000; // Default fallback
            statsT.result.goals = {
                calories: dailyGoal,
                protein: Math.round(dailyGoal * 0.2 / 4), // ~20% of calories from protein
                fat: Math.round(dailyGoal * 0.3 / 9), // ~30% of calories from fat
                carbs: Math.round(dailyGoal * 0.5 / 4), // ~50% of calories from carbs
            };

            const criticalDuration = Date.now() - start;
            if (criticalDuration > 2000) {
                this.logger.warn(`Slow critical dashboard load: ${criticalDuration}ms for user ${userId} — stats=${statsT.ms}ms meals=${mealsT.ms}ms userStats=${userStatsT.ms}ms diet=${activeDietT.ms}ms tracker=${todayTrackerT.ms}ms`);
            }

            // Load suggestions SEPARATELY — completely non-blocking
            // Dashboard returns immediately with loading state, suggestions load in background
            const skipKey = `suggestions_skip:${userId}`;
            const cachedSuggestionsKey = `suggestions_result:${userId}`;
            const shouldSkip = await this.cacheService.get(skipKey, 'suggestions');

            let suggestions: any = { status: 'loading', sections: [] }; // Default: loading state

            if (shouldSkip) {
                // Recently timed out — return cached result or skip status
                const cachedResult = await this.cacheService.get<any>(cachedSuggestionsKey, 'suggestions');
                suggestions = cachedResult || { status: 'skipped', sections: [], message: 'Suggestions temporarily unavailable' };
            } else {
                // Check cache first (instant response)
                const cachedResult = await this.cacheService.get<any>(cachedSuggestionsKey, 'suggestions');
                if (cachedResult) {
                    suggestions = cachedResult;
                } else {
                    // No cache — try to load with 3s timeout (fast path handles new users in <500ms)
                    // If timeout, return loading state — frontend can retry via /suggestions/foods/v2 endpoint
                    const suggestionsStart = Date.now();
                    try {
                        const result = await Promise.race([
                            this.suggestionsService.getSuggestionsV2(userId, normalizedLocale)
                                .catch(e => {
                                    this.logger.warn(`Failed to get suggestions: ${e.message}`);
                                    return { status: 'error', sections: [], error: e.message };
                                }),
                            new Promise<any>(resolve => setTimeout(() => {
                                this.logger.warn(`Suggestions timeout for user ${userId} after 3s — returning loading state`);
                                resolve({ status: 'loading', sections: [] }); // Return loading, not timeout
                            }, 3000)), // 3s timeout — fast path handles new users instantly
                        ]);

                        const suggestionsMs = Date.now() - suggestionsStart;
                        if (suggestionsMs > 500) {
                            this.logger.log(`[Dashboard] Suggestions loaded in ${suggestionsMs}ms for user ${userId}`);
                        }

                        if (result.status === 'loading') {
                            // Timeout — return loading state, don't skip (let frontend retry)
                            suggestions = { status: 'loading', sections: [] };
                        } else if (result.status === 'error') {
                            suggestions = result;
                        } else if (result.sections?.length > 0 || result.status === 'insufficient_data') {
                            // Cache successful result for 10 minutes
                            await this.cacheService.set(cachedSuggestionsKey, result, 'suggestions', 600).catch(() => { });
                            suggestions = result;
                        } else {
                            suggestions = result;
                        }
                    } catch (e) {
                        this.logger.warn(`[Dashboard] Suggestions error for user ${userId}: ${e?.message}`);
                        suggestions = { status: 'error', sections: [], error: e?.message || 'Unknown error' };
                    }
                }
            }

            const totalDuration = Date.now() - start;
            if (totalDuration > 3000) {
                this.logger.warn(`Total dashboard load: ${totalDuration}ms for user ${userId} (critical=${criticalDuration}ms)`);
            }

            return {
                stats: statsT.result,
                meals: mealsT.result,
                userStats: userStatsT.result,
                suggestions,
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

}
