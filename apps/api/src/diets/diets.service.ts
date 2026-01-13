import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DietType, DietDifficulty } from '@prisma/client';

interface DietFilters {
    type?: DietType;
    difficulty?: DietDifficulty;
    suitableFor?: string;
    category?: string;
    uiGroup?: string;
    isFeatured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}

@Injectable()
export class DietsService {
    private readonly logger = new Logger(DietsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get list of diets with filters
     */
    async findAll(filters: DietFilters, locale: string = 'en') {
        try {
            const {
                type,
                difficulty,
                suitableFor,
                category,
                uiGroup,
                isFeatured,
                search,
                limit = 20,
                offset = 0,
            } = filters;

            const where: any = {
                isActive: true,
            };

            // Only add valid enum values to the filter
            if (type && ['WEIGHT_LOSS', 'HEALTH', 'LIFESTYLE', 'MEDICAL', 'PERFORMANCE'].includes(type)) {
                where.type = type;
            }
            if (difficulty && ['EASY', 'MODERATE', 'HARD'].includes(difficulty)) {
                where.difficulty = difficulty;
            }
            if (category) where.category = category;
            if (uiGroup) where.uiGroup = uiGroup;
            if (suitableFor) where.suitableFor = { has: suitableFor };
            if (isFeatured === true) where.isFeatured = true;
            if (search) where.slug = { contains: search.toLowerCase() };

            const diets = await this.prisma.dietProgram.findMany({
                where,
                orderBy: [
                    { isFeatured: 'desc' },
                    { popularityScore: 'desc' },
                ],
                take: limit,
                skip: offset,
                include: {
                    _count: {
                        select: {
                            userPrograms: { where: { status: 'active' } },
                            ratings: true,
                        },
                    },
                },
            });

            const total = await this.prisma.dietProgram.count({ where });

            return {
                diets: diets.map(diet => this.localizeDiet(diet, locale)),
                total,
                limit,
                offset,
            };
        } catch (error) {
            this.logger.error(`[findAll] Error fetching diets with filters ${JSON.stringify(filters)}:`, error);
            throw error;
        }
    }

    /**
     * Get featured diets
     */
    async getFeatured(locale: string = 'en') {
        const diets = await this.prisma.dietProgram.findMany({
            where: { isActive: true, isFeatured: true },
            orderBy: { popularityScore: 'desc' },
            take: 5,
        });

        return diets.map(diet => this.localizeDiet(diet, locale));
    }

    /**
     * Get diet by ID or slug
     */
    async findOne(idOrSlug: string, locale: string = 'en') {
        try {
            const diet = await this.prisma.dietProgram.findFirst({
                where: {
                    OR: [{ id: idOrSlug }, { slug: idOrSlug }],
                    isActive: true,
                },
                include: {
                    days: {
                        orderBy: { dayNumber: 'asc' },
                        include: {
                            meals: { orderBy: { sortOrder: 'asc' } },
                        },
                    },
                    // Note: ratings include removed temporarily - table may not exist yet
                    _count: {
                        select: { userPrograms: { where: { status: 'active' } } },
                    },
                },
            });

            if (!diet) {
                throw new NotFoundException('Diet not found');
            }

            return this.localizeDietFull(diet, locale);
        } catch (error) {
            this.logger.error(`[findOne] Error fetching diet ${idOrSlug}:`, error);
            throw error;
        }
    }

    /**
     * Get meal plan for a specific day
     */
    async getMealPlanForDay(dietId: string, dayNumber: number, locale: string = 'en') {
        const day = await this.prisma.dietProgramDay.findFirst({
            where: { programId: dietId, dayNumber },
            include: {
                meals: { orderBy: { sortOrder: 'asc' } },
            },
        });

        if (!day) return [];

        return day.meals;
    }

    /**
     * Get full meal plan
     */
    async getFullMealPlan(dietId: string, locale: string = 'en') {
        const diet = await this.prisma.dietProgram.findUnique({
            where: { id: dietId },
            include: {
                days: {
                    orderBy: { dayNumber: 'asc' },
                    include: { meals: { orderBy: { sortOrder: 'asc' } } },
                },
            },
        });

        if (!diet) {
            throw new NotFoundException('Diet not found');
        }

        return {
            diet: this.localizeDiet(diet, locale),
            days: diet.days.map(day => ({
                dayNumber: day.dayNumber,
                title: day.title,
                meals: day.meals,
                totals: {
                    calories: day.totalCalories || 0,
                    protein: day.totalProtein || 0,
                    carbs: day.totalCarbs || 0,
                    fat: day.totalFat || 0,
                },
            })),
        };
    }

    /**
     * Start a diet program
     */
    async startDiet(userId: string, dietId: string, options?: {
        customCalories?: number;
        targetWeight?: number;
    }) {
        const diet = await this.prisma.dietProgram.findUnique({
            where: { id: dietId },
        });

        if (!diet) {
            throw new NotFoundException('Diet not found');
        }

        // Check for existing active diet
        const existingActive = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
        });

