// @ts-nocheck
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { isPastEvent } from './eventTime';

const ROUTE_COLOR = '#8B5CF6';
const ACTIVITY_ICON = { run: 'walk-outline', walk: 'footsteps-outline', bike: 'bicycle-outline' };

interface RouteCardProps {
  post: any;
  onAttend?: () => void;
  onPress?: () => void;
  /** Hide the Join button on the user's own route (you can't join your own). */
  isOwn?: boolean;
}

export function RouteCard({ post, onAttend, onPress, isOwn }: RouteCardProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const meta = post.metadata || {};
  const km = Number(meta.distanceKm) || 0;
  const attendees = post._count?.attendees || 0;
  const isPast = isPastEvent(meta);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: ROUTE_COLOR + '0E', borderColor: ROUTE_COLOR + '33' }]}
    >
      <View style={styles.row}>
        <Ionicons name={ACTIVITY_ICON[meta.activity] || 'map-outline'} size={20} color={ROUTE_COLOR} />
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]} numberOfLines={1}>
          {meta.routeName || post.content}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {km > 0 && (
          <View style={styles.metaChip}>
            <Ionicons name="navigate-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detail, { color: colors.textSecondary }]}>{km.toFixed(1)} {t('community.route.km', 'km')}</Text>
          </View>
        )}
        {!!meta.city && (
          <View style={styles.metaChip}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={1}>{meta.city}</Text>
          </View>
        )}
        {!!meta.date && (
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detail, { color: colors.textSecondary }]}>{meta.date} {meta.time || ''}</Text>
          </View>
        )}
      </View>

      {isPast ? (
        <View style={[styles.joinBtn, { backgroundColor: (colors.textTertiary || '#9CA3AF') + '20' }]}>
          <Ionicons name="checkmark-done-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.joinText, { color: colors.textSecondary }]}>
            {t('community.event.finished', 'Finished')}
            {attendees ? ` · ${attendees}` : ''}
          </Text>
        </View>
      ) : isOwn ? (
        <View style={[styles.joinBtn, { backgroundColor: ROUTE_COLOR + '12' }]}>
          <Ionicons name="ribbon-outline" size={18} color={ROUTE_COLOR} />
          <Text style={[styles.joinText, { color: ROUTE_COLOR }]}>
            {t('community.route.youOrganizer', 'You organize this')}
            {attendees ? ` · ${attendees}` : ''}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onAttend}
          style={[styles.joinBtn, { backgroundColor: post.isAttending ? ROUTE_COLOR : ROUTE_COLOR + '1A' }]}
        >
          <Ionicons
            name={post.isAttending ? 'checkmark-circle' : 'add-circle-outline'}
            size={18}
            color={post.isAttending ? '#fff' : ROUTE_COLOR}
          />
          <Text style={[styles.joinText, { color: post.isAttending ? '#fff' : ROUTE_COLOR }]}>
            {post.isAttending ? t('community.route.joined', 'Going') : t('community.route.join', 'Join')}
            {attendees ? ` · ${attendees}` : ''}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600', marginLeft: 8, flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detail: { fontSize: 13 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, marginTop: 2 },
  joinText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
});

export default RouteCard;
