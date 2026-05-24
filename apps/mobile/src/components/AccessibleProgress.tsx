import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AccessibleProgressProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  height?: number;
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  progress,
  label,
  showPercentage = true,
  color = '#3498DB',
  backgroundColor = '#E9ECEF',
  height = 8,
}) => {
  const percentage = Math.max(0, Math.min(100, progress));
  const percentageText = `${Math.round(percentage)}%`;

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={label || 'Progress'}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: percentage,
        text: percentageText,
      }}
    >
      <View style={[styles.track, { backgroundColor, height }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: `${percentage}%`,
              height,
            },
          ]}
        />
      </View>
      {showPercentage && (
        <Text style={styles.percentageText}>{percentageText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
  },
});
