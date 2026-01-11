/**
 * LifestyleTabContent - Main content for the "Lifestyle" tab
 * Based on EatSense_Lifestyles_V2 specification
 * 
 * Features:
 * - Trending section (TRENDING category programs)
 * - Category chips filter
 * - Disclaimer banner (mandatory)
 * - Search functionality (name/tagline/vibe)
 * - Filters: target (male/female/all), age range
 * - Program catalog grouped by category
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../app/i18n/hooks';
import { useTheme } from '../../../contexts/ThemeContext';
import type { LifestyleProgram, LifestyleTarget } from '../types';
import { LIFESTYLE_PROGRAMS, getTrendingPrograms, getProgramsByCategory } from '../data/lifestylePrograms';
import { LIFESTYLE_CATEGORIES } from '../constants';
import LifestyleCard from './LifestyleCard';
import CategoryChips from './CategoryChips';
import TrendingCarousel from './TrendingCarousel';
import DisclaimerBanner from './DisclaimerBanner';

interface LifestyleTabContentProps {
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  onProgramPress: (_programId: string) => void;
}

export default function LifestyleTabContent({
  searchQuery,
  onSearchChange: _onSearchChange,
  onProgramPress,
}: LifestyleTabContentProps) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<LifestyleTarget | null>(null);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);

  // Get trending programs
  const trendingPrograms = useMemo(() => {
    return getTrendingPrograms().slice(0, 8); // Limit to 8
  }, []);

  // Filter programs
  const filteredPrograms = useMemo(() => {
    let programs = LIFESTYLE_PROGRAMS;

    // Filter by category
    if (selectedCategory) {
      programs = getProgramsByCategory(selectedCategory);
    }

    // Filter by target
    if (selectedTarget) {
      programs = programs.filter(p => p.target === selectedTarget);
    }

    // Filter by age range (simplified matching)
    if (selectedAgeRange) {
      programs = programs.filter(p => {
        // Simple age range matching - could be improved
        const programAge = p.ageRange || '18-50';
        return programAge.includes(selectedAgeRange) || !selectedAgeRange;
      });
    }

    // Filter by search query (name, tagline, vibe)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      programs = programs.filter(program => {
        const name = (program.name[language as keyof typeof program.name] || program.name.en || '').toLowerCase();
        const tagline = (program.tagline[language as keyof typeof program.tagline] || program.tagline.en || '').toLowerCase();
        const vibe = program.vibe.toLowerCase();
        return name.includes(query) || tagline.includes(query) || vibe.includes(query);
      });
    }

    return programs;
  }, [selectedCategory, selectedTarget, selectedAgeRange, searchQuery, language]);

  // Group programs by category
  const groupedPrograms = useMemo(() => {
    const groups: Record<string, LifestyleProgram[]> = {};
    filteredPrograms.forEach(program => {
      const categoryId = program.categoryId;
      if (!groups[categoryId]) groups[categoryId] = [];
      groups[categoryId].push(program);
    });
    return groups;
  }, [filteredPrograms]);

  const ageRanges = ['18-30', '30-50', '50+'];

  return (
    <View style={styles.container}>
      {/* Trending Section */}
      {trendingPrograms.length > 0 && !searchQuery && (
        <TrendingCarousel programs={trendingPrograms} onProgramPress={onProgramPress} />
      )}

      {/* Category Chips */}
      {!searchQuery && (
        <CategoryChips
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      )}

      {/* Mandatory Disclaimer */}
      <DisclaimerBanner />

      {/* Filters: Target and Age */}
      {!searchQuery && (
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
                  onPress={() => setSelectedTarget(selectedTarget === target ? null : target)}
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
                  onPress={() => setSelectedAgeRange(selectedAgeRange === range ? null : range)}
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
      )}

      {/* Program List */}
      {selectedCategory ? (
        // Show programs for selected category
        <View style={styles.categorySection}>
          <Text
            style={[
              styles.categoryTitle,
              { color: colors.textPrimary || '#212121' },
            ]}
          >
            {t(`lifestyles.categories.${selectedCategory}`) || selectedCategory}
          </Text>
          {filteredPrograms.length > 0 ? (
            filteredPrograms.map((program) => (
              <LifestyleCard
                key={program.id}
                program={program}
                onPress={() => onProgramPress(program.id)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="leaf-outline" size={48} color={colors.textTertiary || '#CCC'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary || '#999' }]}>
                {t('lifestyles.empty') || 'No programs found'}
              </Text>
            </View>
          )}
        </View>
      ) : (
        // Show all programs grouped by category
        LIFESTYLE_CATEGORIES.map((category) => {
          const categoryPrograms = groupedPrograms[category.id] || [];
          if (categoryPrograms.length === 0 && !searchQuery) return null;

          return (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text
                  style={[
                    styles.categoryTitle,
                    { color: colors.textPrimary || '#212121' },
                  ]}
                >
                  {t(category.nameKey) || category.id}
                </Text>
                <Text
                  style={[
                    styles.categoryCount,
                    { color: colors.textTertiary || '#999' },
                  ]}
                >
                  ({categoryPrograms.length})
                </Text>
              </View>
              {categoryPrograms.map((program) => (
                <LifestyleCard
                  key={program.id}
                  program={program}
                  onPress={() => onProgramPress(program.id)}
                />
              ))}
            </View>
          );
        })
      )}

      {/* Empty State */}
      {filteredPrograms.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="leaf-outline" size={64} color={colors.textTertiary || '#CCC'} />
          <Text style={[styles.emptyText, { color: colors.textSecondary || '#999' }]}>
            {searchQuery
              ? t('lifestyles.empty') || 'No programs found'
              : t('lifestyles.empty') || 'No programs available'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
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
  filterChipActive: {
    // Active style handled by backgroundColor
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  categorySection: {
    marginTop: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