        if (existingActive) {
            // If trying to start the same diet that's already active, return 409 Conflict
            if (existingActive.programId === dietId) {
                throw new ConflictException('Already enrolled in this diet program');
            }
            // If trying to start a different diet while one is active, return 400 Bad Request
            throw new BadRequestException('You already have an active diet. Complete or abandon it first.');
        }

        // Get user profile for weight
        const userProfile = await this.prisma.userProfile.findUnique({
            where: { userId },
        });

        const userDiet = await this.prisma.userDietProgram.create({
            data: {
                userId,
                programId: dietId,
                status: 'active',
                currentDay: 1,
                customCalories: options?.customCalories,
                targetWeight: options?.targetWeight,
                startWeight: userProfile?.weight,
                currentWeight: userProfile?.weight,
            },
            include: { program: true },
        });

        // Increment user count
        await this.prisma.dietProgram.update({
            where: { id: dietId },
            data: {
                userCount: { increment: 1 },
                popularityScore: { increment: 1 },
            },
        });

        this.logger.log(`User ${userId} started diet ${dietId}`);

        return userDiet;
    }

    /**
     * Get user's active diet
     */
    async getActiveDiet(userId: string, locale: string = 'en') {
        try {
            const userDiet = await this.prisma.userDietProgram.findFirst({
                where: { userId, status: 'active' },
                include: {
                    program: {
                        include: {
                            days: {
                                orderBy: { dayNumber: 'asc' },
                                include: { meals: { orderBy: { sortOrder: 'asc' } } },
                            },
                        },
                    },
                    dailyLogs: {
                        orderBy: { date: 'desc' },
                        take: 7,
                    },
                },
            });

            if (!userDiet) return null;

            // Calculate current day based on calendar dates
            const startDate = new Date(userDiet.startedAt);
            startDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffTime = today.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const calculatedCurrentDay = Math.max(1, diffDays + 1); // Day 1 is start date

            // Update currentDay in database if it's different (for backward compatibility)
            if (userDiet.currentDay !== calculatedCurrentDay && calculatedCurrentDay <= userDiet.program.duration) {
                await this.prisma.userDietProgram.update({
                    where: { id: userDiet.id },
                    data: { currentDay: calculatedCurrentDay },
                });
                userDiet.currentDay = calculatedCurrentDay;
            }

            // Get today's plan
            const currentDay = userDiet.program.days.find(d => d.dayNumber === userDiet.currentDay);

            // Get today's log for checklist progress
            const todayLog = await this.prisma.userDietDailyLog.findFirst({
                where: { userDietId: userDiet.id, date: today },
            });

            // Calculate checklist progress from dailyTracker
            const dailyTracker = userDiet.program.dailyTracker as any[] || [];
            const checklist = (todayLog?.checklist as Record<string, boolean>) || {};
            const totalItems = dailyTracker.length;
            const completedItems = Object.values(checklist).filter(Boolean).length;

            return {
                ...userDiet,
                program: this.localizeDiet(userDiet.program, locale),
                todayPlan: currentDay?.meals || [],
                progress: {
                    ...this.calculateProgress(userDiet),
                    // Add checklist progress for Dashboard widget
                    completedTasks: completedItems,
                    totalTasks: totalItems,
                },
                // Add explicit streak for Dashboard (was embedded in userDiet before)
                streak: userDiet.currentStreak || 0,
            };
        } catch (error) {
            this.logger.error(`[getActiveDiet] Error for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get today's meal plan for active diet
     */
    async getTodayPlan(userId: string, locale: string = 'en') {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
            include: {
                program: {
                    include: {
                        days: {
                            include: { meals: { orderBy: { sortOrder: 'asc' } } },
                        },
                    },
                },
            },
        });

        if (!userDiet) return null;

        const currentDay = userDiet.program.days.find(d => d.dayNumber === userDiet.currentDay);

        // Get today's log
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayLog = await this.prisma.userDietDailyLog.findFirst({
            where: { userDietId: userDiet.id, date: today },
        });

        return {
            dayNumber: userDiet.currentDay,
            meals: currentDay?.meals || [],
            logged: {
                breakfast: todayLog?.breakfastLogged || false,
                lunch: todayLog?.lunchLogged || false,
                dinner: todayLog?.dinnerLogged || false,
                snacks: todayLog?.snacksLogged || 0,
            },
            totals: {
                calories: currentDay?.totalCalories || 0,
                protein: currentDay?.totalProtein || 0,
                carbs: currentDay?.totalCarbs || 0,
                fat: currentDay?.totalFat || 0,
            },
        };
    }

    /**
     * Log a meal as completed
     */
    async logMeal(userId: string, mealType: string) {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
        });

        if (!userDiet) {
            throw new BadRequestException('No active diet');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const updateData: any = {};
        switch (mealType.toUpperCase()) {
            case 'BREAKFAST': updateData.breakfastLogged = true; break;
            case 'LUNCH': updateData.lunchLogged = true; break;
            case 'DINNER': updateData.dinnerLogged = true; break;
            case 'SNACK': updateData.snacksLogged = { increment: 1 }; break;
        }

        await this.prisma.userDietDailyLog.upsert({
            where: { userDietId_date: { userDietId: userDiet.id, date: today } },
            create: {
                userDietId: userDiet.id,
                date: today,
                dayNumber: userDiet.currentDay,
                ...updateData,
            },
            update: updateData,
        });

        await this.prisma.userDietProgram.update({
            where: { id: userDiet.id },
            data: { mealsLogged: { increment: 1 } },
        });

        return { success: true };
    }

    /**
     * Pause diet
     */
    async pauseDiet(userId: string) {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
        });

        if (!userDiet) throw new BadRequestException('No active diet');

        return this.prisma.userDietProgram.update({
            where: { id: userDiet.id },
            data: { status: 'paused' },
        });
    }

    /**
     * Resume diet
     */
    async resumeDiet(userId: string) {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'paused' },
        });

        if (!userDiet) throw new BadRequestException('No paused diet');

        return this.prisma.userDietProgram.update({
            where: { id: userDiet.id },
            data: { status: 'active' },
        });
    }

    /**
     * Abandon diet
     */
    async abandonDiet(userId: string) {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: { in: ['active', 'paused'] } },
        });

        if (!userDiet) throw new BadRequestException('No active diet');

        return this.prisma.userDietProgram.update({
            where: { id: userDiet.id },
            data: { status: 'abandoned', completedAt: new Date() },
        });
    }

    /**
     * Get user's diet history
     */
    async getUserDietHistory(userId: string, locale: string = 'en') {
        const userDiets = await this.prisma.userDietProgram.findMany({
            where: { userId },
            orderBy: { startedAt: 'desc' },
            include: { program: true },
        });

        return userDiets.map(ud => ({
            ...ud,
            program: this.localizeDiet(ud.program, locale),
        }));
    }

    /**
     * Get today's tracker state (checklist + symptoms + progress + streak)
     */
    async getTodayTracker(userId: string, locale: string = 'en') {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
            include: {
                program: true,
            },
        });

        if (!userDiet) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get or create today's log
        let todayLog = await this.prisma.userDietDailyLog.findFirst({
            where: { userDietId: userDiet.id, date: today },
        });

        if (!todayLog) {
            // Create empty log for today
            todayLog = await this.prisma.userDietDailyLog.create({
                data: {
                    userDietId: userDiet.id,
                    date: today,
                    dayNumber: userDiet.currentDay,
                    checklist: {},
                    symptoms: {},
                    completionPercent: 0,
                    completed: false,
                    celebrationShown: false,
                },
            });
        }

        const program = userDiet.program;
        const dailyTracker = program.dailyTracker as any[] || [];
        const checklist = (todayLog.checklist as Record<string, boolean>) || {};
        const symptoms = (todayLog.symptoms as Record<string, number>) || {};

        // Calculate completion percentage
        const totalItems = dailyTracker.length;
        const completedItems = Object.values(checklist).filter(Boolean).length;
        const completionPercent = totalItems > 0 ? completedItems / totalItems : 0;

        return {
            diet: this.localizeDiet(program, locale),
            currentDay: userDiet.currentDay,
            totalDays: program.duration,
            streak: {
                current: userDiet.currentStreak,
                longest: userDiet.longestStreak,
                threshold: program.streakThreshold,
            },
            dailyTracker: dailyTracker.map((item: any) => ({
                key: item.key,
                label: this.getLocalizedValue(item.label, locale),
                checked: checklist[item.key] || false,
            })),
            weeklyGoals: program.weeklyGoals ? this.getLocalizedValue(program.weeklyGoals, locale) : null,
            symptoms: symptoms,
            completionPercent,
            completed: todayLog.completed || false,
            celebrationShown: todayLog.celebrationShown || false,
            showSymptoms: program.uiGroup === 'Medical',
            date: today.toISOString().split('T')[0],
        };
    }

    /**
     * Update today's checklist state
     */
    async updateChecklist(userId: string, checklist: Record<string, boolean>) {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
            include: { program: true },
        });

        if (!userDiet) {
            throw new BadRequestException('No active diet');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate completion percentage
        const dailyTracker = userDiet.program.dailyTracker as any[] || [];
        const totalItems = dailyTracker.length;
        const completedItems = Object.values(checklist).filter(Boolean).length;
        const completionPercent = totalItems > 0 ? completedItems / totalItems : 0;

        // Update or create today's log
        const updatedLog = await this.prisma.userDietDailyLog.upsert({
            where: { userDietId_date: { userDietId: userDiet.id, date: today } },
            create: {
                userDietId: userDiet.id,
                date: today,
                dayNumber: userDiet.currentDay,
                checklist: checklist,
                completionPercent,
                completed: false,
                celebrationShown: false,
            },
            update: {
                checklist: checklist,
                completionPercent,
            },
        });

        // Update streak if completion meets threshold
        const threshold = userDiet.program.streakThreshold || 0.7;
        const meetsThreshold = completionPercent >= threshold;

        // Check if we need to update streak (only once per day)
        const lastStreakDate = userDiet.lastStreakDate;
        const todayStr = today.toISOString().split('T')[0];
        const lastStreakStr = lastStreakDate?.toISOString().split('T')[0];

        if (meetsThreshold && lastStreakStr !== todayStr) {
            // Calculate if it's consecutive (yesterday or first day)
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const isConsecutive = lastStreakStr === yesterdayStr || !lastStreakDate;
            const newStreak = isConsecutive ? userDiet.currentStreak + 1 : 1;

            await this.prisma.userDietProgram.update({
                where: { id: userDiet.id },
                data: {
                    currentStreak: newStreak,
                    longestStreak: Math.max(newStreak, userDiet.longestStreak),
                    lastStreakDate: today,
                },
            });
        }

        this.logger.log(`User ${userId} updated checklist: ${completedItems}/${totalItems} (${Math.round(completionPercent * 100)}%)`);

        return {
            success: true,
            completionPercent,
            meetsThreshold,
        };
    }

    /**
     * Mark celebration as shown for today
     */
    async markCelebrationShown(userId: string) {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
        });

        if (!userDiet) {
            throw new BadRequestException('No active diet');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await this.prisma.userDietDailyLog.upsert({
            where: { userDietId_date: { userDietId: userDiet.id, date: today } },
            create: {
                userDietId: userDiet.id,
                date: today,
                dayNumber: userDiet.currentDay,
                celebrationShown: true,
            },
            update: {
                celebrationShown: true,
            },
        });

        return { success: true };
    }

    /**
     * Update today's symptoms (for medical diets)
     */
    async updateSymptoms(userId: string, symptoms: Record<string, number>) {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
            include: { program: true },
        });

        if (!userDiet) {
            throw new BadRequestException('No active diet');
        }

        // Validate symptoms are 1-5
        for (const [key, value] of Object.entries(symptoms)) {
            if (typeof value !== 'number' || value < 1 || value > 5) {
                throw new BadRequestException(`Invalid symptom value for ${key}: must be 1-5`);
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const updatedLog = await this.prisma.userDietDailyLog.upsert({
            where: { userDietId_date: { userDietId: userDiet.id, date: today } },
            create: {
                userDietId: userDiet.id,
                date: today,
                dayNumber: userDiet.currentDay,
                symptoms: symptoms,
            },
            update: {
                symptoms: symptoms,
            },
        });

        this.logger.log(`User ${userId} updated symptoms: ${JSON.stringify(symptoms)}`);

        return {
            success: true,
            symptoms,
        };
    }

    // Helper methods

    private localizeDiet(diet: any, locale: string) {
        if (!diet) return null;
        try {
            return {
                ...diet,
                name: this.getLocalizedValue(diet.name, locale),
                subtitle: this.getLocalizedValue(diet.subtitle, locale),
                description: this.getLocalizedValue(diet.description, locale),
                shortDescription: this.getLocalizedValue(diet.shortDescription, locale),
                tips: diet.tips ? this.getLocalizedValue(diet.tips, locale) : null,
            };
        } catch (error) {
            this.logger.warn(`[localizeDiet] Error localizing diet ${diet?.id}: ${error.message}`);
            return diet; // Return unlocalized diet as fallback
        }
    }

    private localizeDietFull(diet: any, locale: string) {
        if (!diet) return null;
        return {
            ...this.localizeDiet(diet, locale),
            days: diet.days || [],
        };
    }

    private getLocalizedValue(json: any, locale: string): any {
        if (json === null || json === undefined) return '';
        if (typeof json === 'string') return json;
        if (typeof json === 'number') return json;
        if (Array.isArray(json)) return json;
        if (typeof json === 'object') {
            return json[locale] || json['en'] || json['ru'] || Object.values(json)[0] || '';
        }
        return '';
    }

    private calculateProgress(userDiet: any) {
        const totalDays = userDiet.program.duration;
        return {
            daysCompleted: userDiet.daysCompleted,
            totalDays,
            percentComplete: totalDays ? Math.round((userDiet.daysCompleted / totalDays) * 100) : 0,
            adherenceScore: userDiet.adherenceScore,
        };
    }
}
