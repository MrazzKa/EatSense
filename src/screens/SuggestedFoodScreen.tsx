import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';
import AppCard from '../components/common/AppCard';

// V2 API response types
type SuggestionStatus = 'ok' | 'insufficient_data' | 'error';
type HealthLevel = 'poor' | 'average' | 'good' | 'excellent';

type SuggestedFoodItemV2 = {
  id: string;
  title: string;
  description: string;
  tags?: string[];
};

type SuggestedFoodSection = {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  items: SuggestedFoodItemV2[];
};

type HealthInfo = {
  level: HealthLevel;
  score: number;
  reasons: string[];
};

type StatsInfo = {
  daysWithMeals: number;
  mealsCount: number;
  avgCalories: number;
  avgProteinG: number;
  avgFatG: number;
  avgCarbsG: number;
  avgFiberG: number;
  macroPercents: { protein: number; fat: number; carbs: number };
};

export const SuggestedFoodScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const [sections, setSections] = useState<SuggestedFoodSection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [status, setStatus] = useState<SuggestionStatus>('ok');

  const [summary, setSummary] = useState<string>('');



  // V2 API response type for proper typing
  type V2Response = {
    status?: SuggestionStatus;
    summary?: string;
    health?: HealthInfo;
    stats?: StatsInfo;
    sections?: Array<{
      id: string;
      title: string;
      subtitle?: string;
      category?: string;
      items: Array<{
        id: string;
        title: string;
        description: string;
        tags?: string[];
      }>;
    }>;
  };


  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use V2 API - no static fallbacks
      const response = (await ApiService.getSuggestedFoodsV2(language)) as V2Response;

      setStatus(response.status || 'error');
      setSummary(response.summary || '');


      if (response.status === 'ok' && (response.sections?.length ?? 0) > 0) {
        // Map backend sections to UI format
        const uiSections: SuggestedFoodSection[] = response.sections!.map((s: any) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          category: s.category,
          items: (s.items || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            tags: item.tags,
          })),
        }));
        setSections(uiSections);
      } else if (response.status === 'insufficient_data') {
        setSections([]);
      } else {
        setError(response.summary || t('dashboard.suggestedFood.error.generic'));
        setSections([]);
      }
    } catch (e) {
      console.error('[SuggestedFoodScreen] API failed:', e);
      setError(t('dashboard.suggestedFood.error.generic'));
      setStatus('error');
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [language, loadData]); // Reload when language changes

  if (loading && sections.length === 0) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('dashboard.suggestedFood.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header with close button */}
      <View style={[styles.screenHeader, { borderBottomColor: colors.border || colors.borderMuted }]}>
        <TouchableOpacity
          onPress={() => {
            if (navigation && typeof navigation.goBack === 'function') {
              navigation.goBack();
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenHeaderTitle, { color: colors.textPrimary || colors.text }]}>
          {t('dashboard.suggestedFood.title')}
        </Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('dashboard.suggestedFood.subtitle')}
          </Text>
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.errorBackground || colors.surfaceMuted }]}>
            <Text style={[styles.errorText, { color: colors.error || colors.textSecondary }]}>
              {error}
            </Text>
          </View>
        )}

        {status === 'insufficient_data' && sections.length === 0 && !loading ? (
          <View style={styles.insufficientDataContainer}>
            <Ionicons name="nutrition-outline" size={64} color={colors.primary} />
            <Text style={[styles.insufficientDataTitle, { color: colors.textPrimary || colors.text }]}>
              {t('dashboard.suggestedFood.insufficientData.title')}
            </Text>
            <Text style={[styles.insufficientDataText, { color: colors.textSecondary }]}>
              {summary || t('dashboard.suggestedFood.insufficientData.message')}
            </Text>
            <TouchableOpacity
              style={[styles.addMealButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addMealButtonText}>
                {t('dashboard.suggestedFood.addMeal')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : status === 'error' || (sections.length === 0 && !loading) ? (
          <View style={styles.emptyState}>
            <Ionicons name="warning-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {error || t('dashboard.suggestedFood.error.generic')}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: colors.primary }]}
              onPress={onRefresh}
            >
              <Text style={[styles.retryButtonText, { color: colors.primary }]}>
                {t('dashboard.suggestedFood.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          sections.map((section) => {
            const sectionIcon = getSectionIcon(section.id);
            const sectionColor = getSectionColor(section.id, colors);
            return (
              <AppCard key={section.id} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconContainer, { backgroundColor: sectionColor + '20' }]}>
                    <Ionicons name={sectionIcon} size={24} color={sectionColor} />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text }]}>
                      {section.title}
                    </Text>
                    {section.subtitle && (
                      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                        {section.subtitle}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.itemsContainer}>
                  {section.items.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.itemCard,
                        index < section.items.length - 1 && styles.itemCardWithBorder,
                        { borderBottomColor: colors.borderMuted || colors.border }
                      ]}
                    >
                      <View style={[styles.itemBullet, { backgroundColor: sectionColor }]} />
                      <View style={styles.itemTextContainer}>
                        <Text style={[styles.itemTitle, { color: colors.textPrimary || colors.text }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </AppCard>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper functions for section styling
function getSectionIcon(sectionId: string): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    protein: 'fitness',
    fiber: 'leaf',
    carbs: 'nutrition',
    healthy_fat: 'water',
    snacks: 'fast-food',
    general: 'restaurant',
  };
  return iconMap[sectionId] || 'restaurant';
}

function getSectionColor(sectionId: string, colors: any): string {
  const colorMap: Record<string, string> = {
    protein: colors.primary || '#2563EB',
    fiber: colors.success || '#10B981',
    carbs: colors.warning || '#F59E0B',
    healthy_fat: colors.secondary || '#7C3AED',
    snacks: colors.info || '#0EA5E9',
    general: colors.primary || '#2563EB',
  };
  return colorMap[sectionId] || colors.primary || '#2563EB';
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  insufficientDataContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  insufficientDataTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  insufficientDataText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addMealButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemsContainer: {
    gap: 0,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingLeft: 4,
  },
  itemCardWithBorder: {
    borderBottomWidth: 1,
  },
  itemBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
    flexShrink: 0,
  },
  itemTextContainer: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default SuggestedFoodScreen;
