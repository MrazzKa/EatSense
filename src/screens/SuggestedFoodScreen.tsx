import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';

type SuggestedFoodItem = {
  id: string;
  title: string;
  description: string;
};

type SuggestedFoodSection = {
  id: string;
  title: string;
  subtitle?: string;
  items: SuggestedFoodItem[];
};

// Backend may return items directly or sections
type BackendResponse = 
  | SuggestedFoodItem[]
  | { sections: SuggestedFoodSection[] }
  | SuggestedFoodSection[];

export const SuggestedFoodScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const [sections, setSections] = useState<SuggestedFoodSection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const normalizeBackendData = useCallback((data: BackendResponse): SuggestedFoodSection[] => {
    if (!data) return [];

    // If array of sections
    if (Array.isArray(data) && data.length > 0) {
      // Check if it's array of sections or items
      if ('items' in data[0] || 'title' in data[0]) {
        // It's sections
        return data as SuggestedFoodSection[];
      }
      // It's items - convert to single section
      return [
        {
          id: 'general',
          title: t('suggestedFood.sections.protein.title'),
          items: data as SuggestedFoodItem[],
        },
      ];
    }

    // If object with sections
    if (typeof data === 'object' && 'sections' in data && Array.isArray(data.sections)) {
      return data.sections;
    }

    return [];
  }, [t]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Try to get personalized suggestions from backend
      const data = await ApiService.getSuggestedFoods(language);
      const normalizedSections = normalizeBackendData(data as BackendResponse);
      
      if (normalizedSections.length > 0) {
        setSections(normalizedSections);
      } else {
        // 2. Fallback to static localized sections
        setSections(getStaticFallbackSections(t));
      }
    } catch (e) {
      console.warn('[SuggestedFoodScreen] API failed, using fallback', e);
      setError(t('suggestedFood.error.generic'));
      // 3. Always show fallback on error
      setSections(getStaticFallbackSections(t));
    } finally {
      setLoading(false);
    }
  }, [language, t, normalizeBackendData]);

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
          {t('suggestedFood.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
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
          <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
            {t('suggestedFood.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('suggestedFood.subtitle')}
          </Text>
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.errorBackground || colors.surfaceMuted }]}>
            <Text style={[styles.errorText, { color: colors.error || colors.textSecondary }]}>
              {error}
            </Text>
          </View>
        )}

        {sections.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('suggestedFood.empty')}
            </Text>
          </View>
        ) : (
          sections.map((section) => (
            <View
              key={section.id}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface || colors.card,
                  borderColor: colors.border || colors.borderMuted,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text }]}>
                {section.title}
              </Text>
              {section.subtitle && (
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  {section.subtitle}
                </Text>
              )}

              {section.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
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
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Fallback data - fully localized via i18n
function getStaticFallbackSections(t: (_key: string) => string): SuggestedFoodSection[] {
  return [
    {
      id: 'protein',
      title: t('suggestedFood.sections.protein.title'),
      subtitle: t('suggestedFood.sections.protein.subtitle'),
      items: [
        {
          id: 'protein-1',
          title: t('suggestedFood.sections.protein.items.cottageCheese.title'),
          description: t('suggestedFood.sections.protein.items.cottageCheese.description'),
        },
        {
          id: 'protein-2',
          title: t('suggestedFood.sections.protein.items.chickenBreast.title'),
          description: t('suggestedFood.sections.protein.items.chickenBreast.description'),
        },
        {
          id: 'protein-3',
          title: t('suggestedFood.sections.protein.items.eggs.title'),
          description: t('suggestedFood.sections.protein.items.eggs.description'),
        },
      ],
    },
    {
      id: 'fiber',
      title: t('suggestedFood.sections.fiber.title'),
      subtitle: t('suggestedFood.sections.fiber.subtitle'),
      items: [
        {
          id: 'fiber-1',
          title: t('suggestedFood.sections.fiber.items.oats.title'),
          description: t('suggestedFood.sections.fiber.items.oats.description'),
        },
        {
          id: 'fiber-2',
          title: t('suggestedFood.sections.fiber.items.vegetables.title'),
          description: t('suggestedFood.sections.fiber.items.vegetables.description'),
        },
      ],
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 8,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default SuggestedFoodScreen;
