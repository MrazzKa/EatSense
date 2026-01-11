import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
    SuggestedFoodV2Response,
    SuggestionSection,
    SuggestionItem,
    SuggestionStatus,
    HealthLevel,
    NutrientSeverity,
    NutrientSeverities,
    NutritionTargets,
    SupportedLocale,
} from './suggestions.types';
import {
    FOOD_CATALOG,
    RECIPE_TEMPLATES,
    filterCatalogFoods,
    getFoodName,
    getRecipeTitle,
    getRecipeDescription,
    CatalogFood,
} from './food-catalog';

@Injectable()
export class SuggestionsV2Service {
    private readonly logger = new Logger(SuggestionsV2Service.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get personalized food suggestions based on real meal data
     */
    async getSuggestionsV2(
        userId: string,
        locale: SupportedLocale = 'en',
    ): Promise<SuggestedFoodV2Response> {
        const debug = process.env.SUGGESTIONS_DEBUG === 'true';

        try {
            // 1. Get user profile
            const userProfile = await this.prisma.userProfile.findUnique({
                where: { userId },
            });

            const goal = (userProfile?.goal as string) || 'maintain_weight';
            const preferences = (userProfile?.preferences as any) || {};
            const dietaryPreferences: string[] = preferences.dietaryPreferences || [];
            const allergies: string[] = preferences.allergies || [];
            const weight = userProfile?.weight || null;

            // 2. Get meals for last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            const meals = await this.prisma.meal.findMany({
                where: {
                    userId,
                    OR: [
                        { consumedAt: { gte: sevenDaysAgo } },
                        { consumedAt: null, createdAt: { gte: sevenDaysAgo } },
                    ],
                },
                include: { items: true },
                orderBy: { createdAt: 'desc' },
            });

            // 3. Calculate stats
            const stats = this.calculateStats(meals);

            if (debug) {
                this.logger.debug(`[SuggestionsV2] userId=${userId} stats:`, stats);
            }

            // 4. Check for insufficient data
            if (stats.mealsCount < 3 || stats.daysWithMeals < 2) {
                return this.buildInsufficientDataResponse(locale, stats);
            }

            // 5. Get nutrition targets based on goal
            const targets = this.getTargets(goal, weight);

            // 6. Calculate severities
            const severities = this.classifySeverities(stats, targets);

            // 7. Calculate health score
            const healthScore = this.calculateHealthScore(severities, stats);
            const healthLevel = this.getHealthLevel(healthScore);

            // 8. Get recent food names to avoid repetition
            const recentFoodNames = new Set<string>();
            meals.forEach((meal) => {
                meal.items.forEach((item) => {
                    recentFoodNames.add(item.name.toLowerCase());
                });
            });

            // 9. Build sections
            const sections = this.buildSections(
                severities,
                stats,
                targets,
                locale,
                dietaryPreferences,
                allergies,
                recentFoodNames,
            );

            // 10. Build summary
            const summary = this.buildSummary(severities, stats, targets, locale, goal);

            // 11. Build health reasons
            const reasons = this.buildHealthReasons(severities, stats, targets, locale);

            if (debug) {
                this.logger.debug(`[SuggestionsV2] severities:`, severities);
                this.logger.debug(`[SuggestionsV2] healthScore=${healthScore}, sections=${sections.length}`);
            }

            // STEP 4: Structured observability log for suggestions pipeline
            this.logger.log(JSON.stringify({
                stage: 'suggestions_v2',
                userId,
                locale,
                goal,
                mealsAnalyzed: stats.mealsCount,
                daysWithMeals: stats.daysWithMeals,
                severities: {
                    protein: severities.protein,
                    fiber: severities.fiber,
                    fat: severities.fat,
                    carbs: severities.carbs,
                },
                healthScore,
                healthLevel,
                sectionsCount: sections.length,
                sectionTypes: sections.map(s => s.id),
            }));

            return {
                status: 'ok',
                locale,
                summary,
                health: {
                    level: healthLevel,
                    score: healthScore,
                    reasons,
                },
                stats: {
                    daysWithMeals: stats.daysWithMeals,
                    mealsCount: stats.mealsCount,
                    avgCalories: Math.round(stats.avgCalories),
                    avgProteinG: Math.round(stats.avgProtein),
                    avgFatG: Math.round(stats.avgFat),
                    avgCarbsG: Math.round(stats.avgCarbs),
                    avgFiberG: Math.round(stats.avgFiber * 10) / 10,
                    macroPercents: {
                        protein: Math.round(stats.proteinPerc),
                        fat: Math.round(stats.fatPerc),
                        carbs: Math.round(stats.carbsPerc),
                    },
                },
                sections,
            };
        } catch (error) {
            this.logger.error('[SuggestionsV2] Error:', error);
            return {
                status: 'error',
                locale,
                summary: this.getErrorSummary(locale),
                health: { level: 'average', score: 50, reasons: [] },
                stats: {
                    daysWithMeals: 0,
                    mealsCount: 0,
                    avgCalories: 0,
                    avgProteinG: 0,
                    avgFatG: 0,
                    avgCarbsG: 0,
                    avgFiberG: 0,
                    macroPercents: { protein: 0, fat: 0, carbs: 0 },
                },
                sections: [],
            };
        }
    }

    /**
     * Calculate stats from meals
     */
    private calculateStats(meals: any[]): {
        daysWithMeals: number;
        mealsCount: number;
        avgCalories: number;
        avgProtein: number;
        avgFat: number;
        avgCarbs: number;
        avgFiber: number;
        proteinPerc: number;
        fatPerc: number;
        carbsPerc: number;
        uniqueFoods: number;
    } {
        const datesWithMeals = new Set<string>();
        const uniqueFoods = new Set<string>();

        let totalCalories = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalCarbs = 0;
        let totalFiber = 0;
        let mealsCount = 0;

        for (const meal of meals) {
            if (meal.items.length === 0) continue;

            mealsCount++;
            const mealDate = (meal.consumedAt || meal.createdAt).toISOString().split('T')[0];
            datesWithMeals.add(mealDate);

            for (const item of meal.items) {
                totalCalories += item.calories || 0;
                totalProtein += item.protein || 0;
                totalFat += item.fat || 0;
                totalCarbs += item.carbs || 0;
                totalFiber += item.fiber || 0;
                uniqueFoods.add(item.name.toLowerCase());
            }
        }

        const daysWithMeals = datesWithMeals.size || 1; // Avoid division by zero

        // Calculate averages PER DAY (not per 7 days!)
        const avgCalories = totalCalories / daysWithMeals;
        const avgProtein = totalProtein / daysWithMeals;
        const avgFat = totalFat / daysWithMeals;
        const avgCarbs = totalCarbs / daysWithMeals;
        const avgFiber = totalFiber / daysWithMeals;

        // Calculate macro percentages
        const proteinCal = avgProtein * 4;
        const fatCal = avgFat * 9;
        const carbsCal = avgCarbs * 4;
        const totalMacroCal = proteinCal + fatCal + carbsCal;

        const proteinPerc = totalMacroCal > 0 ? (proteinCal / totalMacroCal) * 100 : 0;
        const fatPerc = totalMacroCal > 0 ? (fatCal / totalMacroCal) * 100 : 0;
        const carbsPerc = totalMacroCal > 0 ? (carbsCal / totalMacroCal) * 100 : 0;

        return {
            daysWithMeals,
            mealsCount,
            avgCalories,
            avgProtein,
            avgFat,
            avgCarbs,
            avgFiber,
            proteinPerc,
            fatPerc,
            carbsPerc,
            uniqueFoods: uniqueFoods.size,
        };
    }

    /**
     * Get nutrition targets based on goal
     */
    private getTargets(goal: string, weight: number | null): NutritionTargets {
        const targets: Record<string, NutritionTargets> = {
            lose_weight: {
                proteinPercMin: 20,
                fatPercMax: 30,
                carbsPercMax: 50,
                fiberGMin: 20,
                proteinGPerKg: weight ? 1.8 : undefined,
            },
            maintain_weight: {
                proteinPercMin: 18,
                fatPercMax: 35,
                carbsPercMax: 55,
                fiberGMin: 25,
                proteinGPerKg: weight ? 1.6 : undefined,
            },
            gain_weight: {
                proteinPercMin: 25,
                fatPercMax: 35,
                carbsPercMax: 55,
                fiberGMin: 25,
                proteinGPerKg: weight ? 1.8 : undefined,
            },
        };

        return targets[goal] || targets.maintain_weight;
    }

    /**
     * Classify severity for each nutrient
     */
    private classifySeverities(
        stats: ReturnType<typeof this.calculateStats>,
        targets: NutritionTargets,
    ): NutrientSeverities {
        const classifyPercent = (actual: number, target: number, isMax: boolean): NutrientSeverity => {
            const ratio = actual / target;
            if (isMax) {
                // For max targets (fat, carbs): lower is better
                if (ratio <= 0.9) return 'ok';
                if (ratio <= 1.1) return 'ok';
                if (ratio <= 1.3) return 'high';
                return 'very_high';
            } else {
                // For min targets (protein): higher is better
                if (ratio >= 1.1) return 'ok';
                if (ratio >= 0.9) return 'ok';
                if (ratio >= 0.6) return 'low';
                return 'very_low';
            }
        };

        const classifyFiber = (actual: number, min: number): NutrientSeverity => {
            if (actual >= min) return 'ok';
            if (actual >= min * 0.7) return 'low';
            return 'very_low';
        };

        return {
            protein: classifyPercent(stats.proteinPerc, targets.proteinPercMin, false),
            fiber: classifyFiber(stats.avgFiber, targets.fiberGMin),
            fat: classifyPercent(stats.fatPerc, targets.fatPercMax, true),
            carbs: classifyPercent(stats.carbsPerc, targets.carbsPercMax, true),
            variety: stats.uniqueFoods >= 10 ? 'ok' : 'low',
            loggingQuality: stats.mealsCount >= 5 && stats.daysWithMeals >= 3 ? 'ok' : 'low',
        };
    }

    /**
     * Calculate health score (0-100)
     */
    private calculateHealthScore(
        severities: NutrientSeverities,
        stats: ReturnType<typeof this.calculateStats>,
    ): number {
        let score = 100;

        // Protein (25 points)
        if (severities.protein === 'very_low') score -= 25;
        else if (severities.protein === 'low') score -= 15;

        // Fiber (20 points)
        if (severities.fiber === 'very_low') score -= 20;
        else if (severities.fiber === 'low') score -= 10;

        // Fat (20 points)
        if (severities.fat === 'very_high') score -= 20;
        else if (severities.fat === 'high') score -= 10;

        // Carbs (15 points)
        if (severities.carbs === 'very_high') score -= 15;
        else if (severities.carbs === 'high') score -= 8;

        // Variety/Logging (20 points)
        if (severities.variety === 'low') score -= 10;
        if (severities.loggingQuality === 'low') score -= 10;

        return Math.max(0, Math.min(100, score));
    }

    private getHealthLevel(score: number): HealthLevel {
        if (score >= 85) return 'excellent';
        if (score >= 65) return 'good';
        if (score >= 45) return 'average';
        return 'poor';
    }

    /**
     * Build personalized summary for dashboard card
     */
    private buildSummary(
        severities: NutrientSeverities,
        stats: ReturnType<typeof this.calculateStats>,
        targets: NutritionTargets,
        locale: SupportedLocale,
        goal: string,
    ): string {
        const issues: string[] = [];

        // Find main issue
        if (severities.protein === 'very_low' || severities.protein === 'low') {
            const deficit = Math.round(targets.proteinPercMin - stats.proteinPerc);
            if (locale === 'ru' || locale === 'kk') {
                issues.push(`Белка ниже нормы на ~${deficit}%`);
            } else {
                issues.push(`Protein is ~${deficit}% below target`);
            }
        }

        if (severities.fiber === 'very_low' || severities.fiber === 'low') {
            const deficit = Math.round(targets.fiberGMin - stats.avgFiber);
            if (locale === 'ru' || locale === 'kk') {
                issues.push(`Клетчатки не хватает ~${deficit}г/день`);
            } else {
                issues.push(`Fiber is ~${deficit}g/day below target`);
            }
        }

        if (severities.fat === 'high' || severities.fat === 'very_high') {
            if (locale === 'ru' || locale === 'kk') {
                issues.push(`Много жиров (${Math.round(stats.fatPerc)}%)`);
            } else {
                issues.push(`High fat intake (${Math.round(stats.fatPerc)}%)`);
            }
        }

        if (issues.length === 0) {
            // Balanced diet
            if (locale === 'ru' || locale === 'kk') {
                return 'Отлично! Твой рацион сбалансирован за последние дни. Продолжай так!';
            }
            return 'Great job! Your diet has been well balanced. Keep it up!';
        }

        // Build suggestion
        const mainIssue = issues[0];
        let suggestion = '';

        if (severities.protein === 'very_low' || severities.protein === 'low') {
            if (locale === 'ru' || locale === 'kk') {
                suggestion = 'Добавь порцию творога, яиц или курицы сегодня.';
            } else {
                suggestion = 'Add a serving of cottage cheese, eggs, or chicken today.';
            }
        } else if (severities.fiber === 'very_low' || severities.fiber === 'low') {
            if (locale === 'ru' || locale === 'kk') {
                suggestion = 'Добавь овощи или овсянку в следующий приём пищи.';
            } else {
                suggestion = 'Add vegetables or oatmeal to your next meal.';
            }
        } else if (severities.fat === 'high' || severities.fat === 'very_high') {
            if (locale === 'ru' || locale === 'kk') {
                suggestion = 'Попробуй заменить жирные соусы на легкие заправки.';
            } else {
                suggestion = 'Try replacing fatty sauces with lighter dressings.';
            }
        }

        return `${mainIssue}. ${suggestion}`;
    }

    /**
     * Build health reasons for UI
     */
    private buildHealthReasons(
        severities: NutrientSeverities,
        stats: ReturnType<typeof this.calculateStats>,
        targets: NutritionTargets,
        locale: SupportedLocale,
    ): string[] {
        const reasons: string[] = [];

        if (severities.protein === 'ok') {
            reasons.push(locale === 'ru' ? '✓ Белок в норме' : '✓ Protein is adequate');
        } else {
            reasons.push(locale === 'ru' ? `✗ Белок: ${Math.round(stats.proteinPerc)}%` : `✗ Protein: ${Math.round(stats.proteinPerc)}%`);
        }

        if (severities.fiber === 'ok') {
            reasons.push(locale === 'ru' ? '✓ Клетчатка в норме' : '✓ Fiber is adequate');
        } else {
            reasons.push(locale === 'ru' ? `✗ Клетчатка: ${Math.round(stats.avgFiber)}г/день` : `✗ Fiber: ${Math.round(stats.avgFiber)}g/day`);
        }

        if (severities.fat === 'ok') {
            reasons.push(locale === 'ru' ? '✓ Жиры в норме' : '✓ Fat is balanced');
        } else {
            reasons.push(locale === 'ru' ? `✗ Жиры: ${Math.round(stats.fatPerc)}%` : `✗ Fat: ${Math.round(stats.fatPerc)}%`);
        }

        return reasons.slice(0, 5);
    }

    /**
     * Build recommendation sections with filtered foods and recipes
     */
    private buildSections(
        severities: NutrientSeverities,
        stats: ReturnType<typeof this.calculateStats>,
        targets: NutritionTargets,
        locale: SupportedLocale,
        dietaryPreferences: string[],
        allergies: string[],
        recentFoodNames: Set<string>,
    ): SuggestionSection[] {
        const sections: SuggestionSection[] = [];

        // Convert recent food names to catalog IDs (approximate matching)
        const recentFoodIds = new Set<string>();
        for (const name of recentFoodNames) {
            for (const food of FOOD_CATALOG) {
                if (name.includes(food.nameEn.toLowerCase()) ||
                    name.includes(food.nameRu.toLowerCase())) {
                    recentFoodIds.add(food.id);
                }
            }
        }

        // Protein section
        if (severities.protein === 'very_low' || severities.protein === 'low') {
            const proteinFoods = filterCatalogFoods(
                FOOD_CATALOG.filter(f => f.category === 'protein'),
                dietaryPreferences,
                allergies,
                recentFoodIds,
            ).slice(0, 4);

            const proteinRecipes = RECIPE_TEMPLATES
                .filter(r => r.category === 'protein' || r.category === 'balanced')
                .slice(0, 2);

            const items: SuggestionItem[] = proteinRecipes.map(r => ({
                id: r.id,
                title: getRecipeTitle(r, locale),
                description: getRecipeDescription(r, locale),
                tags: r.tags,
            }));

            // Add individual foods
            proteinFoods.slice(0, 3).forEach(food => {
                items.push({
                    id: food.id,
                    title: getFoodName(food, locale),
                    description: locale === 'ru'
                        ? `${food.proteinPer100g || '~10'}г белка на 100г`
                        : `${food.proteinPer100g || '~10'}g protein per 100g`,
                    tags: food.tags.filter(t => ['quick', 'budget', 'no_cook'].includes(t)),
                });
            });

            sections.push({
                id: 'protein',
                category: 'protein',
                title: locale === 'ru' ? 'Добавь белок' : 'Add Protein',
                subtitle: locale === 'ru'
                    ? `Белок только ${Math.round(stats.proteinPerc)}% — цель ${targets.proteinPercMin}%+`
                    : `Protein is ${Math.round(stats.proteinPerc)}% — target is ${targets.proteinPercMin}%+`,
                items: items.slice(0, 5),
            });
        }

        // Fiber section
        if (severities.fiber === 'very_low' || severities.fiber === 'low') {
            const fiberFoods = filterCatalogFoods(
                FOOD_CATALOG.filter(f => f.category === 'fiber'),
                dietaryPreferences,
                allergies,
                recentFoodIds,
            ).slice(0, 4);

            const fiberRecipes = RECIPE_TEMPLATES
                .filter(r => r.category === 'fiber')
                .slice(0, 2);

            const items: SuggestionItem[] = fiberRecipes.map(r => ({
                id: r.id,
                title: getRecipeTitle(r, locale),
                description: getRecipeDescription(r, locale),
                tags: r.tags,
            }));

            fiberFoods.slice(0, 3).forEach(food => {
                items.push({
                    id: food.id,
                    title: getFoodName(food, locale),
                    description: locale === 'ru'
                        ? 'Богат клетчаткой и витаминами'
                        : 'Rich in fiber and vitamins',
                    tags: food.tags.filter(t => ['quick', 'budget', 'no_cook'].includes(t)),
                });
            });

            sections.push({
                id: 'fiber',
                category: 'fiber',
                title: locale === 'ru' ? 'Добавь клетчатку' : 'Add Fiber',
                subtitle: locale === 'ru'
                    ? `Клетчатка ~${Math.round(stats.avgFiber)}г/день — цель ${targets.fiberGMin}г+`
                    : `Fiber is ~${Math.round(stats.avgFiber)}g/day — target is ${targets.fiberGMin}g+`,
                items: items.slice(0, 5),
            });
        }

        // Healthy fat section (if fat is too high, suggest healthy alternatives)
        if (severities.fat === 'high' || severities.fat === 'very_high') {
            const healthyFatFoods = filterCatalogFoods(
                FOOD_CATALOG.filter(f => f.category === 'healthy_fat'),
                dietaryPreferences,
                allergies,
                recentFoodIds,
            ).slice(0, 3);

            const items: SuggestionItem[] = healthyFatFoods.map(food => ({
                id: food.id,
                title: getFoodName(food, locale),
                description: locale === 'ru'
                    ? 'Полезные жиры вместо насыщенных'
                    : 'Healthy fats instead of saturated',
                tags: food.tags.filter(t => ['quick', 'budget', 'no_cook'].includes(t)),
            }));

            sections.push({
                id: 'healthy_fat',
                category: 'healthy_fat',
                title: locale === 'ru' ? 'Замени жиры' : 'Switch Fats',
                subtitle: locale === 'ru'
                    ? `Жиры ${Math.round(stats.fatPerc)}% — лучше до ${targets.fatPercMax}%`
                    : `Fat is ${Math.round(stats.fatPerc)}% — aim for under ${targets.fatPercMax}%`,
                items,
            });
        }

        // If everything is ok, suggest variety
        if (sections.length === 0) {
            const generalRecipes = RECIPE_TEMPLATES.slice(0, 3);
            const items: SuggestionItem[] = generalRecipes.map(r => ({
                id: r.id,
                title: getRecipeTitle(r, locale),
                description: getRecipeDescription(r, locale),
                tags: r.tags,
            }));

            sections.push({
                id: 'general',
                category: 'general',
                title: locale === 'ru' ? 'Попробуй что-то новое' : 'Try Something New',
                subtitle: locale === 'ru'
                    ? 'Твой рацион сбалансирован! Вот идеи для разнообразия.'
                    : 'Your diet is balanced! Here are ideas for variety.',
                items,
            });
        }

        return sections;
    }

    /**
     * Build response for insufficient data
     */
    private buildInsufficientDataResponse(
        locale: SupportedLocale,
        stats: ReturnType<typeof this.calculateStats>,
    ): SuggestedFoodV2Response {
        const summary = locale === 'ru' || locale === 'kk'
            ? `Добавь ещё ${Math.max(0, 5 - stats.mealsCount)} приёмов пищи для точных рекомендаций`
            : `Add ${Math.max(0, 5 - stats.mealsCount)} more meals for accurate recommendations`;

        return {
            status: 'insufficient_data',
            locale,
            summary,
            health: {
                level: 'average',
                score: 50,
                reasons: [
                    locale === 'ru' ? 'Недостаточно данных для анализа' : 'Not enough data for analysis',
                ],
            },
            stats: {
                daysWithMeals: stats.daysWithMeals,
                mealsCount: stats.mealsCount,
                avgCalories: Math.round(stats.avgCalories),
                avgProteinG: Math.round(stats.avgProtein),
                avgFatG: Math.round(stats.avgFat),
                avgCarbsG: Math.round(stats.avgCarbs),
                avgFiberG: Math.round(stats.avgFiber * 10) / 10,
                macroPercents: {
                    protein: Math.round(stats.proteinPerc),
                    fat: Math.round(stats.fatPerc),
                    carbs: Math.round(stats.carbsPerc),
                },
            },
            sections: [],
        };
    }

    private getErrorSummary(locale: SupportedLocale): string {
        return locale === 'ru' || locale === 'kk'
            ? 'Не удалось загрузить рекомендации. Попробуй позже.'
            : 'Could not load recommendations. Try again later.';
    }
}
