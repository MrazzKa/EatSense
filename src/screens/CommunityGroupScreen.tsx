// @ts-nocheck
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';
import { CommunityPostCard } from '../components/community/CommunityPostCard';
import { EventCard } from '../components/community/EventCard';
import { ChallengeCard } from '../components/community/ChallengeCard';
import { AuthorProfileSheet } from '../components/community/AuthorProfileSheet';
import { useAuth } from '../contexts/AuthContext';

export default function CommunityGroupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId, groupName } = route.params as any;
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();

  const [group, setGroup] = useState<any>(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const { user } = useAuth();
  const [authorSheetVisible, setAuthorSheetVisible] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const loadData = useCallback(async () => {
    try {
      const [groupData, postsData] = await Promise.all([
        ApiService.getCommunityGroup(groupId),
        ApiService.getCommunityGroupPosts(groupId),
      ]);
      setGroup(groupData);
      setPosts(postsData?.data || postsData || []);
      setIsMember(groupData?.isMember || false);
    } catch (err) {
      console.warn('Failed to load group data:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleJoinLeave = useCallback(async () => {
    try {
      if (isMember) {
        await ApiService.leaveCommunityGroup(groupId);
      } else {
        await ApiService.joinCommunityGroup(groupId);
      }
      setIsMember((prev) => !prev);
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              isMember: !prev.isMember,
              _count: {
                ...prev._count,
                memberships: isMember
                  ? (prev._count?.memberships || 1) - 1
                  : (prev._count?.memberships || 0) + 1,
              },
            }
          : prev,
      );
    } catch (err) {
      console.warn('Failed to toggle membership:', err);
    }
  }, [groupId, isMember]);

  const handleLike = useCallback(async (postId: string, type?: string) => {
    try {
      await ApiService.toggleCommunityLike(postId, type);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: !p.isLiked,
                likesCount: p.isLiked ? (p.likesCount || 1) - 1 : (p.likesCount || 0) + 1,
              }
            : p,
        ),
      );
    } catch (err) {
      console.warn('Failed to toggle like:', err);
    }
  }, []);

  const handleAttend = useCallback(async (postId: string) => {
    try {
      await ApiService.toggleEventAttendance(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isAttending: !p.isAttending,
                _count: {
                  ...p._count,
                  attendees: p.isAttending
                    ? (p._count?.attendees || 1) - 1
                    : (p._count?.attendees || 0) + 1,
                },
              }
            : p,
        ),
      );
    } catch (err) {
      console.warn('Failed to toggle attendance:', err);
    }
  }, []);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await ApiService.deleteCommunityPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.warn('Failed to delete post:', err);
    }
  }, []);

  const handleAuthorPress = useCallback((authorId: string) => {
    if (!authorId) return;
    setSelectedAuthorId(authorId);
    setAuthorSheetVisible(true);
  }, []);

  const renderPostItem = useCallback(
    ({ item }) => {
      if (item.type === 'EVENT') {
        return (
          <EventCard
            post={item}
            onPress={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
            onAttend={() => handleAttend(item.id)}
          />
        );
      }
      if (item.type === 'CHALLENGE') {
        return (
          <ChallengeCard
            post={item}
            onPress={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
            onJoin={() => handleAttend(item.id)}
            onLike={() => handleLike(item.id)}
          />
        );
      }
      return (
        <CommunityPostCard
          post={item}
          currentUserId={user?.id}
          onPress={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
          onLike={(type) => handleLike(item.id, type)}
          onComment={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
          onDelete={handleDeletePost}
          onAuthorPress={handleAuthorPress}
        />
      );
    },
    [navigation, handleLike, handleAttend, handleDeletePost, handleAuthorPress, user?.id],
  );

  const renderHeader = () => (
    <View style={styles.groupInfo}>
      <View style={[styles.groupIconLarge, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons
          name={group?.type === 'CITY' ? 'location' : 'people'}
          size={32}
          color={colors.primary}
        />
      </View>
      <Text style={[styles.groupName, { color: colors.textPrimary || colors.text }]}>
        {group?.name || groupName}
      </Text>
      {group?.description ? (
        <Text style={[styles.groupDescription, { color: colors.textSecondary }]}>
          {group.description}
        </Text>
      ) : null}
      <Text style={[styles.memberCount, { color: colors.textTertiary }]}>
        {group?._count?.memberships || 0} {t('community.members', 'members')}
      </Text>
      <TouchableOpacity
        style={[
          styles.joinLeaveBtn,
          { backgroundColor: isMember ? colors.border : colors.primary },
        ]}
        onPress={handleJoinLeave}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.joinLeaveText,
            { color: isMember ? colors.textPrimary || colors.text : '#fff' },
          ]}
        >
          {isMember ? t('community.leave', 'Leave Group') : t('community.join', 'Join')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={40} color={colors.textTertiary} />
      <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
        {t('community.noGroupPosts', 'No posts in this group yet')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerBarTitle, { color: colors.textPrimary || colors.text }]} numberOfLines={1}>
            {groupName || t('community.group', 'Group')}
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerBarTitle, { color: colors.textPrimary || colors.text }]} numberOfLines={1}>
          {group?.name || groupName}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPostItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <AuthorProfileSheet
        visible={authorSheetVisible}
        authorId={selectedAuthorId}
        onClose={() => setAuthorSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    headerBar: {
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
    headerBarTitle: {
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
      paddingBottom: 40,
    },
    groupInfo: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
    },
    groupIconLarge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    groupName: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
    },
    groupDescription: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
    },
    memberCount: {
      fontSize: 14,
      marginTop: 6,
    },
    joinLeaveBtn: {
      paddingHorizontal: 28,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 14,
    },
    joinLeaveText: {
      fontSize: 15,
      fontWeight: '600',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 40,
    },
    emptyText: {
      fontSize: 15,
      marginTop: 10,
    },
  });
