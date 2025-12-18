import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { formatMacro } from '../utils/nutritionFormat';

export const SwipeableIngredientItem = ({ 
  ingredient, 
  index, 
  onPress, 
  onDelete, 
  allowEditing = true 
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.error || '#FF3B30' }]}
        onPress={() => {
          if (onDelete && typeof onDelete === 'function') {
            onDelete(ingredient, index);
          }
        }}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
        </Animated.View>
        <Text style={styles.deleteButtonText}>{t('common.delete') || 'Delete'}</Text>
      </TouchableOpacity>
    );
  };

  if (!allowEditing) {
    // Non-swipeable version for read-only mode
    return (
      <TouchableOpacity
        style={[styles.ingredientItem, styles.ingredientItemDisabled]}
        onPress={onPress}
        disabled={!allowEditing}
        activeOpacity={allowEditing ? 0.7 : 1}
      >
        <View style={styles.ingredientInfo}>
          <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>{ingredient.name}</Text>
          <Text style={[styles.ingredientAmount, { color: colors.textSecondary }]}>{ingredient.weight}g</Text>
        </View>
        <View style={styles.ingredientNutrition}>
          {ingredient.hasNutrition === false ? (
            <Text style={[styles.ingredientCalories, { color: colors.textTertiary, fontStyle: 'italic' }]}>
              {t('analysis.noNutritionData')}
            </Text>
          ) : (
            <>
              <Text style={[styles.ingredientCalories, { color: colors.textPrimary }]}>{ingredient.calories} cal</Text>
              <Text style={[styles.ingredientMacros, { color: colors.textSecondary }]}>
                P: {formatMacro(ingredient.protein)} • C: {formatMacro(ingredient.carbs)} • F: {formatMacro(ingredient.fat)}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[styles.ingredientItem, !allowEditing && styles.ingredientItemDisabled]}
        onPress={onPress}
        disabled={!allowEditing}
        activeOpacity={allowEditing ? 0.7 : 1}
      >
        <View style={styles.ingredientInfo}>
          <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>{ingredient.name}</Text>
          <Text style={[styles.ingredientAmount, { color: colors.textSecondary }]}>{ingredient.weight}g</Text>
        </View>
        <View style={styles.ingredientNutrition}>
          {ingredient.hasNutrition === false ? (
            <Text style={[styles.ingredientCalories, { color: colors.textTertiary, fontStyle: 'italic' }]}>
              {t('analysis.noNutritionData')}
            </Text>
          ) : (
            <>
              <Text style={[styles.ingredientCalories, { color: colors.textPrimary }]}>{ingredient.calories} cal</Text>
              <Text style={[styles.ingredientMacros, { color: colors.textSecondary }]}>
                P: {formatMacro(ingredient.protein)} • C: {formatMacro(ingredient.carbs)} • F: {formatMacro(ingredient.fat)}
              </Text>
            </>
          )}
        </View>
        {allowEditing && (
          <TouchableOpacity
            style={styles.editIcon}
            onPress={onPress}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  ingredientItemDisabled: {
    opacity: 0.6,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  ingredientAmount: {
    fontSize: 14,
  },
  ingredientNutrition: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  ingredientCalories: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  ingredientMacros: {
    fontSize: 12,
  },
  editIcon: {
    padding: 8,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

