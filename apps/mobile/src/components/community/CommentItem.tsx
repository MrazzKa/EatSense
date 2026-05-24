// @ts-nocheck
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

interface CommentItemProps {
  comment: any;
  isOwn?: boolean;
  onDelete?: (commentId: string) => void;
  onAuthorPress?: (authorId: string) => void;
}

export function CommentItem({ comment, isOwn, onDelete, onAuthorPress }: CommentItemProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const authorName = comment.author?.userProfile
    ? `${comment.author.userProfile.firstName || ''} ${comment.author.userProfile.lastName || ''}`.trim()
    : comment.author?.email?.split('@')[0] || 'Anonymous';

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('community.comment.delete', 'Delete Comment'),
      t('community.deleteCommentConfirm', 'Are you sure you want to delete this comment?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('common.delete', 'Delete'), style: 'destructive', onPress: () => onDelete?.(comment.id) },
      ],
    );
  }, [comment.id, onDelete, t]);

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        onPress={() => onAuthorPress?.(comment.authorId || comment.author?.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {authorName[0]?.toUpperCase() || '?'}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <TouchableOpacity
            onPress={() => onAuthorPress?.(comment.authorId || comment.author?.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.name, { color: colors.textPrimary || colors.text }]}>{authorName}</Text>
          </TouchableOpacity>
          {isOwn && (
            <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.content, { color: colors.textPrimary || colors.text }]}>{comment.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
});
