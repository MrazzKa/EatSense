import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import AppCard from '../common/AppCard';

interface StatsRowProps {
  streak: number;
  weeklyPercentage: number;
  totalHabits: number;
}

export default function StatsRow({ streak, weeklyPercentage, totalHabits }: StatsRowProps) {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const stats = [
    { icon: 'flame' as const, color: colors.warning || '#F59E0B', value: streak > 0 ? `${streak}` : '—', label: t('tracker.stats.streak') || 'Streak' },
    { icon: 'stats-chart' as const, color: colors.primary || '#4CAF50', value: `${weeklyPercentage}%`, label: t('tracker.stats.weekly') || 'Weekly' },
    { icon: 'checkmark-done' as const, color: colors.success || '#10B981', value: `${totalHabits}`, label: t('tracker.stats.total') || 'Total' },
  ];

  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <AppCard key={i} style={styles.card} padding="md">
          <View style={[styles.iconBubble, { backgroundColor: stat.color + '18' }]}>
            <Ionicons name={stat.icon} size={18} color={stat.color} />
          </View>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{stat.value}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{stat.label}</Text>
        </AppCard>
      ))}
    </View>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      marginVertical: tokens.spacing.sm,
    },
    card: {
      flex: 1,
      alignItems: 'center',
    },
    iconBubble: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    value: {
      fontSize: 20,
      fontWeight: '700',
    },
    label: {
      fontSize: 12,
      marginTop: 2,
    },
  });
