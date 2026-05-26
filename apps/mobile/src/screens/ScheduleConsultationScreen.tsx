import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';

interface Slot {
  startAt: string;
  endAt: string;
}

const DURATIONS = [30, 60, 90] as const;

export default function ScheduleConsultationScreen({ route, navigation }: any) {
  const { expertId, conversationId, expertName, rescheduleConsultationId, initialDurationMinutes } = route.params || {};
  const isReschedule = !!rescheduleConsultationId;
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const [duration, setDuration] = useState<number>(initialDurationMinutes || 60);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    if (!expertId) return;
    setLoading(true);
    try {
      const from = new Date();
      const to = new Date(Date.now() + 14 * 86400000);
      // Without a timeout the UI gets stuck on the spinner if the API hangs.
      const res = await Promise.race([
        ApiService.request(
          `/experts/${expertId}/availability/slots?from=${from.toISOString()}&to=${to.toISOString()}&duration=${duration}`,
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Loading slots timed out')), 15000),
        ),
      ]);
      setSlots(Array.isArray((res as any)?.slots) ? (res as any).slots : []);
    } catch (err: any) {
      Alert.alert(t('common.error') || 'Error', err?.message || t('experts.noSlots') || 'Failed to load slots');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [expertId, duration]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const groupedByDay = useMemo(() => {
    const groups: Record<string, Slot[]> = {};
    for (const s of slots) {
      const d = new Date(s.startAt);
      const key = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return Object.entries(groups);
  }, [slots]);

  async function book(slot: Slot) {
    setBooking(slot.startAt);
    try {
      if (isReschedule) {
        await ApiService.request(`/consultations/${rescheduleConsultationId}/reschedule`, {
          method: 'PATCH',
          body: JSON.stringify({ startAt: slot.startAt, durationMinutes: duration }),
        });
        Alert.alert(
          t('experts.rescheduleSentTitle') || 'Reschedule requested',
          t('experts.rescheduleSentBody') || 'The expert will be notified and can accept or decline.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        await ApiService.request('/consultations', {
          method: 'POST',
          body: JSON.stringify({
            expertId,
            conversationId,
            startAt: slot.startAt,
            durationMinutes: duration,
          }),
        });
        Alert.alert(
          t('experts.bookingConfirmedTitle') || 'Booked',
          t('experts.bookingConfirmedBody') || 'You will receive a reminder before the call.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err: any) {
      Alert.alert(t('common.error') || 'Error', err?.message || 'Failed to book');
    } finally {
      setBooking(null);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isReschedule
            ? (t('experts.rescheduleTitle') || 'Reschedule')
            : (expertName || t('experts.scheduleTitle') || 'Schedule')}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.durationRow}>
        {DURATIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.durationChip, duration === d && styles.durationChipActive]}
            onPress={() => setDuration(d)}
          >
            <Text style={[styles.durationText, duration === d && styles.durationTextActive]}>{d} min</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : groupedByDay.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('experts.noSlots') || 'No free slots in the next 2 weeks'}</Text>
          <Text style={styles.emptySubtitle}>{t('experts.noSlotsHint') || 'Try a shorter duration or ask the specialist directly.'}</Text>
        </View>
      ) : (
        <FlatList
          data={groupedByDay}
          keyExtractor={([day]) => day}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          renderItem={({ item: [day, daySlots] }) => (
            <View>
              <Text style={styles.dayHeader}>{day}</Text>
              <View style={styles.slotGrid}>
                {daySlots.map((s) => {
                  const d = new Date(s.startAt);
                  const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isBooking = booking === s.startAt;
                  return (
                    <TouchableOpacity
                      key={s.startAt}
                      style={[styles.slot, isBooking && styles.slotBusy]}
                      disabled={!!booking}
                      onPress={() => book(s)}
                    >
                      {isBooking ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.slotText}>{label}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(tokens: any, colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
    durationRow: { flexDirection: 'row', padding: 12, gap: 8 },
    durationChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    durationChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    durationText: { color: colors.textSecondary, fontWeight: '500' },
    durationTextActive: { color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    emptySubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
    dayHeader: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    slot: {
      minWidth: 80,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    slotBusy: { opacity: 0.5 },
    slotText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  });
}
