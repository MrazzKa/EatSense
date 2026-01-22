/**
 * LifestyleTabContent - UNIFIED VERSION using API data
 * 
 * CHANGES FROM ORIGINAL:
 * 1. Removed local LIFESTYLE_PROGRAMS import
 * 2. Uses programs from props (loaded from API in DietsScreen)
 * 3. Uses featuredPrograms for TrendingCarousel
 * 4. Shows loading skeleton when isLoading
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  type ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../app/i18n/hooks';
import { useTheme } from '../../../contexts/ThemeContext';
import type { LifestyleTarget } from '../types';
import { LIFESTYLE_CATEGORIES } from '../constants';
import LifestyleCard from './LifestyleCard';
import CategoryChips from './CategoryChips';
import TrendingCarousel from './TrendingCarousel';
import DisclaimerBanner from './DisclaimerBanner';
import SuggestProgramCard from '../../../components/programs/SuggestProgramCard';

// Card height for getItemLayout optimization
const CARD_HEIGHT = 180;
const CARD_MARGIN = 12;

interface LifestyleProgram {
  id: string;
  slug: string;
  name: { en: string; ru?: string; kk?: string };
  subtitle?: { en: string; ru?: string; kk?: string };
  tagline?: { en: string; ru?: string; kk?: string };
  category?: string;
  uiGroup?: string;
  target?: string;
  ageRange?: string;
  type?: string;
  [key: string]: any;
}

interface LifestyleTabContentProps {
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  onProgramPress: (_programId: string) => void;
  programs?: LifestyleProgram[];
  featuredPrograms?: LifestyleProgram[];
  isLoading?: boolean;
  activeProgram?: any;
}

// Section data type for grouped rendering
interface SectionData {
  type: 'header' | 'trending' | 'chips' | 'disclaimer' | 'filters' | 'category-header' | 'program' | 'empty' | 'loading' | 'suggest';
  data?: any;
  categoryId?: string;
}

// Map API uiGroup to LIFESTYLE_CATEGORIES id
function mapUiGroupToCategoryId(uiGroup: string): string {
  const mapping: Record<string, string> = {
    'Trending': 'TRENDING',
    'Weight Loss': 'GOAL_LOSE_WEIGHT',
    'Build Muscle': 'GOAL_BUILD_MUSCLE',
    'Clear Skin': 'GOAL_CLEAR_SKIN',
    'More Energy': 'GOAL_MORE_ENERGY',
    'Destinations': 'DESTINATIONS',
    'Aesthetics': 'AESTHETICS',
    'Warrior Mode': 'WARRIOR_MODE',
    'Seasonal': 'SEASONAL',
  };
  return mapping[uiGroup] || uiGroup;
}

export default function LifestyleTabContent(props: LifestyleTabContentProps) {
  const {
    searchQuery,
    onProgramPress,
    programs = [],
    featuredPrograms = [],
    isLoading = false,
  } = props;
  const { t, language } = useI18n();
  const { colors } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<LifestyleTarget | null>(null);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);

  // Memoized trending programs from featured
  const trendingPrograms = useMemo(() => {
    return featuredPrograms.slice(0, 8);
  }, [featuredPrograms]);

  // Memoized filtered programs
  const filteredPrograms = useMemo(() => {
    let result = programs;

    if (selectedCategory) {
      result = result.filter(p => {
        const categoryId = mapUiGroupToCategoryId(p.uiGroup || '');
        return categoryId === selectedCategory || p.category === selectedCategory;
      });
    }

    if (selectedTarget) {
      result = result.filter(p => p.target === selectedTarget);
    }

    if (selectedAgeRange) {
      result = result.filter(p => {
        const programAge = p.ageRange || '18-50';
        return programAge.includes(selectedAgeRange) || !selectedAgeRange;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(program => {
        const name = (program.name?.[language as keyof typeof program.name] || program.name?.en || '').toLowerCase();
        const tagline = (program.tagline?.[language as keyof typeof program.tagline] || program.tagline?.en || '').toLowerCase();
        const subtitle = (program.subtitle?.[language as keyof typeof program.subtitle] || program.subtitle?.en || '').toLowerCase();
        return name.includes(query) || tagline.includes(query) || subtitle.includes(query);
      });
    }

    return result;
  }, [programs, selectedCategory, selectedTarget, selectedAgeRange, searchQuery, language]);

  // Build flat list data with sections
  const listData = useMemo((): SectionData[] => {
    const data: SectionData[] = [];

    // Loading state handled by parent DietsScreen - removed to prevent double spinner
    // If parent is loading and we have no cached data, show nothing (parent shows skeleton)

    // Active Program Section (New)
    // Only show if we have an active program
    // And either it's explicitly a lifestyle or we are in Lifestyle tab (implied)
    // We check type or category to filter out Diet programs if needed, 
    // but typically the activeProgram passed here is the user's single active program.
    // If it's a diet, maybe we shouldn't show it here? 
    // Let's assume for now we show it if it's 'LIFESTYLE' type or has a matching category.
    // However, if the user has ANY active program, it's usually valuable to see it.
    // Let's filter to show only if it seems to be a lifestyle program or generic.
    if (props.activeProgram) {
      // Simple check: if it has a 'category' that maps to lifestyle or type is lifestyle
      // const isLifestyle = props.activeProgram.type === 'LIFESTYLE' ||
      // (props.activeProgram.id && programs.some(p => p.id === props.activeProgram.id));

      // Force show for now as requested "display your active lifestyle program"
      data.push({ type: 'header', data: { title: t('diets.active_program') || 'Active Program' } });
      data.push({ type: 'program', data: { ...props.activeProgram, isActive: true } });
    }

    // Trending section (only if not searching and have featured)
    if (!searchQuery && trendingPrograms.length > 0) {
      data.push({ type: 'trending', data: trendingPrograms });
    }

    // Category chips (only if not searching)
    if (!searchQuery) {
      data.push({ type: 'chips' });
    }

    // Disclaimer banner
    data.push({ type: 'disclaimer' });

    // Filters (only if not searching)
    if (!searchQuery) {
      data.push({ type: 'filters' });
    }

    // Programs grouped by category or flat list
    if (selectedCategory) {
      // Show programs for selected category
      if (filteredPrograms.length > 0) {
        data.push({ type: 'category-header', categoryId: selectedCategory });
        filteredPrograms.forEach(program => {
          data.push({ type: 'program', data: program });
        });
      } else {
        data.push({ type: 'empty' });
      }
    } else {
      // Show all programs grouped by category
      LIFESTYLE_CATEGORIES.forEach(category => {
        const categoryPrograms = filteredPrograms.filter(p => {
          const catId = mapUiGroupToCategoryId(p.uiGroup || '');
          return catId === category.id || p.category === category.id.toLowerCase();
        });
        if (categoryPrograms.length > 0) {
          data.push({ type: 'category-header', categoryId: category.id, data: { count: categoryPrograms.length, emoji: category.emoji } });
          categoryPrograms.forEach(program => {
            data.push({ type: 'program', data: program });
          });
        }
      });
    }

    // Empty state
    if (filteredPrograms.length === 0 && !isLoading) {
      data.push({ type: 'empty' });
    }

    // Suggest program card at the end
    if (!searchQuery && programs.length > 0) {
      data.push({ type: 'suggest' });
    }

    return data;
  }, [searchQuery, trendingPrograms, selectedCategory, filteredPrograms, isLoading, programs, props.activeProgram, t]);

  // Memoized render item
  const renderItem: ListRenderItem<SectionData> = useCallback(({ item }) => {
    switch (item.type) {
      case 'loading':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary || '#4CAF50'} />
            <Text style={[styles.loadingText, { color: colors.textSecondary || '#666' }]}>
              {t('lifestyles.loading') || 'Loading lifestyle programs...'}
            </Text>
          </View>
        );

      case 'header':
        return (
          <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
              {item.data?.title}
            </Text>
          </View>
        );

      case 'trending':
        return <TrendingCarousel programs={item.data} onProgramPress={onProgramPress} />;

      case 'chips':
        return (
          <CategoryChips
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        );

      case 'disclaimer':
        return <DisclaimerBanner />;

      case 'filters':
        return (
          <FiltersSection
            selectedTarget={selectedTarget}
            selectedAgeRange={selectedAgeRange}
            onTargetSelect={setSelectedTarget}
            onAgeRangeSelect={setSelectedAgeRange}
            colors={colors}
            t={t}
          />
        );

      case 'category-header':
        return (
          <View style={styles.categoryHeader}>
            {item.data?.emoji && <Text style={styles.categoryEmoji}>{item.data.emoji}</Text>}
            <Text style={[styles.categoryTitle, { color: colors.textPrimary || '#212121' }]}>
              {t(`lifestyles.categories.${item.categoryId}`) || item.categoryId}
            </Text>
            {item.data?.count && (
              <Text style={[styles.categoryCount, { color: colors.textTertiary || '#999' }]}>
                ({item.data.count})
              </Text>
            )}
          </View>
        );

      case 'program':
        return (
          <LifestyleCard
            program={item.data}
            onPress={() => onProgramPress(item.data.id || item.data.slug)}
          />
        );

      case 'empty':
        return (
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={64} color={colors.textTertiary || '#CCC'} />
            <Text style={[styles.emptyText, { color: colors.textSecondary || '#999' }]}>
              {searchQuery
                ? t('lifestyles.empty') || 'No programs found'
                : t('lifestyles.empty') || 'No programs available'}
            </Text>
          </View>
        );

      case 'suggest':
        return <SuggestProgramCard type="lifestyle" />;

      default:
        return null;
    }
  }, [selectedCategory, selectedTarget, selectedAgeRange, colors, t, onProgramPress, searchQuery]);

  // Key extractor
  const keyExtractor = useCallback((item: SectionData, index: number) => {
    if (item.type === 'program') {
      return `program-${item.data.id || item.data.slug}`;
    }
    return `${item.type}-${index}`;
  }, []);

  return (
    <FlatList
      data={listData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      windowSize={5}
      initialNumToRender={8}
      maxToRenderPerBatch={5}
      removeClippedSubviews={true}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    />
  );
}

// Extracted Filters component for better memoization
interface FiltersSectionProps {
  selectedTarget: LifestyleTarget | null;
  selectedAgeRange: string | null;
  onTargetSelect: (_target: LifestyleTarget | null) => void;
  onAgeRangeSelect: (_range: string | null) => void;
  colors: any;
  t: (_key: string) => string;
}

const FiltersSection = React.memo(function FiltersSection({
  selectedTarget,
  selectedAgeRange,
  onTargetSelect,
  onAgeRangeSelect,
  colors,
  t,
}: FiltersSectionProps) {
  const ageRanges = ['18-30', '30-50', '50+'];

  return (
    <View style={styles.filtersContainer}>
      {/* Target Filter */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary || '#666' }]}>
          {t('lifestyles.filters.target.label') || t('lifestyles.filters.target') || 'Target:'}
        </Text>
        <View style={styles.filterChips}>
          {(['all', 'male', 'female'] as LifestyleTarget[]).map((target) => (
            <TouchableOpacity
              key={target}
              style={[
                styles.filterChip,
                selectedTarget === target && styles.filterChipActive,
                {
                  backgroundColor:
                    selectedTarget === target
                      ? colors.primary
                      : colors.inputBackground || colors.surfaceSecondary || '#F5F5F5',
                },
              ]}
              onPress={() => onTargetSelect(selectedTarget === target ? null : target)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      selectedTarget === target
                        ? '#FFF'
                        : colors.textSecondary || '#666',
                  },
                ]}
              >
                {t(`lifestyles.filters.target.${target}`) || target}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Age Range Filter */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary || '#666' }]}>
          {t('lifestyles.filters.age.label') || t('lifestyles.filters.age') || 'Age:'}
        </Text>
        <View style={styles.filterChips}>
          {ageRanges.map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterChip,
                selectedAgeRange === range && styles.filterChipActive,
                {
                  backgroundColor:
                    selectedAgeRange === range
                      ? colors.primary
                      : colors.inputBackground || colors.surfaceSecondary || '#F5F5F5',
                },
              ]}
              onPress={() => onAgeRangeSelect(selectedAgeRange === range ? null : range)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      selectedAgeRange === range
                        ? '#FFF'
                        : colors.textSecondary || '#666',
                  },
                ]}
              >
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipActive: {},
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  categoryCount: {
    fontSize: 14,
    marginLeft: 'auto',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
