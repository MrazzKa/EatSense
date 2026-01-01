import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';

export default function SpecialistProfileScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [specialist, setSpecialist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSpecialist(); }, []);

  const loadSpecialist = async () => {
    try {
      const data = await MarketplaceService.getSpecialist(route.params.id);
      setSpecialist(data);
    } catch (error) {
      console.error('Failed to load specialist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = () => {
    Alert.alert(
      t('experts.startConsultation') || 'Start Consultation',
      `${specialist.currency} ${specialist.pricePerWeek} for 7 days`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('common.confirm') || 'Confirm', onPress: async () => {
          try {
            const consultation = await MarketplaceService.startConsultation(specialist.id);
            navigation.navigate('Chat', { consultationId: consultation.id });
          } catch (error) {
            Alert.alert('Error', 'Failed to start consultation');
          }
        }},
      ]
    );
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={16} color={i <= rating ? '#FFD700' : colors.textSecondary} />);
    }
    return stars;
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  }

  if (!specialist) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary }}>Specialist not found</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('experts.profile') || 'Profile'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          {specialist.avatarUrl ? (
            <Image source={{ uri: specialist.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}><Ionicons name="person" size={40} color={colors.primary} /></View>
          )}
          <Text style={[styles.name, { color: colors.textPrimary }]}>{specialist.displayName}</Text>
          <View style={styles.typeRow}>
            <Text style={[styles.type, { color: colors.textSecondary }]}>{specialist.type === 'dietitian' ? 'Dietitian' : 'Nutritionist'}</Text>
            {specialist.isVerified && <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={14} color="#4CAF50" /><Text style={styles.verifiedText}>Verified</Text></View>}
          </View>
          <View style={styles.ratingRow}>{renderStars(Math.round(specialist.rating))}<Text style={[styles.reviewCount, { color: colors.textSecondary }]}>({specialist.reviewCount} reviews)</Text></View>
          <View style={styles.priceBox}>
            <Text style={[styles.price, { color: colors.primary }]}>{specialist.currency} {specialist.pricePerWeek}</Text>
            <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>/ 7 days</Text>
          </View>
        </View>

        {specialist.bio && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('experts.about') || 'About'}</Text>
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>{specialist.bio}</Text>
          </View>
        )}

        {specialist.credentials && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('experts.credentials') || 'Credentials'}</Text>
            <Text style={[styles.credentialsText, { color: colors.textSecondary }]}>{specialist.credentials}</Text>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('experts.languages') || 'Languages'}</Text>
          <View style={styles.languagesRow}>
            {specialist.languages?.map((lang) => (
              <View key={lang} style={[styles.langBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.langText, { color: colors.primary }]}>{lang.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        {specialist.reviews?.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('experts.recentReviews') || 'Recent Reviews'}</Text>
            {specialist.reviews.map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewerName, { color: colors.textPrimary }]}>{review.client?.userProfile?.firstName || 'User'}</Text>
                  <View style={styles.reviewStars}>{renderStars(review.rating)}</View>
                </View>
                {review.comment && <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.primary }]} onPress={handleStartConsultation}>
          <Text style={styles.startButtonText}>{t('experts.startConsultation') || 'Start Consultation'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { padding: 16 },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: '700', marginTop: 12 },
  typeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  type: { fontSize: 15 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 13, color: '#4CAF50' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  reviewCount: { fontSize: 14, marginLeft: 4 },
  priceBox: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  price: { fontSize: 24, fontWeight: '700' },
  pricePeriod: { fontSize: 14, marginLeft: 4 },
  section: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  bioText: { fontSize: 15, lineHeight: 22 },
  credentialsText: { fontSize: 15, lineHeight: 22 },
  languagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  langText: { fontSize: 13, fontWeight: '600' },
  reviewItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { fontSize: 14, fontWeight: '500' },
  reviewStars: { flexDirection: 'row' },
  reviewComment: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1 },
  startButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
