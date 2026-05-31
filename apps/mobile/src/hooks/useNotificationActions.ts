/**
 * useNotificationActions
 * ----------------------
 * Hook for handling actionable notification responses.
 * Processes medication "Take" button actions and notification taps.
 */
import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { NotificationActions, NotificationCategories } from '../services/localNotificationService';
import ApiService from '../services/apiService';
import i18n from '../../app/i18n/config';

// Get localized strings from i18n with fallbacks
const getLocalizedStrings = () => {
    // Try to get translations from i18n first
    const alertTitle = i18n.t('medications.notifications.alertTitle');
    const alertMessage = i18n.t('medications.notifications.alertMessage');
    const taken = i18n.t('medications.notifications.taken');
    const later = i18n.t('medications.notifications.later');
    const success = i18n.t('medications.notifications.success');
    const error = i18n.t('medications.notifications.error');

    // Fallback values if translations not found
    const locale = i18n.language || 'en';
    const fallbacks: Record<string, Record<string, string>> = {
        alertTitle: {
            en: 'Medication Reminder',
            ru: 'Напоминание о лекарстве',
            kk: 'Дәрі туралы еске салу',
            fr: 'Rappel de médicament',
            de: 'Medikamentenerinnerung',
            es: 'Recordatorio de medicamento',
        },
        alertMessage: {
            en: 'Did you take your medication?',
            ru: 'Вы приняли лекарство?',
            kk: 'Дәріңізді іштіңіз бе?',
            fr: 'Avez-vous pris votre médicament ?',
            de: 'Haben Sie Ihr Medikament eingenommen?',
            es: '¿Tomaste tu medicamento?',
        },
        taken: {
            en: 'Taken',
            ru: 'Принял',
            kk: 'Ішілді',
            fr: 'Pris',
            de: 'Eingenommen',
            es: 'Tomado',
        },
        later: {
            en: 'Later',
            ru: 'Позже',
            kk: 'Кейінірек',
            fr: 'Plus tard',
            de: 'Später',
            es: 'Más tarde',
        },
        success: {
            en: 'Medication marked as taken',
            ru: 'Лекарство отмечено как принятое',
            kk: 'Дәрі қабылданды деп белгіленді',
            fr: 'Médicament marqué comme pris',
            de: 'Medikament als eingenommen markiert',
            es: 'Medicamento marcado como tomado',
        },
        error: {
            en: 'Failed to update medication',
            ru: 'Не удалось обновить лекарство',
            kk: 'Дәріні жаңарту сәтсіз болды',
            fr: 'Échec de la mise à jour du médicament',
            de: 'Medikament konnte nicht aktualisiert werden',
            es: 'Error al actualizar el medicamento',
        },
        smartTipUseful: {
            en: 'Useful',
            ru: 'Полезно',
            kk: 'Пайдалы',
            fr: 'Utile',
            de: 'Hilfreich',
            es: 'Útil',
        },
        smartTipNotRelevant: {
            en: 'Not relevant',
            ru: 'Не актуально',
            kk: 'Өзекті емес',
            fr: 'Pas pertinent',
            de: 'Nicht relevant',
            es: 'No relevante',
        },
        smartTipThanks: {
            en: 'Thanks, we will personalize future tips.',
            ru: 'Спасибо, мы учтём это в следующих советах.',
            kk: 'Рахмет, келесі кеңестерде ескереміз.',
            fr: 'Merci, nous personnaliserons les prochains conseils.',
            de: 'Danke, wir personalisieren künftige Tipps.',
            es: 'Gracias, personalizaremos los próximos consejos.',
        },
        ok: {
            en: 'OK', ru: 'ОК', kk: 'ОК',
            fr: 'OK', de: 'OK', es: 'OK',
        },
    };

    // Return translated value or fallback
    const getWithFallback = (value: string, key: string) => {
        if (value && !value.includes('notifications.')) {
            return value;
        }
        return fallbacks[key][locale] || fallbacks[key].en;
    };

    return {
        alertTitle: getWithFallback(alertTitle, 'alertTitle'),
        alertMessage: getWithFallback(alertMessage, 'alertMessage'),
        taken: getWithFallback(taken, 'taken'),
        later: getWithFallback(later, 'later'),
        success: getWithFallback(success, 'success'),
        error: getWithFallback(error, 'error'),
        smartTipUseful: fallbacks.smartTipUseful[locale] || fallbacks.smartTipUseful.en,
        smartTipNotRelevant: fallbacks.smartTipNotRelevant[locale] || fallbacks.smartTipNotRelevant.en,
        smartTipThanks: fallbacks.smartTipThanks[locale] || fallbacks.smartTipThanks.en,
        ok: (i18n.t('common.ok') && !i18n.t('common.ok').includes('common.ok')) ? i18n.t('common.ok') : (fallbacks.ok[locale] || fallbacks.ok.en),
    };
};

