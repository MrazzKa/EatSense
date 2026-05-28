import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from './notifications.service';
import { pickNextCategory, pickTip, SmartTipCategory } from './smart-tips';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  /**
   * Get user's preferred language from their profile preferences
   */
  private async getUserLanguage(userId: string): Promise<string> {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
        select: { preferences: true },
      });
      const prefs = profile?.preferences as Record<string, any> | null;
      return prefs?.language || 'en';
    } catch {
      return 'en';
    }
  }

  private normalizeLocale(locale?: string | null) {
    const value = String(locale || '').split('-')[0].toLowerCase();
    return ['en', 'ru', 'kk', 'fr', 'de', 'es'].includes(value) ? value : 'en';
  }

  private localDateKey(dt: DateTime) {
    return dt.toFormat('yyyy-LL-dd');
  }

  private pickContextualCategory(issues: string[], lastCategory: string | null, local: DateTime) {
    const valid = issues.filter((issue): issue is SmartTipCategory =>
      ['sleep', 'stress', 'energy', 'digestion'].includes(issue),
    );
    if (!valid.length) return null;

    const preferredByHour: SmartTipCategory[] = local.hour < 11
      ? ['energy', 'digestion', 'stress', 'sleep']
      : local.hour < 17
        ? ['stress', 'energy', 'digestion', 'sleep']
        : ['sleep', 'digestion', 'stress', 'energy'];

    const freshPreferred = preferredByHour.find((category) => valid.includes(category) && category !== lastCategory);
    return freshPreferred || pickNextCategory(valid, lastCategory);
  }

  private async pickPersonalizedCategory(userId: string, issues: string[], lastCategory: string | null, local: DateTime) {
    const valid = issues.filter((issue): issue is SmartTipCategory =>
      ['sleep', 'stress', 'energy', 'digestion'].includes(issue),
    );
    if (!valid.length) return null;

    const scores = new Map<SmartTipCategory, number>(valid.map((issue) => [issue, 1]));
    const add = (category: SmartTipCategory, points: number) => {
      if (scores.has(category)) scores.set(category, (scores.get(category) || 0) + points);
    };

    const timePreferred = this.pickContextualCategory(valid, lastCategory, local);
    if (timePreferred) add(timePreferred, 1.5);
    if (lastCategory && scores.has(lastCategory as SmartTipCategory)) add(lastCategory as SmartTipCategory, -1);

    const since7d = local.minus({ days: 7 }).toUTC().toJSDate();
    const since3d = local.minus({ days: 3 }).toUTC().toJSDate();
    const [profile, meals, mealLogs, recentFeedback] = await Promise.all([
      this.prisma.userProfile.findUnique({
        where: { userId },
        select: { healthProfile: true, dailyCalories: true },
      }),
      this.prisma.meal.findMany({
        where: { userId, createdAt: { gte: since7d } },
        include: { items: true },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mealLog.findMany({
        where: { userId, createdAt: { gte: since7d } },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationDeliveryLog.findMany({
        where: {
          userId,
          type: 'smart_tip',
          reaction: { in: ['useful', 'not_relevant'] },
          createdAt: { gte: local.minus({ days: 30 }).toUTC().toJSDate() },
        },
        select: { category: true, reaction: true },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const health = (profile?.healthProfile as Record<string, any> | null) || {};
    const sleepHours = Number(health?.sleep?.sleepHours ?? health?.sleepHours);
    if (sleepHours && sleepHours < 7) add('sleep', 2);
    if (health?.sleep?.sleepQuality === 'poor' || health?.sleep?.insomnia || health?.sleep?.difficultyFallingAsleep) add('sleep', 2);
    if (health?.eatingBehavior?.emotionalEating || health?.eatingBehavior?.stressEating || health?.stress?.level === 'high') add('stress', 2);
    if (health?.healthFocus?.microbiome || health?.digestiveIssues?.bloating || health?.digestion?.bloating) add('digestion', 2);

    const totals = meals.reduce((acc, meal) => {
      for (const item of meal.items || []) {
        acc.protein += item.protein || 0;
        acc.fiber += item.fiber || 0;
        acc.calories += item.calories || 0;
      }
      return acc;
    }, { protein: 0, fiber: 0, calories: 0 });
    for (const log of mealLogs) {
      totals.protein += log.protein || 0;
      totals.calories += log.calories || 0;
    }
    const trackedDays = Math.max(1, new Set([
      ...meals.map((meal) => meal.createdAt.toISOString().slice(0, 10)),
      ...mealLogs.map((log) => log.createdAt.toISOString().slice(0, 10)),
    ]).size);
    const recentBreakfasts = mealLogs.filter((log) => log.mealType === 'BREAKFAST' && log.createdAt >= since3d).length;
    const avgProtein = totals.protein / trackedDays;
    const avgFiber = totals.fiber / trackedDays;
    if (trackedDays >= 2 && avgProtein < 55) add('energy', 1.5);
    if (trackedDays >= 2 && avgFiber > 0 && avgFiber < 18) add('digestion', 1.5);
    if (recentBreakfasts === 0 && mealLogs.length > 0) add('energy', 1);
    if (profile?.dailyCalories && totals.calories / trackedDays < profile.dailyCalories * 0.65) add('energy', 1);

    for (const feedback of recentFeedback) {
      const category = feedback.category as SmartTipCategory | null;
      if (!category || !scores.has(category)) continue;
      add(category, feedback.reaction === 'useful' ? 1.2 : -2);
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || valid.indexOf(a[0]) - valid.indexOf(b[0]))[0]?.[0] || null;
  }

  /**
   * Cron, который проверяет напоминания о таблетках каждую минуту.
   *
   * NOTE: Server-side medication reminders are DISABLED.
   * Reason: Local notifications are scheduled on the client and are already
   * localized (ru, en, kk, fr). Server notifications were causing duplicates
   * (one in Russian from local, one in English from server).
   *
   * To re-enable: set MEDICATION_PUSH_ENABLED=true in environment
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleMedicationReminders() {
    // Skip if server-side medication push is disabled (default: disabled)
    const medicationPushEnabled = process.env.MEDICATION_PUSH_ENABLED === 'true';
    if (!medicationPushEnabled) {
      return;
    }

    try {
      // Check if medications table exists by attempting a query
      // If it fails, we'll catch and log the error but not crash
      const nowUtc = DateTime.utc();

      // Находим все активные лекарства, у которых есть дозировки
      const medications = await this.prisma.medication.findMany({
        where: {
          isActive: true,
          doses: { some: {} },
        },
        include: {
          doses: true,
          user: {
            include: {
              notificationPreference: true,
              pushTokens: {
                where: { enabled: true },
              },
            },
          },
        },
      });

      for (const med of medications) {
        const tz = med.timezone || 'UTC';

        // Проверяем, попадает ли текущий день в диапазон [startDate, endDate]
        const todayLocal = nowUtc.setZone(tz);
        if (!todayLocal.isValid) {
          this.logger.warn(`Invalid timezone="${tz}" for medication=${med.id}, skipping`);
          continue;
        }

        const start = DateTime.fromJSDate(med.startDate).setZone(tz).startOf('day');
        const end = med.endDate
          ? DateTime.fromJSDate(med.endDate).setZone(tz).endOf('day')
          : null;

        if (todayLocal.toMillis() < start.toMillis() || (end && todayLocal.toMillis() > end.toMillis())) {
          continue;
        }

        // Если у юзера выключены medication-уведомления (если такое поле есть) — пропускаем
        const prefs: any = med.user?.notificationPreference || {};
        // Для MVP проверяем только общий флаг dailyPushEnabled
        if (prefs && prefs.dailyPushEnabled === false) {
          continue;
        }

        // Проверяем, есть ли активные push tokens
        if (!med.user?.pushTokens || med.user.pushTokens.length === 0) {
          continue;
        }

        for (const dose of med.doses) {
          const [targetHour, targetMinute] = dose.timeOfDay
            .split(':')
            .map((v) => parseInt(v, 10));

          const localNow = nowUtc.setZone(tz);

          // Простая логика: напоминание срабатывает, если текущее время совпадает по часам и минутам.
          if (
            localNow.hour === targetHour &&
            localNow.minute === targetMinute
          ) {
            try {
              const medLang = await this.getUserLanguage(med.userId);
              await this.notificationsService.sendMedicationReminder({
                userId: med.userId,
                medicationId: med.id,
                medicationName: med.name,
                dosage: med.dosage,
                doseTime: dose.timeOfDay,
                beforeMeal: dose.beforeMeal,
                afterMeal: dose.afterMeal,
                language: medLang,
              });

              this.logger.debug(
                `[NotificationsScheduler] Sent medication reminder for medicationId=${med.id}, userId=${med.userId}, time=${dose.timeOfDay}`,
              );
            } catch (error: any) {
              this.logger.error(
                `Failed to send medication reminder for medicationId=${med.id}: ${error?.message || error
                }`,
              );
            }
          }
        }
      }
    } catch (error: any) {
      // If medications table doesn't exist or there's a database error, log and continue
      // This prevents the scheduler from crashing the entire application
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        this.logger.debug('[NotificationsScheduler] Medications table not found, skipping medication reminders');
      } else {
        this.logger.error(`[NotificationsScheduler] Error in handleMedicationReminders: ${error?.message || error}`);
      }
    }
  }

  /**
   * Server-side daily reminders are DISABLED.
   * Reason: Local notifications on the client already handle meal reminders
   * (3x/day at 9:00, 13:00, 19:00, fully localized). Server push was causing
   * duplicate notifications — one from server and three from client.
   *
   * The dailyPushEnabled preference flag is now used by the client to control
   * whether local meal reminders are scheduled.
   *
   * To re-enable server push: uncomment the @Cron decorator and method body.
   */
  // @Cron('0 */15 * * * *')
  async handleDailyReminders() {
    // Disabled — local notifications handle this
    return;
  }

  /**
   * Smart tips: opt-in 1 push/day at the user's exact local hour/minute.
   * Delivery is idempotent per user/local day and recorded in
   * notification_delivery_logs for debugging and receipt checks.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async smartTipsTick() {
    const nowUtc = DateTime.utc();
    try {
      const prefs = await this.prisma.notificationPreference.findMany({
        where: {
          smartTipsEnabled: true,
        },
        take: 1000,
      });
      for (const p of prefs) {
        try {
          const issues = (p as any).healthIssues as string[] | undefined;
          if (!issues || issues.length === 0) continue;

          const tz = p.timezone || 'UTC';
          const local = nowUtc.setZone(tz);
          if (!local.isValid) continue;

          const targetHour = (p as any).smartTipsHour ?? 20;
          const targetMinute = (p as any).smartTipsMinute ?? 0;
          const targetLocal = local.set({
            hour: targetHour,
            minute: targetMinute,
            second: 0,
            millisecond: 0,
          });
          if (local < targetLocal) continue;
          // If the service was down around the target time, send shortly after
          // restart, but avoid surprising users many hours later.
          if (local.diff(targetLocal, 'hours').hours > 2) continue;

          const lastCategory = (p as any).smartTipsLastCategory as string | null;
          const category = await this.pickPersonalizedCategory(p.userId, issues, lastCategory, local);
          if (!category) continue;

          const locale = this.normalizeLocale((p as any).locale || await this.getUserLanguage(p.userId));
          const localDate = this.localDateKey(local);
          const recentLogs = await this.prisma.notificationDeliveryLog.findMany({
            where: {
              userId: p.userId,
              type: 'smart_tip',
              category,
              createdAt: { gte: local.minus({ days: 30 }).toUTC().toJSDate() },
            },
            select: { templateKey: true, reaction: true },
            take: 20,
            orderBy: { createdAt: 'desc' },
          });
          const excludedTitles = recentLogs
            .filter((log) => log.reaction !== 'useful')
            .map((log) => String(log.templateKey || '').split(':').slice(2).join(':'))
            .filter(Boolean);
          const tip = pickTip(category, locale, p.userId, {
            allowMedical: Boolean((p as any).smartTipsMedicalAllowed),
            excludeTitles: excludedTitles,
          });
          const templateKey = `${category}:${locale}:${tip.title}`;

          const log = await this.prisma.notificationDeliveryLog.create({
            data: {
              userId: p.userId,
              type: 'smart_tip',
              category,
              templateKey,
              localDate,
              locale,
              timezone: tz,
              scheduledForUtc: targetLocal.toUTC().toJSDate(),
              status: 'scheduled',
              payloadPreview: { title: tip.title, body: tip.body },
            },
          }).catch(async (err: any) => {
            if (err?.code === 'P2002') {
              const existing = await this.prisma.notificationDeliveryLog.findUnique({
                where: { userId_type_localDate: { userId: p.userId, type: 'smart_tip', localDate } },
              });
              return existing?.status === 'failed' ? existing : null;
            }
            throw err;
          });
          if (!log) continue;

          const result = await this.notificationsService.sendPushNotification(
            p.userId,
            tip.title,
            tip.body,
            { type: 'smart_tip', category, deliveryLogId: log.id, templateKey },
          );
          const ticketIds = Array.isArray((result as any)?.tickets)
            ? (result as any).tickets
              .map((ticket: any) => ticket?.id)
              .filter(Boolean)
            : [];
          const ticketError = Array.isArray((result as any)?.tickets)
            ? (result as any).tickets.find((ticket: any) => ticket?.status === 'error')
            : null;
          const deliveredToExpo = (result as any)?.success !== false && ticketIds.length > 0 && !ticketError;
          if (deliveredToExpo) {
            await this.prisma.notificationPreference.update({
              where: { id: p.id },
              data: {
                smartTipsLastSentAt: nowUtc.toJSDate(),
                smartTipsLastCategory: category,
              } as any,
            });
          }
          await this.prisma.notificationDeliveryLog.update({
            where: { id: log.id },
            data: {
              status: deliveredToExpo ? 'sent' : 'failed',
              sentAt: nowUtc.toJSDate(),
              ticketIds,
              errorCode: ticketError?.details?.error ?? null,
              errorMessage: (result as any)?.message ?? ticketError?.message ?? (!ticketIds.length ? 'Expo did not return push tickets' : null),
            },
          });
        } catch (perUserErr: any) {
          this.logger.warn(`[smartTipsTick] user=${p.userId} failed: ${perUserErr?.message}`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`[smartTipsTick] failed: ${e?.message}`);
    }
  }

  @Cron('30 */10 * * * *')
  async smartTipReceiptTick() {
    try {
      const dueLogs = await this.prisma.notificationDeliveryLog.findMany({
        where: {
          type: 'smart_tip',
          status: 'sent',
          receiptCheckedAt: null,
          sentAt: { lt: DateTime.utc().minus({ minutes: 5 }).toJSDate() },
        },
        take: 100,
        orderBy: { sentAt: 'asc' },
      });
      for (const log of dueLogs) {
        try {
          const ticketIds = ((log as any).ticketIds || []) as string[];
          if (!ticketIds.length) {
            await this.prisma.notificationDeliveryLog.update({
              where: { id: log.id },
              data: { receiptCheckedAt: new Date(), status: 'receipt_unavailable' },
            });
            continue;
          }
          const receipts = await this.notificationsService.checkPushReceipts(ticketIds);
          const failed = Object.values(receipts).find((receipt: any) => receipt?.status === 'error') as any;
          await this.prisma.notificationDeliveryLog.update({
            where: { id: log.id },
            data: {
              receiptCheckedAt: new Date(),
              status: failed ? 'receipt_error' : 'receipt_ok',
              errorCode: failed?.details?.error ?? null,
              errorMessage: failed?.message ?? null,
            },
          });
        } catch (err: any) {
          this.logger.warn(`[smartTipReceiptTick] log=${log.id} failed: ${err?.message}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`[smartTipReceiptTick] failed: ${err?.message}`);
    }
  }
}
