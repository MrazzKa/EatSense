import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { Habit, HabitCompletion } from '../../types/tracker';
import HabitRow from './HabitRow';

interface HabitGridProps {
  habits: Habit[];
  weekDates: string[];
  today: string;
  completions: Record<string, HabitCompletion[]>;
  onToggle: (habitId: string, date: string) => void;
  isActiveOnDate: (habit: Habit, date: string) => boolean;
}

const DAY_KEYS = ['common.mon', 'common.tue', 'common.wed', 'common.thu', 'common.fri', 'common.sat', 'common.sun'];
const DAY_FALLBACKS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function HabitGrid({ habits, weekDates, today, completions, onToggle, isActiveOnDate }: HabitGridProps) {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  return (
    <View style={styles.container}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        <View style={{ width: 28 + (tokens.spacing.sm || 8) }} />
        <View style={styles.headers}>
          {weekDates.map((date, i) => {
            const isToday = date === today;
            const label = t(DAY_KEYS[i]) || DAY_FALLBACKS[i];
            return (
              <View key={date} style={styles.headerCell}>
                <Text style={[
                  styles.headerText,
                  isToday && { color: colors.primary, fontWeight: '700' },
                ]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Habit rows */}
      {habits.map(habit => (
        <HabitRow
          key={habit.id}
          habit={habit}
          weekDates={weekDates}
          today={today}
          completions={completions}
          onToggle={onToggle}
          isActiveOnDate={isActiveOnDate}
        />
      ))}
    </View>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    container: {
      marginVertical: tokens.spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
      marginBottom: tokens.spacing.xs,
    },
    headers: {
      flexDirection: 'row',
      flex: 1,
      gap: 4,
    },
    headerCell: {
      width: 32,
      alignItems: 'center',
    },
    headerText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
  });
