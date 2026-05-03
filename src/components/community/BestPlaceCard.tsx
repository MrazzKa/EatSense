// @ts-nocheck
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDesignTokens } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

interface BestPlaceCardProps {
  post: any;
  currentUserId?: string;
  onPress?: () => void;
  onLike?: (type?: string) => void;
  onComment?: () => void;
  onAuthorPress?: (authorId: string) => void;
}

export function BestPlaceCard({
  post,
  currentUserId,
  onPress,
  onLike,
  onComment,
  onAuthorPress,
}: BestPlaceCardProps) {
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const meta = post.metadata || {};
  const placeName = meta.placeName || t('community.bestPlaces.untitled', 'Unnamed place');
  const address = meta.address || '';
  const rating = meta.rating || 0;
  const avgRating = post.placeAvgRating;
  const reviewCount = post.placeReviewCount || 0;

  const authorName = `${post.author?.userProfile?.firstName || ''} ${post.author?.userProfile?.lastName || ''}`.trim() || t('community.anonymous', 'User');
  const groupName = post.group?.name || '';

  const renderStars = (value: number, size = 14) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= value ? 'star' : star - 0.5 <= value ? 'star-half' : 'star-outline'}
            size={size}
            color={star <= value ? '#FFD700' : colors.textTertiary}
          />
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header: Place name + rating */}
      <View style={styles.placeHeader}>
        <View style={[styles.placeIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="location" size={20} color={colors.primary} />
        </View>
        <View style={styles.placeInfo}>
          <Text style={[styles.placeName, { color: colors.textPrimary }]} numberOfLines={2}>
            {placeName}
          </Text>
          {address ? (
            <Text style={[styles.placeAddress, { color: colors.textTertiary }]} numberOfLines={1}>
              {address}
            </Text>
          ) : null}
        </View>
        {rating > 0 && (
          <View style={styles.ratingBadge}>
            {renderStars(rating, 12)}
          </View>
        )}
      </View>

      {/* Content / Review text */}
      {post.content ? (
        <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={3}>
          {post.content}
        </Text>
      ) : null}

      {/* Average rating strip */}
      {avgRating !== null && reviewCount > 0 && (
        <View style={[styles.avgRatingStrip, { backgroundColor: colors.primary + '08' }]}>
          <View style={styles.avgRatingLeft}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={[styles.avgRatingText, { color: colors.textPrimary }]}>
              {avgRating}
            </Text>
          </View>
          <Text style={[styles.reviewCountText, { color: colors.textTertiary }]}>
            {reviewCount} {reviewCount === 1
              ? t('community.bestPlaces.review', 'review')
              : t('community.bestPlaces.reviews', 'reviews')}
          </Text>
        </View>
      )}

      {/* Footer: author, group, actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() => onAuthorPress?.(post.authorId)}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.authorName, { color: colors.textTertiary }]} numberOfLines={1}>
            {authorName}
          </Text>
          {groupName ? (
            <Text style={[styles.groupTag, { color: colors.textTertiary }]} numberOfLines={1}>
              · {groupName}
            </Text>
          ) : null}
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onLike?.()}
            activeOpacity={0.7}
          >
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={post.isLiked ? '#FF4757' : colors.textTertiary}
            />
            {post.likesCount > 0 && (
              <Text style={[styles.actionCount, { color: post.isLiked ? '#FF4757' : colors.textTertiary }]}>
                {post.likesCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onComment}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
            {(post._count?.comments || 0) > 0 && (
              <Text style={[styles.actionCount, { color: colors.textTertiary }]}>
                {post._count.comments}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    placeHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 10,
    },
    placeIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeInfo: {
      flex: 1,
    },
    placeName: {
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 22,
    },
    placeAddress: {
      fontSize: 13,
      marginTop: 2,
    },
    ratingBadge: {
      paddingTop: 2,
    },
    starsRow: {
      flexDirection: 'row',
      gap: 1,
    },
    content: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 10,
    },
    avgRatingStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      marginBottom: 10,
    },
    avgRatingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    avgRatingText: {
      fontSize: 15,
      fontWeight: '700',
    },
    reviewCountText: {
      fontSize: 13,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flex: 1,
    },
    authorName: {
      fontSize: 13,
      fontWeight: '500',
    },
    groupTag: {
      fontSize: 12,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionCount: {
      fontSize: 13,
      fontWeight: '500',
    },
  });
