import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { formatMacro, formatCalories } from '../utils/nutritionFormat';

function getItemImageUrl(item) {
  if (!item) return null;
  const raw =
    item.imageUrl || item.imageURI || item.imageUri || item.photoUrl ||
    item.thumbnailUrl || item.mediaUrl || (item.media && item.media.url) || null;
  return ApiService.resolveMediaUrl(raw);
}

function normalizeMeals(meals) {
  if (!Array.isArray(meals)) return [];
  return meals.map((meal) => {
    if (!meal) return null;
    const items = Array.isArray(meal.items) ? meal.items : [];
    const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const getVal = (key) => {
      const k = `total${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      if (meal[k] !== undefined) return meal[k];
      return items.reduce((s, it) => s + toNumber(it[key]), 0);
    };
    const totalCalories = Math.round(getVal('calories'));
    const totalProtein = Math.round(getVal('protein'));
    const totalCarbs = Math.round(getVal('carbs'));
    const totalFat = Math.round(getVal('fat'));
    return {
      id: meal.id,
      analysisId: meal.analysisId || meal.id,
      name: meal.name || 'Meal',
      dishName: meal.name || 'Meal',
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      imageUrl: ApiService.resolveMediaUrl(
        meal.imageUrl || meal.imageUri || meal.coverUrl || meal.analysisImageUrl || meal.mediaUrl || null
      ),
      ingredients: meal.ingredients || items.map((it) => ({
        id: it.id || String(Math.random()),
        name: it.name || 'Ingredient',
        calories: toNumber(it.calories),
        protein: toNumber(it.protein),
        carbs: toNumber(it.carbs),
        fat: toNumber(it.fat),
        weight: toNumber(it.weight),
        hasNutrition: true,
      })),
      healthScore: meal.healthScore || meal.healthInsights || null,
      analysisResult: {
        dishName: meal.name || 'Meal',
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      },
    };
  }).filter(Boolean);
}

export default function MealHistoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dateParam = route.params?.date;
  // Memoize date to avoid recreation on every render
  const date = React.useMemo(() => dateParam ? new Date(dateParam) : new Date(), [dateParam]);
  const locale = language || 'en';

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await ApiService.getDashboardData(date, locale);
      const list = normalizeMeals(data?.meals ?? []);
      setMeals(list);
    } catch (e) {
      console.warn('[MealHistory] Load error:', e);
      setMeals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => load(true);

  const renderItem = ({ item }) => {
    const img = getItemImageUrl(item);
    return (
      <TouchableOpacity
        style={[styles.row, { borderColor: colors.border || colors.borderMuted }]}
        onPress={() => navigation.navigate('AnalysisResults', { analysisResult: item })}
        activeOpacity={0.7}
      >
        {img ? (
          <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: colors.surfaceMuted || colors.background }]}>
            <Ionicons name="restaurant" size={24} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.content}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
            {item.name || item.dishName || t('dashboard.mealFallback')}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: colors.textSecondary }]}>
            {formatCalories(item.totalCalories ?? item.calories ?? 0)} · {t('analysis.proteinShort') || 'P'} {formatMacro(item.totalProtein ?? item.protein ?? 0)} · {t('analysis.carbsShort') || 'C'} {formatMacro(item.totalCarbs ?? item.carbs ?? 0)} · {t('analysis.fatShort') || 'F'} {formatMacro(item.totalFat ?? item.fat ?? 0)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border || colors.borderMuted }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        {t('mealHistory.title')}
      </Text>
      <View style={styles.backBtn} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="restaurant-outline" size={56} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('mealHistory.emptyTitle')}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('mealHistory.emptySubtitle')}</Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      <FlatList
        data={meals}
        renderItem={renderItem}
        keyExtractor={(it) => it.id || String(it.analysisId)}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={meals.length === 0 ? styles.listEmpty : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  listEmpty: {
    flex: 1,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
