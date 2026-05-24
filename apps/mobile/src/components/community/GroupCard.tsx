// @ts-nocheck
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

interface GroupCardProps {
  group: any;
  onPress?: () => void;
  onJoin?: () => void;
  isMember?: boolean;
  lockedMembership?: boolean;
}

/**
 * Resolves a localized name for a community group. COUNTRY groups are seeded
 * with a raw English name like "Community KZ" — we override that with the
 * `country.${code}` translation so RU/KK/etc users don't see English.
 */
export function resolveGroupName(group: any, t: any): string {
  if (group?.type === 'COUNTRY' && group?.country) {
    const code = String(group.country).toUpperCase();
    const localized = t(`country.${code}`);
    if (localized && localized !== `country.${code}`) return localized;
  }
  return group?.name || '';
}

export function GroupCard({ group, onPress, onJoin, isMember, lockedMembership }: GroupCardProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons
          name={group.type === 'COUNTRY' ? 'flag' : group.type === 'CITY' ? 'location' : 'people'}
          size={22}
          color={colors.primary}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary || colors.text }]}>{resolveGroupName(group, t)}</Text>
        <Text style={[styles.members, { color: colors.textTertiary }]}>
          {group._count?.memberships || 0} {t('community.members', 'members')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation?.();
          if (lockedMembership) return;
          onJoin?.();
        }}
        style={[styles.joinBtn, { backgroundColor: isMember ? colors.border : colors.primary, opacity: lockedMembership ? 0.7 : 1 }]}
      >
        <Text
          style={[
            styles.joinText,
            { color: isMember ? colors.textPrimary || colors.text : '#fff' },
          ]}
        >
          {isMember ? t('community.joined', 'Joined') : t('community.join', 'Join')}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  members: {
    fontSize: 13,
    marginTop: 2,
  },
  joinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