// Optional navigation callback for external navigation
type NavigationCallback = (_screen: string, _params?: Record<string, unknown>) => void;
let navigationCallback: NavigationCallback | null = null;

export function setNotificationNavigationCallback(callback: NavigationCallback | null) {
    navigationCallback = callback;
}

export function useNotificationActions() {
    const responseListener = useRef<Notifications.Subscription | null>(null);
    const strings = getLocalizedStrings();

    /**
     * Mark medication as taken via API
     */
    const takeMedication = useCallback(async (medicationId: string): Promise<boolean> => {
        try {
            await ApiService.takeMedication(medicationId);
            console.log(`[NotificationActions] Medication ${medicationId} marked as taken`);
            return true;
        } catch (error) {
            console.error('[NotificationActions] Failed to take medication:', error);
            return false;
        }
    }, []);

    /**
     * Show confirmation alert when notification is tapped
     */
    const showTakeAlert = useCallback((medicationId: string, medicationName?: string) => {
        const title = medicationName
            ? `${strings.alertTitle}: ${medicationName}`
            : strings.alertTitle;

        Alert.alert(
            title,
            strings.alertMessage,
            [
                {
                    text: strings.later,
                    style: 'cancel',
                    onPress: () => {
                        // Navigate to medication schedule for later action
                        if (navigationCallback) {
                            navigationCallback('MedicationSchedule');
                        }
                    },
                },
                {
                    text: strings.taken,
                    style: 'default',
                    onPress: async () => {
                        const success = await takeMedication(medicationId);
                        if (success) {
                            // Show brief success feedback
                            if (Platform.OS === 'ios') {
                                // On iOS, we can show a subtle alert
                                Alert.alert('', strings.success);
                            }
                        } else {
                            Alert.alert('', strings.error);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    }, [takeMedication, strings]);

    const saveSmartTipFeedback = useCallback(async (
        data: Record<string, unknown>,
        reaction: 'useful' | 'not_relevant',
    ) => {
        try {
            await ApiService.saveSmartTipFeedback({
                deliveryLogId: data.deliveryLogId as string | undefined,
                category: data.category as string | undefined,
                templateKey: data.templateKey as string | undefined,
                reaction,
            });
            if (Platform.OS === 'ios') {
                Alert.alert('', strings.smartTipThanks);
            }
        } catch (error) {
            console.warn('[NotificationActions] Failed to save smart tip feedback:', error);
        }
    }, [strings.smartTipThanks]);

    /**
     * Handle notification response (both action button and tap)
     */
    const handleNotificationResponse = useCallback(async (response: Notifications.NotificationResponse) => {
        const { notification, actionIdentifier } = response;
        const data = (notification.request.content.data || {}) as Record<string, unknown>;
        const categoryIdentifier = notification.request.content.categoryIdentifier;

        console.log('[NotificationActions] Response received:', {
            actionIdentifier,
            categoryIdentifier,
            data,
        });

        // ===== Medication reminders =====
        if (categoryIdentifier === NotificationCategories.MEDICATION_REMINDER) {
            const medicationId = data.medicationId as string | undefined;
            const medicationName = data.medicationName as string | undefined;

            if (!medicationId) {
                console.warn('[NotificationActions] No medicationId in notification data');
                return;
            }

            if (actionIdentifier === NotificationActions.MEDICATION_TAKE) {
                const success = await takeMedication(medicationId);
                if (!success) Alert.alert('', strings.error);
                return;
            }

            if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
                showTakeAlert(medicationId, medicationName);
                return;
            }
            return;
        }

        // ===== Server-sent push routing =====
        // These pushes come from apps/api/src/messages/messages.service.ts and
        // apps/api/src/experts/experts-admin.controller.ts. We only act on
        // the default tap — action-button handling is category-specific.
        if (actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

        const type = data.type as string | undefined;

        if (type === 'new_message') {
            const conversationId = data.conversationId as string | undefined;
            if (!conversationId) {
                console.warn('[NotificationActions] new_message push without conversationId');
                return;
            }
            if (navigationCallback) {
                navigationCallback('Chat', { conversationId });
            }
            return;
        }

        if (type === 'expert_approved' || type === 'expert_rejected') {
            if (navigationCallback) navigationCallback('Profile');
            return;
        }

        if (type === 'meal_reminder' || type === 'diet_reminder') {
            if (navigationCallback) navigationCallback('MainTabs');
            return;
        }

        // Smart tips: opt-in personalised reminders (sleep/stress/energy/digestion).
        // Tap → Profile so the user can adjust prefs or see context.
        if (type === 'smart_tip') {
            Alert.alert(
                notification.request.content.title || 'EatSense',
                notification.request.content.body || '',
                [
                    {
                        text: strings.smartTipNotRelevant,
                        style: 'cancel',
                        onPress: () => saveSmartTipFeedback(data, 'not_relevant'),
                    },
                    {
                        text: strings.smartTipUseful,
                        onPress: () => saveSmartTipFeedback(data, 'useful'),
                    },
                    {
                        text: strings.ok,
                        onPress: () => {
                            if (navigationCallback) navigationCallback('MainTabs', { screen: 'Profile' });
                        },
                    },
                ],
            );
            return;
        }

        // Consultation reminders fired by CalendarScheduler:
        // reminder_24h / reminder_1h / reminder_10m → open the consultation chat
        // or fall back to Experts tab if no conversationId attached.
        if (type === 'reminder_24h' || type === 'reminder_1h' || type === 'reminder_10m' || type === 'consultation_reminder') {
            const conversationId = data.conversationId as string | undefined;
            if (conversationId && navigationCallback) {
                navigationCallback('Chat', { conversationId });
            } else if (navigationCallback) {
                navigationCallback('MainTabs', { screen: 'Experts' });
            }
            return;
        }

        // No-show / completion / rating prompt → Experts tab so user sees the
        // scheduled-consultations list with updated status.
        if (type === 'no_show' || type === 'consultation_completed' || type === 'rating_prompt') {
            if (navigationCallback) navigationCallback('MainTabs', { screen: 'Experts' });
            return;
        }

        // Pharmacy order status updates (sent / processing / ready / completed)
        // open the Pharmacy screen where the order list lives.
        if (type === 'pharmacy_order_status') {
            if (navigationCallback) navigationCallback('Pharmacy');
            return;
        }

        // Low-stock refill nudge: open the pharmacy order flow with the
        // medication pre-filled so the patient can re-order in one tap.
        if (type === 'medication_low_stock') {
            if (navigationCallback) {
                navigationCallback('Pharmacy', {
                    autoOpenOrder: true,
                    prefillMedication: {
                        name: (data as any)?.name || '',
                        dosage: (data as any)?.dosage || '',
                    },
                });
            }
            return;
        }
    }, [takeMedication, showTakeAlert, saveSmartTipFeedback, strings]);

    useEffect(() => {
        // Listen for notification responses (foreground/background)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            handleNotificationResponse
        );

        // Cold start: if the app was killed and the user tapped a push to open it,
        // the tap event is already fired by the time the listener is registered.
        // Replay it explicitly so navigation still happens.
        Notifications.getLastNotificationResponseAsync()
            .then((response) => {
                if (response) {
                    console.log('[NotificationActions] Cold-start response replay');
                    handleNotificationResponse(response);
                }
            })
            .catch((err) => console.warn('[NotificationActions] cold-start replay failed', err));

        console.log('[NotificationActions] Response listener registered');

        return () => {
            if (responseListener.current) {
                responseListener.current.remove();
                console.log('[NotificationActions] Response listener removed');
            }
        };
    }, [handleNotificationResponse]);

    return {
        takeMedication,
        showTakeAlert,
    };
}

export default useNotificationActions;
