import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useI18n } from '../../../app/i18n/hooks';
import { useTheme } from '../../contexts/ThemeContext';
import { LIFESTYLE_CATEGORIES } from '../../data/lifestyleCategories';
import type { LifestyleCategory } from '../../data/lifestyleCategories';

interface CategoryChipsProps {
  selectedCategory: string | null;
  onCategorySelect: (_categoryId: string | null) => void;
}

/**
 * CategoryChips - Horizontal scrollable chips for lifestyle categories
 */
export default function CategoryChips({ selectedCategory, onCategorySelect }: CategoryChipsProps) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const handleCategoryPress = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      onCategorySelect(null); // Deselect if already selected
    } else {
      onCategorySelect(categoryId);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.chip,
          !selectedCategory && styles.chipActive,
          {
            backgroundColor: !selectedCategory
              ? colors.primary
              : colors.surfaceSecondary,
            borderColor: !selectedCategory ? colors.primary : colors.border,
          }
        ]}
        onPress={() => onCategorySelect(null)}
      >
        <Text style={[
          styles.chipText,
          { color: !selectedCategory ? '#FFF' : colors.textSecondary }
        ]}>
          {t('diets_all') || 'All'}
        </Text>
      </TouchableOpacity>

      {LIFESTYLE_CATEGORIES.map((category: LifestyleCategory) => {
        const isSelected = selectedCategory === category.id;
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.chip,
              isSelected && styles.chipActive,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : colors.surfaceSecondary,
                borderColor: isSelected ? colors.primary : colors.border,
              }
            ]}
            onPress={() => handleCategoryPress(category.id)}
          >
            <Text style={styles.emoji}>{category.emoji}</Text>
            <Text style={[
              styles.chipText,
              { color: isSelected ? '#FFF' : colors.textSecondary }
            ]}>
              {t(category.nameKey) || category.id}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipActive: {
    // Active style handled by backgroundColor
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
