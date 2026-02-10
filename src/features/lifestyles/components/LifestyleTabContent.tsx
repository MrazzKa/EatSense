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
// LifestyleTarget type removed - gender filter no longer used
import { LIFESTYLE_CATEGORIES } from '../constants';
import LifestyleCard from './LifestyleCard';
import CategoryChips from './CategoryChips';
import TrendingCarousel from './TrendingCarousel';
import DisclaimerBanner from './DisclaimerBanner';
// PremiumLockModal removed - delegated to DietsScreen which has working handleUnlock flow
// FIX: SuggestProgramCard moved to DietsScreen level for better visibility
// import SuggestProgramCard from '../../../components/programs/SuggestProgramCard';
import ActiveDietWidget from '../../../components/dashboard/ActiveDietWidget';
import { isFreeLifestyle, ENABLE_PREMIUM_LOCK } from '../../../config/freeContent';

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
  imageUrl?: string;
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
  subscription?: any;
  checkLockStatus?: (_programId: string) => boolean;
}

// Helper to check if user has access
const hasAccess = (program: LifestyleProgram, subscription: any): boolean => {
  // Feature flag: when premium lock is disabled, all content is accessible
  if (!ENABLE_PREMIUM_LOCK) return true;

  // 1. Check free list first
  if (isFreeLifestyle(program.id || program.slug || '')) return true;

  // 2. Check if explicitly free
  const isFree = program.price === 'free' || program.type === 'free';
  if (isFree) return true;

  // 3. Check subscription - use hasSubscription from API (source of truth)
  if (!subscription) return false;

  // Primary check: API returns { hasSubscription: true } for active subscribers
  if (subscription.hasSubscription === true) return true;

  // Fallback checks for different subscription object shapes
  const sub = subscription.subscription || subscription;
  const isPremium = (
    sub.status === 'active' ||
    sub.isActive === true ||
    sub.planId === 'monthly' ||
    sub.planId === 'yearly' ||
    sub.planId === 'student' ||
    sub.planId === 'founders' ||
    sub.plan === 'monthly' ||
    sub.plan === 'yearly' ||
    sub.plan === 'student' ||
    sub.plan === 'founders'
  );

  return !!isPremium;
};

// Section data type for grouped rendering
interface SectionData {
  type: 'header' | 'trending' | 'chips' | 'disclaimer' | 'filters' | 'category-header' | 'program' | 'empty' | 'loading' | 'suggest' | 'active-tracker';
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
    subscription,
    checkLockStatus,
  } = props;
  const { t, language } = useI18n();
  const { colors } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // selectedTarget state removed - gender filter disabled (no data to filter by)
  // Removed selectedAgeRange - age filter removed per requirements

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

    // Gender filtering removed - target data not available in programs

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
  }, [programs, selectedCategory, searchQuery, language]);

  // Build flat list data with sections
  const listData = useMemo((): SectionData[] => {
    const data: SectionData[] = [];

    // Loading state handled by parent DietsScreen - removed to prevent double spinner
    // If parent is loading and we have no cached data, show nothing (parent shows skeleton)

    // Active Program Section - Show tracker widget for active lifestyle program
    // Only show if we have an active program AND it's a lifestyle type
    // FIX: Keep tracker visible during loading to prevent flicker - only hide if we truly have no active program
    if (props.activeProgram && props.activeProgram.type === 'lifestyle') {
      data.push({ type: 'active-tracker', data: props.activeProgram });
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

    // FIX 2026-02-04: Removed "For whom" filter as target data is not properly populated in programs
    // The filter was not working correctly and was confusing users

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

    // FIX: SuggestProgramCard moved to DietsScreen level for better visibility
    // Removed from here - now shown at screen level after all content

    return data;
  }, [searchQuery, trendingPrograms, selectedCategory, filteredPrograms, isLoading, props.activeProgram]);

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

      // FIX 2026-02-04: 'filters' case removed - filter was not working

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

      case 'active-tracker':
        // Show tracker widget for active lifestyle program
        return (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <ActiveDietWidget
              activeDiet={item.data}
              onOpenTracker={() => {
                if (item.data?.diet?.id) {
                  onProgramPress(item.data.diet.id);
                }
              }}
              onBrowseDiets={() => { }}
            />
          </View>
        );

      case 'program':
        return (
          <LifestyleCard
            program={item.data}
            isLocked={checkLockStatus ? checkLockStatus(item.data.id || item.data.slug) : !hasAccess(item.data, subscription)}
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

      // FIX: SuggestProgramCard moved to DietsScreen level
      // case 'suggest' removed

      default:
        return null;
    }
  }, [selectedCategory, colors, t, onProgramPress, searchQuery, subscription]);

  // Key extractor
  const keyExtractor = useCallback((item: SectionData, index: number) => {
    if (item.type === 'program') {
      return `program-${item.data.id || item.data.slug}`;
    }
    return `${item.type}-${index}`;
  }, []);

  return (
    <View style={{ flex: 1 }}>
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
      {/* PremiumLockModal removed - handled by DietsScreen with working trial flow */}
    </View>
  );
}

// FiltersSection component removed - gender filter no longer used (no data available)

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
  // Filter styles removed - filter component no longer exists
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
