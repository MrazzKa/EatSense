// @ts-nocheck
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface CommunityPostCardProps {
  post: any;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
}

export function CommunityPostCard({ post, onPress, onLike, onComment }: CommunityPostCardProps) {
  const { colors } = useTheme();

  const authorName = post.author?.userProfile
    ? `${post.author.userProfile.firstName || ''} ${post.author.userProfile.lastName || ''}`.trim()
    : post.author?.email?.split('@')[0] || 'Anonymous';

  const timeAgo = getTimeAgo(post.createdAt);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {authorName[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.authorName, { color: colors.textPrimary || colors.text }]}>{authorName}</Text>
          <Text style={[styles.timeText, { color: colors.textTertiary }]}>{timeAgo}</Text>
        </View>
      </View>

      <Text style={[styles.content, { color: colors.textPrimary || colors.text }]}>{post.content}</Text>

      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={onLike} style={styles.actionButton}>
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? '#FF3B30' : colors.textTertiary}
          />
          <Text style={[styles.actionText, { color: colors.textTertiary }]}>
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
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
});
