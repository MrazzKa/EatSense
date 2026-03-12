import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
    { icon: '🔥', value: streak > 0 ? `${streak}` : '—', label: t('tracker.stats.streak') || 'Streak' },
    { icon: '📊', value: `${weeklyPercentage}%`, label: t('tracker.stats.weekly') || 'Weekly' },
    { icon: '📋', value: `${totalHabits}`, label: t('tracker.stats.total') || 'Total' },
  ];

  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <AppCard key={i} style={styles.card} padding="md">
          <Text style={styles.icon}>{stat.icon}</Text>
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
    icon: {
      fontSize: 20,
      marginBottom: 4,
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
