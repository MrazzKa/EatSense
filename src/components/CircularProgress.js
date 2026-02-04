import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

export function CircularProgress({ progress = 0, size = 220, strokeWidth = 8, value, label, goal, goalUnit, children }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Clamp progress between 0 and 5 (0% to 500%), allowing display of values exceeding goal
  // Progress can be > 1 when value exceeds goal (e.g., 1500/1000 = 1.5 = 150%)
  const isOverGoal = progress > 1;
  const clampedProgress = Math.min(1, Math.max(0, progress)); // Clamp to 0-1 for display
  const displayProgress = Math.min(5, Math.max(0, progress)); // Cap at 500% for display, allow > 1
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate progress change smoothly
  // FIX: Use ref to track current animated value to avoid dependency loop
  const animatedRef = React.useRef(animatedProgress);
  animatedRef.current = animatedProgress;

  useEffect(() => {
    const startValue = animatedRef.current;
    const endValue = displayProgress;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progressRatio, 3);
      const currentValue = startValue + (endValue - startValue) * eased;

      setAnimatedProgress(currentValue);

      if (progressRatio < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedProgress(endValue);
      }
    };

    if (Math.abs(startValue - endValue) > 0.01) {
      requestAnimationFrame(animate);
    }
  }, [displayProgress]); // Only re-run when target progress changes

  const strokeDashoffset = circumference * (1 - animatedProgress);

  // Color changes to warning when over goal
  const getProgressColor = () => {
    if (isOverGoal) {
      return colors.warning || '#F59E0B';
    }
    return colors.primary || '#007AFF';
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
              {value != null
                ? value.toLocaleString()
                : Math.round(clampedProgress * 100)}
            </Text>
            {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
            {goal && (
              <>
                <Text style={[styles.goal, { color: colors.textTertiary }]}>
                  {typeof goal === 'number'
                    ? `${t('dashboard.ofGoal', { goal: Math.round(goal) })} ${goalUnit || t('dashboard.caloriesUnit')}`
                    : goal}
                </Text>
                {isOverGoal && value != null && goal && (
                  <Text style={[styles.overGoal, { color: colors.warning || '#F59E0B' }]}>
                    +{Math.round(value - goal)} {goalUnit || t('dashboard.caloriesUnit')} {t('dashboard.overGoal', { defaultValue: 'over goal' })}
                  </Text>
                )}
              </>
            )}
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
  overGoal: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});

