// @ts-nocheck
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

export default function ExpertsComingSoonScreen() {
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft || colors.primary + '20' }]}>
          <Ionicons name="people" size={56} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
          {t('experts.comingSoon.title', 'Experts Coming Soon')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t(
            'experts.comingSoon.subtitle',
            "We're hand-picking certified nutritionists and dietitians for you. The marketplace launches soon — stay tuned!",
          )}
        </Text>
        <View style={[styles.feature, { borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>
            {t('experts.comingSoon.feature1', 'Verified credentials')}
          </Text>
        </View>
        <View style={[styles.feature, { borderColor: colors.border }]}>
          <Ionicons name="chatbubbles" size={20} color={colors.primary} />
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>
            {t('experts.comingSoon.feature2', 'Direct chat consultations')}
          </Text>
        </View>
        <View style={[styles.feature, { borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>
            {t('experts.comingSoon.feature3', 'Secure data sharing')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (tokens, colors) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: tokens.spacing.xl,
    },
    iconCircle: {
      width: 112,
      height: 112,
      borderRadius: 56,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: tokens.spacing.xl,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: tokens.spacing.md,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: tokens.spacing.xl * 1.5,
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      marginBottom: tokens.spacing.sm,
      width: '100%',
    },
    featureText: {
      fontSize: 14,
      flex: 1,
    },
  });
