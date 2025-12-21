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
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const [sections, setSections] = useState<SuggestedFoodSection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Helper function to get display name for category
  const getCategoryDisplayName = useCallback((category: string): string => {
    const categoryNames: Record<string, string> = {
      protein: t('suggestedFood.sections.protein.title') || 'Белки',
      fiber: t('suggestedFood.sections.fiber.title') || 'Клетчатка',
      carbs: t('suggestedFood.sections.carbs.title') || 'Углеводы',
      healthy_fat: t('suggestedFood.sections.healthyFat.title') || 'Полезные жиры',
      general: t('suggestedFood.sections.general.title') || 'Общие рекомендации',
    };
    
    const localized = categoryNames[category];
    // Check if localization worked (not a key itself)
    if (localized && !localized.includes('suggestedFood.sections')) {
      return localized;
    }
    
    // Fallback to human-readable name
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  }, [t]);

  const normalizeBackendData = useCallback((data: BackendResponse): SuggestedFoodSection[] => {
    if (!data) return [];

    // If array of sections
    if (Array.isArray(data) && data.length > 0) {
      // Check if it's array of sections or items
      if ('items' in data[0] || 'title' in data[0]) {
        // It's sections
        return data as SuggestedFoodSection[];
      }
      
      // Backend returns SuggestedFoodItem[] with name, reason, tip, category
      // Convert to SuggestedFoodSection[] format expected by UI
      const backendItems = data as any[];
      const sectionsMap = new Map<string, SuggestedFoodSection>();
      
      backendItems.forEach((item) => {
        const category = item.category || 'general';
        if (!sectionsMap.has(category)) {
          // Get localized title with proper fallback
          const title = getCategoryDisplayName(category);
          
          sectionsMap.set(category, {
            id: category,
            title,
            subtitle: item.reason || undefined,
            items: [],
          });
        }
        
        const section = sectionsMap.get(category)!;
        // Check if item.name is a localization key and provide fallback
        let itemTitle = item.name || 'Food item';
        if (itemTitle.includes('.') && itemTitle.length > 3 && itemTitle.split('.').length >= 2) {
          // Looks like a localization key, use fallback
          const parts = itemTitle.split('.');
          itemTitle = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1).replace(/_/g, ' ');
        }
        section.items.push({
          id: item.id || `item-${section.items.length}`,
          title: itemTitle,
          description: item.tip || '',
        });
      });
      
      return Array.from(sectionsMap.values());
    }

    // If object with sections
    if (typeof data === 'object' && 'sections' in data && Array.isArray(data.sections)) {
      return data.sections;
    }

    return [];
  }, [t, getCategoryDisplayName]);

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
          {t('suggestedFood.title')}
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

// Fallback data - fully localized via i18n
function getStaticFallbackSections(t: (_key: string) => string): SuggestedFoodSection[] {
  return [
    {
      id: 'protein',
      title: t('suggestedFood.sections.protein.title') || 'Protein Sources',
      subtitle: t('suggestedFood.sections.protein.subtitle') || 'High-quality protein for muscle maintenance',
      items: [
        {
          id: 'protein-1',
          title: t('suggestedFood.sections.protein.items.cottageCheese.title') || 'Cottage Cheese',
          description: t('suggestedFood.sections.protein.items.cottageCheese.description') || 'Low-fat, high-protein option. Great for breakfast or snacks.',
        },
        {
          id: 'protein-2',
          title: t('suggestedFood.sections.protein.items.chickenBreast.title') || 'Chicken Breast',
          description: t('suggestedFood.sections.protein.items.chickenBreast.description') || 'Lean protein source. Perfect for lunch or dinner.',
        },
        {
          id: 'protein-3',
          title: t('suggestedFood.sections.protein.items.eggs.title') || 'Eggs',
          description: t('suggestedFood.sections.protein.items.eggs.description') || 'Complete protein with essential amino acids. Versatile and nutritious.',
        },
        {
          id: 'protein-4',
          title: t('suggestedFood.sections.protein.items.fish.title') || 'Fish (Salmon, Tuna)',
          description: t('suggestedFood.sections.protein.items.fish.description') || 'Rich in omega-3 fatty acids. Supports heart and brain health.',
        },
      ],
    },
    {
      id: 'carbs',
      title: t('suggestedFood.sections.carbs.title') || 'Complex Carbohydrates',
      subtitle: t('suggestedFood.sections.carbs.subtitle') || 'Sustained energy from whole grains',
      items: [
        {
          id: 'carbs-1',
          title: t('suggestedFood.sections.carbs.items.brownRice.title') || 'Brown Rice',
          description: t('suggestedFood.sections.carbs.items.brownRice.description') || 'Whole grain with fiber. Better than white rice for blood sugar control.',
        },
        {
          id: 'carbs-2',
          title: t('suggestedFood.sections.carbs.items.quinoa.title') || 'Quinoa',
          description: t('suggestedFood.sections.carbs.items.quinoa.description') || 'Complete protein and complex carbs. Gluten-free option.',
        },
        {
          id: 'carbs-3',
          title: t('suggestedFood.sections.carbs.items.sweetPotato.title') || 'Sweet Potato',
          description: t('suggestedFood.sections.carbs.items.sweetPotato.description') || 'Rich in beta-carotene and fiber. Natural sweetness without added sugar.',
        },
      ],
    },
    {
      id: 'fiber',
      title: t('suggestedFood.sections.fiber.title') || 'Fiber-Rich Foods',
      subtitle: t('suggestedFood.sections.fiber.subtitle') || 'Support digestive health and satiety',
      items: [
        {
          id: 'fiber-1',
          title: t('suggestedFood.sections.fiber.items.oats.title') || 'Oats',
          description: t('suggestedFood.sections.fiber.items.oats.description') || 'Soluble fiber helps lower cholesterol. Great for breakfast.',
        },
        {
          id: 'fiber-2',
          title: t('suggestedFood.sections.fiber.items.vegetables.title') || 'Leafy Greens & Vegetables',
          description: t('suggestedFood.sections.fiber.items.vegetables.description') || 'Low calories, high volume. Add to every meal for fullness.',
        },
        {
          id: 'fiber-3',
          title: t('suggestedFood.sections.fiber.items.legumes.title') || 'Legumes (Beans, Lentils)',
          description: t('suggestedFood.sections.fiber.items.legumes.description') || 'Plant-based protein and fiber. Budget-friendly and nutritious.',
        },
      ],
    },
    {
      id: 'healthy_fat',
      title: t('suggestedFood.sections.healthyFat.title') || 'Healthy Fats',
      subtitle: t('suggestedFood.sections.healthyFat.subtitle') || 'Essential for hormone production and nutrient absorption',
      items: [
        {
          id: 'fat-1',
          title: t('suggestedFood.sections.healthyFat.items.avocado.title') || 'Avocado',
          description: t('suggestedFood.sections.healthyFat.items.avocado.description') || 'Monounsaturated fats. Supports heart health and satiety.',
        },
        {
          id: 'fat-2',
          title: t('suggestedFood.sections.healthyFat.items.nuts.title') || 'Nuts & Seeds',
          description: t('suggestedFood.sections.healthyFat.items.nuts.description') || 'Omega-3 and omega-6 fatty acids. Great for snacks in moderation.',
        },
        {
          id: 'fat-3',
          title: t('suggestedFood.sections.healthyFat.items.oliveOil.title') || 'Olive Oil',
          description: t('suggestedFood.sections.healthyFat.items.oliveOil.description') || 'Extra virgin olive oil for cooking and dressings. Mediterranean diet staple.',
        },
      ],
    },
  ];
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
