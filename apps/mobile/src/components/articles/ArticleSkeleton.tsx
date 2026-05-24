import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { BORDER_RADIUS, PADDING, SPACING } from '../../utils/designConstants';

export const ArticleSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const base = colors.inputBackground || '#E5E7EB';

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.cover, { backgroundColor: base }]} />
      <View style={styles.content}>
        <View style={[styles.metaLine, { backgroundColor: base }]} />
        <View style={[styles.titleLine, { backgroundColor: base }]} />
        <View style={[styles.titleLineShort, { backgroundColor: base }]} />
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: base }]} />
          <View style={[styles.tag, { backgroundColor: base }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  cover: {
    height: 180,
    width: '100%',
  },
  content: {
    paddingHorizontal: PADDING.lg,
    paddingVertical: PADDING.lg,
    gap: SPACING.sm,
  },
  metaLine: {
    width: '50%',
    height: 12,
    borderRadius: BORDER_RADIUS.sm,
  },
  titleLine: {
    width: '80%',
    height: 18,
    borderRadius: BORDER_RADIUS.sm,
  },
  titleLineShort: {
    width: '60%',
    height: 18,
    borderRadius: BORDER_RADIUS.sm,
  },
  tagRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  tag: {
    width: 70,
    height: 16,
    borderRadius: BORDER_RADIUS.md,
  },
});


