import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
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

    // Get current count
    const currentCountStr = await this.redisService.get(key);
    const currentCount = currentCountStr ? parseInt(currentCountStr) : 0;

    const resetTime = getResetTime();

    if (currentCount >= effectiveLimit) {
      const secondsUntilReset = Math.floor((resetTime.getTime() - Date.now()) / 1000);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'DAILY_LIMIT_EXCEEDED',
          message: `Daily limit reached. You have used ${currentCount} of ${effectiveLimit} ${options.resource === 'food' ? 'photo analyses' : 'chat requests'} today. Limit resets at midnight.`,
          limit: effectiveLimit,
          used: currentCount,
          remaining: 0,
          resetAt: resetTime.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Store limit info in request for later increment (after successful analysis)
    request.dailyLimit = {
      key,
      currentCount,
      resetTime,
      resource: options.resource,
    };

    return true;
  }
}

// Helper function to calculate reset time (midnight)
function getResetTime(): Date {
  const resetTime = new Date();
  resetTime.setHours(24, 0, 0, 0);
  return resetTime;
}

