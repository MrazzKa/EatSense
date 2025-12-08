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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { PADDING, SPACING, BORDER_RADIUS, SHADOW } from '../utils/designConstants';
import { SwipeClosableModal } from './common/SwipeClosableModal';

export const EditFoodItemModal = ({ visible, onClose, item, onSave, index }) => {
  const { colors, tokens } = useTheme();
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

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setEditedItem({
        name: item?.name || '',
        calories: item?.calories?.toString() || '0',
        protein: item?.protein?.toString() || '0',
        carbs: item?.carbs?.toString() || '0',
        fat: item?.fat?.toString() || '0',
        weight: item?.weight?.toString() || '0',
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
      enableSwipe={true}
      enableBackdropClose={true}
      animationType="slide"
      presentationStyle="pageSheet"
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
              {/* Food Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t('editFood.name')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.input, borderColor: colors.border }]}
                  value={editedItem.name}
                  onChangeText={(text) => setEditedItem({ ...editedItem, name: text })}
                  placeholder={t('editFood.namePlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Weight */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('editFood.weight')}</Text>
                  <Text style={[styles.labelHint, { color: colors.textSecondary }]}>{t('editFood.weightHint')}</Text>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.input, borderColor: colors.border }]}
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
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.surface }]} 
                onPress={() => {
                  if (onClose && typeof onClose === 'function') {
                    onClose();
                  }
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Ionicons name="checkmark" size={20} color={colors.onPrimary || '#FFFFFF'} />
                <Text style={[styles.saveButtonText, { color: colors.onPrimary || '#FFFFFF' }]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
});

