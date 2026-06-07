// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { formatCalories } from '../utils/nutritionFormat';

const MACRO_COLORS = { protein: '#3B82F6', carbs: '#F59E0B', fat: '#22C55E' };

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Day key (local YYYY-MM-DD) from a meal's consumedAt/createdAt.
function dayKeyOf(meal) {
  const raw = meal?.consumedAt || meal?.createdAt || null;
  const d = raw ? new Date(raw) : null;
  if (!d || isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Group meals into per-day buckets with totals, newest day first.
function groupByDay(meals) {
  const map = new Map();
  for (const meal of meals || []) {
    const key = dayKeyOf(meal);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { key, date: new Date(meal.consumedAt || meal.createdAt), count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
    const b = map.get(key);
    b.count += 1;
    b.calories += toNum(meal.totalCalories ?? meal.calories);
    b.protein += toNum(meal.totalProtein ?? meal.protein);
    b.carbs += toNum(meal.totalCarbs ?? meal.carbs);
    b.fat += toNum(meal.totalFat ?? meal.fat);
  }
  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
}

export default function DiaryJournalScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const meals = await ApiService.getMeals();
      setDays(groupByDay(Array.isArray(meals) ? meals : []));
    } catch (e) {
      console.warn('[DiaryJournal] load error:', e);
      setDays([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const labelForDay = useCallback((date, key) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const y = new Date(now); y.setDate(now.getDate() - 1);
    const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    if (key === today) return t('mealHistory.today');
    if (key === yKey) return t('mealHistory.yesterday');
    return date.toLocaleDateString(language || 'en', { weekday: 'short', day: 'numeric', month: 'long' });
  }, [t, language]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('MealHistory', { date: item.date.toISOString() })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.dayLabel}>{labelForDay(item.date, item.key)}</Text>
        <View style={styles.kcalPill}>
          <Text style={styles.kcalText}>{formatCalories(Math.round(item.calories))}</Text>
        </View>
      </View>
      <View style={styles.macrosRow}>
        <View style={styles.macroChip}>
          <View style={[styles.dot, { backgroundColor: MACRO_COLORS.protein }]} />
          <Text style={styles.macroText}>{Math.round(item.protein)}{t('dashboard.gramShort')}</Text>
        </View>
        <View style={styles.macroChip}>
          <View style={[styles.dot, { backgroundColor: MACRO_COLORS.carbs }]} />
          <Text style={styles.macroText}>{Math.round(item.carbs)}{t('dashboard.gramShort')}</Text>
        </View>
        <View style={styles.macroChip}>
          <View style={[styles.dot, { backgroundColor: MACRO_COLORS.fat }]} />
          <Text style={styles.macroText}>{Math.round(item.fat)}{t('dashboard.gramShort')}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.countText}>{t('mealHistory.mealsCount', { count: item.count })}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border || colors.borderMuted }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary || colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>{t('mealHistory.journalTitle')}</Text>
      <View style={styles.backBtn} />
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {renderHeader()}
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      <FlatList
        data={days}
        renderItem={renderItem}
        keyExtractor={(it) => it.key}
        contentContainerStyle={days.length === 0 ? styles.listEmpty : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={56} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary || colors.text }]}>{t('mealHistory.emptyJournalTitle')}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('mealHistory.emptyJournalSubtitle')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    list: { padding: 16, paddingBottom: 32 },
    listEmpty: { flexGrow: 1 },
    card: {
      backgroundColor: colors.surface || colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border || colors.borderMuted,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    dayLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary || colors.text, textTransform: 'capitalize' },
    kcalPill: {
      backgroundColor: (colors.primary || '#4F46E5') + '18',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
    },
    kcalText: { fontSize: 14, fontWeight: '700', color: colors.primary || '#4F46E5' },
    macrosRow: { flexDirection: 'row', alignItems: 'center' },
    macroChip: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
    macroText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    countText: { fontSize: 13, color: colors.textTertiary },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
