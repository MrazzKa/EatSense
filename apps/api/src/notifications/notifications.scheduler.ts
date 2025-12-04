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

