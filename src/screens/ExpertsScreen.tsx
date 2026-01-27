import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

/**
 * ExpertsScreen - "Coming Soon" placeholder
 * The full marketplace functionality is temporarily disabled for MVP polish.
 */
export default function ExpertsScreen({ navigation: _navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={[styles.illustrationContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="people" size={64} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
          {t('experts.comingSoonTitle', 'Expert Consultations')}
        </Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('experts.comingSoonDescription', 'Connect with certified dietitians and nutritionists for personalized consultations. This feature is coming soon!')}
        </Text>

        {/* Features preview */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="search" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              {t('experts.feature1', 'Find verified specialists')}
            </Text>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="chatbubbles" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              {t('experts.feature2', 'Chat & video consultations')}
            </Text>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              {t('experts.feature3', 'Personalized meal plans')}
            </Text>
          </View>
        </View>

        {/* Coming soon badge */}
        <View style={[styles.comingSoonBadge, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="time-outline" size={16} color={colors.warning || '#FF9500'} />
          <Text style={[styles.comingSoonText, { color: colors.warning || '#FF9500' }]}>
            {t('common.comingSoon', 'Coming soon')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  articlesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  articlesButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
