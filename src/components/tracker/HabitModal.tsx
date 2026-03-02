import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { Habit, HabitFrequency } from '../../types/tracker';

interface HabitModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (habit: { emoji: string; name: string; frequency: HabitFrequency; customDays?: number[] }) => void;
  editHabit?: Habit | null;
}

const DEFAULT_EMOJIS = ['💧', '🏃', '🧘', '📖', '💊', '🥗', '😴', '🧹'];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function HabitModal({ visible, onClose, onSave, editHabit }: HabitModalProps) {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const [emoji, setEmoji] = useState(editHabit?.emoji || '💧');
  const [name, setName] = useState(editHabit?.name || '');
  const [frequency, setFrequency] = useState<HabitFrequency>(editHabit?.frequency || 'daily');
  const [customDays, setCustomDays] = useState<number[]>(editHabit?.customDays || [0, 1, 2, 3, 4]);

  useEffect(() => {
    if (visible) {
      setEmoji(editHabit?.emoji || '💧');
      setName(editHabit?.name || '');
      setFrequency(editHabit?.frequency || 'daily');
      setCustomDays(editHabit?.customDays || [0, 1, 2, 3, 4]);
    }
  }, [visible, editHabit]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      emoji,
      name: name.trim(),
      frequency,
      customDays: frequency === 'custom' ? customDays : undefined,
    });
    onClose();
  };

  const toggleDay = (day: number) => {
    setCustomDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const freqOptions: { key: HabitFrequency; label: string }[] = [
    { key: 'daily', label: t('tracker.habits.daily') || 'Daily' },
    { key: 'weekdays', label: t('tracker.habits.weekdays') || 'Weekdays' },
    { key: 'custom', label: t('tracker.habits.custom') || 'Custom' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.headerBtn, { color: colors.textSecondary }]}>
                {t('common.cancel') || 'Cancel'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {editHabit ? (t('tracker.habits.edit') || 'Edit Habit') : (t('tracker.habits.add') || 'New Habit')}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={!name.trim()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.headerBtn, { color: name.trim() ? colors.primary : colors.textTertiary, fontWeight: '600' }]}>
                {t('common.save') || 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Emoji picker */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('tracker.habits.emoji') || 'Emoji'}
            </Text>
            <View style={styles.emojiRow}>
              {DEFAULT_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={[
                    styles.emojiBtn,
                    emoji === e && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name input */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('tracker.habits.name') || 'Name'}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
              value={name}
              onChangeText={setName}
              placeholder={t('tracker.habits.namePlaceholder') || 'e.g. Drink water'}
              placeholderTextColor={colors.textTertiary}
              autoFocus={!editHabit}
              maxLength={50}
            />

            {/* Frequency */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('tracker.habits.frequency') || 'Frequency'}
            </Text>
            <View style={[styles.segmented, { backgroundColor: colors.surfaceSecondary || colors.surface }]}>
              {freqOptions.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.segmentBtn,
                    frequency === opt.key && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setFrequency(opt.key)}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: frequency === opt.key ? '#FFF' : colors.textPrimary },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom days */}
            {frequency === 'custom' && (
              <View style={styles.daysRow}>
                {DAY_LABELS.map((label, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => toggleDay(i)}
                    style={[
                      styles.dayBtn,
                      customDays.includes(i) && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: customDays.includes(i) ? '#FFF' : colors.textPrimary },
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
      padding: 20,
      gap: 8,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginTop: 12,
      marginBottom: 6,
    },
    emojiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    emojiBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    emojiText: {
      fontSize: 24,
    },
    input: {
      borderWidth: 1,
      borderRadius: tokens.radii.md || 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
    },
    segmented: {
      flexDirection: 'row',
      borderRadius: tokens.radii.md || 12,
      padding: 3,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: (tokens.radii.md || 12) - 2,
      alignItems: 'center',
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '500',
    },
    daysRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    dayBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary || colors.surface,
    },
    dayText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });
