import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../src/cache/cache.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { normalizeSupportedCountryCode } from '../src/common/country-codes';

@Injectable()
export class UserProfilesService {
  private readonly logger = new Logger(UserProfilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
      select: { id: true },
    });
    return Boolean(subscription);
  }

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

      // Recalculate daily calories if relevant fields changed (respecting manual overrides)
      const updatedData = existingProfile ? { ...existingProfile, ...validProfileData } : validProfileData;
      const bodyFieldsChanged = validProfileData.height || validProfileData.weight || validProfileData.age || validProfileData.gender || validProfileData.activityLevel;
      const upsertExistingPrefs = typeof existingProfile?.preferences === 'object' && existingProfile?.preferences !== null
        ? existingProfile.preferences as Record<string, any>
        : {};

      if (validProfileData.dailyCalories !== undefined && validProfileData.dailyCalories !== null && validProfileData.dailyCalories > 0 && !isNaN(validProfileData.dailyCalories)) {
        // User explicitly sent valid dailyCalories — mark as manual
        if (mergedPreferences && typeof mergedPreferences === 'object') {
          (mergedPreferences as any).isManualCalories = true;
        }
      } else if (validProfileData.dailyCalories !== undefined && (validProfileData.dailyCalories <= 0 || isNaN(validProfileData.dailyCalories))) {
        // Invalid calorie value sent — discard and let backend recalculate
        delete validProfileData.dailyCalories;
        const recalculated = this.calculateDailyCalories(updatedData);
        if (recalculated > 0) {
          validProfileData.dailyCalories = recalculated;
        }
        if (mergedPreferences && typeof mergedPreferences === 'object') {
          (mergedPreferences as any).isManualCalories = false;
        }
      } else if (bodyFieldsChanged && !upsertExistingPrefs.isManualCalories) {
        // Body params changed and no manual override — recalculate
        validProfileData.dailyCalories = this.calculateDailyCalories(updatedData);
        if (mergedPreferences && typeof mergedPreferences === 'object') {
          (mergedPreferences as any).isManualCalories = false;
        }
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
      if (healthProfile !== undefined && await this.hasActiveSubscription(userId)) {
        finalData.healthProfile = healthProfile;
      }

      // Remove fields that should not be saved
      delete finalData.id;
      delete finalData.userId;
      delete finalData.createdAt;
      delete finalData.updatedAt;
      delete finalData.email; // Email is in User model, not UserProfile
      
      // Country can come at the root or inside preferences. Accept only supported
      // ISO-2 codes. "OTHER" intentionally does not create a community.
      const incomingCountryRaw =
        (profileData as any).country ||
        (mergedPreferences && (mergedPreferences as any).country) ||
        null;
      if (incomingCountryRaw && typeof incomingCountryRaw === 'string') {
        finalData.country = normalizeSupportedCountryCode(incomingCountryRaw);
      }

      // Only include fields that exist in UserProfile model
      const allowedFields = [
        'firstName', 'lastName', 'age', 'height', 'weight', 'gender',
        'activityLevel', 'goal', 'targetWeight', 'dailyCalories',
        'avatarUrl', 'preferences', 'healthProfile', 'isOnboardingCompleted',
        'country',
      ];
      const sanitizedFinalData: any = {};
      for (const key of allowedFields) {
        if (key in finalData) {
          sanitizedFinalData[key] = finalData[key];
        }
      }

      // Use upsert to handle both create and update
      const result = await this.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...sanitizedFinalData,
          isOnboardingCompleted: sanitizedFinalData.isOnboardingCompleted ?? false,
        },
        update: sanitizedFinalData,
      });

      // Auto-join the user to the country-level community group when country
      // is set or changes. Failure must not break profile save.
      if (sanitizedFinalData.country) {
        try {
          await this.ensureCountryCommunityMembership(userId, sanitizedFinalData.country);
        } catch (e: any) {
          this.logger.warn(`[UserProfilesService] country auto-join failed: ${e?.message || e}`);
        }
      }

      return result;
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

      if (!profile) {
        this.logger.log(`[UserProfilesService] Profile not found for userId=${userId}`);
        return null;
      }

      // Include expertsRole from User model so the mobile app can check expert status.
      // Also expose the expert's approval state (isPublished/isVerified) so the
      // mobile UI can distinguish "applicant pending review" from "approved expert".
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          expertsRole: true,
          expertProfile: {
            select: { id: true, isPublished: true, isVerified: true, isActive: true },
          },
        },
      });

      // expertStatus matches the admin filter taxonomy:
      // - 'approved': currently published + verified
      // - 'unpublished': previously approved (verified) but admin took offline
      // - 'pending': fresh application awaiting review (active, not yet verified)
      // - 'rejected': admin denied (isActive=false)
      const ep = user?.expertProfile;
      let expertStatus: 'approved' | 'unpublished' | 'pending' | 'rejected' | null = null;
      if (ep) {
        if (ep.isPublished && ep.isVerified) expertStatus = 'approved';
        else if (ep.isActive && ep.isVerified) expertStatus = 'unpublished';
        else if (ep.isActive) expertStatus = 'pending';
        else expertStatus = 'rejected';
      }

      return {
        ...profile,
        expertsRole: user?.expertsRole ?? null,
        expertStatus,
        expertProfile: user?.expertProfile ?? null,
      };
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
      if (dto.healthProfile !== undefined && await this.hasActiveSubscription(userId)) {
        normalizedData.healthProfile = typeof dto.healthProfile === 'object' && dto.healthProfile !== null ? dto.healthProfile : null;
      }

      // Get existing profile for daily calories calculation if needed
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });

      // Recalculate daily calories if relevant body fields changed
      const updatedData = existingProfile ? { ...existingProfile, ...normalizedData } : normalizedData;
      const bodyFieldsChanged = normalizedData.height || normalizedData.weight || normalizedData.age || normalizedData.gender || normalizedData.activityLevel;
      const existingPrefs = typeof existingProfile?.preferences === 'object' && existingProfile?.preferences !== null
        ? existingProfile.preferences as Record<string, any>
        : {};
      const mergedPrefs = {
        ...existingPrefs,
        ...(normalizedData.preferences && typeof normalizedData.preferences === 'object' ? normalizedData.preferences : {}),
      };

      if (normalizedData.dailyCalories !== undefined && normalizedData.dailyCalories !== null && normalizedData.dailyCalories > 0 && !isNaN(normalizedData.dailyCalories)) {
        // User explicitly sent valid dailyCalories — mark as manual
        mergedPrefs.isManualCalories = true;
        normalizedData.preferences = mergedPrefs;
      } else if (normalizedData.dailyCalories !== undefined && (normalizedData.dailyCalories <= 0 || isNaN(normalizedData.dailyCalories))) {
        // Invalid calorie value — discard and recalculate
        delete normalizedData.dailyCalories;
        normalizedData.dailyCalories = this.calculateDailyCalories(updatedData);
        mergedPrefs.isManualCalories = false;
        normalizedData.preferences = mergedPrefs;
      } else if (bodyFieldsChanged && !existingPrefs.isManualCalories) {
        // Body params changed and no manual override — recalculate
        normalizedData.dailyCalories = this.calculateDailyCalories(updatedData);
        mergedPrefs.isManualCalories = false;
        normalizedData.preferences = mergedPrefs;
      }

      // Country: accept at root or inside preferences. Accept only supported ISO-2.
      const incomingCountryRaw =
        (dto as any).country ||
        (normalizedData.preferences as any)?.country ||
        null;
      if (incomingCountryRaw && typeof incomingCountryRaw === 'string') {
        normalizedData.country = normalizeSupportedCountryCode(incomingCountryRaw);
      }

      // Only include fields that exist in UserProfile model
      const allowedFields = [
        'firstName', 'lastName', 'age', 'height', 'weight', 'gender',
        'activityLevel', 'goal', 'targetWeight', 'dailyCalories',
        'preferences', 'healthProfile', 'isOnboardingCompleted', 'country',
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

      // Auto-join country community group if country was set/changed.
      if (sanitizedData.country) {
        try {
          await this.ensureCountryCommunityMembership(userId, sanitizedData.country);
        } catch (e: any) {
          this.logger.warn(`country auto-join failed: ${e?.message || e}`);
        }
      }

      // FIX: Invalidate stats cache so Dashboard picks up new calorie goals immediately
      // This is the PRIMARY profile update endpoint (PUT /user-profiles)
      try {
        await this.cache.invalidateNamespace('stats:monthly', userId);
        await this.cache.invalidateNamespace('stats:daily' as any, userId);
        this.logger.debug(`Invalidated stats cache for user ${userId} after profile update`);
      } catch (cacheError: any) {
        this.logger.warn(`Failed to invalidate stats cache: ${cacheError?.message || String(cacheError)}`);
      }

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

    const multiplier = (activityMultipliers as Record<string, number>)[activityLevel] || 1.2;
    const tdee = bmr * multiplier;

    // Goal-aware target: apply a moderate deficit/surplus so the calorie goal
    // actually reflects the user's weight goal. Previously this returned pure TDEE,
    // so weight-loss users got maintenance calories everywhere (dashboard ring,
    // AI assistant, reports). 15% deficit / 10% surplus, with a safe 1200 floor.
    const goalFactor = profile.goal === 'lose_weight' ? 0.85
      : profile.goal === 'gain_weight' ? 1.10
        : 1.0;
    return Math.max(1200, Math.round(tdee * goalFactor));
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

  /**
   * Ensure the user is a member of the country-level community group.
   * Prefer seeded groups by ISO country code; older seed scripts used slugs
   * like `country-kazakhstan`, so slug-only lookup is intentionally avoided.
   * Single COUNTRY membership invariant.
   */
  private async ensureCountryCommunityMembership(userId: string, countryCode: string) {
    const code = normalizeSupportedCountryCode(countryCode);
    if (!code) return;

    let group = await (this.prisma as any).communityGroup.findFirst({
      where: { type: 'COUNTRY' as any, country: code },
      orderBy: [{ isSeeded: 'desc' }, { createdAt: 'asc' }],
    });

    if (!group) {
      const slug = `country-${code.toLowerCase()}`;
      group = await (this.prisma as any).communityGroup.upsert({
        where: { slug },
        update: { country: code, type: 'COUNTRY' as any },
        create: {
          name: `Community ${code}`,
          slug,
          type: 'COUNTRY' as any,
          country: code,
          isSeeded: true,
        },
      });
    }

    try {
      await (this.prisma as any).communityMembership.deleteMany({
        where: {
          userId,
          group: { type: 'COUNTRY' as any, NOT: { id: group.id } },
        },
      });
    } catch {
      // older deployments may not have type=COUNTRY rows
    }

    await (this.prisma as any).communityMembership.upsert({
      where: { userId_groupId: { userId, groupId: group.id } },
      update: { guidelinesAccepted: true },
      create: { userId, groupId: group.id, guidelinesAccepted: true },
    });

    await (this.prisma as any).userProfile.updateMany({
      where: { userId },
      data: { country: code, cityGroupId: group.id },
    });
  }
}
