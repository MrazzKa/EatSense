import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { TodoItem } from '../../types/tracker';
import AppCard from '../common/AppCard';

interface TodoSectionProps {
  items: TodoItem[];
  onAdd: (text: string, date?: string, reminder?: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

/** Returns local date string YYYY-MM-DD (not UTC) */
function getDateString(offset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(hours: number, minutes: number): string {
  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function TodoSection({ items, onAdd, onToggle, onDelete, compact = false }: TodoSectionProps) {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const [expanded, setExpanded] = useState(false);

  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(getDateString());
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderHour, setReminderHour] = useState(9);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const today = getDateString();
  const tomorrow = getDateString(1);

  const handleAdd = useCallback(() => {
    if (!text.trim()) return;
    let reminder: string | undefined;
    if (reminderOn) {
      // Parse date parts manually to avoid timezone ambiguity
      const [year, month, day] = selectedDate.split('-').map(Number);
      const reminderDate = new Date(year, month - 1, day, reminderHour, reminderMinute, 0, 0);
      if (reminderDate > new Date()) {
        reminder = reminderDate.toISOString();
      }
    }
    onAdd(text.trim(), selectedDate, reminder);
    setText('');
    setShowInput(false);
    setSelectedDate(today);
    setReminderOn(false);
    setReminderHour(9);
    setReminderMinute(0);
  }, [text, selectedDate, onAdd, today, reminderOn, reminderHour, reminderMinute]);

  const getDateLabel = useCallback((date: string) => {
    if (date === today) return t('tracker.todo.today') || 'Today';
    if (date === tomorrow) return t('tracker.todo.tomorrow') || 'Tomorrow';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, [today, tomorrow, t]);

  const handleTimeChange = useCallback((_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setReminderHour(date.getHours());
      setReminderMinute(date.getMinutes());
    }
  }, []);

  const pickerDate = useMemo(() => {
    const d = new Date();
    d.setHours(reminderHour, reminderMinute, 0, 0);
    return d;
  }, [reminderHour, reminderMinute]);

  return (
    <View>
      <AppCard style={styles.card}>
        {items.length === 0 && !showInput ? (
          <TouchableOpacity
            onPress={() => setShowInput(true)}
            style={styles.emptyState}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {t('tracker.todo.empty') || 'No tasks for today'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {(compact && !expanded ? items.slice(0, 3) : items).map(item => (
              <View key={item.id} style={[styles.todoRow, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => onToggle(item.id)}
                  style={[
                    styles.checkbox,
                    {
                      borderColor: item.completed ? colors.primary : colors.border,
                      backgroundColor: item.completed ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {item.completed && <Ionicons name="checkmark" size={14} color={colors.onPrimary || '#FFF'} />}
                </TouchableOpacity>
                <Text
                  style={[
                    styles.todoText,
                    { color: item.completed ? colors.textTertiary : colors.textPrimary },
                    item.completed && styles.todoCompleted,
                  ]}
                  numberOfLines={2}
                >
                  {item.text}
                </Text>
                {item.reminder && !item.completed && (
                  <Ionicons name="notifications" size={14} color={colors.textTertiary} />
                )}
                {item.date !== today && (
                  <View style={[styles.dateBadge, { backgroundColor: colors.primaryTint || (colors.primary + '15') }]}>
                    <Text style={[styles.dateBadgeText, { color: colors.primary }]}>
                      {getDateLabel(item.date)}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => onDelete(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}

            {compact && items.length > 3 && (
              <TouchableOpacity
                style={styles.expandRow}
                onPress={() => setExpanded(!expanded)}
              >
                <Text style={[styles.expandText, { color: colors.primary }]}>
                  {expanded ? (t('common.showLess') || 'Show Less') : (t('common.viewAll') || `View All (${items.length})`)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Inline add */}
            {showInput ? (
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                  value={text}
                  onChangeText={setText}
                  placeholder={t('tracker.todo.placeholder') || 'Add a task...'}
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  onSubmitEditing={handleAdd}
                  returnKeyType="done"
                />

                {/* Date row */}
                <View style={styles.chipsRow}>
                  {[
                    { label: t('tracker.todo.today') || 'Today', value: today },
                    { label: t('tracker.todo.tomorrow') || 'Tomorrow', value: tomorrow },
                  ].map(chip => (
                    <TouchableOpacity
                      key={chip.value}
                      onPress={() => setSelectedDate(chip.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selectedDate === chip.value ? (colors.primaryTint || colors.primary + '20') : (colors.surfaceSecondary || colors.surface),
                          borderColor: selectedDate === chip.value ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, {
                        color: selectedDate === chip.value ? colors.primary : colors.textSecondary,
                      }]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reminder row */}
                <View style={styles.chipsRow}>
                  <TouchableOpacity
                    onPress={() => setReminderOn(prev => !prev)}
                    style={[
                      styles.chip,
                      styles.reminderChip,
                      {
                        backgroundColor: reminderOn ? (colors.primaryTint || colors.primary + '20') : (colors.surfaceSecondary || colors.surface),
                        borderColor: reminderOn ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <Ionicons
                      name={reminderOn ? 'notifications' : 'notifications-outline'}
                      size={14}
                      color={reminderOn ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.chipText, {
                      color: reminderOn ? colors.primary : colors.textSecondary,
                    }]}>
                      {t('tracker.todo.reminder') || 'Reminder'}
                    </Text>
                  </TouchableOpacity>

                  {reminderOn && (
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(true)}
                      style={[
                        styles.chip,
                        styles.timeChip,
                        {
                          backgroundColor: colors.primaryTint || (colors.primary + '20'),
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Ionicons name="time-outline" size={14} color={colors.primary} />
                      <Text style={[styles.timeText, { color: colors.primary }]}>
                        {formatTime(reminderHour, reminderMinute)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.inputActions}>
                  <TouchableOpacity onPress={() => { setShowInput(false); setText(''); setReminderOn(false); }}>
                    <Text style={[styles.inputActionText, { color: colors.textSecondary }]}>
                      {t('common.cancel') || 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAdd} disabled={!text.trim()}>
                    <Text style={[styles.inputActionText, {
                      color: text.trim() ? colors.primary : colors.textTertiary,
                      fontWeight: '600',
                    }]}>
                      {t('common.add') || 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowInput(true)}
                style={styles.addRow}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[styles.addText, { color: colors.primary }]}>
                  {t('tracker.todo.add') || 'Add task'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </AppCard>

      {/* Time Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          >
            <View
              style={[styles.pickerSheet, { backgroundColor: colors.background }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                  {t('tracker.todo.selectTime') || 'Select time'}
                </Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.pickerDone, { color: colors.primary }]}>
                    {t('common.done') || 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                minuteInterval={5}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      ) : (
        showTimePicker && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="default"
            onChange={handleTimeChange}
            minuteInterval={5}
          />
        )
      )}
    </View>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    card: {
      paddingVertical: 4,
    },
    emptyState: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
    },
    todoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    todoText: {
      flex: 1,
      fontSize: 15,
    },
    todoCompleted: {
      textDecorationLine: 'line-through',
    },
    dateBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    dateBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    inputContainer: {
      paddingVertical: 12,
      paddingHorizontal: 4,
      gap: 12,
    },
    input: {
      borderRadius: tokens.radii.md || 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
    },
    chipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
    },
    reminderChip: {
      gap: 5,
    },
    timeChip: {
      gap: 4,
    },
    timeText: {
      fontSize: 13,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    inputActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 16,
    },
    inputActionText: {
      fontSize: 15,
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
      gap: 6,
    },
    addText: {
      fontSize: 15,
      fontWeight: '500',
    },
    pickerOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    pickerSheet: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 20,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    pickerDone: {
      fontSize: 16,
      fontWeight: '600',
    },
    expandRow: {
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'transparent',
    },
    expandText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
