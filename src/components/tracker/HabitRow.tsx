import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Habit, HabitCompletion } from '../../types/tracker';

interface HabitRowProps {
  habit: Habit;
  weekDates: string[];
  today: string;
  completions: Record<string, HabitCompletion[]>;
  onToggle: (habitId: string, date: string) => void;
  isActiveOnDate: (habit: Habit, date: string) => boolean;
}

export default function HabitRow({ habit, weekDates, today, completions, onToggle, isActiveOnDate }: HabitRowProps) {
  const { colors, tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{habit.emoji}</Text>
      <View style={styles.cells}>
        {weekDates.map(date => {
          const isActive = isActiveOnDate(habit, date);
          const isFuture = date > today;
          const isToday = date === today;
          const dayCompletions = completions[date] || [];
          const completion = dayCompletions.find(c => c.habitId === habit.id);
          const completed = completion?.completed ?? false;
          const missed = !isFuture && !completed && isActive && date < today;

          return (
            <TouchableOpacity
              key={date}
              onPress={() => {
                if (!isFuture && isActive) onToggle(habit.id, date);
              }}
              disabled={isFuture || !isActive}
              style={[
                styles.cell,
                completed && { backgroundColor: colors.primaryTint || (colors.primary + '30') },
                missed && { backgroundColor: colors.errorTint || (colors.error + '20') },
                isFuture && { opacity: 0.3 },
                isToday && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            >
              <Text style={[
                styles.cellText,
                completed && { color: colors.primary },
                missed && { color: colors.error },
                isFuture && { color: colors.textTertiary },
                // Today active but not completed: show a tappable dot
                isToday && !completed && !missed && isActive && { color: colors.textTertiary },
              ]}>
                {completed ? '✓' : missed ? '✗' : isFuture ? '·' : isActive ? '·' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: tokens.spacing.sm,
      gap: tokens.spacing.sm,
    },
    emoji: {
      fontSize: 20,
      width: 28,
      textAlign: 'center',
    },
    cells: {
      flexDirection: 'row',
      flex: 1,
      gap: 4,
    },
    cell: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary || colors.surface,
    },
    cellText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
