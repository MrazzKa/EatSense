import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import MarketplaceService from '../services/marketplaceService';

export default function SpecialistListScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(route.params?.type || null);

  useEffect(() => { loadSpecialists(); }, [filter]);

  const loadSpecialists = async () => {
    try {
      setLoading(true);
      const data = await MarketplaceService.getSpecialists(filter ? { type: filter } : {});
      setSpecialists(data);
    } catch (error) {
      console.error('Failed to load specialists:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={14} color={i <= rating ? '#FFD700' : colors.textSecondary} />);
    }
    return stars;
  };

  const renderSpecialist = ({ item }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('SpecialistProfile', { id: item.id })}>
      <View style={styles.cardHeader}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{item.displayName}</Text>
            {item.isVerified && <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />}
          </View>
          <Text style={[styles.type, { color: colors.textSecondary }]}>{item.type === 'dietitian' ? t('experts.dietitian.title') : t('experts.nutritionist.title')}</Text>
          <View style={styles.ratingRow}>{renderStars(Math.round(item.rating))}<Text style={[styles.reviewCount, { color: colors.textSecondary }]}>({item.reviewCount})</Text></View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={[styles.price, { color: colors.primary }]}>{item.currency} {item.pricePerWeek}</Text>
          <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>/ 7 days</Text>
        </View>
      </View>
      {item.bio && <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>{item.bio}</Text>}
      <View style={styles.languages}>
        {item.languages?.map((lang) => (
          <View key={lang} style={[styles.langBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.langText, { color: colors.primary }]}>{lang.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('experts.title') || 'Specialists'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.filters}>
        {[{ id: null, label: 'All' }, { id: 'dietitian', label: 'Dietitian' }, { id: 'nutritionist', label: 'Nutritionist' }].map((f) => (
          <TouchableOpacity key={f.id || 'all'} style={[styles.filterBtn, { borderColor: colors.primary, backgroundColor: filter === f.id ? colors.primary : 'transparent' }]} onPress={() => setFilter(f.id)}>
            <Text style={[styles.filterText, { color: filter === f.id ? '#fff' : colors.primary }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={specialists}
        renderItem={renderSpecialist}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="people-outline" size={48} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No specialists available</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 14, fontWeight: '500' },
  list: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '600' },
  type: { fontSize: 13, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  reviewCount: { fontSize: 12, marginLeft: 4 },
  priceContainer: { alignItems: 'flex-end' },
  price: { fontSize: 18, fontWeight: '700' },
  pricePeriod: { fontSize: 11 },
  bio: { fontSize: 14, marginTop: 12, lineHeight: 20 },
  languages: { flexDirection: 'row', marginTop: 12, gap: 6 },
  langBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  langText: { fontSize: 11, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
});
