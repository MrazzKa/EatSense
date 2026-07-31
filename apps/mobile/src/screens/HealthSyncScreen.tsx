import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ApiService from '../services/apiService';
import HealthService, { HealthDailySummary, HealthPermissionState } from '../services/health';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

interface Consents {
  improveAccuracy: boolean;
  healthAiContext: boolean;
  healthShareWithExpert: boolean;
}

/**
 * Health sync + data privacy settings.
 *
 * This screen replaces a hardcoded "Apple Health Sync — Enabled" row that did
 * nothing. Everything here is off until the user turns it on.
 *
 * The three consents are deliberately separate:
 *  - `healthAiContext` is its own switch because sending HealthKit data to the AI
 *    means sharing it with a third party, which Apple requires to be explicit;
 *  - `healthShareWithExpert` is its own switch because a human sees the data;
 *  - `improveAccuracy` is unrelated to health data and never covers it.
 */
/**
 * Declared at module level on purpose. Defining it inside HealthSyncScreen made
 * React treat it as a new component type on every render, remounting each Switch
 * and losing its animation mid-toggle.
 */
function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  colors,
  styles,
}: {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  colors: any;
  styles: any;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.borderMuted, true: colors.primary }}
      />
    </View>
  );
}

export default function HealthSyncScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<HealthPermissionState | null>(null);
  const [summary, setSummary] = useState<HealthDailySummary | null>(null);
  const [consents, setConsents] = useState<Consents>({
    improveAccuracy: false,
    healthAiContext: false,
    healthShareWithExpert: false,
  });

  const isApple = HealthService.providerId === 'apple-health';
  const storeName = isApple ? 'Apple Health' : 'Health Connect';

  const load = useCallback(async () => {
    try {
      const [isAvailable, isEnabled, permState, serverConsents] = await Promise.all([
        HealthService.isAvailable(),
        HealthService.isEnabled(),
        HealthService.getPermissionState(),
        ApiService.getConsents().catch(() => null),
      ]);
      setAvailable(isAvailable);
      setEnabled(isEnabled);
      setPermission(permState);
      if (serverConsents) {
        setConsents({
          improveAccuracy: !!serverConsents.improveAccuracy,
          healthAiContext: !!serverConsents.healthAiContext,
          healthShareWithExpert: !!serverConsents.healthShareWithExpert,
        });
      }
      if (isEnabled && isAvailable) {
        setSummary(await HealthService.getDailySummary());
      } else {
        setSummary(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleSync = useCallback(async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    Haptics.selectionAsync().catch(() => {});
    try {
      const result = await HealthService.setEnabled(next);
      setEnabled(result.enabled);
      setPermission(result);

      if (next && !result.enabled) {
        Alert.alert(
          t('healthSync.unavailableTitle') || 'Not available',
          (t('healthSync.unavailableBody') || '{{store}} is not available on this device.').replace('{{store}}', storeName),
        );
      }

      if (!next) {
        // Forget which meals we already exported, so re-enabling starts clean.
        await HealthService.resetWriteHistory();
        // Turning sync off withdraws the two health-related consents too — they
        // are meaningless without data, and leaving them on would be misleading.
        if (consents.healthAiContext || consents.healthShareWithExpert) {
          setConsents((c) => ({ ...c, healthAiContext: false, healthShareWithExpert: false }));
          await ApiService.updateConsents({ healthAiContext: false, healthShareWithExpert: false }).catch(() => {});
        }
        setSummary(null);
      } else if (result.enabled) {
        setSummary(await HealthService.getDailySummary());
      }
    } finally {
      setBusy(false);
    }
  }, [busy, consents, storeName, t]);

  const setConsent = useCallback(async (key: keyof Consents, value: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    const previous = consents[key];
    setConsents((c) => ({ ...c, [key]: value })); // optimistic
    try {
      await ApiService.updateConsents({ [key]: value });
    } catch {
      setConsents((c) => ({ ...c, [key]: previous }));
      Alert.alert(t('common.error') || 'Error', t('healthSync.consentFailed') || 'Could not save that setting.');
    }
  }, [consents, t]);

  const openSystemSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('x-apple-health://').catch(() => {
        Linking.openSettings().catch(() => {});
      });
    } else {
      Linking.openSettings().catch(() => {});
    }
  }, []);


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('healthSync.title') || 'Health sync'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {!available ? (
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={styles.noticeText}>
                {(t('healthSync.unavailableBody') || '{{store}} is not available on this device.').replace('{{store}}', storeName)}
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <SettingRow
              icon={isApple ? 'heart-outline' : 'fitness-outline'}
              title={(t('healthSync.syncTitle') || 'Sync with {{store}}').replace('{{store}}', storeName)}
              subtitle={t('healthSync.syncSubtitle') || 'Read your activity and write your meals back.'}
              value={enabled}
              onValueChange={toggleSync}
              disabled={!available || busy}
              colors={colors}
              styles={styles}
            />
          </View>

          <Text style={styles.sectionLabel}>{t('healthSync.whatWeRead') || 'What we read'}</Text>
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              {t('healthSync.readList') ||
                'Steps, active and resting energy, workouts, weight, height, sleep and resting heart rate.'}
            </Text>
            <Text style={[styles.bodyText, { marginTop: 10 }]}>
              {t('healthSync.readWhy') ||
                'Your daily calorie target stops being a guess from a questionnaire and follows how active you actually were.'}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>{t('healthSync.whatWeWrite') || 'What we write'}</Text>
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              {t('healthSync.writeList') || 'Calories, protein, carbs, fat, fibre, sugar, sodium and water, for each meal you log.'}
            </Text>
          </View>

          {enabled && summary ? (
            <>
              <Text style={styles.sectionLabel}>{t('healthSync.todayTitle') || 'Today'}</Text>
              <View style={styles.card}>
                <View style={styles.statsGrid}>
                  {[
                    { label: t('healthSync.steps') || 'Steps', value: summary.steps },
                    { label: t('healthSync.activeEnergy') || 'Active kcal', value: summary.activeEnergyKcal },
                    { label: t('healthSync.workouts') || 'Workout min', value: summary.workoutMinutes },
                    { label: t('healthSync.sleep') || 'Sleep min', value: summary.sleepMinutes },
                  ].map((s) => (
                    <View key={s.label} style={styles.stat}>
                      <Text style={styles.statValue}>{s.value === null || s.value === undefined ? '—' : s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
                {summary.steps === null && summary.activeEnergyKcal === null ? (
                  <Text style={styles.hintText}>
                    {t('healthSync.noDataHint') ||
                      'No data yet. If you declined some categories, you can change that in your system health settings.'}
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>{t('healthSync.privacyTitle') || 'Privacy'}</Text>
          <View style={styles.card}>
            <SettingRow
              icon="sparkles-outline"
              title={t('healthSync.aiContextTitle') || 'Use activity in AI advice'}
              subtitle={
                t('healthSync.aiContextSubtitle') ||
                'Sends sleep and activity to our AI provider so feedback can take them into account. Off by default.'
              }
              value={consents.healthAiContext}
              onValueChange={(v) => setConsent('healthAiContext', v)}
              disabled={!enabled}
              colors={colors}
              styles={styles}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="people-outline"
              title={t('healthSync.expertShareTitle') || 'Share activity with my expert'}
              subtitle={t('healthSync.expertShareSubtitle') || 'Lets a nutritionist you are linked with see your activity.'}
              value={consents.healthShareWithExpert}
              onValueChange={(v) => setConsent('healthShareWithExpert', v)}
              disabled={!enabled}
              colors={colors}
              styles={styles}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="trending-up-outline"
              title={t('healthSync.improveTitle') || 'Help improve accuracy'}
              subtitle={
                t('healthSync.improveSubtitle') ||
                'Links the corrections you make to your account so we can improve recognition. Health data is never included.'
              }
              value={consents.improveAccuracy}
              onValueChange={(v) => setConsent('improveAccuracy', v)}
              colors={colors}
              styles={styles}
            />
          </View>

          <Text style={styles.footnote}>
            {t('healthSync.footnote') ||
              'We never use health data for advertising, and we never share it with anyone without the switches above.'}
          </Text>

          {available ? (
            <TouchableOpacity style={styles.linkBtn} onPress={openSystemSettings} activeOpacity={0.8}>
              <Ionicons name="open-outline" size={17} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.linkBtnText}>
                {(t('healthSync.openSystemSettings') || 'Open {{store}} settings').replace('{{store}}', storeName)}
              </Text>
            </TouchableOpacity>
          ) : null}

          {permission && permission.available && permission.requested && !permission.canWrite ? (
            <Text style={styles.hintText}>
              {t('healthSync.writeDeniedHint') ||
                'Writing meals is currently not permitted. You can enable it in your system health settings.'}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    body: { paddingHorizontal: 20, paddingBottom: 40 },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    card: {
      backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 8,
      borderWidth: 1, borderColor: colors.borderMuted,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowDisabled: { opacity: 0.5 },
    rowIcon: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceSecondary,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    rowTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    rowSubtitle: { fontSize: 12.5, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
    divider: { height: 1, backgroundColor: colors.borderMuted, marginVertical: 14 },
    sectionLabel: {
      fontSize: 12.5, fontWeight: '700', color: colors.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8,
    },
    bodyText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
    hintText: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginTop: 12 },
    footnote: { fontSize: 12.5, color: colors.textTertiary, lineHeight: 18, marginTop: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    stat: { width: '50%', paddingVertical: 8 },
    statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    statLabel: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    notice: {
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: colors.surfaceSecondary, borderRadius: 14, padding: 14, marginBottom: 12,
    },
    noticeText: { flex: 1, fontSize: 13.5, color: colors.textPrimary, lineHeight: 19 },
    linkBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginTop: 20, paddingVertical: 13, borderRadius: 12,
      borderWidth: 1, borderColor: colors.primary,
    },
    linkBtnText: { fontSize: 14.5, fontWeight: '700', color: colors.primary },
  });
