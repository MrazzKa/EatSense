import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Cron, который проверяет напоминания о таблетках каждую минуту.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleMedicationReminders() {
    return;

    // TODO: Uncomment when medications table is created and migrations are applied
    /*
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
            await this.notificationsService.sendMedicationReminder({
              userId: med.userId,
              medicationId: med.id,
              medicationName: med.name,
              dosage: med.dosage,
              doseTime: dose.timeOfDay,
              beforeMeal: dose.beforeMeal,
              afterMeal: dose.afterMeal,
            });

            this.logger.debug(
              `[NotificationsScheduler] Sent medication reminder for medicationId=${med.id}, userId=${med.userId}, time=${dose.timeOfDay}`,
            );
          } catch (error: any) {
            this.logger.error(
              `Failed to send medication reminder for medicationId=${med.id}: ${
                error?.message || error
              }`,
            );
          }
        }
      }
    }
    */
  }

  @Cron('0 */15 * * * *')
  async handleDailyReminders() {
    const start = DateTime.utc();
    const preferences = await this.prisma.notificationPreference.findMany({
      where: {
        dailyPushEnabled: true,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!preferences.length) {
      return;
    }

    for (const pref of preferences) {
      const timezone = pref.timezone || 'UTC';
      let localNow = start.setZone(timezone, { keepLocalTime: false });
      if (!localNow.isValid) {
        this.logger.warn(`Invalid timezone="${timezone}" for user=${pref.userId}, defaulting to UTC`);
        localNow = start;
      }

      if (localNow.hour !== pref.dailyPushHour || localNow.minute >= 15) {
        continue;
      }

      const lastSent = pref.lastPushSentAt
        ? DateTime.fromJSDate(pref.lastPushSentAt).setZone(timezone)
        : null;

      if (lastSent && lastSent.startOf('day').equals(localNow.startOf('day'))) {
        continue;
      }

      try {
        const result = await this.notificationsService.sendPushNotification(
          pref.userId,
          'EatSense Daily Reminder',
          'Log your meals today to stay on track!',
          { type: 'daily-reminder' },
        );

        if (result.success) {
          await this.prisma.notificationPreference.update({
            where: { userId: pref.userId },
            data: {
              lastPushSentAt: start.toJSDate(),
            },
          });
          this.logger.debug(`dailyReminder=sent userId=${pref.userId}`);
        }
      } catch (error: any) {
        this.logger.warn(`dailyReminder=failed userId=${pref.userId} reason=${error.message}`);
      }
    }
  }
}

