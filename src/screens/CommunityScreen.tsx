// @ts-nocheck
import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/apiService';
import { ProfileAvatarButton } from '../components/ProfileAvatarButton';
import { CommunityPostCard } from '../components/community/CommunityPostCard';
import { EventCard } from '../components/community/EventCard';
import { GroupCard } from '../components/community/GroupCard';

type TabKey = 'feed' | 'groups';

export default function CommunityScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('feed');
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCity, setHasCity] = useState(false);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const loadFeed = useCallback(async () => {
    try {
      const data = await ApiService.getCommunityFeed();
      setPosts(data?.data || data || []);
    } catch (err) {
      console.warn('Failed to load community feed:', err);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const data = await ApiService.getCommunityGroups();
      setGroups(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.warn('Failed to load community groups:', err);
    }
  }, []);

  const checkCity = useCallback(async () => {
    try {
      const city = await ApiService.getMyCity();
      setHasCity(!!city);
    } catch {
      setHasCity(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadFeed(), loadGroups(), checkCity()]);
    setLoading(false);
  }, [loadFeed, loadGroups, checkCity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(), loadGroups(), checkCity()]);
    setRefreshing(false);
  }, [loadFeed, loadGroups, checkCity]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    setHasCity(!!user?.cityGroupId);
  }, [user?.cityGroupId]);

  const handleLike = useCallback(async (postId: string) => {
    try {
      await ApiService.toggleCommunityLike(postId);
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

  const handleJoinGroup = useCallback(async (groupId: string) => {
    try {
      if (groups.find(g => g.id === groupId)?.isMember) {
        await ApiService.leaveCommunityGroup(groupId);
      } else {
        await ApiService.joinCommunityGroup(groupId);
      }
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                isMember: !g.isMember,
                _count: {
                  ...g._count,
                  memberships: g.isMember
                    ? (g._count?.memberships || 1) - 1
                    : (g._count?.memberships || 0) + 1,
                },
              }
            : g,
        ),
      );
    } catch (err) {
      console.warn('Failed to toggle group membership:', err);
    }
  }, [groups]);

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
      return (
        <CommunityPostCard
          post={item}
          onPress={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
          onLike={() => handleLike(item.id)}
          onComment={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
        />
      );
    },
    [navigation, handleLike, handleAttend],
  );

  const renderGroupItem = useCallback(
    ({ item }) => (
      <GroupCard
        group={item}
        isMember={item.isMember}
        onPress={() => navigation.navigate('CommunityGroup', { groupId: item.id, groupName: item.name })}
        onJoin={() => handleJoinGroup(item.id)}
      />
    ),
    [navigation, handleJoinGroup],
  );

  const renderCityBanner = () => {
    if (hasCity) return null;
    return (
      <TouchableOpacity
        style={[styles.cityBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
        onPress={() => navigation.navigate('CitySelector')}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={20} color={colors.primary} />
        <Text style={[styles.cityBannerText, { color: colors.primary }]}>
          {t('community.setCity', 'Set your city to connect with locals')}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </TouchableOpacity>
    );
  };

  const renderEmptyFeed = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary || colors.text }]}>
        {t('community.emptyFeed', 'No posts yet')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {t('community.emptyFeedDesc', 'Join groups and be the first to share!')}
      </Text>
    </View>
  );

  const renderEmptyGroups = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary || colors.text }]}>
        {t('community.emptyGroups', 'No groups found')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {t('community.emptyGroupsDesc', 'Create a group to get started!')}
      </Text>
    </View>
  );

  const feedHeader = () => (
    <>
      {renderCityBanner()}
    </>
  );

  const groupsHeader = () => (
    <TouchableOpacity
      style={[styles.createGroupBtn, { borderColor: colors.border }]}
      onPress={() => navigation.navigate('CreateCommunityGroup')}
      activeOpacity={0.7}
    >
      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
      <Text style={[styles.createGroupText, { color: colors.primary }]}>
        {t('community.createGroup', 'Create a new group')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('community.title', 'Community')}
        </Text>
        <ProfileAvatarButton />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'feed' ? colors.primary : colors.textTertiary },
            ]}
          >
            {t('community.myFeed', 'My Feed')}
          </Text>
          {activeTab === 'feed' && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'groups' ? colors.primary : colors.textTertiary },
            ]}
          >
            {t('community.groups', 'Groups')}
          </Text>
          {activeTab === 'groups' && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'feed' ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPostItem}
          ListHeaderComponent={feedHeader}
          ListEmptyComponent={renderEmptyFeed}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
          ListHeaderComponent={groupsHeader}
          ListEmptyComponent={renderEmptyGroups}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('CreateCommunityPost')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      paddingHorizontal: 16,
    },
    tab: {
      marginRight: 24,
      paddingBottom: 10,
      position: 'relative',
    },
    tabActive: {},
    tabText: {
      fontSize: 16,
      fontWeight: '600',
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      borderRadius: 1.5,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingTop: 12,
      paddingBottom: 100,
    },
    cityBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    cityBannerText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 6,
    },
    createGroupBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
    },
    createGroupText: {
      fontSize: 15,
      fontWeight: '600',
      marginLeft: 8,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
  });
