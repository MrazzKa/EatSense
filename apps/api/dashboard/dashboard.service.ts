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
            // Execute all requests in parallel
            const [
                stats,
                meals,
                userStats,
                suggestions,
                activeDiet,
                todayTracker
            ] = await Promise.all([
                // 1. Stats (Calories, Macros for today)
                // If date is provided, we might want stats for THAT date.
                // StatsService.getDashboardStats is hardcoded to "today".
                // Use getPersonalStats for specific date if needed?
                // But Dashboard typically shows "Today's Status" logic even if browsing history?
                // Actually, existing Dashboard code passes `selectedDate` to `getStats`.
                // Let's defer to StatsService behavior. 
                // Logic from ApiService: calls /me/stats?from=date&to=date if date exists.
                // So we should replicate that logic here.
                this.getStatsForDate(userId, date),

                // 2. Meals
                this.mealsService.getMeals(userId, date.toISOString()),

                // 3. User Stats (Photos analyzed count etc - mainly for limits)
                // Ensure UsersService has getStats or similar
                this.usersService.getUserStats(userId).catch(e => {
                    this.logger.error(`Failed to get user stats: ${e.message}`);
                    return { totalPhotosAnalyzed: 0, todayPhotosAnalyzed: 0, dailyLimit: 3 };
                }),

                // 4. Suggestions (Personalized food advice)
                this.suggestionsService.getSuggestionsV2(userId, normalizedLocale).catch(e => {
                    this.logger.error(`Failed to get suggestions: ${e.message}`);
                    return { status: 'error', sections: [] };
                }),

                // 5. Active Diet Program
                this.dietsService.getActiveDiet(userId, locale, true).catch(e => {
                    // It's normal to not have an active diet, expecting null or catch 404
                    return null;
                }),

                // 6. Today Tracker (Checklist state) - often needed with Active Diet
                this.dietsService.getTodayTracker(userId, locale).catch(e => null),
            ]);

            const duration = Date.now() - start;
            if (duration > 1000) {
                this.logger.warn(`Slow dashboard load: ${duration}ms for user ${userId}`);
            }

            return {
                stats,
                meals,
                userStats,
                suggestions,
                activeDiet: activeDiet ? { ...activeDiet, todayTracker } : null,
            };

        } catch (error) {
            this.logger.error(`Error aggregating dashboard data: ${error.message}`, error.stack);
            throw error;
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
