import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { formatMacro, formatCalories } from '../utils/nutritionFormat';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const formatDateLabel = (date, t, language) => {
  if (!date) return '';
  
  // Ensure date is a Date object
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const now = new Date();
  const dayDiff = Math.floor((now.getTime() - dateObj.getTime()) / MS_PER_DAY);

  if (dayDiff <= 0) {
    return t('recently.today') || 'Сегодня';
  }
  if (dayDiff === 1) {
    return t('recently.yesterday') || 'Вчера';
  }
  if (dayDiff <= 6) {
    // Use i18next pluralization if available, otherwise fallback
    const key = dayDiff === 1 ? 'recently.daysAgo_one' : 'recently.daysAgo_other';
    return t(key, { count: dayDiff }) || t('recently.daysAgo', { count: dayDiff }) || `${dayDiff} дн. назад`;
  }

  try {
    return dateObj.toLocaleDateString(language || 'en', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
};

const normalizeMeal = (meal) => {
  if (!meal) return null;
  const items = Array.isArray(meal.items) ? meal.items : [];
  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const sumMacro = (key) => items.reduce((sum, item) => sum + toNumber(item[key]), 0);

  const totalCalories = Math.round(sumMacro('calories'));
  const totalProtein = Math.round(sumMacro('protein'));
  const totalCarbs = Math.round(sumMacro('carbs'));
  const totalFat = Math.round(sumMacro('fat'));

  const normalizedIngredients = items.map((item) => ({
    name: item.name || 'Ingredient',
    calories: toNumber(item.calories),
    protein: toNumber(item.protein),
    carbs: toNumber(item.carbs),
    fat: toNumber(item.fat),
    weight: toNumber(item.weight),
  }));

  const healthScore = meal.healthInsights || null;
  const healthGrade = meal.healthGrade || healthScore?.grade || null;

  return {
    id: meal.id,
    dishName: meal.name || 'Meal',
    date: meal.consumedAt ? new Date(meal.consumedAt) : new Date(meal.createdAt),
    calories: totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    imageUri: meal.imageUrl || meal.imageUri || meal.coverUrl || null,
    healthScore,
    healthGrade,
    analysisResult: {
      dishName: meal.name || 'Meal',
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      ingredients: normalizedIngredients,
      healthScore,
      autoSave: meal.id
        ? {
            mealId: meal.id,
            savedAt: meal.createdAt,
          }
        : null,
      imageUri: meal.imageUrl || meal.imageUri || meal.coverUrl || null,
    },
  };
};

export default function RecentlyScreen() {
  const navigation = useNavigation();
  const { colors, tokens } = useTheme();
  const { t, language } = useI18n();

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecentItems = useCallback(async () => {
    try {
      setLoading(true);
      const meals = await ApiService.getMeals();
      const normalized = Array.isArray(meals)
        ? meals.map(normalizeMeal).filter(Boolean)
        : [];
      // Always use real data - no fallback/demo meals
      setRecentItems(normalized);
    } catch (error) {
      console.error('Error loading recent items:', error);
      // On error, show empty state - no demo data
      setRecentItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentItems();
  }, [loadRecentItems]);

  // Reload when screen comes into focus (e.g., after saving a meal)
  useFocusEffect(
    useCallback(() => {
      loadRecentItems();
    }, [loadRecentItems])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecentItems();
    setRefreshing(false);
  };

  const renderRecentItem = ({ item, index }) => {
    const dateLabel = formatDateLabel(item.date, t, language);
    const healthScoreValue = item.healthScore?.score ? Math.round(item.healthScore.score) : null;

    return (
      <View>
        <TouchableOpacity
          style={[styles.recentItem, { backgroundColor: colors.card, borderColor: colors.borderMuted }]}
          onPress={() => {
            if (navigation && typeof navigation.navigate === 'function') {
              navigation.navigate('AnalysisResults', {
                imageUri: item.imageUrl || item.imageUri,
                analysisResult: item.analysisResult,
                readOnly: true,
              });
            }
          }}
        >
          {/* Task 11: Use imageUrl or imageUri, show placeholder if none */}
          {(item.imageUrl || item.imageUri) ? (
            <Image 
              source={{ uri: item.imageUrl || item.imageUri }} 
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.itemPlaceholder}>
              <Ionicons name="fast-food" size={24} color={colors.textTertiary || colors.textSecondary} />
            </View>
          )}

          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <Text style={[styles.itemName, { color: colors.textPrimary || colors.text }]} numberOfLines={1}>
                {item.dishName}
              </Text>
              <Text style={[styles.itemDate, { color: colors.textSecondary }]}>{dateLabel}</Text>
            </View>

            <View style={styles.itemNutrition}>
              <View style={styles.nutritionBlock}>
                <Text style={[styles.nutritionValue, { color: colors.primary }]}>{formatCalories(item.calories)}</Text>
                <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                  {t('recently.nutrition.calories')}
                </Text>
              </View>
              <View style={styles.nutritionBlock}>
                <Text style={[styles.nutritionValue, { color: colors.primary }]}>{formatMacro(item.protein)}</Text>
                <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                  {t('recently.nutrition.protein')}
                </Text>
              </View>
              <View style={styles.nutritionBlock}>
                <Text style={[styles.nutritionValue, { color: colors.primary }]}>{formatMacro(item.carbs)}</Text>
                <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                  {t('recently.nutrition.carbs')}
                </Text>
              </View>
              <View style={styles.nutritionBlock}>
                <Text style={[styles.nutritionValue, { color: colors.primary }]}>{formatMacro(item.fat)}</Text>
                <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                  {t('recently.nutrition.fat')}
                </Text>
              </View>
            </View>

            {healthScoreValue !== null && (
              <View
                style={[
                  styles.healthBadge,
                  { borderColor: colors.borderMuted, backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Ionicons name="heart" size={14} color={colors.primary} />
                <Text style={[styles.healthBadgeText, { color: colors.textPrimary || colors.text }]}>
                  {t('recently.healthScoreLabel', { score: healthScoreValue })}
                </Text>
                {item.healthGrade && (
                  <Text style={[styles.healthBadgeGrade, { color: colors.textSecondary }]}>
                    {item.healthGrade}
                  </Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="restaurant-outline" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('recently.empty.title')}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {t('recently.empty.subtitle')}
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate('Camera');
          }
        }}
      >
        <Text style={styles.emptyButtonText}>{t('recently.empty.cta')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('recently.title')}</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            // Show filter options
          }}
        >
          <Ionicons name="options-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : recentItems.length > 0 ? (
        <FlatList
          data={recentItems}
          renderItem={renderRecentItem}
          keyExtractor={(item, index) => item.id || `item-${index}`}
          contentContainerStyle={[styles.listContainer, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
}

const createStyles = (tokens, colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.lg,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      color: colors.textPrimary || colors.text,
    },
    filterButton: {
      padding: tokens.spacing.xs,
    },
    listContainer: {
      paddingHorizontal: tokens.spacing.xl,
      paddingTop: tokens.spacing.lg,
      paddingBottom: tokens.spacing.xl,
    },
    recentItem: {
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.lg,
      marginBottom: tokens.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    itemImage: {
      width: 60,
      height: 60,
      borderRadius: tokens.radii.md,
      marginRight: tokens.spacing.md,
    },
    itemPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: tokens.radii.md,
      marginRight: tokens.spacing.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemContent: {
      flex: 1,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.xs,
    },
    itemName: {
      flex: 1,
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
      color: colors.textPrimary || colors.text,
    },
    itemDate: {
      fontSize: tokens.typography.caption.fontSize,
      color: colors.textSecondary,
    },
    itemNutrition: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: tokens.spacing.sm,
    },
    nutritionBlock: {
      flex: 1,
      alignItems: 'center',
    },
    nutritionValue: {
      fontSize: tokens.typography.body.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
      color: colors.primary,
    },
    nutritionLabel: {
      fontSize: tokens.typography.caption.fontSize,
      color: colors.textSecondary,
      marginTop: tokens.spacing.xxs || 2,
    },
    healthBadge: {
      alignSelf: 'flex-end',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      marginTop: tokens.spacing.sm,
    },
    healthBadgeText: {
      fontSize: tokens.typography.caption.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
      marginLeft: tokens.spacing.xs,
    },
    healthBadgeGrade: {
      fontSize: tokens.typography.caption.fontSize,
      fontWeight: tokens.typography.caption.fontWeight,
      marginLeft: tokens.spacing.xxs || 2,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.xxxl,
      gap: tokens.spacing.md,
    },
    emptyTitle: {
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      color: colors.text,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: tokens.typography.body.fontSize,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emptyButton: {
      backgroundColor: colors.primary,
      borderRadius: tokens.radii.md,
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
    },
    emptyButtonText: {
      color: colors.onPrimary ?? '#FFFFFF',
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
