import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/apiService';
import AiAssistant from '../components/AiAssistant';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { CircularProgress } from '../components/CircularProgress';
import { clientLog } from '../utils/clientLog';
import { SwipeClosableModal } from '../components/common/SwipeClosableModal';
import { StatisticsModal } from '../components/StatisticsModal';
import { formatMacro, formatMacroInt, formatCalories } from '../utils/nutritionFormat';
import { ManualAnalysisCard } from '../components/ManualAnalysisCard';
import LabResultsModal from '../components/LabResultsModal';
import DescribeFoodModal from '../components/DescribeFoodModal';
import { PendingMealCard } from '../components/PendingMealCard';
import { usePendingAnalyses, useAnalysis } from '../contexts/AnalysisContext';


// Helper function to get image URL from item (handles various field names and resolves relative URLs)
function getItemImageUrl(item) {
  if (!item) return null;
  const rawUrl =
    item.imageUrl ||
    item.imageURI ||
    item.imageUri ||
    item.photoUrl ||
    item.thumbnailUrl ||
    item.mediaUrl ||
    (item.media && item.media.url) ||
    null;

  // Resolve relative URLs to absolute using ApiService
  return ApiService.resolveMediaUrl(rawUrl);
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { colors, tokens } = useTheme();
  const { t, language } = useI18n();
  // Removed unused currentTime and now state variables
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [plusScale] = useState(new Animated.Value(1));
  const [plusOpacity] = useState(new Animated.Value(0));
  const [stats, setStats] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    goal: 2000,
  });
  const [recentItems, setRecentItems] = useState([]);
  const pendingAnalyses = usePendingAnalyses();
  const { retryAnalysis, removePendingAnalysis } = useAnalysis();
  const [userStats, setUserStats] = useState({
    totalPhotosAnalyzed: 0,
    todayPhotosAnalyzed: 0,
    dailyLimit: 3,
  });
  const [suggestedFoodSummary, setSuggestedFoodSummary] = useState(null);
  const [cardAnimations] = useState(() => ({
    calories: new Animated.Value(0),
    stats: new Animated.Value(0),
    recent: new Animated.Value(0),
    suggested: new Animated.Value(0),
  }));

  // Animate plus button on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(plusOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(plusScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [plusOpacity, plusScale]);

  // Animate cards on mount and when stats change
  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(cardAnimations.calories, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnimations.stats, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnimations.recent, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnimations.suggested, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [stats.totalCalories]); // Re-animate when calories change

  // Определяем функции ПЕРЕД их использованием в хуках
  const loadStats = React.useCallback(async () => {
    try {
      // Используем selectedDate для загрузки статистики по выбранной дате
      const statsData = await ApiService.getStats(selectedDate);
      // Map API (/stats/dashboard) shape to UI state
      if (statsData && statsData.today && statsData.goals) {
        setStats({
          totalCalories: statsData.today.calories || 0,
          totalProtein: statsData.today.protein || 0,
          totalCarbs: statsData.today.carbs || 0,
          totalFat: statsData.today.fat || 0,
          goal: (statsData.goals && statsData.goals.calories) || 2000,
        });
      } else {
        setStats({
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          goal: 2000,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Use fallback data when API is not available
      setStats({
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        goal: 2000,
      });
    }
  }, [selectedDate]);

  // Load recent meals for dashboard display
  const loadRecentItems = React.useCallback(async () => {
    try {
      const meals = await ApiService.getMeals();
      if (Array.isArray(meals)) {
        // Normalize meals similar to RecentlyScreen
        const normalized = meals.slice(0, 3).map((meal) => {
          if (!meal) return null;
          const items = Array.isArray(meal.items) ? meal.items : [];
          const toNumber = (value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
          };
          const sumMacro = (key) => items.reduce((sum, item) => sum + toNumber(item[key]), 0);
          return {
            id: meal.id,
            name: meal.name || 'Meal',
            dishName: meal.name || 'Meal',
            totalCalories: items.length ? Math.round(sumMacro('calories')) : Math.round(meal.totalCalories ?? 0),
            totalProtein: items.length ? Math.round(sumMacro('protein')) : Math.round(meal.totalProtein ?? 0),
            totalCarbs: items.length ? Math.round(sumMacro('carbs')) : Math.round(meal.totalCarbs ?? 0),
            totalFat: items.length ? Math.round(sumMacro('fat')) : Math.round(meal.totalFat ?? 0),
            calories: items.length ? Math.round(sumMacro('calories')) : Math.round(meal.totalCalories ?? 0),
            protein: items.length ? Math.round(sumMacro('protein')) : Math.round(meal.totalProtein ?? 0),
            carbs: items.length ? Math.round(sumMacro('carbs')) : Math.round(meal.totalCarbs ?? 0),
            fat: items.length ? Math.round(sumMacro('fat')) : Math.round(meal.totalFat ?? 0),
            imageUrl: ApiService.resolveMediaUrl(
              meal.imageUrl || meal.imageUri || meal.coverUrl || meal.analysisImageUrl || meal.mediaUrl || null
            ),
            // Include ingredients from items or meal.ingredients
            ingredients: meal.ingredients || items.map(item => ({
              id: item.id || String(Math.random()),
              name: item.name || 'Ingredient',
              calories: toNumber(item.calories),
              protein: toNumber(item.protein),
              carbs: toNumber(item.carbs),
              fat: toNumber(item.fat),
              weight: toNumber(item.weight),
              hasNutrition: true,
            })),
            // Include health score data
            healthScore: meal.healthScore || meal.healthInsights || null,
            analysisResult: {
              dishName: meal.name || 'Meal',
              totalCalories: items.length ? Math.round(sumMacro('calories')) : Math.round(meal.totalCalories ?? 0),
              totalProtein: items.length ? Math.round(sumMacro('protein')) : Math.round(meal.totalProtein ?? 0),
              totalCarbs: items.length ? Math.round(sumMacro('carbs')) : Math.round(meal.totalCarbs ?? 0),
              totalFat: items.length ? Math.round(sumMacro('fat')) : Math.round(meal.totalFat ?? 0),
            },
          };
        }).filter(Boolean);
        setRecentItems(normalized);
      } else {
        setRecentItems([]);
      }
    } catch (error) {
      console.error('[DashboardScreen] Error loading recent items:', error);
      setRecentItems([]);
    }
  }, []);

  // Removed unused functions: loadMonthlyStats, loadArticles
  // These functions used removed state setters (setMonthlyLoading, setMonthlyStats, setFeaturedArticles, setFeedArticles, setHighlightMeal)

  const loadUserStats = React.useCallback(async () => {
    try {
      const stats = await ApiService.getUserStats();
      if (stats) {
        setUserStats({
          totalPhotosAnalyzed: stats.totalPhotosAnalyzed || 0,
          todayPhotosAnalyzed: stats.todayPhotosAnalyzed || 0,
          dailyLimit: stats.dailyLimit || 3,
        });
      }
    } catch (error) {
      console.error('[DashboardScreen] Error loading user stats:', error);
    }
  }, []);

  const loadSuggestedFoodSummary = React.useCallback(async () => {
    try {
      const currentLocale = language || 'ru';
      const suggestions = await ApiService.getSuggestedFoods(currentLocale);
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        // Analyze suggestions to create user-friendly summary messages
        const categoryMessages = {
          protein: t('dashboard.suggestedFood.messages.lowProtein') || 'В последнее время вы потребляете мало белка',
          fiber: t('dashboard.suggestedFood.messages.lowFiber') || 'Вам не хватает клетчатки',
          carbs: t('dashboard.suggestedFood.messages.lowCarbs') || 'Вы потребляете мало углеводов',
          healthy_fat: t('dashboard.suggestedFood.messages.lowHealthyFat') || 'Вам не хватает полезных жиров',
          general: t('dashboard.suggestedFood.messages.general') || 'Персональные рекомендации по питанию',
        };

        // Group suggestions by category to find most common issue
        const categoryCounts = {};
        suggestions.forEach(suggestion => {
          const cat = suggestion.category || 'general';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        // Find most common category
        const mostCommonCategory = Object.keys(categoryCounts).reduce((a, b) =>
          categoryCounts[a] > categoryCounts[b] ? a : b, 'general'
        );

        // Create summary message
        const summaryMessage = categoryMessages[mostCommonCategory] ||
          suggestions[0]?.reason ||
          suggestions[0]?.tip ||
          t('dashboard.suggestedFood.messages.general') || 'Персональные рекомендации по питанию';

        setSuggestedFoodSummary({
          reason: summaryMessage,
          category: mostCommonCategory,
          count: suggestions.length,
        });
      } else {
        setSuggestedFoodSummary(null);
      }
    } catch (error) {
      console.error('[DashboardScreen] Error loading suggested food summary:', error);
      setSuggestedFoodSummary(null);
    }
  }, [language, t]);

  // Load data on mount and when date changes
  useEffect(() => {
    loadStats();
    loadUserStats();
    loadSuggestedFoodSummary();
    loadRecentItems();
  }, [selectedDate, loadStats, loadUserStats, loadSuggestedFoodSummary, loadRecentItems]);

  // Теперь используем функции в хуках ПОСЛЕ их определения
  useEffect(() => {
    const timer = setInterval(() => {
      // Removed setCurrentTime call
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Removed unused time update effect

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
      loadUserStats();
      loadSuggestedFoodSummary();
      loadRecentItems();
    }, [loadStats, loadUserStats, loadSuggestedFoodSummary, loadRecentItems])
  );

  useEffect(() => {
    loadStats();
    loadUserStats();
    loadSuggestedFoodSummary();
    loadRecentItems();
  }, [selectedDate, loadStats, loadUserStats, loadSuggestedFoodSummary, loadRecentItems]);

  // Auto-refresh when pending analyses change (e.g., when an analysis completes)
  const prevPendingCountRef = React.useRef(pendingAnalyses.length);
  useEffect(() => {
    const currentCount = pendingAnalyses.length;
    const prevCount = prevPendingCountRef.current;

    // When an analysis gets removed from pending (completed), reload data
    if (prevCount > 0 && currentCount < prevCount) {
      // Analysis completed - wait a moment for DB to settle then reload
      // This fix ensures the new meal is actually retrievable
      const timer = setTimeout(() => {
        loadStats();
        loadRecentItems();
      }, 2000);
      return () => clearTimeout(timer);
    }

    prevPendingCountRef.current = currentCount;
  }, [pendingAnalyses.length, loadStats, loadRecentItems]);

  // Removed unused formatTime and formatDate functions

  // Check if daily limit reached - TEMPORARILY DISABLED
  const hasReachedDailyLimit = (stats) => {
    // Temporarily disabled for testing
    return false;
    // return stats && stats.todayPhotosAnalyzed >= stats.dailyLimit;
  };

  const handlePlusPress = () => {
    if (__DEV__) {
      console.log('[Dashboard] FAB plus button pressed');
    }
    // Check limit before opening modal
    if (hasReachedDailyLimit(userStats)) {
      if (__DEV__) {
        console.log('[Dashboard] Daily limit reached, showing alert');
      }
      Alert.alert(
        t('limits.title') || 'Daily Limit Reached',
        t('limits.dailyLimitReached', { count: userStats.dailyLimit }) ||
        `You have reached your daily limit of ${userStats.dailyLimit} photo analyses. Please try again tomorrow.`,
      );
      return;
    }

    // Simple, unobtrusive feedback: light scale animation
    Animated.timing(plusScale, {
      toValue: 0.96,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(plusScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    });

    // Show modal with options
    if (__DEV__) {
      console.log('[Dashboard] Opening FAB modal');
    }
    setShowModal(true);
  };

  const [showModal, setShowModal] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const handleCameraPress = async () => {
    console.log('[Dashboard] Camera option selected');
    // Check limit before opening camera
    if (hasReachedDailyLimit(userStats)) {
      Alert.alert(
        t('limits.title') || 'Daily Limit Reached',
        t('limits.dailyLimitReached', { count: userStats.dailyLimit }) ||
        `You have reached your daily limit of ${userStats.dailyLimit} photo analyses. Please try again tomorrow.`,
      );
      setShowModal(false);
      return;
    }

    await clientLog('Dashboard:openCameraPressed').catch(() => { });
    setShowModal(false);
    if (navigation && typeof navigation.navigate === 'function') {
      if (__DEV__) {
        console.log('[Dashboard] Navigating to Camera screen');
      }
      navigation.navigate('Camera');
    } else {
      console.warn('[Dashboard] Navigation not available');
    }
  };

  const handleGalleryPress = async () => {
    if (__DEV__) {
      console.log('[Dashboard] Gallery option selected');
    }
    // Check limit before opening gallery
    if (hasReachedDailyLimit(userStats)) {
      Alert.alert(
        t('limits.title') || 'Daily Limit Reached',
        t('limits.dailyLimitReached', { count: userStats.dailyLimit }) ||
        `You have reached your daily limit of ${userStats.dailyLimit} photo analyses. Please try again tomorrow.`,
      );
      setShowModal(false);
      return;
    }

    await clientLog('Dashboard:openGalleryPressed').catch(() => { });
    setShowModal(false);
    if (navigation && typeof navigation.navigate === 'function') {
      if (__DEV__) {
        console.log('[Dashboard] Navigating to Gallery screen');
      }
      navigation.navigate('Gallery');
    } else {
      console.warn('[Dashboard] Navigation not available');
    }
  };

  const handleAiAssistantPress = () => {
    if (__DEV__) {
      console.log('[Dashboard] AI Assistant card pressed');
    }
    setShowAiAssistant(true);
  };

  const [showLabResultsModal, setShowLabResultsModal] = useState(false);
  const [showDescribeFoodModal, setShowDescribeFoodModal] = useState(false);

  const handleOpenManualAnalysis = () => {
    console.log('[Dashboard] Opening manual analysis modal (Lab Results)');
    setShowModal(false);
    setShowLabResultsModal(true);
  };

  const handleDescribeFood = () => {
    console.log('[Dashboard] Opening Describe Food modal');
    setShowModal(false);
    setShowDescribeFoodModal(true);
  };

  // Removed unused function: handleAnalyzeTextFood


  const navigateToDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  // Dashboard render check removed to reduce console spam

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => navigateToDate(-1)}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.calendarDate}>
            <Text style={styles.calendarDateText}>
              {selectedDate.toLocaleDateString(language || 'en', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.calendarYearText}>
              {selectedDate.getFullYear()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => navigateToDate(1)}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Calories Circle with Progress and Macros - Compact Layout */}
        <Animated.View
          style={[
            styles.caloriesAndMacrosContainer,
            {
              opacity: cardAnimations.calories,
              transform: [{
                scale: cardAnimations.calories.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              }],
            },
          ]}
        >
          {/* Calories Circle - Smaller */}
          <View style={styles.caloriesWrapper}>
            <CircularProgress
              progress={stats.goal > 0 ? Math.min(5, Math.max(0, stats.totalCalories / stats.goal)) : 0}
              size={220}
              strokeWidth={8}
              value={Math.round(stats.totalCalories)}
              label={t('dashboard.calories')}
              goal={Math.round(stats.goal)}
              goalUnit={t('dashboard.caloriesUnit')}
            />
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: cardAnimations.stats,
              transform: [{
                translateY: cardAnimations.stats.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatMacroInt(stats.totalProtein)}</Text>
            <Text style={styles.statLabel}>{t('dashboard.protein')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatMacroInt(stats.totalCarbs)}</Text>
            <Text style={styles.statLabel}>{t('dashboard.carbs')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatMacroInt(stats.totalFat)}</Text>
            <Text style={styles.statLabel}>{t('dashboard.fat')}</Text>
          </View>
        </Animated.View>

        {/* PART A: Section 2 - Recent meals (short list) */}
        <Animated.View
          style={[
            styles.recentContainer,
            {
              opacity: cardAnimations.recent || cardAnimations.stats || 1,
            },
          ]}
        >
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>{t('dashboard.recent')}</Text>
          </View>

          {/* Pending Analyses - Show processing cards at the top */}
          {pendingAnalyses && pendingAnalyses.length > 0 && (
            pendingAnalyses.map((analysis) => (
              <PendingMealCard
                key={analysis.id}
                analysis={analysis}
                onPress={() => {
                  if (navigation && typeof navigation.navigate === 'function') {
                    navigation.navigate('AnalysisResults', {
                      analysisId: analysis.analysisId,
                      status: analysis.status,
                      localPreviewUri: analysis.localPreviewUri,
                    });
                  }
                }}
                onRetry={() => retryAnalysis(analysis.analysisId)}
                onDelete={() => removePendingAnalysis(analysis.analysisId)}
              />
            ))
          )}

          {/* Completed meals */}
          {recentItems && recentItems.length > 0 ? (
            (recentItems || []).slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.articleRow}
                onPress={() => {
                  if (navigation && typeof navigation.navigate === 'function') {
                    navigation.navigate('AnalysisResults', { analysisResult: item, readOnly: true });
                  }
                }}
              >
                {getItemImageUrl(item) ? (
                  <Image
                    source={{ uri: getItemImageUrl(item) }}
                    style={styles.recentItemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.recentItemImagePlaceholder}>
                    <Ionicons name="restaurant" size={24} color={colors.textTertiary} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: tokens.spacing.md }}>
                  <Text numberOfLines={1} style={styles.articleRowTitle}>{item.name || item.dishName || t('dashboard.mealFallback')}</Text>
                  <Text numberOfLines={1} style={styles.articleRowExcerpt}>
                    {formatCalories(item.totalCalories ?? item.calories ?? 0)} · {t('analysis.proteinShort') || 'P'} {formatMacro(item.totalProtein ?? item.protein ?? 0)} · {t('analysis.carbsShort') || 'C'} {formatMacro(item.totalCarbs ?? item.carbs ?? 0)} · {t('analysis.fatShort') || 'F'} {formatMacro(item.totalFat ?? item.fat ?? 0)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ))
          ) : !pendingAnalyses || pendingAnalyses.length === 0 ? (
            <View style={styles.recentEmpty}>
              <Ionicons name="restaurant" size={48} color={colors.textTertiary} />
              <Text style={styles.recentEmptyText}>{t('dashboard.recentEmptyTitle')}</Text>
              <Text style={styles.recentEmptySubtext}>{t('dashboard.recentEmptySubtitle')}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* PART A: Section 3 - Smart Recommendations Cards */}
        {/* 1. Suggested Food Summary Card */}
        {suggestedFoodSummary && suggestedFoodSummary.reason && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: cardAnimations.suggested,
                transform: [{
                  translateY: cardAnimations.suggested.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.suggestedFoodSummaryCard, {
                backgroundColor: colors.surface || colors.card,
                borderColor: colors.border || colors.borderMuted,
                borderLeftWidth: 4,
                borderLeftColor: colors.primary || '#007AFF',
              }]}
              onPress={() => {
                if (__DEV__) {
                  console.log('[Dashboard] Navigating to Suggested Food from summary');
                }
                if (navigation && typeof navigation.navigate === 'function') {
                  navigation.navigate('SuggestedFood');
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.suggestedFoodSummaryContent}>
                <View style={styles.suggestedFoodSummaryIcon}>
                  <Ionicons
                    name={
                      suggestedFoodSummary.category === 'protein' ? 'fitness-outline' :
                        suggestedFoodSummary.category === 'fiber' ? 'leaf-outline' :
                          suggestedFoodSummary.category === 'healthy_fat' ? 'water-outline' :
                            suggestedFoodSummary.category === 'carb' ? 'barbell-outline' :
                              'nutrition-outline'
                    }
                    size={20}
                    color={colors.primary || '#007AFF'}
                  />
                </View>
                <View style={styles.suggestedFoodSummaryText}>
                  <Text style={[styles.suggestedFoodSummaryTitle, { color: colors.textPrimary || colors.text }]}>
                    {t('dashboard.suggestedFood.summary.title') || t('dashboard.suggestedFood.title')}
                  </Text>
                  <Text style={[styles.suggestedFoodSummaryReason, { color: colors.textSecondary }]} numberOfLines={2}>
                    {suggestedFoodSummary.reason}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* 2. AI Assistant */}
        <Animated.View
          style={[
            styles.aiAssistantContainer,
            {
              opacity: cardAnimations.suggested,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.aiAssistantButton}
            onPress={() => {
              if (__DEV__) {
                console.log('[Dashboard] Opening AI Assistant');
              }
              if (typeof handleAiAssistantPress === 'function') {
                handleAiAssistantPress();
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.aiAssistantIcon}>
              <Ionicons name="chatbubble" size={24} color={colors.onPrimary || colors.inverseText} />
            </View>
            <View style={styles.aiAssistantContent}>
              <Text style={styles.aiAssistantTitle}>{t('dashboard.aiAssistant')}</Text>
              <Text style={styles.aiAssistantSubtitle}>
                {t('dashboard.aiAssistantSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>

        {/* 3. Manual Analysis / "Вставьте свой анализ" */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: cardAnimations.suggested,
            },
          ]}
        >
          <ManualAnalysisCard onPressAddManual={() => {
            if (__DEV__) {
              console.log('[Dashboard] Opening manual analysis modal');
            }
            handleOpenManualAnalysis();
          }} />
        </Animated.View>

        {/* PART A: Section 5 - Nutrition section */}
        {/* TODO: replaced by Monthly PDF report */}
      </ScrollView>

      {/* Floating Plus Button - Right Side (fixed, non-draggable) */}
      <Animated.View
        style={[
          styles.plusButtonContainer,
          {
            transform: [{ scale: plusScale }],
            opacity: plusOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.plusButton}
          onPress={typeof handlePlusPress === 'function' ? handlePlusPress : () => { }}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add" size={32} color={colors.onPrimary || colors.inverseText} />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal for Add Options */}
      <SwipeClosableModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        swipeDirection="down"
        enableSwipe={true}
        enableBackdropClose={true}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.addFoodModalContent} edges={['bottom']}>
          <View style={styles.addFoodModalHeader}>
            <Text style={styles.addFoodModalTitle}>{t('dashboard.addFood.title')}</Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.text || colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.addFoodModalSubtitle}>
            {t('dashboard.addFood.subtitle')}
          </Text>

          <View style={styles.addFoodModalButtons}>
            <TouchableOpacity
              style={styles.addFoodModalButton}
              onPress={typeof handleCameraPress === 'function' ? handleCameraPress : () => { }}
            >
              <View style={styles.addFoodModalButtonIcon}>
                <Ionicons name="camera" size={32} color={colors.primary} />
              </View>
              <Text style={styles.addFoodModalButtonTitle}>{t('dashboard.addFood.camera.title')}</Text>
              <Text style={styles.addFoodModalButtonSubtitle}>
                {t('dashboard.addFood.camera.description')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addFoodModalButton}
              onPress={typeof handleGalleryPress === 'function' ? handleGalleryPress : () => { }}
            >
              <View style={styles.addFoodModalButtonIcon}>
                <Ionicons name="images" size={32} color={colors.primary} />
              </View>
              <Text style={styles.addFoodModalButtonTitle}>{t('dashboard.addFood.gallery.title')}</Text>
              <Text style={styles.addFoodModalButtonSubtitle}>
                {t('dashboard.addFood.gallery.description')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addFoodModalButton}
              onPress={typeof handleDescribeFood === 'function' ? handleDescribeFood : () => { }}
            >
              <View style={styles.addFoodModalButtonIcon}>
                <Ionicons name="create-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.addFoodModalButtonTitle}>{t('dashboard.addFood.manual.title')}</Text>
              <Text style={styles.addFoodModalButtonSubtitle}>
                {t('dashboard.addFood.manual.description')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SwipeClosableModal>

      {/* AI Assistant Modal */}
      <AiAssistant
        visible={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
      />

      {/* Statistics Modal */}
      <StatisticsModal
        visible={showStatistics}
        onClose={() => setShowStatistics(false)}
      />

      {/* Lab Results Modal */}
      <LabResultsModal
        visible={showLabResultsModal}
        onClose={() => setShowLabResultsModal(false)}
      />

      {/* Describe Food Modal */}
      <DescribeFoodModal
        visible={showDescribeFoodModal}
        onClose={() => setShowDescribeFoodModal(false)}
        onAnalysisCompleted={(analysisId) => {
          // Navigate to AnalysisResultsScreen with analysisId
          if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate('AnalysisResults', {
              analysisId,
            });
          }
          setShowDescribeFoodModal(false);
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (tokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      paddingHorizontal: tokens.spacing.xl,
      paddingTop: tokens.spacing.xxxl,
      paddingBottom: tokens.spacing.md,
    },
    timeContainer: {
      alignItems: 'flex-start',
      gap: tokens.spacing.xs,
    },
    timeText: {
      fontSize: 24,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    dateText: {
      fontSize: 16,
      color: tokens.colors.textSecondary,
    },
    calendarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tokens.spacing.lg || 16,
      paddingHorizontal: tokens.spacing.xl,
      gap: tokens.spacing.xl,
      marginBottom: tokens.spacing.lg || 16, // Consistent spacing after calendar
    },
    calendarButton: {
      padding: tokens.spacing.sm,
    },
    calendarDate: {
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    calendarDateText: {
      fontSize: 24,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    calendarYearText: {
      fontSize: 16,
      color: tokens.colors.textSecondary,
    },
    caloriesAndMacrosContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.lg || 16,
      marginBottom: tokens.spacing.lg || 16,
      gap: tokens.spacing.lg,
    },
    caloriesWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    caloriesContainer: {
      alignItems: 'center',
      paddingVertical: tokens.spacing.xl || 20,
      marginBottom: tokens.spacing.lg || 16, // Consistent spacing after calories ring
    },
    caloriesCircle: {
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: tokens.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: tokens.colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: 3,
      borderColor: tokens.colors.primaryTint,
    },
    caloriesInner: {
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    caloriesNumber: {
      fontSize: 42,
      fontWeight: '800',
      color: tokens.colors.primary,
    },
    caloriesLabel: {
      fontSize: 16,
      color: tokens.colors.textSecondary,
    },
    caloriesGoal: {
      fontSize: 14,
      color: tokens.colors.textTertiary,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.lg || 16,
      gap: tokens.spacing.md,
      marginBottom: tokens.spacing.lg || 16, // Consistent spacing after macros
    },
    statsContainerCompact: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: tokens.spacing.sm,
    },
    statItem: {
      alignItems: 'center',
      backgroundColor: tokens.colors.card,
      paddingVertical: tokens.spacing.lg, // Reduced from xl
      paddingHorizontal: tokens.spacing.xl,
      borderRadius: tokens.radii.lg,
      minWidth: 80,
      flex: 1,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    statItemCompact: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: tokens.colors.card,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    statNumberCompact: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.colors.textPrimary,
    },
    statLabel: {
      fontSize: 14,
      color: tokens.colors.textSecondary,
    },
    statLabelCompact: {
      fontSize: 12,
      color: tokens.colors.textSecondary,
      marginTop: tokens.spacing.xxs,
    },
    articlesSection: {
      paddingHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.lg, // Reduced from xl
      gap: tokens.spacing.md,
    },
    articlesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    articlesTitle: {
      fontSize: tokens.typography.headingS.fontSize,
      fontWeight: tokens.typography.headingS.fontWeight,
      color: tokens.colors.textPrimary,
    },
    articlesViewAll: {
      color: tokens.colors.primary,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    featuredList: {
      marginBottom: tokens.spacing.md,
    },
    articleCardSmall: {
      width: 200,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.md,
      marginRight: tokens.spacing.md,
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    featuredBadgeSmall: {
      position: 'absolute',
      top: tokens.spacing.xs,
      right: tokens.spacing.xs,
      paddingHorizontal: tokens.spacing.xs,
      paddingVertical: tokens.spacing.xxs,
      borderRadius: tokens.radii.sm,
      backgroundColor: tokens.colors.primary,
    },
    articleTitleSmall: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: tokens.spacing.xs,
      color: tokens.colors.textPrimary,
    },
    articleExcerptSmall: {
      fontSize: 13,
      color: tokens.colors.textSecondary,
    },
    articleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.md,
      marginBottom: tokens.spacing.sm,
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    articleRowContent: {
      flex: 1,
      gap: tokens.spacing.xs,
      paddingRight: tokens.spacing.sm,
    },
    articleRowTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    articleRowExcerpt: {
      fontSize: 13,
      color: tokens.colors.textSecondary,
    },
    recentItemImage: {
      width: 60,
      height: 60,
      borderRadius: tokens.radii.md,
      backgroundColor: tokens.colors.surfaceMuted,
    },
    recentItemImagePlaceholder: {
      width: 60,
      height: 60,
      borderRadius: tokens.radii.md,
      backgroundColor: tokens.colors.surfaceMuted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    highlightSection: {
      paddingHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.lg,
      gap: tokens.spacing.md,
    },
    highlightTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    highlightSubtitle: {
      fontSize: 13,
      color: tokens.colors.textSecondary,
    },
    aiAssistantContainer: {
      paddingHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.lg || 16, // Consistent 16px spacing
    },
    aiAssistantButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: tokens.spacing.md, // Reduced from lg for compactness
      borderRadius: tokens.radii.lg,
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    aiAssistantIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: tokens.spacing.md,
      backgroundColor: tokens.colors.primary,
    },
    aiAssistantContent: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    aiAssistantTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    aiAssistantSubtitle: {
      fontSize: 14,
      color: tokens.colors.textSecondary,
    },
    suggestedFoodSummaryCard: {
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.md,
      borderWidth: 1,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    suggestedFoodSummaryContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.md,
    },
    suggestedFoodSummaryIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tokens.colors.primaryTint || tokens.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    suggestedFoodSummaryText: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    suggestedFoodSummaryTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    suggestedFoodSummaryReason: {
      fontSize: 13,
      color: tokens.colors.textSecondary,
      lineHeight: 18,
    },
    section: {
      marginBottom: tokens.spacing.lg || 16, // Consistent 16px spacing between sections
      paddingHorizontal: tokens.spacing.xl,
    },
    recentContainer: {
      paddingHorizontal: tokens.spacing.xl,
      paddingBottom: tokens.spacing.md,
      gap: tokens.spacing.sm,
      marginBottom: tokens.spacing.lg || 16, // Consistent 16px spacing
    },
    recentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.md,
    },
    recentTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '500',
    },
    recentEmpty: {
      alignItems: 'center',
      paddingVertical: tokens.spacing.gutter,
      borderRadius: tokens.radii.lg,
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
      gap: tokens.spacing.md,
    },
    recentEmptyText: {
      fontSize: 18,
      fontWeight: '500',
      color: tokens.colors.textSecondary,
    },
    recentEmptySubtext: {
      fontSize: 14,
      textAlign: 'center',
      color: tokens.colors.textTertiary,
    },
    plusButtonContainer: {
      position: 'absolute',
      bottom: tokens.spacing.xxl,
      right: tokens.spacing.xl,
      zIndex: 10,
    },
    plusButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: tokens.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: tokens.colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 12,
      borderWidth: 2,
      borderColor: tokens.colors.surface,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: tokens.states.scrim,
      justifyContent: 'flex-end',
    },
    modalBackground: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: tokens.colors.card,
      borderTopLeftRadius: tokens.radii.xl,
      borderTopRightRadius: tokens.radii.xl,
      paddingTop: tokens.spacing.xl,
      paddingBottom: tokens.spacing.gutter,
      paddingHorizontal: tokens.spacing.xl,
      shadowColor: tokens.states.cardShadow?.shadowColor || 'rgba(0,0,0,0.2)',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.sm,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 16,
      color: tokens.colors.textSecondary,
      marginBottom: tokens.spacing.gutter,
    },
    modalButtons: {
      gap: tokens.spacing.lg,
    },
    modalButton: {
      backgroundColor: tokens.colors.surfaceMuted,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.xl,
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    modalButtonIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: tokens.colors.primaryTint,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalButtonTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    modalButtonSubtitle: {
      fontSize: 14,
      color: tokens.colors.textSecondary,
      textAlign: 'center',
    },
    monthlySection: {
      paddingHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.lg, // Reduced from xl
      gap: tokens.spacing.md,
    },
    viewInsightsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tokens.spacing.md,
      gap: tokens.spacing.xs,
    },
    viewInsightsButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.colors.primary,
    },
    monthlyHeader: {
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    sectionTitle: {
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      color: tokens.colors.textPrimary,
    },
    sectionSubtle: {
      fontSize: 14,
      color: tokens.colors.textSecondary,
    },
    monthlyEmpty: {
      alignItems: 'center',
      paddingVertical: tokens.spacing.gutter,
      borderRadius: tokens.radii.lg,
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
      gap: tokens.spacing.md,
    },
    topFoodsContainer: {
      backgroundColor: tokens.colors.surfaceMuted,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.md,
      marginBottom: tokens.spacing.md,
    },
    sectionSubtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
      marginBottom: tokens.spacing.sm,
    },
    topFoodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: tokens.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: tokens.colors.borderMuted,
    },
    topFoodRank: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
      marginRight: tokens.spacing.sm,
    },
    topFoodContent: {
      flex: 1,
    },
    topFoodLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    topFoodMeta: {
      fontSize: 12,
      color: tokens.colors.textSecondary,
    },
    mealDistributionContainer: {
      backgroundColor: tokens.colors.surfaceMuted,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.md,
    },
    mealDistributionRow: {
      marginBottom: tokens.spacing.sm,
    },
    mealDistributionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.xs,
    },
    mealDistributionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    mealDistributionMeta: {
      fontSize: 12,
      color: tokens.colors.textSecondary,
    },
    mealDistributionBarTrack: {
      height: 8,
      backgroundColor: tokens.colors.borderMuted,
      borderRadius: 4,
      marginBottom: tokens.spacing.xs,
    },
    mealDistributionBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    mealDistributionMetaSmall: {
      fontSize: 12,
      color: tokens.colors.textSecondary,
    },
    analysisCounterContainer: {
      paddingHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.lg, // Reduced from xl
    },
    analysisCounterCard: {
      backgroundColor: tokens.colors.card,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.md,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    analysisCounterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    analysisCounterContent: {
      flex: 1,
    },
    analysisCounterLabel: {
      fontSize: 12,
      color: tokens.colors.textSecondary,
      marginBottom: 2,
    },
    analysisCounterValue: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    analysisCounterDivider: {
      height: 1,
      backgroundColor: tokens.colors.borderMuted,
      marginVertical: tokens.spacing.sm,
    },
    // Task 9-10: New feature cards styles
    newFeaturesContainer: {
      paddingHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.lg,
      gap: tokens.spacing.md,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: tokens.spacing.md, // Reduced from lg for compactness
      borderRadius: tokens.radii.lg,
      borderWidth: 1,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: tokens.spacing.md,
    },
    featureContent: {
      flex: 1,
      gap: tokens.spacing.xxs || 2,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    featureSubtitle: {
      fontSize: 13,
      color: tokens.colors.textSecondary,
    },
    // Modal styles for Specialists and Suggested Food
    modalContentFull: {
      flex: 1,
      paddingTop: tokens.spacing.lg,
      paddingBottom: tokens.spacing.lg,
      paddingHorizontal: tokens.spacing.xl,
    },
    modalHeaderFull: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.lg,
    },
    modalTitleFull: {
      fontSize: 24,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
      flex: 1,
    },
    modalCloseButton: {
      padding: tokens.spacing.xs,
    },
    modalScrollView: {
      flex: 1,
    },
    modalScrollContent: {
      flexGrow: 1,
      paddingVertical: tokens.spacing.lg,
      paddingBottom: tokens.spacing.xl,
    },
    modalDescription: {
      fontSize: 15,
      lineHeight: 22,
      color: tokens.colors.textSecondary,
    },
    modalFooter: {
      paddingTop: tokens.spacing.lg,
      paddingBottom: tokens.spacing.md,
      borderTopWidth: 1,
    },
    modalButtonFull: {
      borderRadius: tokens.radii.lg,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    // Add Food Modal styles
    addFoodModalContent: {
      paddingHorizontal: tokens.spacing.xl,
      paddingTop: tokens.spacing.lg,
      paddingBottom: tokens.spacing.xl,
      minHeight: 300,
    },
    addFoodModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.md,
    },
    addFoodModalTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
      flex: 1,
    },
    addFoodModalSubtitle: {
      fontSize: 16,
      color: tokens.colors.textSecondary,
      marginBottom: tokens.spacing.lg, // Reduced from xl
    },
    addFoodModalButtons: {
      gap: tokens.spacing.lg,
    },
    addFoodModalButton: {
      backgroundColor: tokens.colors.surfaceMuted,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.xl,
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    addFoodModalButtonIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: tokens.colors.primaryTint,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addFoodModalButtonTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    addFoodModalButtonSubtitle: {
      fontSize: 14,
      color: tokens.colors.textSecondary,
      textAlign: 'center',
    },
  });
