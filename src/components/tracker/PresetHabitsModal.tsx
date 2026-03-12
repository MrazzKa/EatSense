import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { PRESET_HABITS, PresetHabit } from '../../data/presetHabits';
import { Habit, HabitFrequency } from '../../types/tracker';

interface PresetHabitsModalProps {
  visible: boolean;
  onClose: () => void;
  onAddPresets: (habits: { emoji: string; name: string; frequency: HabitFrequency }[]) => void;
  onCreateCustom: () => void;
  existingHabits: Habit[];
}

export default function PresetHabitsModal({
  visible,
  onClose,
  onAddPresets,
  onCreateCustom,
  existingHabits,
}: PresetHabitsModalProps) {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const [selected, setSelected] = useState<Set<number>>(new Set());

  const existingNames = useMemo(() =>
    new Set(existingHabits.map(h => h.name.toLowerCase())),
  [existingHabits]);

  const togglePreset = useCallback((index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleDone = useCallback(() => {
    const habitsToAdd = Array.from(selected).map(i => {
      const preset = PRESET_HABITS[i];
      return {
        emoji: preset.emoji,
        name: t(preset.nameKey) || preset.defaultName,
        frequency: preset.frequency,
      };
    });
    if (habitsToAdd.length > 0) {
      onAddPresets(habitsToAdd);
    }
    setSelected(new Set());
    onClose();
  }, [selected, onAddPresets, onClose, t]);

  const handleCreateCustom = useCallback(() => {
    setSelected(new Set());
    onClose();
    // Delay opening HabitModal to let PresetModal finish dismissing
    setTimeout(() => {
      onCreateCustom();
    }, 400);
  }, [onClose, onCreateCustom]);

  const handleClose = useCallback(() => {
    setSelected(new Set());
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.headerBtn, { color: colors.textSecondary }]}>
              {t('common.cancel') || 'Cancel'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('tracker.presets.title') || 'Add Habits'}
          </Text>
          <TouchableOpacity
            onPress={handleDone}
            disabled={selected.size === 0}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.headerBtn, {
              color: selected.size > 0 ? colors.primary : colors.textTertiary,
              fontWeight: '600',
            }]}>
              {t('common.done') || 'Done'}{selected.size > 0 ? ` (${selected.size})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {PRESET_HABITS.map((preset, index) => {
            const alreadyAdded = existingNames.has(
              (t(preset.nameKey) || preset.defaultName).toLowerCase()
            );
            const isSelected = selected.has(index);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => !alreadyAdded && togglePreset(index)}
                style={[
                  styles.presetRow,
                  { borderBottomColor: colors.border },
                  alreadyAdded && styles.presetRowDisabled,
                ]}
                disabled={alreadyAdded}
                activeOpacity={0.7}
              >
                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                <Text style={[
                  styles.presetName,
                  { color: alreadyAdded ? colors.textTertiary : colors.textPrimary },
                ]}>
                  {t(preset.nameKey) || preset.defaultName}
                </Text>
                {alreadyAdded ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.textTertiary} />
                ) : (
                  <View style={[
                    styles.checkbox,
                    { borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { backgroundColor: colors.primary },
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color={colors.onPrimary || '#FFF'} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Create custom button */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleCreateCustom}
            style={[styles.customBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={[styles.customBtnText, { color: colors.primary }]}>
              {t('tracker.presets.createCustom') || 'Create Custom Habit'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    headerBtn: {
      fontSize: 16,
    },
    body: {
      flex: 1,
    },
    bodyContent: {
      paddingBottom: 20,
    },
    presetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 14,
    },
    presetRowDisabled: {
      opacity: 0.5,
    },
    presetEmoji: {
      fontSize: 24,
    },
    presetName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    customBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: tokens.radii.md || 12,
      borderWidth: 1.5,
      gap: 8,
    },
    customBtnText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
