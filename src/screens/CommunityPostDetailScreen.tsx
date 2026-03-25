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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';

const POST_TYPE_I18N_MAP: Record<string, string> = {
  TEXT: 'text', PHOTO: 'photo', DIET_SHARE: 'dietShare', ACHIEVEMENT: 'achievement',
  EVENT: 'event', RECOMMENDATION: 'recommendation', LIFESTYLE: 'lifestyle',
  BEST_PLACES: 'bestPlaces', RECIPE: 'recipe', QUESTION: 'question', CHALLENGE: 'challenge',
};
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/apiService';
import { CommentItem } from '../components/community/CommentItem';
import { AuthorProfileSheet } from '../components/community/AuthorProfileSheet';
import { REACTION_TYPES, getReactionEmoji } from '../components/community/ReactionPicker';

export default function CommunityPostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { postId = '' } = (route.params as any) || {};
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  // Author profile sheet
  const [authorSheetVisible, setAuthorSheetVisible] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

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

  const handleLike = useCallback(async (type?: string) => {
    if (!post) return;
    try {
      await ApiService.toggleCommunityLike(postId, type);
      setPost((prev) => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        reactionType: prev.isLiked ? null : (type || 'LIKE'),
        likesCount: prev.isLiked ? (prev.likesCount || 1) - 1 : (prev.likesCount || 0) + 1,
      } : prev);
    } catch (err) {
      console.warn('Failed to toggle like:', err);
    }
    setShowReactions(false);
  }, [post, postId]);

  const handleDeletePost = useCallback(() => {
    Alert.alert(
      t('community.post.delete', 'Delete Post'),
      t('community.post.deleteConfirm', 'Are you sure you want to delete this post?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteCommunityPost(postId);
              navigation.goBack();
            } catch (err) {
              console.warn('Failed to delete post:', err);
            }
          },
        },
      ],
    );
  }, [postId, navigation, t]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await ApiService.deleteCommunityComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPost((prev) =>
        prev ? { ...prev, _count: { ...prev._count, comments: Math.max((prev._count?.comments || 1) - 1, 0) } } : prev,
      );
    } catch (err) {
      console.warn('Failed to delete comment:', err);
    }
  }, []);

  const handleMarkSolved = useCallback(async () => {
    if (!post) return;
    try {
      const updatedMetadata = { ...(post.metadata || {}), isSolved: true };
      await ApiService.updateCommunityPost(postId, { metadata: updatedMetadata });
      setPost((prev) => prev ? { ...prev, metadata: updatedMetadata } : prev);
    } catch (err) {
      console.warn('Failed to mark as solved:', err);
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

  const handleAuthorPress = useCallback((authorId: string) => {
    if (!authorId) return;
    setSelectedAuthorId(authorId);
    setAuthorSheetVisible(true);
  }, []);

  const authorName = post?.author?.userProfile
    ? `${post.author.userProfile.firstName || ''} ${post.author.userProfile.lastName || ''}`.trim()
    : post?.author?.email?.split('@')[0] || 'Anonymous';

  const isOwnPost = user?.id && (post?.authorId === user.id || post?.author?.id === user.id);
  const currentReaction = post?.reactionType || (post?.isLiked ? 'LIKE' : null);
  const currentEmoji = getReactionEmoji(currentReaction);

  const renderPostHeader = () => {
    if (!post) return null;
    return (
      <View style={styles.postContainer}>
        {/* Author */}
        <View style={styles.authorRow}>
          <TouchableOpacity
            onPress={() => handleAuthorPress(post.authorId || post.author?.id)}
            style={styles.authorTouchable}
            activeOpacity={0.7}
          >
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
          </TouchableOpacity>
        </View>

        {/* Post type badge */}
        {post.type && post.type !== 'TEXT' && (
          <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(post.type) + '15' }]}>
            <Text style={[styles.typeBadgeText, { color: getTypeBadgeColor(post.type) }]}>
              {t(`community.postType.${POST_TYPE_I18N_MAP[post.type] || post.type.toLowerCase()}`, post.type)}
            </Text>
          </View>
        )}

        {/* Content */}
        <Text style={[styles.postContent, { color: colors.textPrimary || colors.text }]}>
          {post.content}
        </Text>

        {/* Metadata for special types */}
        {renderMetadata()}

        {/* Image */}
        {post.imageUrl && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
        )}

        {/* Reaction picker */}
        {showReactions && (
          <View style={[styles.reactionPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {REACTION_TYPES.map((r) => (
              <TouchableOpacity
                key={r.type}
                onPress={() => handleLike(r.type)}
                style={[
                  styles.reactionBtn,
                  currentReaction === r.type && { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={[styles.actionsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => handleLike('LIKE')}
            onLongPress={() => setShowReactions(true)}
            style={styles.actionBtn}
          >
            {currentEmoji ? (
              <Text style={styles.reactionSmall}>{currentEmoji}</Text>
            ) : (
              <Ionicons name="heart-outline" size={22} color={colors.textTertiary} />
            )}
            <Text style={[styles.actionCount, { color: post.isLiked ? colors.primary : colors.textTertiary }]}>
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

          {/* Mark as solved for QUESTION type (own post only) */}
          {post.type === 'QUESTION' && isOwnPost && !post.metadata?.isSolved && (
            <TouchableOpacity onPress={handleMarkSolved} style={styles.solveBtn}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.solveText}>{t('community.question.markSolved', 'Mark Solved')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Solved badge */}
        {post.type === 'QUESTION' && post.metadata?.isSolved && (
          <View style={[styles.solvedBanner, { backgroundColor: '#4CAF5010' }]}>
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            <Text style={styles.solvedBannerText}>{t('community.question.solved', 'Solved')}</Text>
          </View>
        )}

        {/* Comments header */}
        <Text style={[styles.commentsHeader, { color: colors.textPrimary || colors.text }]}>
          {t('community.comments', 'Comments')}
        </Text>
      </View>
    );
  };

  const renderMetadata = () => {
    if (!post?.metadata) return null;

    if (post.type === 'RECIPE') {
      return (
        <View style={[styles.metadataBox, { backgroundColor: colors.primary + '08', borderColor: colors.border }]}>
          {post.metadata.recipeName && (
            <Text style={[styles.metaTitle, { color: colors.primary }]}>🍳 {post.metadata.recipeName}</Text>
          )}
          {post.metadata.ingredients && (
            <View style={styles.metaSection}>
              <Text style={[styles.metaSectionTitle, { color: colors.textSecondary }]}>
                {t('community.recipe.ingredients', 'Ingredients')}
              </Text>
              <Text style={[styles.metaBody, { color: colors.textPrimary || colors.text }]}>
                {post.metadata.ingredients}
              </Text>
            </View>
          )}
          {post.metadata.steps && (
            <View style={styles.metaSection}>
              <Text style={[styles.metaSectionTitle, { color: colors.textSecondary }]}>
                {t('community.recipe.steps', 'Steps')}
              </Text>
              <Text style={[styles.metaBody, { color: colors.textPrimary || colors.text }]}>
                {post.metadata.steps}
              </Text>
            </View>
          )}
          {(post.metadata.prepTime || post.metadata.servings) && (
            <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
              {post.metadata.prepTime ? `⏱ ${post.metadata.prepTime}` : ''}
              {post.metadata.servings ? ` · ${post.metadata.servings} ${t('community.recipe.servingsShort', 'servings')}` : ''}
            </Text>
          )}
        </View>
      );
    }

    if (post.type === 'BEST_PLACES') {
      return (
        <View style={[styles.metadataBox, { backgroundColor: '#4CAF5008', borderColor: colors.border }]}>
          {post.metadata.placeName && (
            <Text style={[styles.metaTitle, { color: '#4CAF50' }]}>📍 {post.metadata.placeName}</Text>
          )}
          {post.metadata.address && (
            <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>{post.metadata.address}</Text>
          )}
          {post.metadata?.rating > 0 && (
            <Text style={styles.metaStars}>{'⭐'.repeat(Math.min(Number(post.metadata.rating) || 0, 5))}</Text>
          )}
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.textPrimary || colors.text }]}>
            {t('community.postTitle', 'Post')}
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
          {t('community.postTitle', 'Post')}
        </Text>
        {isOwnPost ? (
          <TouchableOpacity onPress={handleDeletePost} style={styles.backBtn}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={comments}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              isOwn={user?.id && (item.authorId === user.id || item.author?.id === user.id)}
              onDelete={handleDeleteComment}
              onAuthorPress={handleAuthorPress}
            />
          )}
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

      {/* Author Profile Sheet */}
      <AuthorProfileSheet
        visible={authorSheetVisible}
        authorId={selectedAuthorId}
        onClose={() => setAuthorSheetVisible(false)}
      />
    </SafeAreaView>
  );
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

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    flex: { flex: 1 },
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
    listContent: { paddingBottom: 8 },
    postContainer: { paddingBottom: 8 },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 10,
    },
    authorTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '600' },
    authorInfo: { marginLeft: 12, flex: 1 },
    authorName: { fontSize: 16, fontWeight: '600' },
    timeText: { fontSize: 13, marginTop: 1 },
    typeBadge: {
      alignSelf: 'flex-start',
      marginLeft: 16,
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
    postContent: {
      fontSize: 16,
      lineHeight: 23,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    postImage: { width: '100%', height: 240 },
    metadataBox: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    metaTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    metaSection: { marginTop: 8 },
    metaSectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    metaBody: { fontSize: 14, lineHeight: 20 },
    metaDetail: { fontSize: 13, marginTop: 4 },
    metaStars: { fontSize: 14, marginTop: 4 },
    reactionPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
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
    reactionBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
    reactionEmoji: { fontSize: 22 },
    reactionSmall: { fontSize: 20 },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    actionCount: { fontSize: 15, marginLeft: 6 },
    solveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 'auto',
      gap: 4,
    },
    solveText: { fontSize: 13, fontWeight: '600', color: '#4CAF50' },
    solvedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 8,
      padding: 10,
      borderRadius: 8,
      gap: 6,
    },
    solvedBannerText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
    commentsHeader: {
      fontSize: 16,
      fontWeight: '600',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    emptyComments: { alignItems: 'center', paddingVertical: 24 },
    emptyCommentsText: { fontSize: 14 },
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
