import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { formatCalories } from '../utils/nutritionFormat';

type Tab = 'history' | 'favorites';

interface Recipe {
  id: string;
  title: string;
  usesIngredients: string[];
  alsoNeed: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timeMinutes?: number | null;
  steps: string[];
  isFavorite: boolean;
  cookedCount: number;
}

interface Scan {
  id: string;
  ingredients: { name: string; quantityHint?: string }[];
  detectedCount: number;
  createdAt: string;
  recipes: Recipe[];
}

/**
 * Past fridge scans and saved recipes.
 *
 * Until this screen existed the whole fridge flow was throw-away: you scanned,
 * read the recipes, closed the screen, and everything was gone.
 */
/**
 * Module level on purpose: declaring it inside the screen made React remount the
 * whole row (and its heart icon) on every render.
 */
function RecipeRow({
  recipe,
  busyRecipeId,
  onCook,
  onToggleFavorite,
  colors,
  styles,
  t,
}: {
  recipe: Recipe;
  busyRecipeId: string | null;
  onCook: (r: Recipe) => void;
  onToggleFavorite: (r: Recipe) => void;
  colors: any;
  styles: any;
  t: (k: string) => string;
}) {
  return (
    <View style={styles.recipeRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.recipeTitle}>{recipe.title}</Text>
        <Text style={styles.recipeMeta}>
          {formatCalories(recipe.calories)}
          {recipe.timeMinutes ? ` \u00b7 ${recipe.timeMinutes} ${t('fridge.minutes') || 'min'}` : ''}
          {recipe.cookedCount > 0
            ? ` \u00b7 ${(t('fridge.cookedTimes') || 'cooked {{count}}\u00d7').replace('{{count}}', String(recipe.cookedCount))}`
            : ''}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onCook(recipe)}
        disabled={busyRecipeId === recipe.id}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ marginRight: 14 }}
        accessibilityLabel={t('fridge.iCookedThis') || 'I cooked this'}
      >
        {busyRecipeId === recipe.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onToggleFavorite(recipe)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={t('fridge.favorite') || 'Save recipe'}
      >
        <Ionicons
          name={recipe.isFavorite ? 'heart' : 'heart-outline'}
          size={22}
          color={recipe.isFavorite ? '#FF6B6B' : colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function FridgeHistoryScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>('history');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scans, setScans] = useState<Scan[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [lockedCount, setLockedCount] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busyRecipeId, setBusyRecipeId] = useState<string | null>(null);

  // Same pattern the rest of the app uses (DiaryJournalScreen, DashboardScreen):
  // pass the i18n language straight to Intl, never an array.
  const formatDate = useCallback(
    (iso: string) => {
      try {
        return new Date(iso).toLocaleDateString(language || 'en', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
        });
      } catch {
        return new Date(iso).toDateString();
      }
    },
    [language],
  );

  const load = useCallback(async () => {
    try {
      const [history, favs] = await Promise.all([
        ApiService.getFridgeHistory().catch(() => null),
        ApiService.getFridgeFavorites().catch(() => null),
      ]);
      setScans(Array.isArray(history?.scans) ? history.scans : []);
      setLockedCount(Number(history?.lockedCount) || 0);
      setFavorites(Array.isArray(favs?.recipes) ? favs.recipes : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const deleteScan = useCallback((scan: Scan) => {
    Alert.alert(
      t('fridge.deleteTitle') || 'Delete this scan?',
      t('fridge.deleteBody') || 'The scan and its recipes will be removed.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            setScans((prev) => prev.filter((s) => s.id !== scan.id));
            try {
              await ApiService.deleteFridgeScan(scan.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } catch {
              load();
            }
          },
        },
      ],
    );
  }, [t, load]);

  const toggleFavorite = useCallback(async (recipe: Recipe) => {
    Haptics.selectionAsync().catch(() => {});
    const nextValue = !recipe.isFavorite;
    const apply = (r: Recipe) => (r.id === recipe.id ? { ...r, isFavorite: nextValue } : r);
    setScans((prev) => prev.map((s) => ({ ...s, recipes: s.recipes.map(apply) })));
    setFavorites((prev) => (nextValue ? prev : prev.filter((r) => r.id !== recipe.id)));
    try {
      const res = await ApiService.toggleFridgeFavorite(recipe.id);
      if (res?.limitReached) {
        Alert.alert(
          t('fridge.favLimitTitle') || 'Favourites are full',
          t('fridge.favLimitBody') || 'Upgrade to Pro to save unlimited recipes.',
        );
      }
      load();
    } catch {
      load();
    }
  }, [t, load]);

  const cookRecipe = useCallback(async (recipe: Recipe) => {
    if (busyRecipeId) return;
    setBusyRecipeId(recipe.id);
    try {
      await ApiService.cookFridgeRecipe(recipe.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        t('fridge.cookedTitle') || 'Added to your diary',
        (t('fridge.cookedBody') || '{{title}} was logged as a meal.').replace('{{title}}', recipe.title),
      );
    } catch {
      Alert.alert(t('fridge.errorTitle') || 'Something went wrong', t('fridge.errorBody') || 'Please try again.');
    } finally {
      setBusyRecipeId(null);
    }
  }, [busyRecipeId, t]);


  const renderHistory = () => {
    if (scans.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Ionicons name="time-outline" size={44} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            {t('fridge.emptyHistory') || 'No scans yet. Photograph your fridge and your results will be saved here.'}
          </Text>
          <TouchableOpacity style={styles.emptyCta} onPress={() => navigation.navigate('FridgeScan')} activeOpacity={0.85}>
            <Text style={styles.emptyCtaText}>{t('fridge.takePhoto') || 'Take photo'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {scans.map((scan) => {
          const isOpen = !!expanded[scan.id];
          const names = (scan.ingredients || []).map((i) => i?.name).filter(Boolean);
          return (
            <View key={scan.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpanded((p) => ({ ...p, [scan.id]: !p[scan.id] }))}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardDate}>{formatDate(scan.createdAt)}</Text>
                  <Text style={styles.cardSummary}>
                    {(t('fridge.itemsCount') || '{{count}} items').replace('{{count}}', String(names.length))}
                    {scan.recipes?.length
                      ? ` · ${(t('fridge.recipesCount') || '{{count}} recipes').replace('{{count}}', String(scan.recipes.length))}`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteScan(scan)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginRight: 12 }}
                  accessibilityLabel={t('common.delete') || 'Delete'}
                >
                  <Ionicons name="trash-outline" size={19} color={colors.textTertiary} />
                </TouchableOpacity>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {isOpen ? (
                <View style={styles.cardBody}>
                  <Text style={styles.blockLabel}>{t('fridge.detectedTitle') || 'We found these'}</Text>
                  <View style={styles.chips}>
                    {names.map((n, i) => (
                      <View key={`${n}-${i}`} style={styles.chip}>
                        <Text style={styles.chipText}>{n}</Text>
                      </View>
                    ))}
                  </View>

                  {scan.recipes?.length ? (
                    <>
                      <Text style={[styles.blockLabel, { marginTop: 16 }]}>
                        {t('fridge.recipesTitle') || 'Recipes for you'}
                      </Text>
                      {scan.recipes.map((r) => (
                        <RecipeRow
                          key={r.id}
                          recipe={r}
                          busyRecipeId={busyRecipeId}
                          onCook={cookRecipe}
                          onToggleFavorite={toggleFavorite}
                          colors={colors}
                          styles={styles}
                          t={t}
                        />
                      ))}
                    </>
                  ) : null}

                  <TouchableOpacity
                    style={styles.reuseBtn}
                    onPress={() => navigation.navigate('FridgeScan')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={17} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.reuseBtnText}>{t('fridge.newScan') || 'New scan'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}

        {lockedCount > 0 ? (
          <TouchableOpacity
            style={styles.lockedCard}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.85}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={styles.lockedText}>
              {(t('fridge.lockedScans') || '{{count}} older scans — upgrade to Pro to see them').replace(
                '{{count}}',
                String(lockedCount),
              )}
            </Text>
          </TouchableOpacity>
        ) : null}
      </>
    );
  };

  const renderFavorites = () => {
    if (favorites.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Ionicons name="heart-outline" size={44} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            {t('fridge.emptyFavorites') || 'No saved recipes yet. Tap the heart on a recipe to keep it here.'}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.card}>
        <View style={styles.cardBody}>
          {favorites.map((r) => (
            <RecipeRow
                          key={r.id}
                          recipe={r}
                          busyRecipeId={busyRecipeId}
                          onCook={cookRecipe}
                          onToggleFavorite={toggleFavorite}
                          colors={colors}
                          styles={styles}
                          t={t}
                        />
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('fridge.history') || 'History'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {(['history', 'favorites'] as Tab[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {key === 'history'
                ? t('fridge.tabHistory') || 'Scans'
                : t('fridge.tabFavorites') || 'Saved'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {tab === 'history' ? renderHistory() : renderFavorites()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
    tab: {
      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
    },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: '#FFF' },
    body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    card: {
      backgroundColor: colors.card, borderRadius: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.borderMuted, overflow: 'hidden',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    cardDate: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    cardSummary: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
    cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
    blockLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      backgroundColor: colors.surfaceSecondary, borderRadius: 999,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    chipText: { fontSize: 13, color: colors.textPrimary },
    recipeRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
      borderTopWidth: 1, borderTopColor: colors.borderMuted,
    },
    recipeTitle: { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
    recipeMeta: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    reuseBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginTop: 14, paddingVertical: 11, borderRadius: 12,
      borderWidth: 1, borderColor: colors.primary,
    },
    reuseBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    lockedCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surfaceSecondary, borderRadius: 14, padding: 16,
    },
    lockedText: { flex: 1, fontSize: 13.5, color: colors.textPrimary, lineHeight: 19 },
    emptyBox: { alignItems: 'center', paddingVertical: 60 },
    emptyText: {
      marginTop: 14, fontSize: 14, color: colors.textSecondary,
      textAlign: 'center', paddingHorizontal: 24, lineHeight: 20,
    },
    emptyCta: {
      marginTop: 20, backgroundColor: colors.primary,
      borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28,
    },
    emptyCtaText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
  });
