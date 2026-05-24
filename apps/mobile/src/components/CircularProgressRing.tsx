import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

interface CircularProgressRingProps {
  progress: number; // 0-1 or 0-100 (will be normalized)
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  textStyle?: any;
}

/**
 * CircularProgressRing - Small circular progress indicator for tracker
 * Uses SVG for smooth rendering
 */
export default function CircularProgressRing({
  progress,
  size = 56,
  strokeWidth = 4,
  showText = true,
  textStyle,
}: CircularProgressRingProps) {
  const { colors } = useTheme();

  // Normalize progress to 0-1
  const normalizedProgress = progress > 1 ? progress / 100 : progress;
  const clampedProgress = Math.min(1, Math.max(0, normalizedProgress));
  const displayPercent = Math.round(clampedProgress * 100);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedProgress);

  const progressColor = clampedProgress >= 0.8 
    ? (colors.primary || '#4CAF50')
    : (colors.warning || '#FF9800');

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border || '#E5E7EB'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        {clampedProgress > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.text, textStyle, { color: colors.textPrimary || '#212121' }]}>
            {displayPercent}%
          </Text>
        </View>
      )}
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
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
});
