import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserProfilesService {
  private readonly logger = new Logger(UserProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, profileData: any) {
    try {
      // Use upsert to handle both create and update cases
      return await this.upsertForUser(userId, profileData);
    } catch (error) {
      this.logger.error(
        `[UserProfilesService] createProfile() failed for userId=${userId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async upsertForUser(userId: string, profileData: any) {
    try {
      // Get existing profile for daily calories calculation
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });

      // Remove fields that don't exist in the schema - be very explicit
      // UserProfile fields: id, userId, firstName, lastName, age, height, weight, gender, activityLevel, goal, targetWeight, dailyCalories, preferences, healthProfile, isOnboardingCompleted, createdAt, updatedAt
      // Note: email is NOT in UserProfile, it's in User model
      const {
        selectedPlan,
        planBillingCycle,
        planId,
        billingCycle,
        preferences,
        healthProfile,
        email, // Remove email - it's not in UserProfile model
        ...validProfileData
      } = profileData;

      // Ensure selectedPlan, planBillingCycle, and email are completely removed
      delete (validProfileData as any).selectedPlan;
      delete (validProfileData as any).planBillingCycle;
      delete (validProfileData as any).planId;
      delete (validProfileData as any).billingCycle;
      delete (validProfileData as any).email;
      
      // Sanitize string fields: convert empty strings to null
      if (validProfileData.firstName === '') validProfileData.firstName = null;
      if (validProfileData.lastName === '') validProfileData.lastName = null;
      if (validProfileData.gender === '') validProfileData.gender = null;
      if (validProfileData.activityLevel === '') validProfileData.activityLevel = null;
      if (validProfileData.goal === '') validProfileData.goal = null;

      const mergedPreferences = this.mergePreferences(
        preferences ?? existingProfile?.preferences,
        selectedPlan || planId,
        planBillingCycle || billingCycle,
      );

      // Recalculate daily calories if relevant fields changed
      const updatedData = existingProfile ? { ...existingProfile, ...validProfileData } : validProfileData;
      if (validProfileData.height || validProfileData.weight || validProfileData.age || validProfileData.gender || validProfileData.activityLevel) {
        validProfileData.dailyCalories = this.calculateDailyCalories(updatedData);
      }

      // Build final data object
      const finalData: any = {
        ...validProfileData,
      };

      // Handle preferences
      if (mergedPreferences !== null && mergedPreferences !== undefined) {
        finalData.preferences = mergedPreferences;
      }

      // Handle healthProfile (JSON field)
      if (healthProfile !== undefined) {
        finalData.healthProfile = healthProfile;
      }

      // Remove fields that should not be saved
      delete finalData.id;
      delete finalData.userId;
      delete finalData.createdAt;
      delete finalData.updatedAt;
      delete finalData.email; // Email is in User model, not UserProfile
      
      // Only include fields that exist in UserProfile model
      const allowedFields = [
        'firstName', 'lastName', 'age', 'height', 'weight', 'gender', 
        'activityLevel', 'goal', 'targetWeight', 'dailyCalories', 
        'preferences', 'healthProfile', 'isOnboardingCompleted'
      ];
      const sanitizedFinalData: any = {};
      for (const key of allowedFields) {
        if (key in finalData) {
          sanitizedFinalData[key] = finalData[key];
        }
      }

      // Use upsert to handle both create and update
      return this.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...sanitizedFinalData,
          isOnboardingCompleted: sanitizedFinalData.isOnboardingCompleted ?? false,
        },
        update: sanitizedFinalData,
      });
    } catch (error) {
      this.logger.error(
        `[UserProfilesService] upsertForUser() failed for userId=${userId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getProfile(userId: string) {
    try {
      let profile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });

      // If profile doesn't exist, create a default one
      if (!profile) {
        this.logger.log(`[UserProfilesService] Profile not found for userId=${userId}, creating default profile`);
        profile = await this.prisma.userProfile.create({
          data: {
            userId,
            isOnboardingCompleted: false,
            // All other fields are optional, so we can leave them null/undefined
          },
        });
        this.logger.log(`[UserProfilesService] Created default profile for userId=${userId}, id=${profile.id}`);
      }

      return profile;
    } catch (error) {
      this.logger.error(
        `[UserProfilesService] getProfile() failed for userId=${userId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getOrCreateForUser(userId: string) {
    // Alias for getProfile to maintain consistency
    return this.getProfile(userId);
  }

  /**
   * Update user profile with proper validation and normalization
   * Handles empty strings, removes invalid fields, normalizes data
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    this.logger.log(`[UserProfilesService] updateProfile() called for userId=${userId}`);
    
    try {
      // Normalize empty strings to null/undefined for optional string fields
      const normalizedData: any = {};

      // String fields: normalize empty strings to null
      if (dto.firstName !== undefined) {
        normalizedData.firstName = dto.firstName?.trim() || null;
      }
      if (dto.lastName !== undefined) {
        normalizedData.lastName = dto.lastName?.trim() || null;
      }
      if (dto.gender !== undefined) {
        normalizedData.gender = dto.gender?.trim() || null;
      }
      if (dto.activityLevel !== undefined) {
        normalizedData.activityLevel = dto.activityLevel?.trim() || null;
      }
      if (dto.goal !== undefined) {
        normalizedData.goal = dto.goal?.trim() || null;
      }

      // Number fields: only include if defined and valid
      if (dto.age !== undefined && dto.age !== null) {
        normalizedData.age = Number.isInteger(dto.age) ? dto.age : null;
      }
      if (dto.height !== undefined && dto.height !== null) {
        normalizedData.height = Number.isFinite(dto.height) && dto.height > 0 ? dto.height : null;
      }
      if (dto.weight !== undefined && dto.weight !== null) {
        normalizedData.weight = Number.isFinite(dto.weight) && dto.weight > 0 ? dto.weight : null;
      }
      if (dto.targetWeight !== undefined && dto.targetWeight !== null) {
        normalizedData.targetWeight = Number.isFinite(dto.targetWeight) && dto.targetWeight > 0 ? dto.targetWeight : null;
      }
      if (dto.dailyCalories !== undefined && dto.dailyCalories !== null) {
        normalizedData.dailyCalories = Number.isInteger(dto.dailyCalories) && dto.dailyCalories > 0 ? dto.dailyCalories : null;
      }

      // Boolean fields
      if (dto.isOnboardingCompleted !== undefined) {
        normalizedData.isOnboardingCompleted = Boolean(dto.isOnboardingCompleted);
      }

      // JSON fields: only include if defined and is object
      if (dto.preferences !== undefined) {
        normalizedData.preferences = typeof dto.preferences === 'object' && dto.preferences !== null ? dto.preferences : null;
      }
      if (dto.healthProfile !== undefined) {
        normalizedData.healthProfile = typeof dto.healthProfile === 'object' && dto.healthProfile !== null ? dto.healthProfile : null;
      }

      // Get existing profile for daily calories calculation if needed
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });

      // Recalculate daily calories if relevant fields changed
      const updatedData = existingProfile ? { ...existingProfile, ...normalizedData } : normalizedData;
      if (normalizedData.height || normalizedData.weight || normalizedData.age || normalizedData.gender || normalizedData.activityLevel) {
        normalizedData.dailyCalories = this.calculateDailyCalories(updatedData);
      }

      // Only include fields that exist in UserProfile model
      const allowedFields = [
        'firstName', 'lastName', 'age', 'height', 'weight', 'gender',
        'activityLevel', 'goal', 'targetWeight', 'dailyCalories',
        'preferences', 'healthProfile', 'isOnboardingCompleted'
      ];
      const sanitizedData: any = {};
      for (const key of allowedFields) {
        if (key in normalizedData) {
          sanitizedData[key] = normalizedData[key];
        }
      }

      // Use upsert to handle both create and update
      const profile = await this.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...sanitizedData,
          isOnboardingCompleted: sanitizedData.isOnboardingCompleted ?? false,
        },
        update: sanitizedData,
      });

      this.logger.log(
        `[UserProfilesService] updateProfile() succeeded for userId=${userId}, profileId=${profile.id}`,
      );
      return profile;
    } catch (error) {
      this.logger.error(
        `[UserProfilesService] updateProfile() failed for userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async completeOnboarding(userId: string) {
    try {
      // Ensure profile exists before updating
      let profile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        this.logger.log(`[UserProfilesService] Profile not found for userId=${userId} in completeOnboarding, creating default profile first`);
        profile = await this.prisma.userProfile.create({
          data: {
            userId,
            isOnboardingCompleted: true, // Mark as completed immediately
          },
        });
        this.logger.log(`[UserProfilesService] Created and completed onboarding for userId=${userId}, id=${profile.id}`);
        return profile;
      }

      // Update existing profile
      return this.prisma.userProfile.update({
        where: { userId },
        data: { isOnboardingCompleted: true },
      });
    } catch (error) {
      this.logger.error(
        `[UserProfilesService] completeOnboarding() failed for userId=${userId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private calculateDailyCalories(profile: any): number {
    const { height, weight, age, gender, activityLevel } = profile;
    
    if (!height || !weight || !age || !gender || !activityLevel) {
      return 2000; // Default value
    }

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Apply activity level multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };

    const multiplier = activityMultipliers[activityLevel] || 1.2;
    return Math.round(bmr * multiplier);
  }

  private mergePreferences(
    basePreferences: any,
    selectedPlan?: string,
    planBillingCycle?: string,
  ) {
    const hasPlanSelection = selectedPlan || planBillingCycle;
    const preferencesClone = basePreferences
      ? { ...basePreferences }
      : hasPlanSelection
        ? {}
        : null;

    if (!preferencesClone) {
      return null;
    }

    if (hasPlanSelection) {
      const subscription = {
        ...(preferencesClone.subscription ?? {}),
      };

      if (selectedPlan) {
        subscription.planId = selectedPlan;
      }
      if (planBillingCycle) {
        subscription.billingCycle = planBillingCycle;
      } else if (selectedPlan === 'free' && !subscription.billingCycle) {
        subscription.billingCycle = 'lifetime';
      }

      preferencesClone.subscription = subscription;
    }

    return preferencesClone;
  }
}
