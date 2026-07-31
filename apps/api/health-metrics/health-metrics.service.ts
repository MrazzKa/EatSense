import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { calculateDailyCalories } from '../src/common/daily-calories.util';
import { SyncHealthMetricsDto } from './dto';

/**
 * Server-side home for Apple Health / Health Connect data.
 *
 * HealthKit and Health Connect are device-only, so the app pushes a daily rollup
 * here. Keeping it server-side is what makes three things possible that a purely
 * on-device integration could not do: a calorie target that follows real
 * activity, an expert seeing the client's activity, and history surviving a
 * device change.
 *
 * NOTE: this data is NEVER used for the training dataset, and it is only sent to
 * the AI when the user has switched on `healthAiContext`. Apple's HealthKit rules
 * make both of those hard requirements, not preferences.
 */
@Injectable()
export class HealthMetricsService {
  private readonly logger = new Logger(HealthMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sync(userId: string, dto: SyncHealthMetricsDto) {
    const days = Array.isArray(dto.days) ? dto.days : [];

    let written = 0;
    for (const day of days) {
      // Skip days where the user granted nothing — an all-null row is noise.
      const hasAnything =
        day.steps != null ||
        day.activeEnergyKcal != null ||
        day.restingEnergyKcal != null ||
        day.workoutMinutes != null ||
        day.sleepMinutes != null ||
        day.restingHeartRate != null;
      if (!hasAnything) continue;

      const data = {
        steps: day.steps ?? null,
        activeEnergyKcal: day.activeEnergyKcal ?? null,
        restingEnergyKcal: day.restingEnergyKcal ?? null,
        workoutMinutes: day.workoutMinutes ?? null,
        sleepMinutes: day.sleepMinutes ?? null,
        restingHeartRate: day.restingHeartRate ?? null,
        source: dto.source,
        syncedAt: new Date(),
      };

      try {
        await this.prisma.healthDailyMetric.upsert({
          where: { userId_date: { userId, date: day.date } },
          create: { userId, date: day.date, ...data },
          update: data,
        });
        written++;
      } catch (e: any) {
        this.logger.warn(`[HealthMetrics] upsert failed for ${day.date}: ${e?.message}`);
      }
    }

    if (typeof dto.weightKg === 'number' && Number.isFinite(dto.weightKg)) {
      await this.syncWeight(userId, dto.weightKg);
    }

    return { written, received: days.length };
  }

  /**
   * Mirror the latest scale reading into the profile.
   *
   * Only moves the number when it actually differs — a no-op update would bump
   * `updatedAt` and, worse, retrigger the profile's calorie recalculation on
   * every app open.
   */
  private async syncWeight(userId: string, weightKg: number) {
    try {
      const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
      if (!profile) return;

      const rounded = Math.round(weightKg * 10) / 10;
      if (profile.weight !== null && Math.abs(profile.weight - rounded) < 0.1) return;

      const prefs = ((profile.preferences as any) || {}) as Record<string, any>;
      const data: any = { weight: rounded };

      // The calorie target is derived from weight (Mifflin-St Jeor), so a new
      // weight has to move it — otherwise the scale updates and the goal quietly
      // keeps using the old number. Skipped when the user set the target by hand,
      // matching how UserProfilesService.updateProfile treats `isManualCalories`.
      if (!prefs.isManualCalories) {
        const next = calculateDailyCalories({ ...profile, weight: rounded });
        if (next !== profile.dailyCalories) data.dailyCalories = next;
      }

      await this.prisma.userProfile.update({ where: { id: profile.id }, data });
      this.logger.log(
        `[HealthMetrics] weight synced from health store for userId=${userId}` +
          (data.dailyCalories ? ` (calorie target → ${data.dailyCalories})` : ''),
      );
    } catch (e: any) {
      this.logger.warn(`[HealthMetrics] weight sync failed: ${e?.message}`);
    }
  }

  /** One day, or null when the user has never synced / granted nothing. */
  async getDay(userId: string, date: string) {
    return this.prisma.healthDailyMetric
      .findUnique({ where: { userId_date: { userId, date } } })
      .catch(() => null);
  }

  async getRange(userId: string, from: string, to: string) {
    return this.prisma.healthDailyMetric
      .findMany({
        where: { userId, date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      })
      .catch(() => []);
  }

  /**
   * Extra calories the user earned today by moving.
   *
   * Deliberately uses ACTIVE energy only. Resting energy is already inside the
   * BMR-derived target, so adding total burn would double-count it and inflate
   * the budget by ~1500 kcal.
   */
  async getActiveEnergyForDate(userId: string, date: string): Promise<number | null> {
    const day = await this.getDay(userId, date);
    const kcal = day?.activeEnergyKcal;
    return typeof kcal === 'number' && kcal > 0 ? kcal : null;
  }
}
