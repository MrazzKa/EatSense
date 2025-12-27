import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, I18nManager } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { formatMacro } from '../utils/nutritionFormat';

/**
 * Swipeable ingredient item with edit/delete actions
 * Uses react-native-gesture-handler Swipeable component
 */
export const SwipeableIngredientItem = ({
  ingredient,
  index,
  onPress,
  onDelete,
  allowEditing = true
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const swipeableRef = useRef(null);

  const closeSwipeable = useCallback(() => {
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  }, []);

  const handleEdit = useCallback(() => {
    closeSwipeable();
    setTimeout(() => {
      if (onPress && typeof onPress === 'function') {
        onPress();
      }
    }, 100);
  }, [closeSwipeable, onPress]);

  const handleDelete = useCallback(() => {
    closeSwipeable();
    setTimeout(() => {
      if (onDelete && typeof onDelete === 'function') {
        onDelete(ingredient, index);
      }
    }, 100);
  }, [closeSwipeable, onDelete, ingredient, index]);

  // Render right swipe actions (Edit and Delete buttons)
  const renderRightActions = useCallback((progress, dragX) => {
    // Animation for buttons appearance
    const translateX = dragX.interpolate({
      inputRange: [-150, 0],
      outputRange: [0, 150],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.rightActionsContainer,
          {
            transform: [{ translateX }],
            opacity,
          }
        ]}
      >
        {/* Edit Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.editButton,
            {
              backgroundColor: colors.surface || '#FFFFFF',
              borderColor: colors.border || '#E5E5E5',
            },
          ]}
          onPress={handleEdit}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={20} color={colors.textPrimary || '#333333'} />
          <Text style={[styles.actionButtonText, { color: colors.textPrimary || '#333333' }]}>
            {t('common.edit') || 'Edit'}
          </Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.deleteButton,
            {
              backgroundColor: '#FEE2E2',
              borderColor: '#FECACA',
            },
          ]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
          <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>
            {t('common.delete') || 'Delete'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [colors, t, handleEdit, handleDelete]);

  // Ingredient content component
  const IngredientContent = () => (
    <View style={[
      styles.ingredientCard,
      { backgroundColor: colors.card || colors.surface || '#FFFFFF' }
    ]}>
      <View style={styles.ingredientInfo}>
        <Text
          style={[styles.ingredientName, { color: colors.textPrimary || '#1F2937' }]}
          numberOfLines={2}
        >
          {ingredient.name}
        </Text>
        <Text style={[styles.ingredientWeight, { color: colors.textSecondary || '#6B7280' }]}>
          {ingredient.weight || ingredient.portion_g || 0} {t('analysis.grams') || 'г'}
        </Text>
      </View>

      <View style={styles.nutritionInfo}>
        {ingredient.hasNutrition === false ? (
          <Text style={[styles.noNutritionText, { color: colors.textTertiary || '#9CA3AF' }]}>
            {t('analysis.noNutritionData') || 'Нет данных'}
          </Text>
        ) : (
          <>
            <Text style={[styles.caloriesText, { color: colors.textPrimary || '#1F2937' }]}>
              {Math.round(ingredient.calories || 0)} {t('analysis.kcal') || 'ккал'}
            </Text>
            <Text style={[styles.macrosText, { color: colors.textSecondary || '#6B7280' }]}>
              Б: {formatMacro(ingredient.protein)} · У: {formatMacro(ingredient.carbs)} · Ж: {formatMacro(ingredient.fat)}
            </Text>
          </>
        )}
      </View>

      {/* Swipe hint indicator */}
      {allowEditing && (
        <View style={styles.swipeHint}>
          <Ionicons
            name="chevron-back"
            size={16}
            color={colors.textTertiary || '#D1D5DB'}
          />
        </View>
      )}
    </View>
  );

  // Read-only mode - no swipe
  if (!allowEditing) {
    return <IngredientContent />;
  }

  // Swipeable mode
  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={50}
      overshootRight={false}
      friction={2}
      useNativeAnimations={true}
      containerStyle={styles.swipeableContainer}
      childrenContainerStyle={styles.swipeableContent}
    >
      <TouchableOpacity
        onPress={handleEdit}
        activeOpacity={0.8}
        delayPressIn={50}
      >
        <IngredientContent />
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    marginBottom: 8,
    overflow: 'visible',
  },
  swipeableContent: {
    overflow: 'visible',
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 8,
    gap: 6,
  },
  actionButton: {
    width: 68,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  editButton: {
    // Styles applied via inline
  },
  deleteButton: {
    // Styles applied via inline
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  ingredientInfo: {
    flex: 1,
    marginRight: 12,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 22,
  },
  ingredientWeight: {
    fontSize: 13,
  },
  nutritionInfo: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  caloriesText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  macrosText: {
    fontSize: 11,
  },
  noNutritionText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  swipeHint: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
});

export default SwipeableIngredientItem;
