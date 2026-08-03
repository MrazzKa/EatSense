import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { HealthDailySummary } from '../services/health';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

interface Props {
  /** Today's activity as read from the device. Null when sync is off. */
  summary: HealthDailySummary | null;
  /** Extra kcal the server already added to today's goal because of that activity. */
  activeEnergyBonus: number;
}

/**
 * Today's activity, on the dashboard, directly under the calorie ring.
 *
 * WHY IT EXISTS
 * -------------
 * The Health integration worked from the first build but lived entirely behind
 * Profile → Health sync, and the only thing it surfaced on the main screen was a
 * "+121 earned by moving" line inside the ring. Feedback from the first TestFlight
 * build was blunt: it reads as a separate, disconnected feature, and even the
 * person who asked for it had trouble finding it.
 *
 * So the connection is now stated where the number it changes actually lives:
 * this card sits under the ring, shows what was read from the health store, and
 * says in words how much of today's target came from moving. Tapping it opens the
 * full settings screen, which is now reachable in one tap from the home screen
 * instead of four.
 */
export default function TodayActivityCard({ summary, activeEnergyBonus }: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const open = useCallback(() => navigation.navigate('HealthSync'), [navigation]);

  // Nothing was read (sync off, or every category declined) — say nothing rather
  // than show a card full of dashes. HealthSyncPrompt covers the "not connected"
  // case and would otherwise be competing for the same slot.
  const hasAnything =
    !!summary &&
    (summary.steps != null ||
      summary.activeEnergyKcal != null ||
      summary.workoutMinutes != null ||
      summary.sleepMinutes != null);

  if (!hasAnything) return null;

  const sleepHours =
    summary!.sleepMinutes != null ? Math.round((summary!.sleepMinutes / 60) * 10) / 10 : null;

  const cells: { key: string; icon: string; value: string; label: string }[] = [];
  if (summary!.steps != null) {
    cells.push({
      key: 'steps',
      icon: 'walk-outline',
      value: summary!.steps.toLocaleString(),
      label: t('healthSync.steps') || 'Steps',
    });
  }
  if (summary!.activeEnergyKcal != null) {
    cells.push({
      key: 'active',
      icon: 'flame-outline',
      value: String(summary!.activeEnergyKcal),
      label: t('healthSync.activeEnergy') || 'Active kcal',
    });
  }
  if (summary!.workoutMinutes != null && summary!.workoutMinutes > 0) {
    cells.push({
      key: 'workout',
      icon: 'barbell-outline',
      value: String(summary!.workoutMinutes),
      label: t('healthSync.workouts') || 'Workout min',
    });
  }
  if (sleepHours != null && sleepHours > 0) {
    cells.push({
      key: 'sleep',
      icon: 'moon-outline',
      value: `${sleepHours}`,
      label: t('healthSync.sleepHours') || 'Sleep h',
    });
  }

  return (
    <TouchableOpacity style={styles.card} onPress={open} activeOpacity={0.85}>
      <View style={styles.header}>
        <Ionicons
          name={Platform.OS === 'ios' ? 'heart' : 'fitness'}
          size={15}
          color="#EF4444"
          style={{ marginRight: 7 }}
        />
        <Text style={styles.title}>{t('healthSync.todayActivity') || 'Today’s activity'}</Text>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>

      <View style={styles.grid}>
        {cells.map((c) => (
          <View key={c.key} style={styles.cell}>
            <Ionicons name={c.icon as any} size={15} color={colors.textSecondary} />
            <Text style={styles.cellValue}>{c.value}</Text>
            <Text style={styles.cellLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* The whole point of the integration, spelled out. Without this sentence
          the goal just quietly differs from yesterday and reads as a bug. */}
      {activeEnergyBonus > 0 ? (
        <View style={styles.bonusRow}>
          <Ionicons name="add-circle" size={14} color={colors.success || '#22C55E'} />
          <Text style={styles.bonusText}>
            {(t('healthSync.addedToGoal') || '{{kcal}} kcal added to today’s goal because you moved').replace(
              '{{kcal}}',
              String(activeEnergyBonus),
            )}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          {t('healthSync.noBonusYet') || 'Move more today and your calorie goal grows with you.'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginHorizontal: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.borderMuted,
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    title: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { minWidth: '25%', flexGrow: 1, paddingVertical: 2 },
    cellValue: { fontSize: 19, fontWeight: '800', color: colors.textPrimary, marginTop: 3 },
    cellLabel: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
    bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    bonusText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.success || '#22C55E', lineHeight: 17 },
    hint: { fontSize: 12.5, color: colors.textTertiary, marginTop: 12, lineHeight: 17 },
  });
