// @ts-nocheck
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CommentItemProps {
  comment: any;
}

export function CommentItem({ comment }: CommentItemProps) {
  const { colors } = useTheme();

  const authorName = comment.author?.userProfile
    ? `${comment.author.userProfile.firstName || ''} ${comment.author.userProfile.lastName || ''}`.trim()
    : comment.author?.email?.split('@')[0] || 'Anonymous';

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {authorName[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.textPrimary || colors.text }]}>{authorName}</Text>
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
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
});
