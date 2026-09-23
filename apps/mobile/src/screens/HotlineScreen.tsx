import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

const POLL_MS = 5000;
const MAX_REASON = 1000;

type Phase = 'loading' | 'closed' | 'idle' | 'waiting' | 'accepted' | 'error';

interface HotlineExpert {
  id: string;
  displayName: string;
  type?: string;
}

interface HotlineRequest {
  id: string;
  status: 'WAITING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  conversationId?: string | null;
  expert?: HotlineExpert | null;
}

interface HotlineStatus {
  open: boolean;
  onDutyCount: number;
  nextOpensAt: string | null;
  waiting: number;
  estimatedWaitMinutes: number | null;
  request: HotlineRequest | null;
}

/**
 * The hotline: ask to talk to a specialist now, wait, get handed into the chat.
 *
 * It promises as little as the line can actually keep. When nobody is on duty it
 * says so and offers to book instead, rather than accepting a request that would
 * sit unanswered — an unanswered queue is worse than a closed line, because it
 * tells someone that help is coming when it is not.
 */
export default function HotlineScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const symptomReportId: string | undefined = route.params?.symptomReportId;
  const presetReason: string | undefined = route.params?.reason;

  const [status, setStatus] = useState<HotlineStatus | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [reason, setReason] = useState(presetReason ?? '');
  const [busy, setBusy] = useState(false);
  const handedOff = useRef(false);

  const applyStatus = useCallback((next: HotlineStatus) => {
    setStatus(next);
    const request = next.request;
    if (request?.status === 'ACCEPTED') setPhase('accepted');
    else if (request?.status === 'WAITING') setPhase('waiting');
    else setPhase(next.open ? 'idle' : 'closed');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = (await ApiService.getHotlineStatus()) as HotlineStatus;
      applyStatus(next);
    } catch {
      setPhase((current) => (current === 'loading' ? 'error' : current));
    }
  }, [applyStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Only poll while something is actually pending, and stop in the background —
  // a screen left open in a pocket should not keep the radio busy.
  useEffect(() => {
    if (phase !== 'waiting' && phase !== 'idle' && phase !== 'closed') return undefined;

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!timer) timer = setInterval(refresh, POLL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        start();
      } else stop();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [phase, refresh]);

  // Hand over to the chat exactly once, so re-entering this screen does not
  // bounce the user back out of a conversation they navigated away from.
  useEffect(() => {
    if (phase !== 'accepted' || handedOff.current) return;
    const conversationId = status?.request?.conversationId;
    if (!conversationId) return;
    handedOff.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    navigation.replace('Chat', { conversationId });
  }, [phase, status, navigation]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ApiService.createHotlineRequest({
        reason: reason.trim() || undefined,
        symptomReportId,
        locale: language,
      });
      Haptics.selectionAsync().catch(() => {});
      await refresh();
    } catch (error: any) {
      Alert.alert(
        t('common.error', 'Error'),
        error?.message || t('hotline.requestFailed', 'Could not reach the line. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  }, [busy, reason, symptomReportId, language, refresh, t]);

  const cancel = useCallback(async () => {
    const id = status?.request?.id;
    if (!id || busy) return;
    setBusy(true);
    try {
      await ApiService.cancelHotlineRequest(id);
      await refresh();
    } catch (error: any) {
      Alert.alert(t('common.error', 'Error'), error?.message || t('common.tryAgain', 'Try again'));
    } finally {
      setBusy(false);
    }
  }, [status, busy, refresh, t]);

  const opensAtLabel = useMemo(() => {
    if (!status?.nextOpensAt) return null;
    const at = new Date(status.nextOpensAt);
    if (Number.isNaN(at.getTime())) return null;
    return at.toLocaleString(language || undefined, {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [status, language]);

  const renderClosed = () => (
    <>
      <View style={[styles.badge, styles.badgeClosed]}>
        <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
        <Text style={styles.badgeText}>{t('hotline.closed', 'The line is closed')}</Text>
      </View>
      <Text style={styles.lead}>
        {opensAtLabel
          ? t('hotline.opensAt', 'Opens {{when}}').replace('{{when}}', opensAtLabel)
          : t('hotline.noSchedule', 'No one is on the line right now.')}
      </Text>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('Experts')}
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryBtnText}>
          {t('hotline.bookInstead', 'Book a consultation instead')}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderIdle = () => (
    <>
      <View style={[styles.badge, styles.badgeOpen]}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <Text style={styles.badgeText}>
          {t('hotline.open', 'On the line now: {{count}}').replace(
            '{{count}}',
            String(status?.onDutyCount ?? 0),
          )}
        </Text>
      </View>

      <Text style={styles.lead}>
        {status?.estimatedWaitMinutes
          ? t('hotline.waitEstimate', 'Usually answered within {{minutes}} min').replace(
              '{{minutes}}',
              String(status.estimatedWaitMinutes),
            )
          : t('hotline.answeredSoon', 'Usually answered within a few minutes.')}
      </Text>

      {symptomReportId ? (
        <View style={styles.attached}>
          <Ionicons name="body-outline" size={16} color={colors.primary} />
          <Text style={styles.attachedText}>
            {t('hotline.attachedReport', 'Your body map record will be attached.')}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('hotline.reasonLabel', 'What is going on?')}</Text>
        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder={t('hotline.reasonPlaceholder', 'A sentence is enough')}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={MAX_REASON}
          textAlignVertical="top"
          accessibilityLabel={t('hotline.reasonLabel', 'What is going on?')}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
        onPress={submit}
        disabled={busy}
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        {busy ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.primaryBtnText}>{t('hotline.connect', 'Connect me')}</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        {t(
          'hotline.disclaimer',
          'Our specialists advise on nutrition. This is not emergency care — for anything urgent call the emergency services.',
        )}
      </Text>
    </>
  );

  const renderWaiting = () => (
    <View style={styles.waitBox}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.waitTitle}>{t('hotline.waiting', 'Looking for a specialist')}</Text>
      <Text style={styles.waitBody}>
        {status?.estimatedWaitMinutes
          ? t('hotline.waitEstimate', 'Usually answered within {{minutes}} min').replace(
              '{{minutes}}',
              String(status.estimatedWaitMinutes),
            )
          : t('hotline.answeredSoon', 'Usually answered within a few minutes.')}
      </Text>
      <Text style={styles.waitHint}>
        {t('hotline.waitHint', 'You can close the app — we will notify you.')}
      </Text>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={cancel}
        disabled={busy}
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryBtnText}>{t('common.cancel', 'Cancel')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.waitBox}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
      <Text style={styles.waitTitle}>{t('hotline.offline', 'No connection')}</Text>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={refresh}
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryBtnText}>{t('common.tryAgain', 'Try again')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('hotline.title', 'Hotline')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {phase === 'loading' && (
            <View style={styles.waitBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          {phase === 'closed' && renderClosed()}
          {phase === 'idle' && renderIdle()}
          {(phase === 'waiting' || phase === 'accepted') && renderWaiting()}
          {phase === 'error' && renderError()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
    body: { paddingHorizontal: 20, paddingBottom: 32 },

    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 13,
      marginBottom: 14,
    },
    badgeOpen: { backgroundColor: colors.successTint || colors.surfaceMuted },
    badgeClosed: { backgroundColor: colors.surfaceMuted },
    badgeText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    dot: { width: 8, height: 8, borderRadius: 4 },

    lead: { fontSize: 15, color: colors.textSecondary, lineHeight: 21, marginBottom: 18 },

    attached: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primaryTint,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 14,
    },
    attachedText: { flex: 1, fontSize: 13, color: colors.primary, fontWeight: '600' },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderMuted,
      marginBottom: 16,
    },
    cardLabel: { fontSize: 14.5, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
    input: {
      minHeight: 88,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderMuted,
    },

    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },

    secondaryBtn: {
      marginTop: 18,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 22,
      borderWidth: 1,
      borderColor: colors.borderMuted,
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    secondaryBtnText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },

    disclaimer: {
      fontSize: 12.5,
      color: colors.textTertiary,
      lineHeight: 18,
      marginTop: 16,
      textAlign: 'center',
    },

    waitBox: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 12 },
    waitTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 20,
      textAlign: 'center',
    },
    waitBody: {
      fontSize: 14.5,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20,
    },
    waitHint: { fontSize: 13, color: colors.textTertiary, marginTop: 10, textAlign: 'center' },
  });
