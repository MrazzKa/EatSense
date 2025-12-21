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
    const translateX = dragX.interpolate({
      inputRange: [-200, 0],
      outputRange: [0, 200],
      extrapolate: 'clamp',
    });

    const deleteScale = dragX.interpolate({
      inputRange: [-200, -100, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    const editScale = dragX.interpolate({
      inputRange: [-200, -100, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActions}>
        <Animated.View
          style={[
            styles.actionButton,
            styles.editButton,
            {
              backgroundColor: colors.primary,
              transform: [{ translateX }, { scale: editScale }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.actionButtonContent}
            onPress={() => {
              if (onPress && typeof onPress === 'function') {
                onPress();
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t('common.edit') || 'Edit'}</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View
          style={[
            styles.actionButton,
            styles.deleteButton,
            {
              backgroundColor: colors.error || '#FF3B30',
              transform: [{ translateX }, { scale: deleteScale }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.actionButtonContent}
            onPress={() => {
              if (onDelete && typeof onDelete === 'function') {
                onDelete(ingredient, index);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t('common.delete') || 'Delete'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 16,
  },
  actionButton: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
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
    backgroundColor: '#FF3B30',
  },
});

