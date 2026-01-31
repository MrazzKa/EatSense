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
import PremiumLockModal from '../../../components/common/PremiumLockModal';
// FIX: SuggestProgramCard moved to DietsScreen level for better visibility
// import SuggestProgramCard from '../../../components/programs/SuggestProgramCard';
import ActiveDietWidget from '../../../components/dashboard/ActiveDietWidget';
import { isFreeLifestyle } from '../../../config/freeContent';

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
}

// Helper to check if user has access
const hasAccess = (program: LifestyleProgram, subscription: any): boolean => {
  // 1. Check free list first
  if (isFreeLifestyle(program.id || program.slug || '')) return true;

  // 2. Check if explicitly free
  const isFree = program.price === 'free' || program.type === 'free';
  if (isFree) return true;

  // 3. Check subscription
  const isPremium = subscription && (
    subscription.planId === 'premium_monthly' ||
    subscription.planId === 'premium_yearly' ||
    subscription.status === 'active' ||
    subscription.isActive === true
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
  } = props;
  const { t, language } = useI18n();
  const { colors } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<LifestyleTarget | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  // Handler for program press with lock check
  const handleProgramPress = useCallback((program: LifestyleProgram) => {
    const locked = !hasAccess(program, subscription);
    if (locked) {
      setShowLockModal(true);
    } else {
      onProgramPress(program.id || program.slug);
    }
  }, [subscription, onProgramPress]);
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

    if (selectedTarget) {
      // FIX #6: Filter by target - handle both 'all' (show all) and specific targets
      // Normalize comparison to handle case-insensitive matching and synonyms
      if (selectedTarget !== 'all') {
        const targetSynonyms: Record<string, string[]> = {
          male: ['male', 'men', 'man', 'masculine'],
          female: ['female', 'women', 'woman', 'feminine'],
        };
        const normalizedSelected = selectedTarget.toLowerCase().trim();
        const validTargets = targetSynonyms[normalizedSelected] || [normalizedSelected];

        result = result.filter(p => {
          // Handle programs with no target (show for all) or matching target
          const programTarget = (p.target || '').toLowerCase().trim();

          // Show program if:
          // 1. Program has no target (empty/null)
          // 2. Program target is explicitly 'all'
          // 3. Program target matches selected target (or synonyms)
          return !programTarget || programTarget === 'all' || validTargets.includes(programTarget);
        });
      }
      // If selectedTarget === 'all', show all programs (no filtering)
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
  }, [programs, selectedCategory, selectedTarget, searchQuery, language]);

  // Build flat list data with sections
  const listData = useMemo((): SectionData[] => {
    const data: SectionData[] = [];

    // Loading state handled by parent DietsScreen - removed to prevent double spinner
    // If parent is loading and we have no cached data, show nothing (parent shows skeleton)

    // Active Program Section - Show tracker widget for active lifestyle program
    // Only show if we have an active program AND it's a lifestyle type
    // FIX: Use stable check to prevent tracker from appearing/disappearing
    // Only show tracker if activeProgram exists and is stable (not loading)
    if (props.activeProgram && props.activeProgram.type === 'lifestyle' && !isLoading) {
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

      case 'filters':
        return (
          <FiltersSection
            selectedTarget={selectedTarget}
            onTargetSelect={setSelectedTarget}
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
            isLocked={!hasAccess(item.data, subscription)}
            onPress={() => handleProgramPress(item.data)}
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
  }, [selectedCategory, selectedTarget, colors, t, onProgramPress, searchQuery, handleProgramPress, subscription]);

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
      <PremiumLockModal
        visible={showLockModal}
        onClose={() => setShowLockModal(false)}
        onUnlock={() => {
          setShowLockModal(false);
          // Navigate to paywall or trigger potential purchase flow
          // For now, maybe navigate to Profile or just close
          // Ideally should open Paywall
          // console.log('Unlock pressed');
        }}
      />
    </View>
  );
}

// Extracted Filters component for better memoization
interface FiltersSectionProps {
  selectedTarget: LifestyleTarget | null;
  onTargetSelect: (_target: LifestyleTarget | null) => void;
  colors: any;
  t: (_key: string) => string;
}

const FiltersSection = React.memo(function FiltersSection({
  selectedTarget,
  onTargetSelect,
  colors,
  t,
}: FiltersSectionProps) {
  return (
    <View style={styles.filtersContainer}>
      {/* Target Filter */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary || '#666' }]}>
          {t('lifestyles.filters_target_label') || 'Target:'}
        </Text>
        <View style={styles.filterChips}>
          {(['all', 'male', 'female'] as LifestyleTarget[]).map((target) => {
            const isSelected = selectedTarget === target || (target === 'all' && selectedTarget === null);
            return (
              <TouchableOpacity
                key={target}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                  {
                    backgroundColor:
                      isSelected
                        ? colors.primary
                        : colors.inputBackground || colors.surfaceSecondary || '#F5F5F5',
                  },
                ]}
                onPress={() => {
                  if (target === 'all') {
                    // Tapping 'all' always resets to null (default state)
                    onTargetSelect(null);
                  } else {
                    // Toggle other targets
                    onTargetSelect(selectedTarget === target ? null : target);
                  }
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        isSelected
                          ? '#FFF'
                          : colors.textSecondary || '#666',
                    },
                  ]}
                >
                  {t(`lifestyles.filters_target_${target}`) || target}
                </Text>
              </TouchableOpacity>
            );
          })}
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
