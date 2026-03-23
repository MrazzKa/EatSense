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
    MASCOT: 'mascot',
} as const;

// Action identifiers for actionable notifications
export const NotificationActions = {
    MEDICATION_TAKE: 'medication_take',
    MEDICATION_SNOOZE: 'medication_snooze',
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

            await Notifications.setNotificationChannelAsync('mascot', {
                name: 'Companion',
                importance: Notifications.AndroidImportance.DEFAULT,
                vibrationPattern: [0, 250],
                lightColor: '#4CAF50',
                sound: 'default',
            });
        }

        // Set up notification categories with actionable buttons
        await this.setupNotificationCategories();

        this.initialized = true;
    }

    /**
     * Setup notification categories with action buttons
     */
    private async setupNotificationCategories(): Promise<void> {
        // Get localized button text from i18n with fallback
        let takeButtonText = i18n.t('medications.notifications.actionTake');
        if (!takeButtonText || takeButtonText.includes('notifications.actionTake')) {
            // Fallback if translation not found
            const locale = i18n.language || 'en';
            const takeButtonTexts: Record<string, string> = {
                en: 'Taken',
                ru: 'Принял',
                kk: 'Ішілді',
                fr: 'Pris',
                de: 'Eingenommen',
                es: 'Tomado',
            };
            takeButtonText = takeButtonTexts[locale] || takeButtonTexts.en;
        }

        // Set up medication reminder category with "Take" action button
        await Notifications.setNotificationCategoryAsync(NotificationCategories.MEDICATION_REMINDER, [
            {
                identifier: NotificationActions.MEDICATION_TAKE,
                buttonTitle: takeButtonText,
                options: {
                    // FIX: Set to true on iOS so action button is visible and response is processed
                    opensAppToForeground: true,
                },
            },
        ]);

        console.log('[LocalNotificationService] Notification categories initialized');
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
        medicationId: string,
        dosage?: string
    ): Promise<string> {
        // Use i18n translations with fallbacks
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Get translated title
        let title = i18n.t('medications.notifications.title');
        if (!title || title.includes('notifications.title')) {
            // Fallback if translation not found
            const locale = i18n.language || 'en';
            const titles: Record<string, string> = {
                en: 'Time to take medication',
                ru: 'Время принять лекарство',
                kk: 'Дәрі ішу уақыты',
                fr: 'Heure de prendre le médicament',
                de: 'Zeit, Medikamente einzunehmen',
                es: 'Hora de tomar el medicamento',
            };
            title = titles[locale] || titles.en;
        }

        // Get translated body with interpolation
        let body: string;
        const bodyTemplate = i18n.t('medications.notifications.body', {
            name: medicationName,
            time: timeStr,
            dosage: dosage || ''
        });

        if (!bodyTemplate || bodyTemplate.includes('notifications.body')) {
            // Fallback if translation not found
            const locale = i18n.language || 'en';
            const bodies: Record<string, string> = {
                en: `${medicationName} at ${timeStr}${dosage ? ` (${dosage})` : ''}`,
                ru: `${medicationName} в ${timeStr}${dosage ? ` (${dosage})` : ''}`,
                kk: `${medicationName} ${timeStr}${dosage ? ` (${dosage})` : ''}`,
                fr: `${medicationName} à ${timeStr}${dosage ? ` (${dosage})` : ''}`,
                de: `${medicationName} um ${timeStr}${dosage ? ` (${dosage})` : ''}`,
                es: `${medicationName} a las ${timeStr}${dosage ? ` (${dosage})` : ''}`,
            };
            body = bodies[locale] || bodies.en;
        } else {
            body = bodyTemplate;
        }

        return this.scheduleDailyNotification(
            {
                title,
                body,
                data: { type: 'medication', medicationId, medicationName, dosage },
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
        // FIX 2026-01-29: Cancel only MEAL notifications, not everything
        await this.cancelNotificationsByCategory(NotificationCategories.MEAL_REMINDER);

        const locale = i18n.language || 'en';

        const titles: Record<string, string> = {
            en: "Don't forget to log your meal!",
            ru: 'Не забудьте записать еду!',
            kk: 'Тамақты жазуды ұмытпаңыз!',
            fr: "N'oubliez pas de noter votre repas !",
            de: 'Vergessen Sie nicht, Ihre Mahlzeit zu erfassen!',
            es: '¡No olvides registrar tu comida!',
        };

        const bodies: Record<string, Record<string, string>> = {
            morning: {
                en: 'How was your breakfast? Snap a photo!',
                ru: 'Как завтрак? Сфотографируйте!',
                kk: 'Таңғы ас қандай болды? Суретке түсіріңіз!',
                fr: 'Comment était votre petit-déjeuner ? Prenez une photo !',
                de: 'Wie war Ihr Frühstück? Machen Sie ein Foto!',
                es: '¿Qué tal el desayuno? ¡Toma una foto!',
            },
            afternoon: {
                en: "Time to log your lunch. What did you eat?",
                ru: 'Время записать обед. Что съели?',
                kk: 'Түскі асты жазу уақыты. Не жедіңіз?',
                fr: "C'est l'heure de noter votre déjeuner. Qu'avez-vous mangé ?",
                de: 'Zeit, Ihr Mittagessen zu erfassen. Was haben Sie gegessen?',
                es: 'Hora de registrar tu almuerzo. ¿Qué comiste?',
            },
            evening: {
                en: "How was your dinner? Don't forget to log it.",
                ru: 'Как ужин? Не забудьте записать.',
                kk: 'Кешкі ас қандай болды? Жазуды ұмытпаңыз.',
                fr: "Comment était votre dîner ? N'oubliez pas de le noter.",
                de: 'Wie war Ihr Abendessen? Vergessen Sie nicht, es zu erfassen.',
                es: '¿Qué tal la cena? No olvides registrarla.',
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
     * Schedule mascot engagement notifications (Duolingo-style)
     * Call this when mascot is created or app is opened
     */
    async scheduleMascotNotifications(mascotName: string): Promise<string[]> {
        await this.cancelNotificationsByCategory(NotificationCategories.MASCOT);

        const locale = i18n.language || 'en';
        const identifiers: string[] = [];

        const messages = {
            missYou: {
                title: { en: `${mascotName} misses you!`, ru: `${mascotName} скучает!`, kk: `${mascotName} сағынды!`, fr: `${mascotName} vous manque !`, de: `${mascotName} vermisst dich!`, es: `¡${mascotName} te extraña!` },
                body: { en: "It's been a while! Come back and analyze some food together.", ru: 'Давно не виделись! Вернитесь и проанализируем еду вместе.', kk: 'Көптен бері кездеспедік! Оралыңыз, бірге тағамды талдайық.', fr: "Ça fait un moment ! Revenez analyser un repas ensemble.", de: 'Es ist eine Weile her! Komm zurück und analysiere etwas Essen.', es: '¡Ha pasado un tiempo! Vuelve y analicemos comida juntos.' },
            },
            hungry: {
                title: { en: `${mascotName} is hungry!`, ru: `${mascotName} голоден!`, kk: `${mascotName} аш!`, fr: `${mascotName} a faim !`, de: `${mascotName} hat Hunger!`, es: `¡${mascotName} tiene hambre!` },
                body: { en: 'Feed me healthy food to help me grow!', ru: 'Покорми меня полезной едой, чтобы я рос!', kk: 'Өсуім үшін маған пайдалы тағам беріңіз!', fr: 'Nourris-moi de bons aliments pour que je grandisse !', de: 'Füttere mich mit gesundem Essen, damit ich wachse!', es: '¡Aliméntame con comida sana para que crezca!' },
            },
            streak: {
                title: { en: "Don't break your streak!", ru: 'Не прерывайте серию!', kk: 'Серияңызды үзбеңіз!', fr: 'Ne brisez pas votre série !', de: 'Unterbrich deinen Streak nicht!', es: '¡No rompas tu racha!' },
                body: { en: `${mascotName} is counting on you! Open the app to keep your daily streak.`, ru: `${mascotName} рассчитывает на вас! Откройте приложение, чтобы сохранить серию.`, kk: `${mascotName} сізге сенеді! Серияны жалғастыру үшін қолданбаны ашыңыз.`, fr: `${mascotName} compte sur vous ! Ouvrez l'app pour maintenir votre série.`, de: `${mascotName} zählt auf dich! Öffne die App, um deinen Streak zu halten.`, es: `¡${mascotName} cuenta contigo! Abre la app para mantener tu racha.` },
            },
        };

        // Schedule "miss you" — next day at 18:00
        const missId = await this.scheduleDailyNotification(
            {
                title: messages.missYou.title[locale] || messages.missYou.title.en,
                body: messages.missYou.body[locale] || messages.missYou.body.en,
                data: { type: 'mascot', action: 'miss_you' },
                categoryIdentifier: NotificationCategories.MASCOT,
            },
            18, 0,
        );
        identifiers.push(missId);

        // Schedule "hungry" — daily at 12:00
        const hungryId = await this.scheduleDailyNotification(
            {
                title: messages.hungry.title[locale] || messages.hungry.title.en,
                body: messages.hungry.body[locale] || messages.hungry.body.en,
                data: { type: 'mascot', action: 'hungry' },
                categoryIdentifier: NotificationCategories.MASCOT,
            },
            12, 0,
        );
        identifiers.push(hungryId);

        // Schedule "streak reminder" — daily at 20:00
        const streakId = await this.scheduleDailyNotification(
            {
                title: messages.streak.title[locale] || messages.streak.title.en,
                body: messages.streak.body[locale] || messages.streak.body.en,
                data: { type: 'mascot', action: 'streak_reminder' },
                categoryIdentifier: NotificationCategories.MASCOT,
            },
            20, 0,
        );
        identifiers.push(streakId);

        return identifiers;
    }

    /**
     * Cancel mascot notifications (e.g., when mascot is deleted)
     */
    async cancelMascotNotifications(): Promise<void> {
        await this.cancelNotificationsByCategory(NotificationCategories.MASCOT);
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
