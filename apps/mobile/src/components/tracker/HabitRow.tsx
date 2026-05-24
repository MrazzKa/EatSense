import React, { useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Habit, HabitCompletion } from '../../types/tracker';

interface HabitRowProps {
  habit: Habit;
  weekDates: string[];
  today: string;
  completions: Record<string, HabitCompletion[]>;
  onToggle: (habitId: string, date: string) => void;
  isActiveOnDate: (habit: Habit, date: string) => boolean;
  onEdit?: (habit: Habit) => void;
}

function HabitCell({ date, habit, today, completions, onToggle, isActiveOnDate, colors, styles }: {
  date: string; habit: Habit; today: string;
  completions: Record<string, HabitCompletion[]>;
  onToggle: (id: string, date: string) => void;
  isActiveOnDate: (h: Habit, d: string) => boolean;
  colors: any; styles: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const isActive = isActiveOnDate(habit, date);
  const isFuture = date > today;
  const isToday = date === today;
  const dayCompletions = completions[date] || [];
  const completed = dayCompletions.find(c => c.habitId === habit.id)?.completed ?? false;
  const missed = !isFuture && !completed && isActive && date < today;

  const handlePress = useCallback(() => {
    if (isFuture || !isActive) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle(habit.id, date);
  }, [isFuture, isActive, habit.id, date, onToggle, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={isFuture || !isActive}
        activeOpacity={0.7}
        style={[
          styles.cell,
          completed && { backgroundColor: colors.primaryTint || (colors.primary + '30') },
          missed && { backgroundColor: colors.errorTint || (colors.error + '20') },
          isFuture && { opacity: 0.3 },
          isToday && !completed && { borderColor: colors.primary, borderWidth: 2 },
        ]}
      >
        {completed ? (
          <Ionicons name="checkmark" size={16} color={colors.primary} />
        ) : missed ? (
          <Ionicons name="close" size={14} color={colors.error} />
        ) : isActive && !isFuture ? (
          <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HabitRow({ habit, weekDates, today, completions, onToggle, isActiveOnDate, onEdit }: HabitRowProps) {
  const { colors, tokens } = useTheme();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={() => onEdit?.(habit)} activeOpacity={0.6}>
        <Text style={styles.emoji}>{habit.emoji}</Text>
      </TouchableOpacity>
      <View style={styles.cells}>
        {weekDates.map(date => (
          <HabitCell
            key={date}
            date={date}
            habit={habit}
            today={today}
            completions={completions}
            onToggle={onToggle}
            isActiveOnDate={isActiveOnDate}
            colors={colors}
            styles={styles}
          />
        ))}
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
      aspectRatio: 1,
      flex: 1,
      maxWidth: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary || colors.surface,
    },
    cellText: {
      fontSize: 14,
      fontWeight: '600',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      opacity: 0.4,
    },
  });
