import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Single shimmering placeholder block. Theme-aware; respects Reduce Motion
 * (falls back to a static muted block instead of pulsing).
 */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: SkeletonProps) {
  const { colors, reduceMotion } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  const bg = colors.surfaceMuted || colors.border || '#E5E7EB';
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: bg, opacity: reduceMotion ? 0.6 : pulse },
        style,
      ]}
    />
  );
}

interface ListSkeletonProps {
  count?: number;
  /** Show a circular avatar placeholder on the left of each row. */
  avatar?: boolean;
}

/**
 * A list of card-shaped skeleton rows. Drop in as a loading state for any
 * card/list screen so the layout doesn't jump when real data arrives.
 */
export function ListSkeleton({ count = 5, avatar = true }: ListSkeletonProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[styles.card, { backgroundColor: colors.surface || '#FFF', borderColor: colors.border || '#E5E7EB' }]}
        >
          {avatar ? <Skeleton width={44} height={44} radius={22} /> : null}
          <View style={styles.cardBody}>
            <Skeleton width="62%" height={14} />
            <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardBody: { flex: 1 },
});

export default Skeleton;
