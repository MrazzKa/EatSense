// @ts-nocheck
import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
  allowEditing = true,
  swipeRef, // Optional: external ref to control swipeable
  onSwipeableWillOpen, // Optional: callback when swipe will open (to close other swipes)
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const swipeableRef = useRef(null);

  // Expose close function via swipeRef if provided
  React.useImperativeHandle(swipeRef, () => ({
    close: () => {
      if (swipeableRef.current) {
        swipeableRef.current.close();
      }
    }
  }), []);

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
      inputRange: [-110, 0],
      outputRange: [0, 110],
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
          <Ionicons name="pencil" size={22} color={colors.textPrimary || '#333333'} />
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
          <Ionicons name="trash-outline" size={22} color="#DC2626" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, [colors, handleEdit, handleDelete]);

  // Read-only mode - no swipe
  if (!allowEditing) {
    return <IngredientContent ingredient={ingredient} colors={colors} t={t} styles={styles} allowEditing={allowEditing} />;
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
      onSwipeableWillOpen={() => {
        // Notify parent that this swipe is opening (to close others)
        if (onSwipeableWillOpen && typeof onSwipeableWillOpen === 'function') {
          onSwipeableWillOpen(index);
        }
      }}
    >
      <TouchableOpacity
        onPress={handleEdit}
        activeOpacity={0.8}
        delayPressIn={50}
      >
        <IngredientContent ingredient={ingredient} colors={colors} t={t} styles={styles} allowEditing={allowEditing} />
      </TouchableOpacity>
    </Swipeable>
  );
}; // End of SwipeableIngredientItem

// Extracted Component
const IngredientContent = ({ ingredient, colors, t, styles, allowEditing }) => {
  const allergyMatches = Array.isArray(ingredient?.userFlags?.allergyMatch)
    ? ingredient.userFlags.allergyMatch
    : [];
  const dietViolations = Array.isArray(ingredient?.userFlags?.dietViolation)
    ? ingredient.userFlags.dietViolation
    : [];
  const conditionWarnings = Array.isArray(ingredient?.userFlags?.conditionWarning)
    ? ingredient.userFlags.conditionWarning
    : [];
  const hasUserWarnings = allergyMatches.length > 0 || dietViolations.length > 0 || conditionWarnings.length > 0;
  const localizeAllergy = (value) => t(`allergies.items.${value}`) || value;
  const localizeDiet = (value) => t(`analysis.dietViolation.items.${value}`) || value;
  const localizeCondition = (value) => t(`analysis.conditionWarning.items.${value}`) || value;

  return (
  <View style={[
    styles.ingredientCard,
    hasUserWarnings && styles.ingredientCardWarning,
    { backgroundColor: hasUserWarnings ? '#FFF7ED' : (colors.card || colors.surface || '#FFFFFF') }
  ]}>
    <View style={styles.ingredientInfo}>
      <Text
        style={[styles.ingredientName, { color: colors.textPrimary || '#1F2937' }]}
        numberOfLines={2}
      >
        {/* Capitalize ingredient name */}
        {ingredient.name
          ? ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1)
          : 'Ingredient'}
      </Text>
      <Text style={[styles.ingredientWeight, { color: colors.textSecondary || '#6B7280' }]}>
        {ingredient.weight || ingredient.portion_g || 0} {t('analysis.grams') || 'г'}
      </Text>
      {hasUserWarnings && (
        <View style={styles.warningBadges}>
          {allergyMatches.length > 0 && (
            <View style={[styles.warningBadge, styles.allergyBadge]}>
              <Ionicons name="warning" size={12} color="#B91C1C" />
              <Text style={[styles.warningBadgeText, { color: '#B91C1C' }]} numberOfLines={1}>
                {t('analysis.allergyWarning.badgeTitle') || 'Allergen'}: {allergyMatches.map(localizeAllergy).join(', ')}
              </Text>
            </View>
          )}
          {dietViolations.length > 0 && (
            <View style={[styles.warningBadge, styles.dietBadge]}>
              <Ionicons name="alert-circle" size={12} color="#92400E" />
              <Text style={[styles.warningBadgeText, { color: '#92400E' }]} numberOfLines={1}>
                {t('analysis.dietViolation.title') || 'Diet'}: {dietViolations.map(localizeDiet).join(', ')}
              </Text>
            </View>
          )}
          {conditionWarnings.length > 0 && (
            <View style={[styles.warningBadge, styles.conditionBadge]}>
              <Ionicons name="medkit" size={12} color="#9A3412" />
              <Text style={[styles.warningBadgeText, { color: '#9A3412' }]} numberOfLines={1}>
                {t('analysis.conditionWarning.title') || 'Health'}: {conditionWarnings.map(localizeCondition).join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}
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
            {t('analysis.proteinShort') || 'P'}: {formatMacro(ingredient.protein)} · {t('analysis.carbsShort') || 'C'}: {formatMacro(ingredient.carbs)} · {t('analysis.fatShort') || 'F'}: {formatMacro(ingredient.fat)}
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
    width: 48,
    height: 48,
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
  ingredientCardWarning: {
    borderWidth: 1,
    borderColor: '#FDBA74',
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
    textTransform: 'capitalize',
  },
  ingredientWeight: {
    fontSize: 13,
  },
  warningBadges: {
    marginTop: 8,
    gap: 6,
  },
  warningBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  allergyBadge: {
    backgroundColor: '#FEE2E2',
  },
  dietBadge: {
    backgroundColor: '#FEF3C7',
  },
  conditionBadge: {
    backgroundColor: '#FFEDD5',
  },
  warningBadgeText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
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
