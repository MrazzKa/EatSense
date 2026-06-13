// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  value: Date | null;
  onChange: (d: Date) => void;
  colors: any;
  t: any;
  placeholder?: string;
}

function defaultFuture(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

/**
 * Single field for picking a date AND time, storing a real Date (→ ISO upstream)
 * so "past event" can be detected reliably. iOS shows an inline datetime spinner
 * in a modal; Android runs the native two-step date → time flow.
 */
export function DateTimeField({ value, onChange, colors, t, placeholder }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [iosTemp, setIosTemp] = useState<Date>(value || defaultFuture());
  const [androidStage, setAndroidStage] = useState<'idle' | 'date' | 'time'>('idle');
  const [androidTemp, setAndroidTemp] = useState<Date>(value || defaultFuture());

  const open = () => {
    if (Platform.OS === 'ios') {
      setIosTemp(value || defaultFuture());
      setIosOpen(true);
    } else {
      setAndroidTemp(value || defaultFuture());
      setAndroidStage('date');
    }
  };

  const label = value
    ? value.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : (placeholder || t('community.pickDateTime', 'Pick date & time'));

  return (
    <>
      <TouchableOpacity
        style={[styles.field, { borderColor: colors.border || '#E5E7EB', backgroundColor: colors.background }]}
        onPress={open}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
        <Text style={[styles.label, { color: value ? (colors.textPrimary || colors.text) : colors.textTertiary }]}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={iosOpen} statusBarTranslucent>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setIosOpen(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: colors.surface || '#FFF' }]}>
              <View style={styles.sheetHead}>
                <TouchableOpacity onPress={() => setIosOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: colors.textTertiary, fontSize: 16 }}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { onChange(iosTemp); setIosOpen(false); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>{t('common.done', 'Done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosTemp}
                mode="datetime"
                display="spinner"
                onChange={(_, d) => { if (d) setIosTemp(d); }}
                textColor={colors.textPrimary}
                style={{ alignSelf: 'center' }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {Platform.OS === 'android' && androidStage === 'date' && (
        <DateTimePicker
          value={androidTemp}
          mode="date"
          onChange={(e, d) => {
            if (e.type === 'dismissed' || !d) { setAndroidStage('idle'); return; }
            const merged = new Date(androidTemp);
            merged.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
            setAndroidTemp(merged);
            setAndroidStage('time');
          }}
        />
      )}
      {Platform.OS === 'android' && androidStage === 'time' && (
        <DateTimePicker
          value={androidTemp}
          mode="time"
          is24Hour
          onChange={(e, d) => {
            setAndroidStage('idle');
            if (e.type === 'dismissed' || !d) return;
            const merged = new Date(androidTemp);
            merged.setHours(d.getHours(), d.getMinutes(), 0, 0);
            onChange(merged);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  label: { flex: 1, fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
