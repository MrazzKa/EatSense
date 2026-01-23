import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CacheService } from '../cache/cache.service';
import { DietType, DietDifficulty } from '@prisma/client';
import * as crypto from 'crypto';

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

// Cache TTL for diets list (5 minutes)
const DIETS_CACHE_TTL = 300;

@Injectable()
export class DietsService implements OnModuleInit {
    private readonly logger = new Logger(DietsService.name);

    async onModuleInit() {
        // Warm up cache heavily used on app start
        this.logger.log('Warming up diets cache...');
        try {
            await Promise.all([
                // Warm up featured diets
                this.getFeatured('en'),
                this.getFeatured('ru'),
                // Warm up main catalog (first page)
                this.findAll({ limit: 20 }, 'en'),
                this.findAll({ limit: 20 }, 'ru'),
            ]);
            this.logger.log('Diets cache warmup completed');
        } catch (error) {
            this.logger.error('Failed to warm up diets cache', error);
        }
    }

    constructor(
        private prisma: PrismaService,
        private cacheService: CacheService,
    ) { }

    private buildCacheKey(filters: DietFilters, locale: string): string {
        const data = JSON.stringify({ ...filters, locale });
        return crypto.createHash('md5').update(data).digest('hex');
    }

    /**
     * Get list of diets with filters (with Redis caching)
     */
    async findAll(filters: DietFilters, locale: string = 'en') {
        const cacheKey = this.buildCacheKey(filters, locale);

        // Check cache first
        const cached = await this.cacheService.get<any>(cacheKey, 'diets:list');
        if (cached) {
            return cached;
        }

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
                // Select only card fields for list view (performance)
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    subtitle: true,
                    shortDescription: true,
                    type: true,
                    difficulty: true,
                    duration: true,
                    imageUrl: true,
                    isFeatured: true,
                    popularityScore: true,
                    tags: true,
                    dailyCalories: true,
                    category: true,
                    uiGroup: true,
                    _count: {
                        select: {
                            userPrograms: { where: { status: 'active' } },
                            ratings: true,
                        },
                    },
                },
            });

            const total = await this.prisma.dietProgram.count({ where });

            const result = {
                diets: diets.map(diet => this.localizeDiet(diet, locale)),
                total,
                limit,
                offset,
            };

            // Cache the result
            await this.cacheService.set(cacheKey, result, 'diets:list', DIETS_CACHE_TTL);

            return result;
        } catch (error) {
            this.logger.error(`[findAll] Error fetching diets with filters ${JSON.stringify(filters)}:`, error);
            throw error;
        }
    }

    /**
     * PATCH 04: Get diets by specific slugs (for lazy loading optimization)
     */
    async findBySlugs(slugs: string[], locale: string = 'en') {
        try {
            const diets = await this.prisma.dietProgram.findMany({
                where: {
                    slug: { in: slugs },
                    isActive: true,
                },
                orderBy: { popularityScore: 'desc' },
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    subtitle: true,
                    shortDescription: true,
                    type: true,
                    difficulty: true,
                    duration: true,
                    imageUrl: true,
                    isFeatured: true,
                    popularityScore: true,
                    tags: true,
                    dailyCalories: true,
                    category: true,
                    uiGroup: true,
                },
            });

            return {
                diets: diets.map(diet => this.localizeDiet(diet, locale)),
                total: diets.length,
            };
        } catch (error) {
            this.logger.error(`[findBySlugs] Error fetching diets by slugs:`, error);
            throw error;
        }
    }

    /**
     * Get featured diets (with Redis caching)
     */
    async getFeatured(locale: string = 'en') {
        const cacheKey = `featured:${locale}`;

        // Try cache first
        const cached = await this.cacheService.get<any[]>(cacheKey, 'diets:featured');
        if (cached) {
            return cached;
        }

        const diets = await this.prisma.dietProgram.findMany({
            where: { isActive: true, isFeatured: true },
            orderBy: { popularityScore: 'desc' },
            take: 5,
        });

        const result = diets.map(diet => this.localizeDiet(diet, locale));

        // Cache for 5 minutes
        await this.cacheService.set(cacheKey, result, 'diets:featured', DIETS_CACHE_TTL);

        return result;
    }

    /**
     * Get diet by ID or slug (with Redis caching)
     */
    async findOne(idOrSlug: string, locale: string = 'en') {
        const cacheKey = `${idOrSlug}:${locale}`;

        // Try cache first
        const cached = await this.cacheService.get<any>(cacheKey, 'diets:detail');
        if (cached) {
            return cached;
        }

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

            const result = this.localizeDietFull(diet, locale);

            // Cache for 5 minutes
            await this.cacheService.set(cacheKey, result, 'diets:detail', DIETS_CACHE_TTL);

            return result;
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
    async startDiet(userId: string, dietIdOrSlug: string, options?: {
        customCalories?: number;
        targetWeight?: number;
    }) {
        this.logger.log(`[startDiet] Starting diet for user ${userId}, diet: ${dietIdOrSlug}`);

        try {
            // Support both ID and slug lookup (fixes 404 for lifestyle programs using slugs)
            const diet = await this.prisma.dietProgram.findFirst({
                where: {
                    OR: [{ id: dietIdOrSlug }, { slug: dietIdOrSlug }],
                    isActive: true,
                },
            });

            if (!diet) {
                this.logger.warn(`[startDiet] Diet not found: ${dietIdOrSlug}`);

                // Log available diets for debugging (helpful for 404 issues)
                const availableDiets = await this.prisma.dietProgram.findMany({
                    where: { isActive: true },
                    select: { slug: true, id: true },
                    take: 20,
                });
                this.logger.debug(`[startDiet] Available active diets: ${availableDiets.map(d => d.slug).join(', ')}`);

                throw new NotFoundException(`Diet "${dietIdOrSlug}" not found or not active`);
            }

            const dietId = diet.id; // Use actual ID for subsequent operations

            // Check for existing active diet
            const existingActive = await this.prisma.userDietProgram.findFirst({
                where: { userId, status: 'active' },
            });

            if (existingActive) {
                // If trying to start the same diet that's already active, return 409 Conflict
                if (existingActive.programId === dietId) {
                    throw new ConflictException('Already enrolled in this diet program');
                }
                // If trying to start a different diet while one is active, pause it
                this.logger.log(`[startDiet] Pausing existing diet ${existingActive.programId} for user ${userId}`);
                await this.prisma.userDietProgram.update({
                    where: { id: existingActive.id },
                    data: { status: 'paused' },
                });
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

            this.logger.log(`[startDiet] User ${userId} successfully started diet ${diet.slug}`);

            return userDiet;
        } catch (error: any) {
            // Re-throw known exceptions
            if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
                throw error;
            }

            // Log and wrap unexpected errors
            this.logger.error(`[startDiet] Failed to start diet: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to start diet program. Please try again.');
        }
    }

    /**
     * Get user's active diet
     */
    /**
     * Get user's active diet
     */
    async getActiveDiet(userId: string, locale: string = 'en', isLightweight: boolean = false) {
        try {
            const userDiet = await this.prisma.userDietProgram.findFirst({
                where: { userId, status: 'active' },
                include: {
                    program: {
                        include: {
                            // If lightweight, don't fetch all days/meals here. We'll fetch today's only.
                            days: isLightweight ? false : {
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
            let todayPlan = [];
            let currentDayData;

            if (isLightweight) {
                // Fetch ONLY today's day and meals
                currentDayData = await this.prisma.dietProgramDay.findFirst({
                    where: {
                        programId: userDiet.programId,
                        dayNumber: userDiet.currentDay
                    },
                    include: { meals: { orderBy: { sortOrder: 'asc' } } }
                });
            } else {
                currentDayData = userDiet.program.days.find(d => d.dayNumber === userDiet.currentDay);
            }

            if (currentDayData) {
                todayPlan = currentDayData.meals;
            }

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
                todayPlan, // Now populated efficiently
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
        // Input validation - prevent 500 errors from undefined/null checklist
        if (!checklist || typeof checklist !== 'object') {
            throw new BadRequestException('Invalid checklist: must be an object with boolean values');
        }

        // Validate all values are booleans
        for (const [key, value] of Object.entries(checklist)) {
            if (typeof value !== 'boolean') {
                throw new BadRequestException(`Invalid checklist value for "${key}": must be a boolean`);
            }
        }

        try {
            const userDiet = await this.prisma.userDietProgram.findFirst({
                where: { userId, status: 'active' },
                include: { program: true },
            });

            if (!userDiet) {
                throw new BadRequestException('No active diet');
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Calculate completion percentage - handle null/undefined dailyTracker
            const dailyTracker = (userDiet.program?.dailyTracker as any[]) || [];
            const totalItems = dailyTracker.length || Object.keys(checklist).length || 1;
            const completedItems = Object.values(checklist).filter(Boolean).length;
            const completionPercent = totalItems > 0 ? completedItems / totalItems : 0;

            // Update or create today's log with transaction for atomicity
            const updatedLog = await this.prisma.$transaction(async (tx) => {
                return tx.userDietDailyLog.upsert({
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
            });

            // Update streak if completion meets threshold
            const threshold = userDiet.program?.streakThreshold || 0.7;
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
                checklist: updatedLog.checklist,
            };
        } catch (error: any) {
            this.logger.error(`[updateChecklist] Error for user ${userId}:`, {
                message: error.message,
                code: error.code,
                stack: error.stack?.split('\n').slice(0, 3),
            });

            // Re-throw known exceptions
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }

            // Wrap unknown errors with InternalServerErrorException
            throw new InternalServerErrorException(`Failed to update checklist: ${error.message || 'Unknown error'}`);
        }
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
     * Complete today and advance to next day
     * This marks today's log as completed and updates streak
     */
    /**
     * Complete today and advance to next day
     * PATCH 03: Fixed day not being saved, counter staying at 1
     */
    async completeDay(userId: string): Promise<{
        success: boolean;
        alreadyCompleted?: boolean;
        currentDay: number;
        daysCompleted: number;
        streak: number;
        isComplete: boolean;
        completionRate: number;
    }> {
        const userDiet = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
            include: { program: true },
        });

        if (!userDiet) {
            throw new NotFoundException('No active diet found');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if already completed today
        const existingLog = await this.prisma.userDietDailyLog.findFirst({
            where: {
                userDietId: userDiet.id,
                date: today,
            },
        });

        // CRITICAL FIX: Check if already marked as completed
        if (existingLog?.completed) {
            this.logger.log(`[completeDay] Day already completed for user ${userId}`);
            return {
                success: true,
                alreadyCompleted: true,
                currentDay: userDiet.currentDay,
                daysCompleted: userDiet.daysCompleted,
                streak: userDiet.currentStreak,
                isComplete: userDiet.currentDay >= userDiet.program.duration,
                completionRate: existingLog.completionPercent || 1,
            };
        }

        // Calculate completion rate from checklist
        const checklist = (existingLog?.checklist as Record<string, boolean>) || {};
        const dailyTracker = userDiet.program.dailyTracker as any[] || [];
        const totalItems = dailyTracker.length;
        const completedItems = Object.values(checklist).filter(Boolean).length;
        const completionRate = totalItems > 0 ? completedItems / totalItems : 1;

        this.logger.log(`[completeDay] Completing day for user ${userId}:`, {
            currentDay: userDiet.currentDay,
            totalItems,
            completedItems,
            completionRate,
        });

        // Update or create daily log
        await this.prisma.userDietDailyLog.upsert({
            where: {
                userDietId_date: {
                    userDietId: userDiet.id,
                    date: today,
                },
            },
            update: {
                completed: true,
                completionPercent: completionRate,
            },
            create: {
                userDietId: userDiet.id,
                date: today,
                dayNumber: userDiet.currentDay,
                checklist: checklist,
                completed: true,
                completionPercent: completionRate,
            },
        });

        // Calculate new streak
        const streakThreshold = userDiet.program.streakThreshold || 0.6;
        const maintainsStreak = completionRate >= streakThreshold;
        const newStreak = maintainsStreak ? userDiet.currentStreak + 1 : 0;
        const bestStreak = Math.max(userDiet.longestStreak, newStreak);

        // CRITICAL FIX: Calculate next day correctly
        const nextDay = userDiet.currentDay + 1;
        const isComplete = nextDay > userDiet.program.duration;
        const finalCurrentDay = isComplete ? userDiet.program.duration : nextDay;

        this.logger.log(`[completeDay] Updating progress:`, {
            nextDay,
            isComplete,
            finalCurrentDay,
            newStreak,
            newDaysCompleted: userDiet.daysCompleted + 1,
        });

        // CRITICAL FIX: Update UserDiet with incremented values
        await this.prisma.userDietProgram.update({
            where: { id: userDiet.id },
            data: {
                currentDay: finalCurrentDay,
                daysCompleted: { increment: 1 }, // CRITICAL: Use atomic increment
                currentStreak: newStreak,
                longestStreak: bestStreak,
                lastStreakDate: maintainsStreak ? today : userDiet.lastStreakDate,
                status: isComplete ? 'completed' : 'active',
                completedAt: isComplete ? new Date() : null,
            },
        });

        return {
            success: true,
            alreadyCompleted: false,
            currentDay: finalCurrentDay,
            daysCompleted: userDiet.daysCompleted + 1,
            streak: newStreak,
            isComplete,
            completionRate,
        };
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

    /**
     * Get bundle of all diets data for frontend (single request optimization)
     * Returns: featured diets, featured lifestyles, all diets, all lifestyles, active program
     */
    async getBundle(userId: string | null, locale: string = 'en') {
        const cacheKey = `bundle:${locale}`;
        const BUNDLE_CACHE_TTL = 60; // 60 seconds for bundle

        // Try cache first (only for public data - user-specific data is always fresh)
        const cached = await this.cacheService.get<any>(cacheKey, 'diets:bundle');

        try {
            // Prepare parallel requests
            const requests: Promise<any>[] = [
                // Featured diets (type = WEIGHT_LOSS, HEALTH, etc, excluding LIFESTYLE)
                this.prisma.dietProgram.findMany({
                    where: { isActive: true, isFeatured: true, type: { not: 'LIFESTYLE' } },
                    orderBy: { popularityScore: 'desc' },
                    take: 8,
                }).then(diets => diets.map(d => this.localizeDiet(d, locale))),

                // Featured lifestyles
                this.prisma.dietProgram.findMany({
                    where: { isActive: true, isFeatured: true, type: 'LIFESTYLE' },
                    orderBy: { popularityScore: 'desc' },
                    take: 8,
                }).then(diets => diets.map(d => this.localizeDiet(d, locale))),

                // All diets (non-lifestyle)
                this.prisma.dietProgram.findMany({
                    where: { isActive: true, type: { not: 'LIFESTYLE' } },
                    orderBy: [{ isFeatured: 'desc' }, { popularityScore: 'desc' }],
                    take: 50,
                    select: {
                        id: true, slug: true, name: true, subtitle: true, shortDescription: true,
                        type: true, difficulty: true, duration: true, imageUrl: true,
                        isFeatured: true, popularityScore: true, tags: true, dailyCalories: true,
                        category: true, uiGroup: true,
                    },
                }).then(diets => diets.map(d => this.localizeDiet(d, locale))),

                // All lifestyles
                this.prisma.dietProgram.findMany({
                    where: { isActive: true, type: 'LIFESTYLE' },
                    orderBy: [{ isFeatured: 'desc' }, { popularityScore: 'desc' }],
                    take: 50,
                    select: {
                        id: true, slug: true, name: true, subtitle: true, shortDescription: true,
                        type: true, difficulty: true, duration: true, imageUrl: true,
                        isFeatured: true, popularityScore: true, tags: true, dailyCalories: true,
                        category: true, uiGroup: true,
                    },
                }).then(diets => diets.map(d => this.localizeDiet(d, locale))),
            ];

            // Add active program request if user is authenticated
            if (userId) {
                requests.push(this.getActiveDiet(userId, locale).catch(() => null));
            } else {
                requests.push(Promise.resolve(null));
            }

            const [featuredDiets, featuredLifestyles, allDiets, allLifestyles, activeProgram] = await Promise.all(requests);

            const result = {
                featuredDiets,
                featuredLifestyles,
                allDiets,
                allLifestyles,
                activeProgram,
                timestamp: Date.now(),
            };

            // Cache public data (without activeProgram) for 60 seconds
            if (!cached) {
                await this.cacheService.set(cacheKey, {
                    featuredDiets,
                    featuredLifestyles,
                    allDiets,
                    allLifestyles,
                    timestamp: Date.now(),
                }, 'diets:bundle', BUNDLE_CACHE_TTL);
            }

            return result;
        } catch (error) {
            this.logger.error(`[getBundle] Error fetching bundle:`, error);
            throw error;
        }
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

    // ==================== PROGRAM SUGGESTIONS ====================

    async createSuggestion(
        userId: string,
        dto: { name: string; description?: string; type: 'diet' | 'lifestyle' },
    ) {
        // Check for duplicates (case-insensitive)
        const existing = await this.prisma.programSuggestion.findFirst({
            where: {
                name: { equals: dto.name, mode: 'insensitive' },
                status: 'pending',
            },
        });

        if (existing) {
            // Check if user already voted
            if (existing.voters.includes(userId)) {
                return { success: true, alreadyVoted: true, suggestion: existing };
            }

            // Increment vote
            const updated = await this.prisma.programSuggestion.update({
                where: { id: existing.id },
                data: {
                    votes: { increment: 1 },
                    voters: { push: userId },
                },
            });

            return { success: true, voted: true, suggestion: updated };
        }

        // Create new suggestion
        const suggestion = await this.prisma.programSuggestion.create({
            data: {
                name: dto.name,
                description: dto.description,
                type: dto.type,
                votes: 1,
                voters: [userId],
                createdBy: userId,
            },
        });

        return { success: true, created: true, suggestion };
    }

    async getSuggestions(type?: 'diet' | 'lifestyle', limit = 20) {
        return this.prisma.programSuggestion.findMany({
            where: {
                status: 'pending',
                ...(type ? { type } : {}),
            },
            orderBy: { votes: 'desc' },
            take: Math.min(limit, 50),
            select: {
                id: true,
                name: true,
                description: true,
                type: true,
                votes: true,
                createdAt: true,
            },
        });
    }
}
