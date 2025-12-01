import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/apiService';
import AiAssistant from '../components/AiAssistant';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { HealthScoreCard } from '../components/HealthScoreCard';
import { CircularProgress } from '../components/CircularProgress';
import { clientLog } from '../utils/clientLog';
import { CommonActions } from '@react-navigation/native';
import { SwipeClosableModal } from '../components/common/SwipeClosableModal';
import { StatisticsModal } from '../components/StatisticsModal';
import { formatMacro, formatCalories } from '../utils/nutritionFormat';
import { ManualAnalysisCard } from '../components/ManualAnalysisCard';
import { LabResultsModal } from '../components/LabResultsModal';


export default function DashboardScreen() {
  const navigation = useNavigation();
  const { colors, tokens } = useTheme();
  const { t, language } = useI18n();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [now, setNow] = useState(new Date());
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
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [feedArticles, setFeedArticles] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [highlightMeal, setHighlightMeal] = useState(null);
  const [userStats, setUserStats] = useState({
    totalPhotosAnalyzed: 0,
    todayPhotosAnalyzed: 0,
    dailyLimit: 3,
  });

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
  }, []);

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

  const loadMonthlyStats = React.useCallback(async () => {
    try {
      setMonthlyLoading(true);
      const response = await ApiService.getMonthlyStats();
      setMonthlyStats(response);
    } catch (error) {
      console.error('Error loading monthly stats:', error);
      setMonthlyStats(null);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  const loadArticles = React.useCallback(async () => {
    try {
      const [featured, feed] = await Promise.all([
        ApiService.getFeaturedArticles(3, language || 'ru'),
        ApiService.getArticlesFeed(1, 5, language || 'ru'),
      ]);
      
      const currentLocale = language || 'ru';
      
      // Deduplicate featured articles by slug (unique per locale)
      if (Array.isArray(featured)) {
        const seen = new Set();
        const unique = featured.filter((article) => {
          if (!article?.slug) return false;
          const key = `${article.locale || currentLocale}:${article.slug}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setFeaturedArticles(unique.slice(0, 3));
      } else {
        setFeaturedArticles([]);
      }
      
      // Deduplicate feed articles by slug (unique per locale)
      if (feed && typeof feed === 'object' && Array.isArray(feed.articles)) {
        const seen = new Set();
        const unique = feed.articles.filter((article) => {
          if (!article?.slug) return false;
          const key = `${article.locale || currentLocale}:${article.slug}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setFeedArticles(unique.slice(0, 5));
      } else {
        console.warn('[DashboardScreen] Invalid feed response:', feed);
        setFeedArticles([]);
      }
    } catch (err) {
      console.error('[DashboardScreen] Error loading articles:', err);
      setFeaturedArticles([]);
      setFeedArticles([]);
    }
  }, [language]);

  const loadRecent = React.useCallback(async () => {
    try {
      // Используем selectedDate для загрузки meals по выбранной дате
      const meals = await ApiService.getMeals(selectedDate);
      const items = Array.isArray(meals) ? meals.slice(0, 5) : [];
      setRecentItems(items);
      const withInsights = items.find(item => item.healthInsights);
      if (withInsights?.healthInsights?.score) {
        setHighlightMeal({
          id: withInsights.id,
          name: withInsights.name || withInsights.dishName || t('analysis.title'),
          healthScore: withInsights.healthInsights,
        });
      } else {
        setHighlightMeal(null);
      }
    } catch {
      setRecentItems([]);
      setHighlightMeal(null);
    }
  }, [t, selectedDate]);

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

  // Теперь используем функции в хуках ПОСЛЕ их определения
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update time every minute for display
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
      loadMonthlyStats();
      loadArticles();
      loadRecent();
      loadUserStats();
    }, [loadStats, loadMonthlyStats, loadArticles, loadRecent, loadUserStats])
  );

  useEffect(() => {
    loadStats();
    loadMonthlyStats();
    loadArticles();
    loadRecent();
    loadUserStats();
  }, [selectedDate, loadStats, loadMonthlyStats, loadArticles, loadRecent, loadUserStats]);

  const formatTime = (date) => {
    return date.toLocaleTimeString(language || 'en', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString(language || 'en', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatRangeLabel = (range) => {
    if (!range?.from || !range?.to) {
      return null;
    }
    try {
      const fromDate = new Date(range.from);
      const toDate = new Date(range.to);
      return `${fromDate.toLocaleDateString(language || 'en', {
        month: 'short',
        day: 'numeric',
      })} – ${toDate.toLocaleDateString(language || 'en', {
        month: 'short',
        day: 'numeric',
      })}`;
    } catch {
      return null;
    }
  };

  const getMealTypeLabel = (mealType) => {
    switch (mealType) {
      case 'BREAKFAST':
        return t('dashboard.mealTypes.breakfast');
      case 'DINNER':
        return t('dashboard.mealTypes.dinner');
      case 'LUNCH':
      default:
        return t('dashboard.mealTypes.lunch');
    }
  };

  // Check if daily limit reached
  const hasReachedDailyLimit = (stats) => {
    return stats && stats.todayPhotosAnalyzed >= stats.dailyLimit;
  };

  const handlePlusPress = () => {
    // Check limit before opening modal
    if (hasReachedDailyLimit(userStats)) {
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
    setShowModal(true);
  };

  const [showModal, setShowModal] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const handleCameraPress = async () => {
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

    await clientLog('Dashboard:openCameraPressed').catch(() => {});
    setShowModal(false);
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Camera');
    }
  };

  const handleGalleryPress = async () => {
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

    await clientLog('Dashboard:openGalleryPressed').catch(() => {});
    setShowModal(false);
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Gallery');
    }
  };

  const handleAiAssistantPress = () => {
    setShowAiAssistant(true);
  };

  const [showLabResultsModal, setShowLabResultsModal] = useState(false);

  const handleOpenManualAnalysis = () => {
    // Open lab results modal for health analysis
    setShowLabResultsModal(true);
  };


  const navigateToDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  // Temporary log to verify Dashboard renders without crash
  if (__DEV__) {
    console.log('[DashboardScreen] rendered OK');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Compact header with time and date */}
        <View style={styles.header}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(now)}</Text>
            <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
          </View>
        </View>

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

        {/* Calories Circle with Progress */}
        <View style={styles.caloriesContainer}>
          <CircularProgress
            progress={stats.goal > 0 ? Math.min(1, stats.totalCalories / stats.goal) : 0}
            size={220}
            strokeWidth={8}
            value={stats.totalCalories}
            label={t('dashboard.calories')}
            goal={t('dashboard.ofGoal', { goal: stats.goal.toLocaleString() })}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatMacro(stats.totalProtein)}</Text>
            <Text style={styles.statLabel}>{t('dashboard.protein')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatMacro(stats.totalCarbs)}</Text>
            <Text style={styles.statLabel}>{t('dashboard.carbs')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatMacro(stats.totalFat)}</Text>
            <Text style={styles.statLabel}>{t('dashboard.fat')}</Text>
          </View>
        </View>

        {/* PART A: Section 2 - Recent meals (short list) */}
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>{t('dashboard.recent')}</Text>
            {recentItems && recentItems.length > 3 && (
              <TouchableOpacity
                onPress={() => {
                  if (navigation && typeof navigation.navigate === 'function') {
                    navigation.navigate('Recently');
                  }
                }}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  {t('dashboard.seeAll') || 'See all'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.recentItemImage} />
                ) : (
                  <View style={styles.recentItemImagePlaceholder}>
                    <Ionicons name="restaurant" size={24} color={colors.textTertiary} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: tokens.spacing.md }}>
                  <Text numberOfLines={1} style={styles.articleRowTitle}>{item.name || item.dishName || t('dashboard.mealFallback')}</Text>
                  <Text numberOfLines={1} style={styles.articleRowExcerpt}>
                    {t('dashboard.recentMacroSummary', {
                      calories: item.totalCalories ?? item.calories ?? 0,
                      protein: item.totalProtein ?? item.protein ?? 0,
                      carbs: item.totalCarbs ?? item.carbs ?? 0,
                      fat: item.totalFat ?? item.fat ?? 0,
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.recentEmpty}>
              <Ionicons name="restaurant" size={48} color={colors.textTertiary} />
              <Text style={styles.recentEmptyText}>{t('dashboard.recentEmptyTitle')}</Text>
              <Text style={styles.recentEmptySubtext}>{t('dashboard.recentEmptySubtitle')}</Text>
            </View>
          )}
        </View>

        {/* PART A: Section 3 - AI Assistant teaser */}
        <View style={styles.aiAssistantContainer}>
          <TouchableOpacity style={styles.aiAssistantButton} onPress={typeof handleAiAssistantPress === 'function' ? handleAiAssistantPress : () => {}}>
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
        </View>

        {/* PART A: Section 4 - Insert analysis / Upload analysis */}
        <View style={styles.section}>
          <ManualAnalysisCard onPressAddManual={handleOpenManualAnalysis} />
        </View>

        {/* PART A: Section 5 - Nutrition section */}
        {monthlyStats && monthlyStats.topFoods && monthlyStats.topFoods.length > 0 && (
          <View style={styles.monthlySection}>
            <View style={styles.monthlyHeader}>
              <Text style={styles.sectionTitle}>{t('dashboard.monthlyStats.title')}</Text>
              {formatRangeLabel(monthlyStats?.range) ? (
                <Text style={styles.sectionSubtle}>{formatRangeLabel(monthlyStats?.range)}</Text>
              ) : null}
            </View>

            <View style={styles.topFoodsContainer}>
              <Text style={styles.sectionSubtitle}>{t('dashboard.monthlyStats.topFoods')}</Text>
              {(monthlyStats.topFoods || []).slice(0, 3).map((food, index) => (
                <View key={`${food.label}-${index}`} style={styles.topFoodRow}>
                  <Text style={styles.topFoodRank}>{index + 1}</Text>
                  <View style={styles.topFoodContent}>
                    <Text numberOfLines={1} style={styles.topFoodLabel}>{food.label}</Text>
                    <Text style={styles.topFoodMeta}>
                      {t('dashboard.monthlyStats.foodMeta', {
                        count: food.count,
                        calories: Math.round(food.totalCalories || 0),
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.viewInsightsButton}
              onPress={() => {
                setShowStatistics(true);
              }}
            >
              <Text style={styles.viewInsightsButtonText}>
                {t('dashboard.monthlyStats.viewFullInsights') || 'View full insights'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
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
          onPress={typeof handlePlusPress === 'function' ? handlePlusPress : () => {}}
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
              onPress={typeof handleCameraPress === 'function' ? handleCameraPress : () => {}}
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
              onPress={typeof handleGalleryPress === 'function' ? handleGalleryPress : () => {}}
            >
              <View style={styles.addFoodModalButtonIcon}>
                <Ionicons name="images" size={32} color={colors.primary} />
              </View>
              <Text style={styles.addFoodModalButtonTitle}>{t('dashboard.addFood.gallery.title')}</Text>
              <Text style={styles.addFoodModalButtonSubtitle}>
                {t('dashboard.addFood.gallery.description')}
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
      paddingVertical: tokens.spacing.lg, // Reduced from xl
      paddingHorizontal: tokens.spacing.xl,
      gap: tokens.spacing.xl,
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
    caloriesContainer: {
      alignItems: 'center',
      paddingVertical: tokens.spacing.xxxl,
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
      paddingVertical: tokens.spacing.xl,
      gap: tokens.spacing.md,
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
    statNumber: {
      fontSize: 20,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    statLabel: {
      fontSize: 14,
      color: tokens.colors.textSecondary,
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
      marginBottom: tokens.spacing.lg,
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
    section: {
      marginBottom: tokens.spacing.md, // Reduced from lg for compactness
      paddingHorizontal: tokens.spacing.xl,
    },
    recentContainer: {
      paddingHorizontal: tokens.spacing.xl,
      paddingBottom: tokens.spacing.md, // Reduced from gutter
      gap: tokens.spacing.sm, // Reduced from md
      marginBottom: tokens.spacing.md, // Reduced from lg
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
    modalContent: {
      flex: 1,
      paddingTop: tokens.spacing.lg,
      paddingBottom: tokens.spacing.lg,
      paddingHorizontal: tokens.spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.lg,
    },
    modalTitle: {
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
    modalButton: {
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
