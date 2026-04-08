import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma.service';

export const DAILY_LIMIT_KEY = 'dailyLimit';

export interface DailyLimitOptions {
  limit?: number; // Optional: if not provided, uses FREE_DAILY_ANALYSES or PRO_DAILY_ANALYSES from env
  resource: 'food' | 'chat';
}

@Injectable()
export class DailyLimitGuard implements CanActivate {
  private readonly logger = new Logger(DailyLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<DailyLimitOptions>(
      DAILY_LIMIT_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true; // No limit configured
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Check if limits are disabled (for admin/testing)
    const disableLimits = process.env.DISABLE_LIMITS === 'true';
    if (disableLimits) {
      return true;
    }

    // Check user subscription - query database for active subscription
    const activeSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
      include: { plan: true },
    });

    const isFreeUser = !activeSubscription;

    // Get limits from environment variables
    const freeDailyAnalyses = parseInt(process.env.FREE_DAILY_ANALYSES || '3', 10);
    const proDailyAnalyses = parseInt(process.env.PRO_DAILY_ANALYSES || '9999', 10);

    // Use plan-specific limit if available, otherwise use env defaults
    let userLimit: number;
    if (activeSubscription?.plan?.dailyLimit) {
      userLimit = activeSubscription.plan.dailyLimit;
    } else {
      userLimit = isFreeUser ? freeDailyAnalyses : proDailyAnalyses;
    }

    // Override with explicit limit from decorator if provided
    const effectiveLimit = options.limit || (options.resource === 'food' ? userLimit : 10);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `daily:${options.resource}:${userId}:${today}`;

    const resetTime = getResetTime();

    // Atomically increment counter before allowing the request.
    // NOTE: A real Redis INCR always returns >= 1 (it creates the key if missing).
    // RedisService.incr() returns 0 ONLY when Redis is unavailable or errored.
    // We treat 0 as a sentinel for "Redis broken" and FAIL CLOSED — otherwise the
    // paywall silently disables itself the moment Redis hiccups (the bug we hit
    // in production where users could take unlimited photos).
    const newCount = await this.redisService.incr(key);

    if (newCount <= 0) {
      this.logger.error(
        `[DailyLimitGuard] Redis unavailable for key=${key} (incr returned ${newCount}). ` +
        `Failing CLOSED to protect ${options.resource} quota. Falling back to DB count.`,
      );

      // Fallback: count today's analyses directly from the database.
      // This keeps the paywall working when Redis is down at the cost of one extra query.
      const dbCount = await this.countTodayFromDb(userId, options.resource);
      if (dbCount >= effectiveLimit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Daily scan limit reached',
            limit: effectiveLimit,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // DB count is below the limit — allow the request. The next analysis will
      // increment the DB-backed counter naturally (Analysis row is created downstream).
      return true;
    }

    // Set TTL on first increment so the key expires at midnight
    if (newCount === 1) {
      const secondsUntilMidnight = Math.ceil(
        (resetTime.getTime() - Date.now()) / 1000,
      );
      await this.redisService.expire(key, secondsUntilMidnight);
    }

    // Enforce effective limit
    if (newCount > effectiveLimit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Daily scan limit reached',
          limit: effectiveLimit,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * DB-backed fallback when Redis is unavailable.
   * Counts today's Analysis rows for the user (food resource only — chat has no
   * persistent table to count from, so chat falls back to allowing the request).
   */
  private async countTodayFromDb(userId: string, resource: 'food' | 'chat'): Promise<number> {
    if (resource !== 'food') {
      return 0;
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    try {
      return await this.prisma.analysis.count({
        where: {
          userId,
          createdAt: { gte: startOfDay },
        },
      });
    } catch (error: any) {
      this.logger.error(
        `[DailyLimitGuard] DB fallback also failed for userId=${userId}: ${error?.message || error}`,
      );
      // Both Redis AND DB are broken — at this point the API is in serious trouble.
      // We let the request through rather than block all paying users from a transient outage.
      return 0;
    }
  }
}

// Helper function to calculate reset time (midnight)
function getResetTime(): Date {
  const resetTime = new Date();
  resetTime.setHours(24, 0, 0, 0);
  return resetTime;
}

