import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import DietProgramsService from '../services/dietProgramsService';

const CATEGORIES = [
  { id: null, label: 'All' },
  { id: 'hollywood', label: 'Hollywood' },
  { id: 'athletes', label: 'Athletes' },
  { id: 'historical', label: 'Historical' },
];

export default function DietProgramsListScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null);

  useEffect(() => { loadPrograms(); }, [category]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const data = await DietProgramsService.getPrograms(category);
      setPrograms(data);
    } catch (error) {
      console.error('Failed to load programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return colors.textSecondary;
    }
  };

  const renderProgram = ({ item }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('DietProgramDetail', { id: item.id })}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="restaurant" size={32} color={colors.primary} />
        </View>
      )}
      <View style={styles.cardContent}>
        {item.isFeatured && <View style={[styles.featuredBadge, { backgroundColor: colors.primary }]}><Text style={styles.featuredText}>Featured</Text></View>}
        <Text style={[styles.programName, { color: colors.textPrimary }]}>{item.name}</Text>
        {item.subtitle && <Text style={[styles.programSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.duration} days</Text>
          </View>
          {item.dailyCalories && (
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.dailyCalories} kcal</Text>
            </View>
          )}
          {item.difficulty && (
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) + '20' }]}>
              <Text style={[styles.difficultyText, { color: getDifficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
            </View>
          )}
        </View>
        {item.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('dietPrograms.title') || 'Diet Programs'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.filters}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.id || 'all'} style={[styles.filterBtn, { borderColor: colors.primary, backgroundColor: category === cat.id ? colors.primary : 'transparent' }]} onPress={() => setCategory(cat.id)}>
            <Text style={[styles.filterText, { color: category === cat.id ? '#fff' : colors.primary }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={programs}
        renderItem={renderProgram}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No programs available</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' },
  list: { padding: 16 },
  card: { borderRadius: 12, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
  cardImage: { width: '100%', height: 140 },
  cardImagePlaceholder: { width: '100%', height: 140, alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: 16 },
  featuredBadge: { position: 'absolute', top: -140 + 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  featuredText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  programName: { fontSize: 18, fontWeight: '700' },
  programSubtitle: { fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  difficultyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  difficultyText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  tagsRow: { flexDirection: 'row', marginTop: 12, gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  tagText: { fontSize: 12, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
});
