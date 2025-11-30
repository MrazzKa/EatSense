import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
      const {
        selectedPlan,
        planBillingCycle,
        planId,
        billingCycle,
        preferences,
        healthProfile,
        ...validProfileData
      } = profileData;

      // Ensure selectedPlan and planBillingCycle are completely removed
      delete (validProfileData as any).selectedPlan;
      delete (validProfileData as any).planBillingCycle;
      delete (validProfileData as any).planId;
      delete (validProfileData as any).billingCycle;

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

      // Use upsert to handle both create and update
      return this.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...finalData,
          isOnboardingCompleted: finalData.isOnboardingCompleted ?? false,
        },
        update: finalData,
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

  async updateProfile(userId: string, profileData: any) {
    try {
      // Use upsert to handle both create and update cases
      return await this.upsertForUser(userId, profileData);
    } catch (error) {
      this.logger.error(
        `[UserProfilesService] updateProfile() failed for userId=${userId}`,
        (error as Error).stack,
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
