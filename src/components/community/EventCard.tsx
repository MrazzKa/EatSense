// @ts-nocheck
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

interface EventCardProps {
  post: any;
  onAttend?: () => void;
  onPress?: () => void;
}

export function EventCard({ post, onAttend, onPress }: EventCardProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const meta = post.metadata || {};

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '30' }]}
    >
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
          {meta.title || post.content}
        </Text>
      </View>
      {meta.date && (
        <View style={styles.row}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            {meta.date} {meta.time || ''}
          </Text>
        </View>
      )}
      {meta.location && (
        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detail, { color: colors.textSecondary }]}>{meta.location}</Text>
        </View>
      )}
      <TouchableOpacity
        onPress={onAttend}
        style={[
          styles.attendBtn,
          { backgroundColor: post.isAttending ? colors.primary : colors.primary + '15' },
        ]}
      >
        <Ionicons
          name={post.isAttending ? 'checkmark-circle' : 'checkmark-circle-outline'}
          size={18}
          color={post.isAttending ? '#fff' : colors.primary}
        />
        <Text style={[styles.attendText, { color: post.isAttending ? '#fff' : colors.primary }]}>
          {post.isAttending ? t('community.attending', "I'll go") : t('community.attend', "I'll go")}
          {post._count?.attendees ? ` \u00b7 ${post._count.attendees}` : ''}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  detail: {
    fontSize: 14,
    marginLeft: 8,
  },
  attendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  attendText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
