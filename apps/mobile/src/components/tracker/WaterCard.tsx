import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../glass/GlassCard';

type Props = {
  glasses: number;
  goal: number;
  onAdd: () => void;
  onRemove: () => void;
  colors: any;
  t: any;
};

const WATER_COLOR = '#38BDF8';

/**
 * Daily water tracker card — tap + to log a glass. Visual row of glass icons
 * plus a progress bar. Local-only (per calendar day).
 */
const WaterCard: React.FC<Props> = ({ glasses, goal, onAdd, onRemove, colors, t }) => {
  const iconsToShow = Math.min(goal, 12);
  const pct = goal > 0 ? Math.min(100, Math.round((glasses / goal) * 100)) : 0;
  const reached = glasses >= goal;

  const handleAdd = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* noop */ }
    onAdd();
  };
  const handleRemove = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* noop */ }
    onRemove();
  };

  return (
    <GlassCard padding="lg" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: WATER_COLOR + '1F' }]}>
            <Ionicons name="water" size={18} color={WATER_COLOR} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
            {t('tracker.water.title', 'Water')}
          </Text>
        </View>
        <Text style={[styles.count, { color: reached ? WATER_COLOR : (colors.textSecondary || '#6B7280') }]}>
          {glasses}/{goal} <Text style={styles.unit}>{t('tracker.water.unit', 'glasses')}</Text>
        </Text>
      </View>

      {/* Glass icons */}
      <View style={styles.glassRow}>
        {Array.from({ length: iconsToShow }).map((_, i) => {
          const filled = i < glasses;
          return (
            <Ionicons
              key={i}
              name={filled ? 'water' : 'water-outline'}
              size={20}
              color={filled ? WATER_COLOR : (colors.border || '#D1D5DB')}
              style={{ marginRight: 4 }}
            />
          );
        })}
        {glasses > iconsToShow && (
          <Text style={[styles.overflow, { color: WATER_COLOR }]}>+{glasses - iconsToShow}</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.track, { backgroundColor: WATER_COLOR + '22' }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: WATER_COLOR }]} />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrlBtn, { borderColor: colors.border || '#E5E7EB' }]}
          onPress={handleRemove}
          disabled={glasses === 0}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={22} color={glasses === 0 ? (colors.textTertiary || '#9CA3AF') : (colors.textPrimary || colors.text)} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: WATER_COLOR }]}
          onPress={handleAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#FFF" />
          <Text style={styles.addText}>{t('tracker.water.add', 'Add a glass')}</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  count: { fontSize: 15, fontWeight: '700' },
  unit: { fontSize: 12, fontWeight: '500' },
  glassRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 14, marginBottom: 12 },
  overflow: { fontSize: 13, fontWeight: '700', marginLeft: 2 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  ctrlBtn: { width: 48, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12 },
  addText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

export default WaterCard;
