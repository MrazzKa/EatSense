import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdateProfileDto } from './dto';
import { HealthProfile } from '../src/users/health-profile.types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        profile: true,
        createdAt: true,
        updatedAt: true,
        userProfile: {
          select: {
            firstName: true,
            lastName: true,
            age: true,
            height: true,
            weight: true,
            gender: true,
            activityLevel: true,
            goal: true,
            targetWeight: true,
            dailyCalories: true,
            preferences: true,
            healthProfile: true,
            isOnboardingCompleted: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build update data (only include defined fields that exist in UserProfile model)
    // UserProfile fields: firstName, lastName, age, height, weight, gender, activityLevel, goal, targetWeight, dailyCalories, preferences, healthProfile, isOnboardingCompleted
    // Note: email is NOT in UserProfile, it's in User model
    const updateData: any = {};
    if (updateProfileDto.firstName !== undefined) {
      updateData.firstName = updateProfileDto.firstName || null;
    }
    if (updateProfileDto.lastName !== undefined) {
      updateData.lastName = updateProfileDto.lastName || null;
    }
    if (updateProfileDto.age !== undefined) {
      updateData.age = updateProfileDto.age || null;
    }
    if (updateProfileDto.height !== undefined) {
      updateData.height = updateProfileDto.height || null;
    }
    if (updateProfileDto.weight !== undefined) {
      updateData.weight = updateProfileDto.weight || null;
    }
    if (updateProfileDto.gender !== undefined) {
      updateData.gender = updateProfileDto.gender || null;
    }
    if (updateProfileDto.activityLevel !== undefined) {
      updateData.activityLevel = updateProfileDto.activityLevel || null;
    }
    if (updateProfileDto.goal !== undefined) {
      updateData.goal = updateProfileDto.goal || null;
    }
    if (updateProfileDto.targetWeight !== undefined) {
      updateData.targetWeight = updateProfileDto.targetWeight || null;
    }
    if (updateProfileDto.dailyCalories !== undefined) {
      updateData.dailyCalories = updateProfileDto.dailyCalories || null;
    }
    if (updateProfileDto.preferences !== undefined) {
      updateData.preferences = updateProfileDto.preferences || null;
    }
    if (updateProfileDto.isOnboardingCompleted !== undefined) {
      updateData.isOnboardingCompleted = updateProfileDto.isOnboardingCompleted;
    }

    // Handle healthProfile merge
    if (updateProfileDto.healthProfile !== undefined) {
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });
      const existingHealthProfile = (existingProfile?.healthProfile || {}) as HealthProfile;
      
      // Deep merge healthProfile objects
      const nextHealthProfile: HealthProfile = {
        ...existingHealthProfile,
      };
      
      if (updateProfileDto.healthProfile.metabolic !== undefined) {
        nextHealthProfile.metabolic = {
          ...existingHealthProfile.metabolic,
          ...updateProfileDto.healthProfile.metabolic,
        };
      }
      
      if (updateProfileDto.healthProfile.eatingBehavior !== undefined) {
        nextHealthProfile.eatingBehavior = {
          ...existingHealthProfile.eatingBehavior,
          ...updateProfileDto.healthProfile.eatingBehavior,
        };
      }
      
      if (updateProfileDto.healthProfile.sleep !== undefined) {
        nextHealthProfile.sleep = {
          ...existingHealthProfile.sleep,
          ...updateProfileDto.healthProfile.sleep,
        };
      }
      
      if (updateProfileDto.healthProfile.glp1Module !== undefined) {
        nextHealthProfile.glp1Module = {
          ...existingHealthProfile.glp1Module,
          ...updateProfileDto.healthProfile.glp1Module,
        };
      }
      
      if (updateProfileDto.healthProfile.healthFocus !== undefined) {
        nextHealthProfile.healthFocus = {
          ...existingHealthProfile.healthFocus,
          ...updateProfileDto.healthProfile.healthFocus,
        };
      }

      // Auto-calculate WHR if waist and hip are provided
      if (
        nextHealthProfile.metabolic?.waistCm &&
        nextHealthProfile.metabolic?.hipCm &&
        nextHealthProfile.metabolic.hipCm > 0
      ) {
        nextHealthProfile.metabolic.whr = Number(
          (nextHealthProfile.metabolic.waistCm / nextHealthProfile.metabolic.hipCm).toFixed(2)
        );
      }

      updateData.healthProfile = nextHealthProfile;
    }

    // Sanitize updateData: remove any fields that don't exist in UserProfile model
    // UserProfile fields: id, userId, firstName, lastName, age, height, weight, gender, activityLevel, goal, targetWeight, dailyCalories, preferences, healthProfile, isOnboardingCompleted, createdAt, updatedAt
    const allowedFields = [
      'firstName', 'lastName', 'age', 'height', 'weight', 'gender', 
      'activityLevel', 'goal', 'targetWeight', 'dailyCalories', 
      'preferences', 'healthProfile', 'isOnboardingCompleted'
    ];
    const sanitizedUpdateData: any = {};
    for (const key of allowedFields) {
      if (key in updateData) {
        sanitizedUpdateData[key] = updateData[key];
      }
    }

    // Update or create UserProfile
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: sanitizedUpdateData,
      create: {
        userId,
        ...sanitizedUpdateData,
      },
    });

    // Also update JSON profile field for backward compatibility
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (userProfile) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          profile: {
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            age: userProfile.age,
            height: userProfile.height,
            weight: userProfile.weight,
            gender: userProfile.gender,
            activityLevel: userProfile.activityLevel,
            goal: userProfile.goal,
            targetWeight: userProfile.targetWeight,
            dailyCalories: userProfile.dailyCalories,
            preferences: userProfile.preferences,
            healthProfile: userProfile.healthProfile,
            isOnboardingCompleted: userProfile.isOnboardingCompleted,
          },
        },
      });
    }

    // Return updated user with profile
    return this.getProfile(userId);
  }

  async deleteAccount(userId: string) {
    try {
      // Revoke all refresh tokens
      const refreshTokens = await this.prisma.refreshToken.findMany({
        where: { userId, revoked: false },
      });

      // Add all active tokens to Redis blacklist
      const blacklistPrefix = process.env.REDIS_BLACKLIST_PREFIX || 'auth:refresh:blacklist:';
      for (const token of refreshTokens) {
        const blacklistKey = `${blacklistPrefix}${token.token}`;
        const ttl = Math.max(0, Math.floor((token.expiresAt.getTime() - Date.now()) / 1000));
        if (ttl > 0) {
          await this.redisService.set(blacklistKey, '1', ttl);
        }
      }

      // Revoke all refresh tokens in database
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });

      // Get user email for OTP cleanup
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      // Clean up Redis daily limit counters
      const today = new Date().toISOString().split('T')[0];
      await this.redisService.del(`daily:food:${userId}:${today}`);
      await this.redisService.del(`daily:chat:${userId}:${today}`);

      // Clean up OTP entries (stored by email, not userId)
      if (user?.email) {
        const normalizedEmail = user.email.trim().toLowerCase();
        await this.redisService.del(`auth:otp:${normalizedEmail}`);
        await this.redisService.del(`auth:otp:cooldown:${normalizedEmail}`);
        await this.redisService.del(`auth:otp:rate:${normalizedEmail}`);
      }

      // Delete user (cascade will delete related records: analyses, meals, media, etc.)
      await this.prisma.user.delete({
        where: { id: userId },
      });

      this.logger.log(`[UsersService] Account deleted for user ${userId}`);

      return { message: 'Account deleted successfully' };
    } catch (error) {
      this.logger.error(`[UsersService] Failed to delete account for user ${userId}:`, error);
      throw error;
    }
  }

  async getUserStats(userId: string) {
    try {
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

      // If no stats exist yet, return safe defaults
    if (!stats) {
      return {
        totalPhotosAnalyzed: 0,
        todayPhotosAnalyzed: 0,
        dailyLimit: parseInt(process.env.FREE_DAILY_ANALYSES || '3', 10),
      };
    }

      // Normalise potentially null values from DB
      const totalPhotosAnalyzed = Number.isFinite(Number(stats.totalPhotosAnalyzed))
        ? Number(stats.totalPhotosAnalyzed)
        : 0;
      let todayPhotosAnalyzed = Number.isFinite(Number(stats.todayPhotosAnalyzed))
        ? Number(stats.todayPhotosAnalyzed)
        : 0;

    // Check if today's count needs reset
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastAnalysisDate = stats.lastAnalysisDate
      ? new Date(stats.lastAnalysisDate)
      : null;

    if (!lastAnalysisDate || lastAnalysisDate < today) {
      // Reset today's count if last analysis was not today
      todayPhotosAnalyzed = 0;
    }

    // Get daily limit based on subscription
    let dailyLimit = parseInt(process.env.FREE_DAILY_ANALYSES || '3', 10);
    
    // Check user's active subscription to get plan-specific limit
    const activeSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
      include: { plan: true },
    });

    if (activeSubscription?.plan?.dailyLimit) {
      // Use plan-specific limit (e.g., student: 10, paid: 9999)
      dailyLimit = activeSubscription.plan.dailyLimit;
    } else if (activeSubscription && !activeSubscription.plan) {
      // Subscription exists but plan not found - use pro default
      dailyLimit = parseInt(process.env.PRO_DAILY_ANALYSES || '9999', 10);
    }

    return {
        totalPhotosAnalyzed,
      todayPhotosAnalyzed,
      dailyLimit,
    };
    } catch (error) {
      // Never let stats endpoint crash the app – log and return safe defaults
      this.logger.error(`[UsersService] getUserStats failed for user ${userId}: ${error?.message || error}`, error?.stack);
      return {
        totalPhotosAnalyzed: 0,
        todayPhotosAnalyzed: 0,
        dailyLimit: parseInt(process.env.FREE_DAILY_ANALYSES || '3', 10),
      };
    }
  }

  async getUserReport(userId: string, from?: string, to?: string) {
    const now = new Date();
    const toDate = to ? new Date(to) : now;
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days

    // Get analyses in period
    const analyses = await this.prisma.analysis.findMany({
      where: {
        userId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        status: 'COMPLETED',
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
      },
    });

    // Get lab results if any
    const labResults = await this.prisma.labResult.findMany({
      where: {
        userId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        id: true,
        summary: true,
        createdAt: true,
      },
    });

    // Get basic nutrition aggregates from meals
    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        items: true,
      },
    });

    const totalCalories = meals.reduce((sum, meal) => {
      return sum + meal.items.reduce((mealSum, item) => mealSum + item.calories, 0);
    }, 0);

    const totalProtein = meals.reduce((sum, meal) => {
      return sum + meal.items.reduce((mealSum, item) => mealSum + item.protein, 0);
    }, 0);

    return {
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      totalPhotosAnalyzed: analyses.length,
      nutritionAggregates: {
        totalCalories,
        totalProtein,
        averageCaloriesPerDay: analyses.length > 0 ? totalCalories / analyses.length : 0,
      },
      labResultsSummary: labResults.length > 0
        ? `${labResults.length} lab result(s) analyzed in this period.`
        : null,
    };
  }
}
