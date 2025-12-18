import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { formatMacro, formatCalories } from '../utils/nutritionFormat';
import { CircularProgress } from '../components/CircularProgress';

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

  const totalCalories = items.length
    ? Math.round(sumMacro('calories'))
    : Math.round(meal.totalCalories ?? 0);
  const totalProtein = items.length
    ? Math.round(sumMacro('protein'))
    : Math.round(meal.totalProtein ?? 0);
  const totalCarbs = items.length
    ? Math.round(sumMacro('carbs'))
    : Math.round(meal.totalCarbs ?? 0);
  const totalFat = items.length
    ? Math.round(sumMacro('fat'))
    : Math.round(meal.totalFat ?? 0);

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

  const imageUri = meal.imageUrl || meal.imageUri || meal.coverUrl || meal.analysisImageUrl || null;

  return {
    id: meal.id,
    dishName: meal.name || 'Meal',
    date: meal.consumedAt ? new Date(meal.consumedAt) : new Date(meal.createdAt),
    calories: totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    imageUri,
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
      imageUri,
    },
  };
};

export default function RecentlyScreen() {
  const navigation = useNavigation();
  const { colors, tokens } = useTheme();
  const { t, language } = useI18n();

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);
  const [recentItems, setRecentItems] = useState([]);
  const [activeAnalyses, setActiveAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollingIntervalRef = useRef(null);

  const loadRecentItems = useCallback(async () => {
    try {
      setLoading(true);
      const [meals, activeAnalysesData] = await Promise.all([
        ApiService.getMeals(),
        ApiService.getActiveAnalyses().catch(() => []), // Fallback to empty array if fails
      ]);
      const normalized = Array.isArray(meals)
        ? meals.map(normalizeMeal).filter(Boolean)
        : [];
      // Always use real data - no fallback/demo meals
      setRecentItems(normalized);
      setActiveAnalyses(Array.isArray(activeAnalysesData) ? activeAnalysesData : []);
    } catch (error) {
      console.error('Error loading recent items:', error);
      // On error, show empty state - no demo data
      setRecentItems([]);
      setActiveAnalyses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAnalysisStatus = useCallback(async (analysisId) => {
    try {
      const status = await ApiService.getAnalysisStatus(analysisId);
      if (status.status === 'completed' || status.status === 'failed') {
        // Analysis completed, reload meals
        loadRecentItems();
        return false; // Stop polling
      }
      return true; // Continue polling
    } catch (error) {
      console.error(`Error checking analysis status for ${analysisId}:`, error);
      return false; // Stop polling on error
    }
  }, [loadRecentItems]);

  useEffect(() => {
    // Poll active analyses every 2 seconds
    if (activeAnalyses.length > 0) {
      pollingIntervalRef.current = setInterval(async () => {
        const shouldContinue = await Promise.all(
          activeAnalyses.map((analysis) => checkAnalysisStatus(analysis.analysisId))
        );
        // If all analyses are completed, stop polling
        if (!shouldContinue.some(Boolean)) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }, 2000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [activeAnalyses, checkAnalysisStatus]);

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

  const ActiveAnalysisCard = React.memo(function ActiveAnalysisCard({ item }) {
    const progressAnim = useRef(new Animated.Value(0)).current;
    const isProcessing = item.status === 'PROCESSING' || item.status === 'processing';
    // Removed unused isPending variable
    // Use actual progress from backend if available, otherwise simulate based on status
    // Backend returns status as lowercase ('pending' or 'processing')
    const progress = item.progress !== undefined ? item.progress / 100 : (isProcessing ? 0.5 : 0.2);

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }, [progressAnim]);

    const opacity = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    const dateLabel = formatDateLabel(item.createdAt, t, language);

    return (
      <View style={[styles.recentItem, { backgroundColor: colors.card, borderColor: colors.borderMuted }]}>
        {item.imageUri ? (
          <Image 
            source={{ uri: item.imageUri }} 
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.itemPlaceholder}>
            <CircularProgress
              progress={progress}
              size={48}
              strokeWidth={4}
              color={colors.primary}
              backgroundColor={colors.borderMuted}
              value={Math.round(progress * 100)}
              label="%"
              labelStyle={{ fontSize: 10, color: colors.textPrimary }}
              valueStyle={{ fontSize: 12, color: colors.primary }}
            />
          </View>
        )}

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Animated.View style={{ opacity }}>
              <Text style={[styles.itemName, { color: colors.textPrimary || colors.text }]} numberOfLines={1}>
                {isProcessing ? t('recently.analyzing') || 'Анализируем...' : t('recently.pending') || 'Ожидание...'}
              </Text>
            </Animated.View>
            <Text style={[styles.itemDate, { color: colors.textSecondary }]}>{dateLabel}</Text>
          </View>

          <Text style={[styles.itemDescription, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.description || (isProcessing ? t('recently.analyzingSubtitle') : t('recently.pending'))}
          </Text>

          <View style={styles.itemStatus}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.itemStatusText, { color: colors.primary }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
      </View>
    );
  });

  const renderActiveAnalysis = ({ item }) => <ActiveAnalysisCard item={item} />;

  const renderRecentItem = ({ item }) => {
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
      ) : (recentItems.length > 0 || activeAnalyses.length > 0) ? (
        <FlatList
          data={[
            ...activeAnalyses.map((analysis) => ({ ...analysis, isActiveAnalysis: true })),
            ...recentItems,
          ]}
          renderItem={({ item }) => 
            item.isActiveAnalysis ? renderActiveAnalysis({ item }) : renderRecentItem({ item })
          }
          keyExtractor={(item, index) => 
            item.isActiveAnalysis 
              ? `analysis-${item.analysisId}` 
              : item.id || `item-${index}`
          }
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
    itemDescription: {
      fontSize: tokens.typography.caption.fontSize,
      color: colors.textSecondary,
      marginTop: tokens.spacing.xs,
    },
    itemStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
      marginTop: tokens.spacing.sm,
    },
    itemStatusText: {
      fontSize: tokens.typography.caption.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
      color: colors.primary,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: tokens.spacing.sm,
      gap: tokens.spacing.sm,
    },
    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
    progressText: {
      fontSize: tokens.typography.caption.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
      minWidth: 40,
      textAlign: 'right',
    },
    analysisStatusText: {
      fontSize: tokens.typography.caption.fontSize,
      marginTop: tokens.spacing.xs,
    },
  });
