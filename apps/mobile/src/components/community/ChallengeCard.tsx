// @ts-nocheck
/**
 * ChallengeCard — Special card for CHALLENGE-type community posts
 * Shows challenge info, participants count, duration, join button
 */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

interface ChallengeCardProps {
  post: any;
  onPress: () => void;
  onJoin?: () => void;
  onLike?: () => void;
}

export function ChallengeCard({ post, onPress, onJoin, onLike }: ChallengeCardProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const meta = post.metadata || {};
  const participantsCount = post._count?.attendees || meta.participantsCount || 0;
  const duration = meta.duration || meta.durationDays || 7;
  const isJoined = post.isAttending;

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Extract challenge title from metadata or first line of content
  const title = meta.title || post.content?.split('\n')[0] || t('community.challenge', 'Challenge');
  const description = meta.title ? post.content : post.content?.split('\n').slice(1).join('\n');

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      {/* Gradient-like header band */}
      <View style={styles.headerBand}>
        <View style={styles.headerLeft}>
          <View style={styles.fireIcon}>
            <Ionicons name="flame" size={22} color="#FF6D00" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.challengeLabel}>
              {t('community.challengeLabel', 'CHALLENGE')}
            </Text>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {description?.trim() ? (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
          {description.trim()}
        </Text>
      ) : null}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {participantsCount} {t('community.participants', 'joined')}
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {duration} {t('community.days', 'days')}
          </Text>
        </View>
        {post.likesCount > 0 && (
          <View style={styles.stat}>
            <Ionicons name="heart" size={14} color="#FF5252" />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {post.likesCount}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.joinBtn,
            isJoined
              ? { backgroundColor: colors.primary + '15', borderColor: colors.primary }
              : { backgroundColor: colors.primary },
          ]}
          onPress={(e) => { e.stopPropagation?.(); onJoin?.(); }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isJoined ? 'checkmark-circle' : 'flash'}
            size={18}
            color={isJoined ? colors.primary : '#FFF'}
          />
          <Text style={[styles.joinBtnText, { color: isJoined ? colors.primary : '#FFF' }]}>
            {isJoined
              ? t('community.joined', 'Joined')
              : t('community.joinChallenge', 'Join Challenge')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.likeBtn}
          onPress={(e) => { e.stopPropagation?.(); onLike?.(); }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? '#FF5252' : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: colors.surface || colors.card || '#FFF',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    headerBand: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FF6D00' + '10',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#FF6D00' + '15',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    fireIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#FF6D00' + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    headerTextWrap: {
      flex: 1,
    },
    challengeLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FF6D00',
      letterSpacing: 1.2,
      marginBottom: 2,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary || '#212121',
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      paddingHorizontal: 14,
      paddingTop: 10,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 10,
      gap: 16,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 13,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 10,
    },
    joinBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      gap: 6,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    joinBtnText: {
      fontSize: 14,
      fontWeight: '700',
    },
    likeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: (colors.border || '#E0E0E0') + '40',
    },
  });
