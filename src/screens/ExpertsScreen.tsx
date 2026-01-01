import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
// @ts-ignore
import MarketplaceService from '../services/marketplaceService';

export default function ExpertsScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    try {
      const result = await MarketplaceService.getUnreadCount();
      setUnreadCount(result.count || 0);
    } catch {
      // Silently ignore - not critical
    }
  };

  useEffect(() => {
    loadUnreadCount();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>{t('experts.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('experts.subtitle')}</Text>

        {/* My Consultations Card */}
        <TouchableOpacity
          style={[styles.myConsultationsCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
          onPress={() => navigation.navigate('ConsultationsList')}
        >
          <View style={styles.myConsultationsContent}>
            <Ionicons name="chatbubbles" size={24} color={colors.primary} />
            <View style={styles.myConsultationsText}>
              <Text style={[styles.myConsultationsTitle, { color: colors.primary }]}>{t('experts.myConsultations')}</Text>
              <Text style={[styles.myConsultationsSubtitle, { color: colors.textSecondary }]}>{t('experts.viewChats')}</Text>
            </View>
          </View>
          <View style={styles.myConsultationsRight}>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text }]}>{t('experts.findSpecialist')}</Text>

        {/* Dietitian Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.surface || colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('SpecialistList', { type: 'dietitian' })}
        >
          <View style={[styles.cardIconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="medical" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>{t('experts.dietitian.title')}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t('experts.dietitian.subtitle')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Nutritionist Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.surface || colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('SpecialistList', { type: 'nutritionist' })}
        >
          <View style={[styles.cardIconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="nutrition" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>{t('experts.nutritionist.title')}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t('experts.nutritionist.subtitle')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* View All Button */}
        <TouchableOpacity
          style={[styles.allButton, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('SpecialistList')}
        >
          <Text style={[styles.allButtonText, { color: colors.primary }]}>{t('experts.viewAll')}</Text>
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
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  myConsultationsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  myConsultationsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  myConsultationsText: {
    marginLeft: 12,
  },
  myConsultationsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  myConsultationsSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  myConsultationsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  allButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  allButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
