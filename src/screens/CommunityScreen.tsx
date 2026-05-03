// @ts-nocheck
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
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
import { BestPlaceCard } from '../components/community/BestPlaceCard';
import { EventCard } from '../components/community/EventCard';
import { ChallengeCard } from '../components/community/ChallengeCard';
import { GroupCard } from '../components/community/GroupCard';
import CommunityGuidedTour from '../components/community/CommunityGuidedTour';
import { AuthorProfileSheet } from '../components/community/AuthorProfileSheet';

type TabKey = 'feed' | 'groups' | 'places';

export default function CommunityScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const { user } = useAuth();
  const isInitialLoad = useRef(true);

  const [activeTab, setActiveTab] = useState<TabKey>('feed');
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCity, setHasCity] = useState(false);
  const [myOwnedCommunity, setMyOwnedCommunity] = useState<{ id: string; name: string } | null>(null);
  const [bestPlaces, setBestPlaces] = useState([]);

  // Search
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Author profile sheet
  const [authorSheetVisible, setAuthorSheetVisible] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

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

  const loadOwnedCommunity = useCallback(async () => {
    try {
      const owned = await ApiService.getMyOwnedCommunity();
      setMyOwnedCommunity(owned?.id ? { id: owned.id, name: owned.name || '' } : null);
    } catch {
      setMyOwnedCommunity(null);
    }
  }, []);

  const loadBestPlaces = useCallback(async () => {
    try {
      const data = await ApiService.getBestPlaces(1, 50);
      setBestPlaces(data?.data || data || []);
    } catch (err) {
      console.warn('Failed to load best places:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (isInitialLoad.current) {
      setLoading(true);
    }
    await Promise.all([loadFeed(), loadGroups(), checkCity(), loadOwnedCommunity(), loadBestPlaces()]);
    setLoading(false);
    isInitialLoad.current = false;
  }, [loadFeed, loadGroups, checkCity, loadOwnedCommunity, loadBestPlaces]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(), loadGroups(), checkCity(), loadOwnedCommunity(), loadBestPlaces()]);
    setRefreshing(false);
  }, [loadFeed, loadGroups, checkCity, loadOwnedCommunity, loadBestPlaces]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    setHasCity(!!user?.cityGroupId);
  }, [user?.cityGroupId]);

  // --- Handlers ---

  const handleLike = useCallback(async (postId: string, type?: string) => {
    try {
      await ApiService.toggleCommunityLike(postId, type);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: !p.isLiked,
                reactionType: p.isLiked ? null : (type || 'LIKE'),
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
      Alert.alert(t('common.error', 'Error'), t('community.deleteFailed', 'Failed to delete'));
    }
  }, [t]);

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

  const handleAuthorPress = useCallback((authorId: string) => {
    if (!authorId) return;
    setSelectedAuthorId(authorId);
    setAuthorSheetVisible(true);
  }, []);

  // --- Filtered data ---
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter((p) => {
      const content = (p.content || '').toLowerCase();
      const author = `${p.author?.userProfile?.firstName || ''} ${p.author?.userProfile?.lastName || ''}`.toLowerCase();
      return content.includes(q) || author.includes(q);
    });
  }, [posts, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter((g) => (g.name || '').toLowerCase().includes(q));
  }, [groups, searchQuery]);

  // Recommended groups (non-member groups for empty feed state)
  const recommendedGroups = useMemo(() => {
    return groups.filter((g) => !g.isMember).slice(0, 4);
  }, [groups]);

  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return bestPlaces;
    const q = searchQuery.toLowerCase();
    return bestPlaces.filter((p) => {
      const meta = (p as any).metadata || {};
      const content = ((p as any).content || '').toLowerCase();
      const name = (meta.placeName || '').toLowerCase();
      const addr = (meta.address || '').toLowerCase();
      return content.includes(q) || name.includes(q) || addr.includes(q);
    });
  }, [bestPlaces, searchQuery]);

  // --- Render helpers ---

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

  const renderBestPlaceItem = useCallback(
    ({ item }) => (
      <BestPlaceCard
        post={item}
        currentUserId={user?.id}
        onPress={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
        onLike={(type) => handleLike(item.id, type)}
        onComment={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
        onAuthorPress={handleAuthorPress}
      />
    ),
    [navigation, handleLike, handleAuthorPress, user?.id],
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
          {t('community.setCountry', 'Set your country to connect with locals')}
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

      {/* Recommended groups */}
      {recommendedGroups.length > 0 && (
        <View style={styles.recommendedSection}>
          <Text style={[styles.recommendedTitle, { color: colors.textPrimary || colors.text }]}>
            {t('community.recommendedGroups', 'Recommended for you')}
          </Text>
          {recommendedGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isMember={false}
              onPress={() => navigation.navigate('CommunityGroup', { groupId: group.id, groupName: group.name })}
              onJoin={() => handleJoinGroup(group.id)}
            />
          ))}
        </View>
      )}
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

  const renderEmptyPlaces = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="location-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary || colors.text }]}>
        {t('community.emptyPlaces', 'No places yet')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {t('community.emptyPlacesDesc', 'Be the first to share a great place!')}
      </Text>
    </View>
  );

  const handleTourStep = useCallback((stepIndex: number) => {
    if (stepIndex === 0) {
      setActiveTab('groups');
    } else if (stepIndex === 1) {
      navigation.navigate('CreateCommunityPost');
    }
  }, [navigation]);

  const feedHeader = () => (
    <>
      <CommunityGuidedTour onStepAction={handleTourStep} />
      {renderCityBanner()}
    </>
  );

  const groupsHeader = () => {
    // User-created custom groups are disabled — only country-based groups are available.
    // We still show "Open my community" if the user already owns one (legacy data).
    if (myOwnedCommunity) {
      return (
        <TouchableOpacity
          style={[styles.createGroupBtn, { borderColor: colors.border }]}
          onPress={() => navigation.navigate('CommunityGroup', { groupId: myOwnedCommunity.id, groupName: myOwnedCommunity.name })}
          activeOpacity={0.7}
        >
          <Ionicons name="people-circle-outline" size={22} color={colors.primary} />
          <Text style={[styles.createGroupText, { color: colors.primary }]}>
            {t('community.openExisting', 'Open my community')}
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('community.title', 'Community')}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => { setSearchVisible((v) => !v); if (searchVisible) setSearchQuery(''); }}
            style={styles.searchToggle}
          >
            <Ionicons name={searchVisible ? 'close' : 'search'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <ProfileAvatarButton />
        </View>
      </View>

      {/* Search bar */}
      {searchVisible && (
        <View style={[styles.searchBar, { borderBottomColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary || colors.text }]}
            placeholder={t('community.searchPlaceholder', 'Search posts and groups...')}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'places' && styles.tabActive]}
          onPress={() => setActiveTab('places')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'places' ? colors.primary : colors.textTertiary },
            ]}
          >
            {t('community.places', 'Places')}
          </Text>
          {activeTab === 'places' && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'feed' ? (
        <FlatList
          data={filteredPosts}
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
      ) : activeTab === 'groups' ? (
        <FlatList
          data={filteredGroups}
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
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          renderItem={renderBestPlaceItem}
          ListEmptyComponent={renderEmptyPlaces}
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

      {/* Author Profile Sheet */}
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
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    searchToggle: {
      padding: 4,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      paddingVertical: 4,
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
      paddingBottom: 110,
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
      paddingTop: 60,
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
    recommendedSection: {
      width: '100%',
      marginTop: 24,
      paddingHorizontal: 0,
    },
    recommendedTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      textAlign: 'left',
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
      bottom: 96,
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
