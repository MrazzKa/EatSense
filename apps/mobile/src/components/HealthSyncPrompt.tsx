import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import HealthService from '../services/health';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

const DISMISS_KEY = 'health:promptDismissedAt';
const DISMISS_COUNT_KEY = 'health:promptDismissCount';
/** Wait a week before asking again after a "not now". */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** Three polite asks, then never again. */
const MAX_ASKS = 3;

interface Props {
  onConnected?: () => void;
}

/**
 * Dashboard card offering to connect Apple Health / Health Connect.
 *
 * Why a card and not the system dialog straight away: on iOS the HealthKit
 * permission sheet can only ever be shown ONCE per data type. If the user taps
 * "Don't Allow" there is no second chance — the app can never ask again, only
 * send them into Settings. So we ask our own question first and spend that one
 * system prompt only on people who already said yes.
 *
 * It also explains the benefit before asking, which is what Apple's own review
 * guidance asks for.
 *
 * It used to wait until the user had logged a meal, on the theory that the offer
 * lands better once there is something to gain from it. In practice that hid the
 * entire feature from exactly the people who had not started yet — the first
 * TestFlight round came back with "I could barely find it myself" — and a brand
 * new account saw nothing at all. Activity is worth reading from day one, so the
 * only gates left are: sync is off, the store exists, and the user has not said
 * no three times.
 */
export default function HealthSyncPrompt({ onConnected }: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const isApple = Platform.OS === 'ios';
  const storeName = isApple ? 'Apple Health' : 'Health Connect';

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await HealthService.isEnabled()) return;
        if (!(await HealthService.isAvailable())) return;

        const [dismissedAt, count] = await Promise.all([
          AsyncStorage.getItem(DISMISS_KEY),
          AsyncStorage.getItem(DISMISS_COUNT_KEY),
        ]);
        if (Number(count || 0) >= MAX_ASKS) return;
        if (dismissedAt && Date.now() - Number(dismissedAt) < SNOOZE_MS) return;

        if (!cancelled) setVisible(true);
      } catch {
        /* never let this break the dashboard */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    Haptics.selectionAsync().catch(() => {});
    try {
      const result = await HealthService.setEnabled(true);
      if (result.enabled) {
        setVisible(false);
        onConnected?.();
      } else {
        // Not available on this device — stop offering it.
        await AsyncStorage.setItem(DISMISS_COUNT_KEY, String(MAX_ASKS));
        setVisible(false);
      }
    } catch {
      setVisible(false);
    } finally {
      setBusy(false);
    }
  }, [busy, onConnected]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    try {
      const count = Number((await AsyncStorage.getItem(DISMISS_COUNT_KEY)) || 0) + 1;
      await AsyncStorage.multiSet([
        [DISMISS_KEY, String(Date.now())],
        [DISMISS_COUNT_KEY, String(count)],
      ]);
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name={isApple ? 'heart' : 'fitness'} size={20} color="#EF4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {(t('healthSync.promptTitle') || 'Connect {{store}}').replace('{{store}}', storeName)}
          </Text>
          <Text style={styles.subtitle}>
            {t('healthSync.promptBody') ||
              'Your calorie goal will follow how much you actually moved, and your meals will appear in your health app.'}
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={connect} disabled={busy} activeOpacity={0.85}>
          {busy ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>{t('healthSync.promptConnect') || 'Connect'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('HealthSync')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>{t('healthSync.promptDetails') || 'What is shared?'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.borderMuted,
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#EF444418',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
    secondaryBtn: { paddingVertical: 12, paddingHorizontal: 14 },
    secondaryBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  });
