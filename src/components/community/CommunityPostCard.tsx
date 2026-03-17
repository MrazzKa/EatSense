// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

const REACTION_TYPES = [
  { type: 'LIKE', emoji: '👍' },
  { type: 'HEART', emoji: '❤️' },
  { type: 'FIRE', emoji: '🔥' },
  { type: 'LAUGH', emoji: '😂' },
  { type: 'CLAP', emoji: '👏' },
];

interface CommunityPostCardProps {
  post: any;
  currentUserId?: string;
  onPress?: () => void;
  onLike?: (type?: string) => void;
  onComment?: () => void;
  onDelete?: (postId: string) => void;
  onAuthorPress?: (authorId: string) => void;
}

export function CommunityPostCard({
  post,
  currentUserId,
  onPress,
  onLike,
  onComment,
  onDelete,
  onAuthorPress,
}: CommunityPostCardProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [showReactions, setShowReactions] = useState(false);

  const authorName = post.author?.userProfile
    ? `${post.author.userProfile.firstName || ''} ${post.author.userProfile.lastName || ''}`.trim()
    : post.author?.email?.split('@')[0] || 'Anonymous';

  const timeAgo = getTimeAgo(post.createdAt);
  const isOwn = currentUserId && (post.authorId === currentUserId || post.author?.id === currentUserId);
  const avatarUrl = post.author?.userProfile?.avatarUrl || post.author?.avatarUrl;
  const preset = parsePresetAvatar(avatarUrl);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('community.post.delete', 'Delete Post'),
      t('community.post.deleteConfirm', 'Are you sure you want to delete this post?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('common.delete', 'Delete'), style: 'destructive', onPress: () => onDelete?.(post.id) },
      ],
    );
  }, [post.id, onDelete, t]);

  const handleReactionSelect = useCallback((type: string) => {
    setShowReactions(false);
    onLike?.(type);
  }, [onLike]);

  const handleLikePress = useCallback(() => {
    onLike?.('LIKE');
  }, [onLike]);

  const handleLikeLongPress = useCallback(() => {
    setShowReactions(true);
  }, []);

  // Render metadata for special post types
  const renderMetadata = () => {
    if (!post.metadata) return null;

    if (post.type === 'RECIPE') {
      return (
        <View style={[styles.metadataBox, { backgroundColor: colors.primary + '08', borderColor: colors.border }]}>
          {post.metadata.recipeName && (
            <Text style={[styles.metaTitle, { color: colors.primary }]}>
              🍳 {post.metadata.recipeName}
            </Text>
          )}
          {post.metadata.prepTime && (
            <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
              ⏱ {post.metadata.prepTime} {post.metadata.servings ? `· ${post.metadata.servings} ${t('community.recipe.servingsShort', 'servings')}` : ''}
            </Text>
          )}
        </View>
      );
    }

    if (post.type === 'BEST_PLACES') {
      return (
        <View style={[styles.metadataBox, { backgroundColor: '#4CAF5008', borderColor: colors.border }]}>
          {post.metadata.placeName && (
            <Text style={[styles.metaTitle, { color: '#4CAF50' }]}>
              📍 {post.metadata.placeName}
            </Text>
          )}
          {post.metadata.address && (
            <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>{post.metadata.address}</Text>
          )}
          {post.metadata.rating && (
            <Text style={styles.metaStars}>{'⭐'.repeat(Math.min(post.metadata.rating, 5))}</Text>
          )}
        </View>
      );
    }

    if (post.type === 'QUESTION' && post.metadata?.isSolved) {
      return (
        <View style={[styles.solvedBadge, { backgroundColor: '#4CAF5015' }]}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.solvedText}>{t('community.question.solved', 'Solved')}</Text>
        </View>
      );
    }

    return null;
  };

  // Get reaction emoji for current user
  const currentReaction = post.reactionType || (post.isLiked ? 'LIKE' : null);
  const currentEmoji = currentReaction
    ? REACTION_TYPES.find(r => r.type === currentReaction)?.emoji || '👍'
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onAuthorPress?.(post.authorId || post.author?.id)}
          activeOpacity={0.7}
          style={styles.authorTouchable}
        >
          {preset ? (
            <View style={[styles.avatarCircle, { backgroundColor: preset.bg }]}>
              <Ionicons name={preset.icon} size={18} color="#FFF" />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarCircle} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {authorName[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={[styles.authorName, { color: colors.textPrimary || colors.text }]}>{authorName}</Text>
            <Text style={[styles.timeText, { color: colors.textTertiary }]}>{timeAgo}</Text>
          </View>
        </TouchableOpacity>
        {isOwn && (
          <TouchableOpacity onPress={handleDelete} style={styles.menuBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Post type badge */}
      {post.type && post.type !== 'TEXT' && (
        <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(post.type) + '15' }]}>
          <Text style={[styles.typeBadgeText, { color: getTypeBadgeColor(post.type) }]}>
            {t(`community.postType.${post.type.toLowerCase()}`, post.type)}
          </Text>
        </View>
      )}

      <Text style={[styles.content, { color: colors.textPrimary || colors.text }]}>{post.content}</Text>

      {renderMetadata()}

      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Reaction picker overlay */}
      {showReactions && (
        <View style={[styles.reactionPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {REACTION_TYPES.map((r) => (
            <TouchableOpacity
              key={r.type}
              onPress={() => handleReactionSelect(r.type)}
              style={[
                styles.reactionBtn,
                currentReaction === r.type && { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowReactions(false)} style={styles.reactionCloseBtn}>
            <Ionicons name="close" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleLikePress}
          onLongPress={handleLikeLongPress}
          style={styles.actionButton}
        >
          {currentEmoji ? (
            <Text style={styles.reactionSmall}>{currentEmoji}</Text>
          ) : (
            <Ionicons name="heart-outline" size={20} color={colors.textTertiary} />
          )}
          <Text style={[styles.actionText, { color: post.isLiked ? colors.primary : colors.textTertiary }]}>
            {post.likesCount || 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onComment} style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textTertiary} />
          <Text style={[styles.actionText, { color: colors.textTertiary }]}>
            {post._count?.comments || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function parsePresetAvatar(url) {
  if (!url?.startsWith('preset://')) return null;
  const parts = url.replace('preset://', '').split('|');
  if (parts.length === 2) return { icon: parts[0], bg: parts[1] };
  return null;
}

function getTypeBadgeColor(type: string): string {
  const map = {
    PHOTO: '#2196F3',
    RECOMMENDATION: '#FF9800',
    ACHIEVEMENT: '#FFD700',
    EVENT: '#E91E63',
    LIFESTYLE: '#9C27B0',
    BEST_PLACES: '#4CAF50',
    RECIPE: '#FF5722',
    QUESTION: '#00BCD4',
    CHALLENGE: '#FF6D00',
  };
  return map[type] || '#666';
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  authorTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    marginTop: 1,
  },
  menuBtn: {
    padding: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
  },
  metadataBox: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  metaTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  metaStars: {
    fontSize: 14,
    marginTop: 4,
  },
  solvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  solvedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 4,
  },
  reactionSmall: {
    fontSize: 18,
  },
  reactionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  reactionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  reactionEmoji: {
    fontSize: 22,
  },
  reactionCloseBtn: {
    marginLeft: 4,
    padding: 4,
  },
});
