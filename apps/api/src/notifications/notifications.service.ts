import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { Expo } from 'expo-server-sdk';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma.service';
import type { RegisterPushTokenDto } from './dto/register-push-token.dto';
import type { SendTestNotificationDto } from './dto/send-test-notification.dto';
import type { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo: Expo;
  private readonly defaultHour = parseInt(process.env.NOTIFICATIONS_DAILY_DEFAULT_HOUR || '8', 10);

  constructor(private readonly prisma: PrismaService) {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
    });
  }

  private async ensurePreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.notificationPreference.create({
      data: {
        userId,
        dailyPushHour: Number.isNaN(this.defaultHour) ? 8 : this.defaultHour,
        timezone: 'UTC',
      },
    });
  }

  async getPreferences(userId: string) {
    const prefs = await this.ensurePreferences(userId);
    return {
      dailyPushEnabled: prefs.dailyPushEnabled,
      dailyPushHour: prefs.dailyPushHour,
      dailyPushMinute: prefs.dailyPushMinute ?? 0,
      timezone: prefs.timezone,
      lastPushSentAt: prefs.lastPushSentAt,
    };
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    this.logger.log(`[NotificationsService] updatePreferences() called for userId=${userId}`);

    try {
      // Normalize and validate input data
      const updateData: any = {};

      // Handle dailyPushEnabled
      if (dto.dailyPushEnabled !== undefined) {
        // Ensure it's a boolean
        updateData.dailyPushEnabled = Boolean(dto.dailyPushEnabled);
        if (!updateData.dailyPushEnabled) {
          updateData.lastPushSentAt = null;
        }
      }

      // Handle dailyPushHour - ensure it's a valid integer between 0-23
      if (dto.dailyPushHour !== undefined) {
        const hour = typeof dto.dailyPushHour === 'string'
          ? parseInt(dto.dailyPushHour, 10)
          : Number(dto.dailyPushHour);

        if (Number.isNaN(hour) || hour < 0 || hour > 23) {
          throw new BadRequestException('dailyPushHour must be an integer between 0 and 23');
        }
        updateData.dailyPushHour = hour;
        updateData.lastPushSentAt = null;
      }

      // Handle timezone
      if (dto.timezone !== undefined) {
        const zone = dto.timezone?.trim() || 'UTC';
        const test = DateTime.utc().setZone(zone);
        if (!test.isValid) {
          throw new BadRequestException(`Invalid timezone provided: ${zone}`);
        }
        updateData.timezone = zone;
      }

      // Handle dailyPushMinute - ensure it's a valid integer between 0-59
      if (dto.dailyPushMinute !== undefined) {
        const minute = typeof dto.dailyPushMinute === 'string'
          ? parseInt(dto.dailyPushMinute, 10)
          : Number(dto.dailyPushMinute);

        if (Number.isNaN(minute) || minute < 0 || minute > 59) {
          throw new BadRequestException('dailyPushMinute must be an integer between 0 and 59');
        }
        updateData.dailyPushMinute = minute;
        updateData.lastPushSentAt = null;
      }

      // Get existing preferences for defaults
      const existing = await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });

      // Use upsert to handle both create and update cases
      const prefs = await this.prisma.notificationPreference.upsert({
        where: { userId },
        create: {
          userId,
          dailyPushEnabled: updateData.dailyPushEnabled ?? false,
          dailyPushHour: updateData.dailyPushHour ?? (Number.isNaN(this.defaultHour) ? 8 : this.defaultHour),
          dailyPushMinute: updateData.dailyPushMinute ?? 0,
          timezone: updateData.timezone ?? 'UTC',
          lastPushSentAt: null,
        },
        update: updateData,
      });

      this.logger.log(
        `[NotificationsService] updatePreferences() succeeded for userId=${userId}`,
      );

      return {
        dailyPushEnabled: prefs.dailyPushEnabled,
        dailyPushHour: prefs.dailyPushHour,
        dailyPushMinute: prefs.dailyPushMinute ?? 0,
        timezone: prefs.timezone,
        lastPushSentAt: prefs.lastPushSentAt,
      };
    } catch (error) {
      this.logger.error(
        `[NotificationsService] updatePreferences() failed for userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    if (!Expo.isExpoPushToken(dto.token)) {
      throw new BadRequestException('Invalid Expo push token.');
    }

    const now = new Date();

    const pushToken = await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      update: {
        userId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        appVersion: dto.appVersion,
        enabled: dto.enabled ?? true,
        lastUsedAt: now,
      },
      create: {
        token: dto.token,
        userId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        appVersion: dto.appVersion,
        enabled: dto.enabled ?? true,
        lastUsedAt: now,
      },
    });

    if (dto.deviceId) {
      await this.prisma.pushToken.updateMany({
        where: {
          userId,
          deviceId: dto.deviceId,
          token: { not: dto.token },
        },
        data: {
          enabled: false,
        },
      });
    }

    return {
      id: pushToken.id,
      deviceId: pushToken.deviceId,
      platform: pushToken.platform,
      appVersion: pushToken.appVersion,
      enabled: pushToken.enabled,
      lastUsedAt: pushToken.lastUsedAt,
      createdAt: pushToken.createdAt,
      updatedAt: pushToken.updatedAt,
      tokenPreview: `${pushToken.token.slice(0, 12)}…${pushToken.token.slice(-5)}`,
    };
  }

  async listPushTokens(userId: string) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return tokens.map((token) => ({
      id: token.id,
      deviceId: token.deviceId,
      platform: token.platform,
      appVersion: token.appVersion,
      enabled: token.enabled,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      tokenPreview: `${token.token.slice(0, 12)}…${token.token.slice(-5)}`,
    }));
  }

  async deletePushToken(userId: string, id: string) {
    await this.prisma.pushToken.deleteMany({
      where: { userId, id },
    });
    return { id, deleted: true };
  }

  async sendTestNotification(userId: string, dto: SendTestNotificationDto) {
    return this.sendPushNotification(userId, dto.title, dto.body, dto.data);
  }

  async sendPushNotification(userId: string, title: string, body: string, data?: Record<string, any>) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, enabled: true },
    });

    if (!tokens.length) {
      return {
        success: false,
        message: 'No push tokens registered for this user.',
      };
    }

    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token.token,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    }));

    const tickets: ExpoPushTicket[] = [];
    const ticketTargets: string[] = [];

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        ticketChunk.forEach((ticket, index) => {
          tickets.push(ticket);
          const rawTarget = chunk[index]?.to;
          const normalizedTarget = Array.isArray(rawTarget)
            ? rawTarget[0] ?? ''
            : rawTarget ?? '';
          ticketTargets.push(normalizedTarget);
        });
      } catch (error) {
        this.logger.error('Error sending push notification chunk', error);
      }
    }

    await this.handleTicketErrors(ticketTargets, tickets);

    if (tokens.length) {
      await this.prisma.pushToken.updateMany({
        where: { token: { in: tokens.map((token) => token.token) } },
        data: { lastUsedAt: new Date() },
      });
    }

    return {
      success: true,
      sent: tickets.length,
      tickets,
    };
  }

  private async handleTicketErrors(tokens: string[], tickets: ExpoPushTicket[]) {
    await Promise.all(
      tickets.map(async (ticket, index) => {
        if (ticket.status === 'ok') {
          return;
        }

        const token = tokens[index];
        const error = ticket.details?.error;

        this.logger.warn(`Push ticket error for token ${token}: ${ticket.message}`, ticket.details);

        if (error === 'DeviceNotRegistered' || error === 'InvalidCredentials') {
          await this.prisma.pushToken.updateMany({
            where: { token },
            data: { enabled: false },
          });
        }
      }),
    );
  }

  /**
   * Send medication reminder push notification
   */
  async sendMedicationReminder(params: {
    userId: string;
    medicationId: string;
    medicationName: string;
    dosage?: string | null;
    doseTime: string;
    beforeMeal?: boolean;
    afterMeal?: boolean;
  }) {
    const { userId, medicationName, dosage, doseTime, beforeMeal, afterMeal } = params;

    const title = 'Reminder: medication time';
    let body = `${medicationName} at ${doseTime}`;

    if (dosage) {
      body += ` (${dosage})`;
    }

    if (beforeMeal) {
      body += ' — before meal';
    } else if (afterMeal) {
      body += ' — after meal';
    }

    // Используем существующий метод sendPushNotification
    return this.sendPushNotification(userId, title, body, {
      type: 'medication_reminder',
      medicationId: params.medicationId,
    });
  }
}

