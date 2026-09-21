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
import { syncMealsToHealth } from '../hooks/useHealthSync';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { formatCalories } from '../utils/nutritionFormat';
import { severityColor } from '../features/bodymap/severity';
import { zoneNameKey } from '../features/bodymap/catalog';
import { buildDiaryDays } from '../utils/diaryDays';

const MACRO_COLORS = { protein: '#3B82F6', carbs: '#F59E0B', fat: '#22C55E' };

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
      // Symptom history is a nice-to-have on this screen: if it fails the diary
      // still has to render, so it resolves to an empty list rather than
      // rejecting the pair.
      const [meals, symptomRes] = await Promise.all([
        ApiService.getMeals(),
        ApiService.getSymptomReports(60).catch(() => null),
      ]);
      const reports = Array.isArray(symptomRes?.reports) ? symptomRes.reports : [];
      setDays(buildDiaryDays(Array.isArray(meals) ? meals : [], reports));
      // Mirror logged meals into Apple Health / Health Connect. Meals are created
      // server-side (analysis, fridge recipe, manual), so there is no single
      // client-side "meal created" moment to hook — the diary load is where we
      // reliably see all of them. De-duplicated by meal id inside HealthService,
      // and a no-op unless the user turned sync on.
      syncMealsToHealth(Array.isArray(meals) ? meals : []).catch(() => {});
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

  // Up to three zones on one line, then "+N" — a day card is a summary, and a
  // wrapped list of eight body parts stops being one.
  const renderSymptoms = (symptoms) => {
    if (!symptoms || symptoms.length === 0) return null;
    const shown = symptoms.slice(0, 3);
    const rest = symptoms.length - shown.length;
    const names = symptoms.map((s) => t(zoneNameKey(s.zoneId), s.zoneId)).join(', ');

    return (
      <View
        style={styles.symptomRow}
        accessible
        accessibilityLabel={t('bodyMap.diaryA11y', 'Symptoms: {{zones}}').replace('{{zones}}', names)}
      >
        <Ionicons name="body-outline" size={15} color={colors.textTertiary} />
        {shown.map((symptom, i) => (
          <View key={`${symptom.zoneId}-${i}`} style={styles.symptomChip}>
            <View style={[styles.dot, { backgroundColor: severityColor(symptom.severity) }]} />
            <Text style={styles.symptomText} numberOfLines={1}>
              {t(zoneNameKey(symptom.zoneId), symptom.zoneId)}
            </Text>
          </View>
        ))}
        {rest > 0 && <Text style={styles.symptomMore}>+{rest}</Text>}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const hasMeals = item.count > 0;

    const body = (
      <>
        <View style={[styles.cardTop, !hasMeals && item.symptoms.length > 0 && styles.cardTopTight]}>
          <Text style={styles.dayLabel}>{labelForDay(item.date, item.key)}</Text>
          {hasMeals && (
            <View style={styles.kcalPill}>
              <Text style={styles.kcalText}>{formatCalories(Math.round(item.calories))}</Text>
            </View>
          )}
        </View>
        {hasMeals && (
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
        )}
        {renderSymptoms(item.symptoms)}
      </>
    );

    // A day with symptoms but no meals has nothing to open — MealHistory would
    // be an empty screen — so it is a plain card rather than a dead link.
    if (!hasMeals) {
      return <View style={styles.card}>{body}</View>;
    }

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('MealHistory', { date: item.date.toISOString() })}
      >
        {body}
      </TouchableOpacity>
    );
  };

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
    // No macros row underneath means the 12px gap would hang in the air.
    cardTopTight: { marginBottom: 0 },
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
    symptomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderMuted || colors.border,
    },
    symptomChip: { flexDirection: 'row', alignItems: 'center', maxWidth: '45%' },
    symptomText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    symptomMore: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
    countText: { fontSize: 13, color: colors.textTertiary },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
