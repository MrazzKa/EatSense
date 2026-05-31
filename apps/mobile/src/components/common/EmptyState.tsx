import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDesignTokens } from '../../contexts/ThemeContext';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

/**
 * Consistent empty-state block: centered icon bubble, title, optional subtitle,
 * and an optional primary CTA. Theme-aware. Use everywhere a list/section can be
 * empty so the look is uniform across the app.
 */
export function EmptyState({ icon = 'document-outline', title, subtitle, actionLabel, onAction, style }: EmptyStateProps) {
  const { colors } = useTheme();
  const tokens = useDesignTokens();

  return (
    <View style={[styles.container, { paddingVertical: tokens.spacing.xxxl }, style]}>
      <View style={[styles.iconBubble, { backgroundColor: (colors.primary || '#4CAF50') + '14' }]}>
        <Ionicons name={icon} size={30} color={colors.primary || '#4CAF50'} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={[styles.action, { backgroundColor: colors.primary }]} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconBubble: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  action: { minHeight: 44, paddingHorizontal: 22, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  actionText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

export default EmptyState;
