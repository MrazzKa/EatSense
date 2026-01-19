/**
 * LocalNotificationService
 * ------------------------
 * Service for scheduling and managing local notifications.
 * Used for medication reminders, meal reminders, and daily tips.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '../../app/i18n/config';

export interface LocalNotificationOptions {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    categoryIdentifier?: string;
}

export interface ScheduledNotification {
    identifier: string;
    hour: number;
    minute: number;
    repeats: boolean;
}

// Notification category identifiers
export const NotificationCategories = {
    MEAL_REMINDER: 'meal_reminder',
    MEDICATION_REMINDER: 'medication_reminder',
    DAILY_TIP: 'daily_tip',
} as const;

class LocalNotificationService {
    private initialized = false;

    /**
     * Initialize notification categories and channels
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Set up Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('reminders', {
                name: 'Reminders',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#4CAF50',
                sound: 'default',
            });

            await Notifications.setNotificationChannelAsync('medications', {
                name: 'Medication Reminders',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 500, 250, 500],
                lightColor: '#FF5722',
                sound: 'default',
            });
        }

        this.initialized = true;
    }

    /**
     * Schedule a one-time notification
     */
    async scheduleNotification(
        options: LocalNotificationOptions,
        trigger: Notifications.NotificationTriggerInput
    ): Promise<string> {
        await this.initialize();

        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: options.title,
                body: options.body,
                data: options.data || {},
                categoryIdentifier: options.categoryIdentifier,
                sound: 'default',
            },
            trigger,
        });

        return identifier;
    }

    /**
     * Schedule a daily notification at a specific time
     */
    async scheduleDailyNotification(
        options: LocalNotificationOptions,
        hour: number,
        minute: number
    ): Promise<string> {
        await this.initialize();

        const trigger: Notifications.DailyTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
        };

        return this.scheduleNotification(options, trigger);
    }

    /**
     * Schedule medication reminder
     */
    async scheduleMedicationReminder(
        medicationName: string,
        hour: number,
        minute: number,
        medicationId: string
    ): Promise<string> {
        const locale = i18n.language || 'en';

        const titles: Record<string, string> = {
            en: 'Time to take medication',
            ru: 'Время принять лекарство',
            kk: 'Дәрі ішу уақыты',
        };

        const bodies: Record<string, string> = {
            en: `Don't forget to take ${medicationName}`,
            ru: `Не забудьте принять ${medicationName}`,
            kk: `${medicationName} қабылдауды ұмытпаңыз`,
        };

        return this.scheduleDailyNotification(
            {
                title: titles[locale] || titles.en,
                body: bodies[locale] || bodies.en,
                data: { type: 'medication', medicationId },
                categoryIdentifier: NotificationCategories.MEDICATION_REMINDER,
            },
            hour,
            minute
        );
    }

    /**
     * Schedule meal reminder (1/2/3 times a day)
     */
    async scheduleMealReminders(frequency: 1 | 2 | 3): Promise<string[]> {
        // FIX 2026-01-19: Cancel existing meal reminders first to avoid duplicates
        await this.cancelNotificationsByCategory(NotificationCategories.MEAL_REMINDER);

        const locale = i18n.language || 'en';

        const titles: Record<string, string> = {
            en: "Don't forget to log your meal!",
            ru: 'Не забудьте записать еду!',
            kk: 'Тамақты жазуды ұмытпаңыз!',
        };

        const bodies: Record<string, Record<string, string>> = {
            morning: {
                en: 'How was your breakfast? Snap a photo!',
                ru: 'Как завтрак? Сфотографируйте!',
                kk: 'Таңғы ас қандай болды? Суретке түсіріңіз!',
            },
            afternoon: {
                en: "Time to log your lunch. What did you eat?",
                ru: 'Время записать обед. Что съели?',
                kk: 'Түскі асты жазу уақыты. Не жедіңіз?',
            },
            evening: {
                en: "How was your dinner? Don't forget to log it.",
                ru: 'Как ужин? Не забудьте записать.',
                kk: 'Кешкі ас қандай болды? Жазуды ұмытпаңыз.',
            },
        };

        const times = [
            { period: 'morning', hour: 9, minute: 0 },
            { period: 'afternoon', hour: 13, minute: 0 },
            { period: 'evening', hour: 19, minute: 0 },
        ];

        // Select times based on frequency
        const scheduledTimes = times.slice(0, frequency);
        const identifiers: string[] = [];

        for (const time of scheduledTimes) {
            const id = await this.scheduleDailyNotification(
                {
                    title: titles[locale] || titles.en,
                    body: bodies[time.period][locale] || bodies[time.period].en,
                    data: { type: 'meal_reminder', period: time.period },
                    categoryIdentifier: NotificationCategories.MEAL_REMINDER,
                },
                time.hour,
                time.minute
            );
            identifiers.push(id);
        }

        return identifiers;
    }

    /**
     * Cancel a specific notification
     */
    async cancelNotification(identifier: string): Promise<void> {
        await Notifications.cancelScheduledNotificationAsync(identifier);
    }

    /**
     * Cancel all notifications with a specific category
     */
    async cancelNotificationsByCategory(category: string): Promise<void> {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const toCancel = scheduled.filter(
            (n) => n.content.categoryIdentifier === category
        );

        for (const notification of toCancel) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }

    /**
     * Cancel all scheduled notifications
     */
    async cancelAllNotifications(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }

    /**
     * Get all scheduled notifications
     */
    async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
        return Notifications.getAllScheduledNotificationsAsync();
    }

    /**
     * Check if notifications are permitted
     */
    async checkPermissions(): Promise<boolean> {
        const { status } = await Notifications.getPermissionsAsync();
        return status === 'granted';
    }

    /**
     * Request notification permissions
     */
    async requestPermissions(): Promise<boolean> {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    }
}

// Export singleton instance
export const localNotificationService = new LocalNotificationService();
export default localNotificationService;
