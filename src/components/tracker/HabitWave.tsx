import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { Habit, HabitCompletion } from '../../types/tracker';

interface HabitWaveProps {
  habits: Habit[];
  weekDates: string[];
  today: string;
  completions: Record<string, HabitCompletion[]>;
  isActiveOnDate: (habit: Habit, date: string) => boolean;
}

export default function HabitWave({ habits, weekDates, today, completions, isActiveOnDate }: HabitWaveProps) {
  const { colors, tokens } = useTheme();
  const [width, setWidth] = useState(300);
  const height = 120;
  const paddingH = 16;
  const paddingV = 20;
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const rates = weekDates.map(date => {
    if (date > today || habits.length === 0) return null;
    const active = habits.filter(h => isActiveOnDate(h, date));
    if (active.length === 0) return null;
    const dayC = completions[date] || [];
    const done = active.filter(h => dayC.some(c => c.habitId === h.id && c.completed)).length;
    return done / active.length;
  });

  const chartW = width - paddingH * 2;
  const chartH = height - paddingV * 2;
  const step = chartW / 6;

  const points = rates.map((rate, i) => {
    if (rate === null) return null;
    return { x: paddingH + i * step, y: paddingV + chartH * (1 - rate) };
  }).filter(Boolean) as { x: number; y: number }[];

  let pathD = '';
  if (points.length >= 2) {
    pathD = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      pathD += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
  }

  const fillD = pathD
    ? `${pathD} L${points[points.length - 1].x},${paddingV + chartH} L${points[0].x},${paddingV + chartH} Z`
    : '';

  return (
    <View style={styles.container} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {fillD ? <Path d={fillD} fill="url(#waveGrad)" /> : null}
        {pathD ? <Path d={pathD} stroke={colors.primary} strokeWidth={2.5} fill="none" /> : null}
        {points.map((p, i) => {
          const dateIdx = rates.findIndex((r, j) => {
            let count = 0;
            for (let k = 0; k <= j; k++) if (rates[k] !== null) count++;
            return count === i + 1;
          });
          const isToday = weekDates[dateIdx] === today;
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isToday ? 5 : 3.5}
              fill={isToday ? colors.primary : colors.background}
              stroke={colors.primary}
              strokeWidth={isToday ? 2.5 : 2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    container: {
      borderRadius: tokens.radii.lg,
      backgroundColor: colors.surfaceSecondary || colors.surface,
      overflow: 'hidden',
      marginVertical: tokens.spacing.sm,
    },
  });
