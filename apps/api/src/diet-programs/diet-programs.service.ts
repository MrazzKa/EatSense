import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DietProgramsService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters?: { category?: string }) {
        if (!this.prisma.dietProgram) {
            return [];
        }

        const where: any = { isActive: true };
        if (filters?.category) where.category = filters.category;

        return this.prisma.dietProgram.findMany({
            where,
            orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
        });
    }

    async findById(id: string) {
        if (!this.prisma.dietProgram) {
            return null;
        }

        return this.prisma.dietProgram.findUnique({
            where: { id },
            include: {
                days: {
                    orderBy: { dayNumber: 'asc' },
                    include: {
                        meals: { orderBy: { sortOrder: 'asc' } },
                    },
                },
            },
        });
    }

    async startProgram(userId: string, programId: string) {
        if (!this.prisma.dietProgram || !this.prisma.userDietProgram) {
            throw new NotFoundException('Feature not available');
        }

        const program = await this.prisma.dietProgram.findUnique({
            where: { id: programId },
        });

        if (!program) throw new NotFoundException('Program not found');

        // Check for ANY existing active diet (not just this one)
        const existingActive = await this.prisma.userDietProgram.findFirst({
            where: { userId, status: 'active' },
        });

        if (existingActive) {
            // If trying to start the same diet that's already active, return 409 Conflict
            if (existingActive.programId === programId) {
                throw new ConflictException('Already enrolled in this diet program');
            }
            // If trying to start a different diet while one is active, return 400 Bad Request
            throw new BadRequestException('You already have an active diet. Complete or abandon it first.');
        }

        // Check if user has previous enrollment in this program (completed/abandoned)
        const existing = await this.prisma.userDietProgram.findUnique({
            where: { userId_programId: { userId, programId } },
        });

        if (existing) {
            return this.prisma.userDietProgram.update({
                where: { id: existing.id },
                data: { status: 'active', currentDay: 1, startedAt: new Date() },
                include: { program: true },
            });
        }

        return this.prisma.userDietProgram.create({
            data: { userId, programId, status: 'active', currentDay: 1 },
            include: { program: true },
        });
    }

    async getProgress(userId: string, programId: string) {
        if (!this.prisma.userDietProgram) {
            return null;
        }

        const progress = await this.prisma.userDietProgram.findUnique({
            where: { userId_programId: { userId, programId } },
            include: {
                program: {
                    include: {
                        days: {
                            orderBy: { dayNumber: 'asc' },
                            include: { meals: { orderBy: { sortOrder: 'asc' } } },
                        },
                    },
                },
            },
        });

        return progress;
    }

    async completeDay(userId: string, programId: string) {
        if (!this.prisma.userDietProgram) {
            throw new NotFoundException('Feature not available');
        }

        const progress = await this.prisma.userDietProgram.findUnique({
            where: { userId_programId: { userId, programId } },
            include: { program: true },
        });

        if (!progress) throw new NotFoundException('Progress not found');

        // FIX: Check if program exists before accessing its properties
        if (!progress.program) {
            throw new BadRequestException('Program data is missing');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get or create today's log
        let todayLog = await this.prisma.userDietDailyLog.findFirst({
            where: { userDietId: progress.id, date: today },
        });

        if (!todayLog) {
            // Create today's log if it doesn't exist
            // FIX: Safe access to dailyTracker with null check
            const dailyTracker = (progress.program?.dailyTracker as any[]) || [];
            todayLog = await this.prisma.userDietDailyLog.create({
                data: {
                    userDietId: progress.id,
                    date: today,
                    dayNumber: progress.currentDay,
                    checklist: {},
                    completionPercent: 0,
                    completed: false,
                    celebrationShown: false,
                },
            });
        }

        // Calculate completion rate
        // FIX: Safe access to dailyTracker with null check
        const checklist = (todayLog.checklist as Record<string, boolean>) || {};
        const dailyTracker = (progress.program?.dailyTracker as any[]) || [];
        const totalItems = dailyTracker.length;
        const completedItems = Object.values(checklist).filter(Boolean).length;
        const completionRate = totalItems > 0 ? completedItems / totalItems : 0;

        // Mark today's log as completed
        await this.prisma.userDietDailyLog.update({
            where: { id: todayLog.id },
            data: {
                completed: true,
                completionPercent: completionRate,
            },
        });

        // Update streak based on completion rate
        const threshold = progress.program?.streakThreshold || 0.6;
        const meetsThreshold = completionRate >= threshold;

        const lastStreakDate = progress.lastStreakDate;
        const todayStr = today.toISOString().split('T')[0];
        const lastStreakStr = lastStreakDate?.toISOString().split('T')[0];

        let newStreak = progress.currentStreak;
        if (meetsThreshold) {
            if (lastStreakStr !== todayStr) {
                // Check if consecutive
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                const isConsecutive = lastStreakStr === yesterdayStr || !lastStreakDate;
                newStreak = isConsecutive ? progress.currentStreak + 1 : 1;

                await this.prisma.userDietProgram.update({
                    where: { id: progress.id },
                    data: {
                        currentStreak: newStreak,
                        longestStreak: Math.max(newStreak, progress.longestStreak),
                        lastStreakDate: today,
                    },
                });
            }
        } else {
            // Reset streak if below threshold (only if we're updating streak today)
            if (lastStreakStr !== todayStr && progress.currentStreak > 0) {
                await this.prisma.userDietProgram.update({
                    where: { id: progress.id },
                    data: {
                        currentStreak: 0,
                    },
                });
                newStreak = 0;
            }
        }

        // Calculate next day based on calendar dates
        const startDate = new Date(progress.startedAt);
        startDate.setHours(0, 0, 0, 0);
        
        // Calculate days from start to tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const diffTime = tomorrow.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // TODO: Subtract paused days when pause functionality is implemented
        // const pausedDays = progress.pausedDays || [];
        // const activeDays = diffDays - pausedDays.length;
        
        const nextDay = diffDays + 1; // Day 1 is start date
        const programDuration = progress.program?.duration || 0;
        const isCompleted = nextDay > programDuration;

        // Create empty log for next day (if not completed)
        if (!isCompleted) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Check if tomorrow's log already exists
            const tomorrowLog = await this.prisma.userDietDailyLog.findFirst({
                where: { userDietId: progress.id, date: tomorrow },
            });

            if (!tomorrowLog) {
                await this.prisma.userDietDailyLog.create({
                    data: {
                        userDietId: progress.id,
                        date: tomorrow,
                        dayNumber: nextDay,
                        checklist: {}, // Empty checklist for new day
                        completionPercent: 0,
                        completed: false,
                        celebrationShown: false,
                    },
                });
            }
        }

        // Update progress
        const updatedProgress = await this.prisma.userDietProgram.update({
            where: { id: progress.id },
            data: {
                currentDay: isCompleted ? programDuration : nextDay,
                status: isCompleted ? 'completed' : 'active',
                completedAt: isCompleted ? new Date() : null,
                daysCompleted: isCompleted ? programDuration : progress.daysCompleted + 1,
            },
            include: { program: true },
        });

        return updatedProgress;
    }
}
