// @ts-nocheck
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';
import { CommentItem } from '../components/community/CommentItem';

export default function CommunityPostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { postId } = route.params as any;
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const inputRef = useRef<TextInput>(null);

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const loadData = useCallback(async () => {
    try {
      const [postData, commentsData] = await Promise.all([
        ApiService.getCommunityPost(postId),
        ApiService.getCommunityComments(postId),
      ]);
      setPost(postData);
      setComments(commentsData?.data || commentsData || []);
    } catch (err) {
      console.warn('Failed to load post detail:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleLike = useCallback(async () => {
    if (!post) return;
    try {
      await ApiService.toggleCommunityLike(postId);
      setPost((prev) => ({
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: prev.isLiked ? (prev.likesCount || 1) - 1 : (prev.likesCount || 0) + 1,
      }));
    } catch (err) {
      console.warn('Failed to toggle like:', err);
    }
  }, [post, postId]);

  const handleSubmitComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    try {
      const newComment = await ApiService.createCommunityComment(postId, { content: text });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setPost((prev) =>
        prev
          ? { ...prev, _count: { ...prev._count, comments: (prev._count?.comments || 0) + 1 } }
          : prev,
      );
    } catch (err) {
      console.warn('Failed to submit comment:', err);
    } finally {
      setSubmitting(false);
    }
  }, [commentText, submitting, postId]);

  const authorName = post?.author?.userProfile
    ? `${post.author.userProfile.firstName || ''} ${post.author.userProfile.lastName || ''}`.trim()
    : post?.author?.email?.split('@')[0] || 'Anonymous';

  const renderPostHeader = () => {
    if (!post) return null;
    return (
      <View style={styles.postContainer}>
        {/* Author */}
        <View style={styles.authorRow}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {authorName[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: colors.textPrimary || colors.text }]}>
              {authorName}
            </Text>
            <Text style={[styles.timeText, { color: colors.textTertiary }]}>
              {new Date(post.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Content */}
        <Text style={[styles.postContent, { color: colors.textPrimary || colors.text }]}>
          {post.content}
        </Text>

        {/* Image */}
        {post.imageUrl && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
        )}

        {/* Actions */}
        <View style={[styles.actionsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={post.isLiked ? '#FF3B30' : colors.textTertiary}
            />
            <Text style={[styles.actionCount, { color: colors.textTertiary }]}>
              {post.likesCount || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => inputRef.current?.focus()}
            style={styles.actionBtn}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textTertiary} />
            <Text style={[styles.actionCount, { color: colors.textTertiary }]}>
              {post._count?.comments || comments.length}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comments header */}
        <Text style={[styles.commentsHeader, { color: colors.textPrimary || colors.text }]}>
          {t('community.comments', 'Comments')}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.textPrimary || colors.text }]}>
            {t('community.post', 'Post')}
          </Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary || colors.text }]}>
          {t('community.post', 'Post')}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={comments}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={({ item }) => <CommentItem comment={item} />}
          ListHeaderComponent={renderPostHeader}
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Text style={[styles.emptyCommentsText, { color: colors.textTertiary }]}>
                {t('community.noComments', 'No comments yet. Be the first!')}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Comment input */}
        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.textPrimary || colors.text, backgroundColor: colors.surfaceSecondary || colors.surface }]}
            placeholder={t('community.writeComment', 'Write a comment...')}
            placeholderTextColor={colors.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
            style={[
              styles.sendBtn,
              { opacity: !commentText.trim() || submitting ? 0.4 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="send" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingBottom: 8,
    },
    postContainer: {
      paddingBottom: 8,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 10,
    },
    avatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '600',
    },
    authorInfo: {
      marginLeft: 12,
      flex: 1,
    },
    authorName: {
      fontSize: 16,
      fontWeight: '600',
    },
    timeText: {
      fontSize: 13,
      marginTop: 1,
    },
    postContent: {
      fontSize: 16,
      lineHeight: 23,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    postImage: {
      width: '100%',
      height: 240,
    },
    actionsRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 24,
    },
    actionCount: {
      fontSize: 15,
      marginLeft: 6,
    },
    commentsHeader: {
      fontSize: 16,
      fontWeight: '600',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    emptyComments: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    emptyCommentsText: {
      fontSize: 14,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    textInput: {
      flex: 1,
      minHeight: 38,
      maxHeight: 100,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 15,
    },
    sendBtn: {
      width: 40,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
