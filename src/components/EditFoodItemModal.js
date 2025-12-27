import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { PADDING, SPACING, BORDER_RADIUS, SHADOW } from '../utils/designConstants';
import { SwipeClosableModal } from './common/SwipeClosableModal';
import ApiService from '../services/apiService';

// Portion Presets
const PORTION_PRESETS = {
  small: { label: 'Small', multiplier: 0.5 },
  medium: { label: 'Medium', multiplier: 1.0 },
  large: { label: 'Large', multiplier: 1.5 },
};

export const EditFoodItemModal = ({ visible, onClose, item, onSave, index }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [editedItem, setEditedItem] = useState({
    name: item?.name || '',
    calories: item?.calories?.toString() || '0',
    protein: item?.protein?.toString() || '0',
    carbs: item?.carbs?.toString() || '0',
    fat: item?.fat?.toString() || '0',
    weight: item?.weight?.toString() || '0',
  });
  const [originalWeight, setOriginalWeight] = useState(parseFloat(item?.weight) || 100);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      const weight = parseFloat(item?.weight) || 100;
      setOriginalWeight(weight);
      setEditedItem({
        name: item?.name || '',
        calories: item?.calories?.toString() || '0',
        protein: item?.protein?.toString() || '0',
        carbs: item?.carbs?.toString() || '0',
        fat: item?.fat?.toString() || '0',
        weight: weight.toString(),
      });
    }
  }, [item, visible]);

  const handleSave = () => {
    // Формируем payload в формате, который ожидает backend
    const updatedItem = {
      id: item?.id || String(index),
      name: editedItem.name.trim(),
      portion_g: parseFloat(editedItem.weight) || item?.portion_g || item?.weight || 0,
      calories: parseFloat(editedItem.calories) || item?.calories || item?.nutrients?.calories || 0,
      protein_g: parseFloat(editedItem.protein) || item?.protein || item?.nutrients?.protein || 0,
      carbs_g: parseFloat(editedItem.carbs) || item?.carbs || item?.nutrients?.carbs || 0,
      fat_g: parseFloat(editedItem.fat) || item?.fat || item?.nutrients?.fat || 0,
      // Include original values for feedback loop
      originalValues: {
        name: item?.name,
        portion_g: item?.weight || item?.portion_g,
        calories: item?.calories || item?.nutrients?.calories,
        protein_g: item?.protein || item?.nutrients?.protein,
        carbs_g: item?.carbs || item?.nutrients?.carbs,
        fat_g: item?.fat || item?.nutrients?.fat,
      },
    };

    if (onSave && typeof onSave === 'function') {
      onSave(updatedItem, index);
    }
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  const handleNumberChange = (field, value) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    const cleanedValue = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : numericValue;
    setEditedItem({ ...editedItem, [field]: cleanedValue });
  };

  const calculateCalories = () => {
    const protein = parseFloat(editedItem.protein) || 0;
    const carbs = parseFloat(editedItem.carbs) || 0;
    const fat = parseFloat(editedItem.fat) || 0;
    // 1g protein = 4 cal, 1g carbs = 4 cal, 1g fat = 9 cal
    return Math.round(protein * 4 + carbs * 4 + fat * 9);
  };

  const autoCalculatedCalories = calculateCalories();

  return (
    <SwipeClosableModal
      visible={visible}
      onClose={onClose}
      swipeDirection="down"
      enableSwipe={false}
      enableBackdropClose={false}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + 8 : 0}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>{t('editFood.title')}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('editFood.subtitle')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (onClose && typeof onClose === 'function') {
                    onClose();
                  }
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Food Name with Search */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('editFood.name')}</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      // Show search modal
                      setShowSearch(true);
                    }}
                    style={styles.searchButton}
                  >
                    <Ionicons name="search-outline" size={18} color={colors.primary} />
                    <Text style={[styles.searchButtonText, { color: colors.primary }]}>
                      {t('editFood.searchUSDA') || 'Search USDA'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.input, borderColor: colors.border }]}
                  value={editedItem.name}
                  onChangeText={(text) => setEditedItem({ ...editedItem, name: text })}
                  placeholder={t('editFood.namePlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Weight with Presets */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('editFood.weight')}</Text>
                  <Text style={[styles.labelHint, { color: colors.textSecondary }]}>{t('editFood.weightHint')}</Text>
                </View>
                {/* Preset Buttons */}
                <View style={styles.presetContainer}>
                  {Object.entries(PORTION_PRESETS).map(([key, preset]) => {
                    const presetWeight = Math.round(originalWeight * preset.multiplier);
                    const isSelected = Math.abs(parseFloat(editedItem.weight) - presetWeight) < 1;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.presetButton,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => {
                          const newWeight = presetWeight.toString();
                          setEditedItem({ ...editedItem, weight: newWeight });
                          // Recalculate macros proportionally
                          const scale = preset.multiplier;
                          setEditedItem(prev => ({
                            ...prev,
                            weight: newWeight,
                            calories: Math.round(parseFloat(prev.calories) * scale).toString(),
                            protein: (parseFloat(prev.protein) * scale).toFixed(1),
                            carbs: (parseFloat(prev.carbs) * scale).toFixed(1),
                            fat: (parseFloat(prev.fat) * scale).toFixed(1),
                          }));
                        }}
                      >
                        <Text
                          style={[
                            styles.presetButtonText,
                            { color: isSelected ? colors.onPrimary || '#FFFFFF' : colors.text },
                          ]}
                        >
                          {preset.label}
                        </Text>
                        <Text
                          style={[
                            styles.presetButtonSubtext,
                            { color: isSelected ? colors.onPrimary || '#FFFFFF' : colors.textSecondary },
                          ]}
                        >
                          {presetWeight}g
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.input, borderColor: colors.border, marginTop: 12 }]}
                  value={editedItem.weight}
                  onChangeText={(text) => handleNumberChange('weight', text)}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Macros Section */}
              <View style={styles.macrosSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('editFood.macronutrients')}</Text>

                <View style={styles.macrosGrid}>
                  <View style={[styles.macroCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <View style={[styles.macroIcon, { backgroundColor: '#FF3B3015' }]}>
                      <Ionicons name="flame" size={20} color="#FF3B30" />
                    </View>
                    <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{t('editFood.protein')}</Text>
                    <TextInput
                      style={[styles.macroInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      value={editedItem.protein}
                      onChangeText={(text) => handleNumberChange('protein', text)}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[styles.macroUnit, { color: colors.textTertiary }]}>g</Text>
                  </View>

                  <View style={[styles.macroCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <View style={[styles.macroIcon, { backgroundColor: '#34C75915' }]}>
                      <Ionicons name="leaf" size={20} color="#34C759" />
                    </View>
                    <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{t('editFood.carbs')}</Text>
                    <TextInput
                      style={[styles.macroInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      value={editedItem.carbs}
                      onChangeText={(text) => handleNumberChange('carbs', text)}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[styles.macroUnit, { color: colors.textTertiary }]}>g</Text>
                  </View>

                  <View style={[styles.macroCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <View style={[styles.macroIcon, { backgroundColor: '#FF950015' }]}>
                      <Ionicons name="water" size={20} color="#FF9500" />
                    </View>
                    <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{t('editFood.fat')}</Text>
                    <TextInput
                      style={[styles.macroInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                      value={editedItem.fat}
                      onChangeText={(text) => handleNumberChange('fat', text)}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[styles.macroUnit, { color: colors.textTertiary }]}>g</Text>
                  </View>
                </View>
              </View>

              {/* Calories - Auto-calculated or manual */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('editFood.calories')}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const calculated = calculateCalories();
                      setEditedItem({ ...editedItem, calories: calculated.toString() });
                    }}
                  >
                    <Text style={[styles.autoCalcButton, { color: colors.primary }]}>
                      {editedItem.calories !== autoCalculatedCalories.toString() && t('editFood.calculate', { value: autoCalculatedCalories })}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.input, borderColor: colors.border }]}
                  value={editedItem.calories}
                  onChangeText={(text) => handleNumberChange('calories', text)}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
                {autoCalculatedCalories > 0 && editedItem.calories === autoCalculatedCalories.toString() && (
                  <Text style={[styles.calculatedHint, { color: colors.success }]}>{t('editFood.calculatedAuto')}</Text>
                )}
              </View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom }]}>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleSave}>
                <Ionicons name="checkmark" size={20} color={colors.onPrimary || '#FFFFFF'} />
                <Text style={[styles.saveButtonText, { color: colors.onPrimary || '#FFFFFF' }]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* USDA Search Modal */}
      {showSearch && (
        <SwipeClosableModal
          visible={showSearch}
          onClose={() => {
            setShowSearch(false);
            setSearchQuery('');
            setSearchResults([]);
          }}
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={[styles.searchModal, { backgroundColor: colors.surface }]} edges={['bottom']}>
            <View style={[styles.searchHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.searchTitle, { color: colors.text }]}>
                {t('editFood.searchUSDA') || 'Search USDA Database'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('editFood.searchPlaceholder') || 'Search for food...'}
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={async () => {
                  if (searchQuery.trim()) {
                    setIsSearching(true);
                    try {
                      const results = await ApiService.searchFoods(searchQuery.trim(), 10);
                      setSearchResults(results || []);
                    } catch (error) {
                      console.error('[EditFoodItemModal] Search error:', error);
                      setSearchResults([]);
                    } finally {
                      setIsSearching(false);
                    }
                  }
                }}
                returnKeyType="search"
              />
              {isSearching && (
                <ActivityIndicator size="small" color={colors.primary} style={styles.searchLoader} />
              )}
            </View>

            <FlatList
              data={searchResults}
              keyExtractor={(food, idx) => `food-${food.fdcId || idx}`}
              renderItem={({ item: food }) => (
                <TouchableOpacity
                  style={[styles.searchResultItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={async () => {
                    try {
                      setIsSearching(true);
                      // Get full food details if fdcId is available
                      let foodDetails = food;
                      if (food.fdcId) {
                        try {
                          foodDetails = await ApiService.getUSDAFoodDetails(food.fdcId);
                        } catch (error) {
                          console.error('[EditFoodItemModal] Error fetching food details:', error);
                          // Fallback to the food object we already have
                        }
                      }

                      // Apply selected food
                      const description = foodDetails.description || food.description || food.brandOwner || '';
                      const nutrients = foodDetails.foodNutrients || food.foodNutrients || [];

                      // Extract nutrition values (USDA format)
                      const getNutrient = (nutrientId) => {
                        const nutrient = nutrients.find(n =>
                          (n.nutrientId === nutrientId || n.nutrient?.id === nutrientId) ||
                          (n.nutrient && n.nutrient.id === nutrientId)
                        );
                        return nutrient?.value || nutrient?.amount || 0;
                      };

                      // USDA nutrient IDs: 1008=Energy, 1003=Protein, 1005=Carbohydrate, 1004=Total lipid
                      const calories = getNutrient(1008); // Energy (kcal)
                      const protein = getNutrient(1003); // Protein (g)
                      const carbs = getNutrient(1005); // Carbs (g)
                      const fat = getNutrient(1004); // Fat (g)

                      setEditedItem({
                        name: description,
                        calories: Math.round(calories).toString(),
                        protein: protein.toFixed(1),
                        carbs: carbs.toFixed(1),
                        fat: fat.toFixed(1),
                        weight: editedItem.weight, // Keep current weight
                      });
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    } catch (error) {
                      console.error('[EditFoodItemModal] Error applying food:', error);
                    } finally {
                      setIsSearching(false);
                    }
                  }}
                >
                  <Text style={[styles.searchResultName, { color: colors.textPrimary }]}>
                    {food.description || food.brandOwner || 'Unknown'}
                  </Text>
                  {food.brandOwner && (
                    <Text style={[styles.searchResultBrand, { color: colors.textSecondary }]}>
                      {food.brandOwner}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.trim() && !isSearching ? (
                  <View style={styles.emptySearch}>
                    <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                      {t('editFood.noResults') || 'No results found'}
                    </Text>
                  </View>
                ) : null
              }
              contentContainerStyle={{ padding: 16 }}
            />
          </SafeAreaView>
        </SwipeClosableModal>
      )}
    </SwipeClosableModal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: PADDING.screen,
    paddingTop: PADDING.lg,
    paddingBottom: PADDING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    paddingHorizontal: PADDING.screen,
    paddingVertical: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.xl,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelHint: {
    fontSize: 12,
    fontWeight: '400',
  },
  autoCalcButton: {
    fontSize: 12,
    fontWeight: '500',
  },
  calculatedHint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  macrosSection: {
    marginBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  macroCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  macroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  macroLabel: {
    fontSize: 12,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  macroInput: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    borderWidth: 1,
    marginBottom: 2,
  },
  macroUnit: {
    fontSize: 11,
  },
  input: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: PADDING.screen,
    paddingTop: SPACING.md,
    paddingBottom: PADDING.lg,
    borderTopWidth: 1,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md + 4,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: SPACING.md + 4,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
    ...SHADOW.sm,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // USDA Search Modal Styles
  searchModal: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING.screen,
    paddingVertical: PADDING.md,
    borderBottomWidth: 1,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING.screen,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
  },
  searchLoader: {
    marginLeft: SPACING.sm,
  },
  searchResultItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: PADDING.screen,
    borderBottomWidth: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultBrand: {
    fontSize: 13,
    marginTop: 2,
  },
  emptySearch: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 16,
  },
});

export default EditFoodItemModal;

