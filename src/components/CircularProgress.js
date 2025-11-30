import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

export function CircularProgress({ progress = 0, size = 220, strokeWidth = 8, value, label, goal, children }) {
  const { colors, tokens } = useTheme();
  
  // Clamp progress between 0 and 1, and cap display percentage at 500%
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const displayProgress = Math.min(5, clampedProgress); // Cap at 500% for display
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - displayProgress);
  
  // Color based on progress
  const getProgressColor = () => {
    if (clampedProgress < 0.5) return colors.success || '#10B981';
    if (clampedProgress < 0.8) return colors.warning || '#F59E0B';
    return colors.error || '#EF4444';
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.borderMuted || '#E5E7EB'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.content}>
        {children || (
          <>
            <Text style={[styles.value, { color: colors.primary }]}>
              {value !== undefined ? value.toLocaleString() : (
                clampedProgress >= 5 
                  ? '500+%' 
                  : `${Math.round(clampedProgress * 100)}%`
              )}
            </Text>
            {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
            {goal && <Text style={[styles.goal, { color: colors.textTertiary }]}>{goal}</Text>}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  value: {
    fontSize: 42,
    fontWeight: '800',
  },
  label: {
    fontSize: 16,
  },
  goal: {
    fontSize: 14,
  },
});

