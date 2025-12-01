import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

export default function ExpertsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();

  const handleDietitianPress = () => {
    // Coming soon - will navigate to dietitian chat/booking flow
    // For now, just show an alert or keep as placeholder
  };

  const handleNutritionistPress = () => {
    // Coming soon - will navigate to nutritionist chat/booking flow
    // For now, just show an alert or keep as placeholder
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background || colors.surface }]} edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
          {t('experts.title') || 'Get help from experts'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('experts.subtitle') || 'Talk with a dietitian or nutritionist to personalize your plan.'}
        </Text>

        {/* Dietitian card */}
        <TouchableOpacity
          style={[styles.card, {
            backgroundColor: colors.surface || colors.card,
            borderColor: colors.border || colors.borderMuted,
          }]}
          activeOpacity={0.85}
          onPress={handleDietitianPress}
        >
          <View style={[styles.cardIconContainer, { backgroundColor: colors.primaryTint || colors.primary + '20' }]}>
            <Ionicons name="medical" size={24} color={colors.primary || '#007AFF'} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>
            {t('experts.dietitian.title') || 'Dietitian'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {t('experts.dietitian.subtitle') || 'Clinical guidance based on your medical history and goals.'}
          </Text>
        </TouchableOpacity>

        {/* Nutritionist card */}
        <TouchableOpacity
          style={[styles.card, {
            backgroundColor: colors.surface || colors.card,
            borderColor: colors.border || colors.borderMuted,
          }]}
          activeOpacity={0.85}
          onPress={handleNutritionistPress}
        >
          <View style={[styles.cardIconContainer, { backgroundColor: colors.primaryTint || colors.primary + '20' }]}>
            <Ionicons name="nutrition" size={24} color={colors.primary || '#007AFF'} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>
            {t('experts.nutritionist.title') || 'Nutritionist'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {t('experts.nutritionist.subtitle') || 'Practical advice on meals, habits, and daily routines.'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
});

