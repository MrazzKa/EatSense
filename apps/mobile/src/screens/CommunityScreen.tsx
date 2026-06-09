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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileAvatarButton } from '../components/ProfileAvatarButton';
import { CommunityPostCard } from '../components/community/CommunityPostCard';
import { BestPlaceCard } from '../components/community/BestPlaceCard';
import { EventCard } from '../components/community/EventCard';
import { RouteCard } from '../components/community/RouteCard';
import { ChallengeCard } from '../components/community/ChallengeCard';
import { GroupCard, resolveGroupName } from '../components/community/GroupCard';
import CommunityGuidedTour from '../components/community/CommunityGuidedTour';
import { AuthorProfileSheet } from '../components/community/AuthorProfileSheet';
import CommunityPlacesMap from '../components/community/CommunityPlacesMap';
import BottomSheet from '../components/common/BottomSheet';
import { CUISINES } from '../config/cuisines';
import {
  FLOATING_TAB_BAR_BOTTOM_GAP,
  FLOATING_TAB_BAR_HEIGHT,
} from '../navigation/GlassTabBar';

type TabKey = 'feed' | 'groups' | 'places';

export default function CommunityScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuth();
  const isInitialLoad = useRef(true);

  // Pilot focus is the Switzerland map + places, so land there by default.
  const [activeTab, setActiveTab] = useState<TabKey>('places');
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCity, setHasCity] = useState(false);
  const [myOwnedCommunity, setMyOwnedCommunity] = useState<{ id: string; name: string } | null>(null);
  const [bestPlaces, setBestPlaces] = useState([]);
  const [selectedPlacesCity, setSelectedPlacesCity] = useState<any>(null);
  const [placesViewMode, setPlacesViewMode] = useState<'list' | 'map'>('map');
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);

  // Search
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Author profile sheet
  const [authorSheetVisible, setAuthorSheetVisible] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const floatingTabTop = insets.bottom + FLOATING_TAB_BAR_BOTTOM_GAP + FLOATING_TAB_BAR_HEIGHT;
  const fabBottom = floatingTabTop + 18;
  const styles = useMemo(() => createStyles(tokens, colors, fabBottom), [tokens, colors, fabBottom]);

  const loadFeed = useCallback(async () => {
    try {
      const data = await ApiService.getCommunityFeed();
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setPosts(list);
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
      // Apply user's selected-city filter (set on BestPlacesScreen).
      let city: string | undefined;
      try {
        const raw = await AsyncStorage.getItem('bestPlaces:selectedCity');
        if (raw) {
          const parsed = JSON.parse(raw);
          setSelectedPlacesCity(parsed?.city ? parsed : null);
          if (parsed?.city) city = parsed.city;
        }
        if (!raw) setSelectedPlacesCity(null);
      } catch {
        setSelectedPlacesCity(null);
        // ignore — fall back to global best places
      }
      const data = await ApiService.getBestPlaces(1, 50, undefined, city);
      const places = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setBestPlaces(places);
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

  // Guard against double-fire: a rapid double-tap used to send two concurrent
  // attend requests and crash the server with a unique-constraint 500.
  const attendInFlight = useRef<Set<string>>(new Set());
  const handleAttend = useCallback(async (postId: string) => {
    if (attendInFlight.current.has(postId)) return;
    attendInFlight.current.add(postId);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const applyToggle = () =>
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isAttending: !p.isAttending,
                _count: {
                  ...p._count,
                  attendees: p.isAttending
                    ? Math.max((p._count?.attendees || 1) - 1, 0)
                    : (p._count?.attendees || 0) + 1,
                },
              }
            : p,
        ),
      );
    applyToggle(); // optimistic
    try {
      await ApiService.toggleEventAttendance(postId);
    } catch (err) {
      console.warn('Failed to toggle attendance:', err);
      applyToggle(); // revert on failure
    } finally {
      attendInFlight.current.delete(postId);
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
      const group = groups.find(g => g.id === groupId);
      if (group?.type === 'COUNTRY' && group?.isMember) {
        return;
      }
      if (group?.isMember) {
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
    const q = searchQuery.trim().toLowerCase();
    return bestPlaces.filter((p) => {
      const meta = (p as any).metadata || {};
      if (cuisineFilter && meta.cuisine !== cuisineFilter) return false;
      if (!q) return true;
      const content = ((p as any).content || '').toLowerCase();
      const name = (meta.placeName || '').toLowerCase();
      const addr = (meta.address || '').toLowerCase();
      return content.includes(q) || name.includes(q) || addr.includes(q);
    });
  }, [bestPlaces, searchQuery, cuisineFilter]);

  // Map places ignore the cuisine filter: the cuisine chips only exist in List mode,
  // so silently filtering map pins by a cuisine the user can't see/clear is confusing.
  const mapPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bestPlaces;
    return bestPlaces.filter((p) => {
      const meta = (p as any).metadata || {};
      const content = ((p as any).content || '').toLowerCase();
      const name = (meta.placeName || '').toLowerCase();
      const addr = (meta.address || '').toLowerCase();
      return content.includes(q) || name.includes(q) || addr.includes(q);
    });
  }, [bestPlaces, searchQuery]);

  // Loose city match used to filter events/routes on the map by the picked city.
  const cityMatch = useCallback((meta: any, city?: string) => {
    if (!city) return true;
    const rc = (meta?.city || '').trim().toLowerCase();
    if (!rc) return false;
    return rc === city || rc.includes(city) || city.includes(rc);
  }, []);

  // Community events (from the feed) shown as pins on the map — filtered by city.
  const mapEvents = useMemo(() => {
    const events = (posts || []).filter((p: any) => p?.type === 'EVENT');
    const city = selectedPlacesCity?.city?.trim().toLowerCase();
    if (!city) return events;
    return events.filter((p: any) => cityMatch(p?.metadata, city));
  }, [posts, selectedPlacesCity, cityMatch]);

  const mapRoutes = useMemo(() => {
    const routes = (posts || []).filter((p: any) => p?.type === 'ROUTE');
    const city = selectedPlacesCity?.city?.trim().toLowerCase();
    if (!city) return routes;
    return routes.filter((p: any) => cityMatch(p?.metadata, city));
  }, [posts, selectedPlacesCity, cityMatch]);

  // Tapping a pin/route on the map opens a compact preview card (name + meta +
  // one-tap Join + Details) instead of jumping straight into the detail screen.
  const [mapPreviewPost, setMapPreviewPost] = useState<any>(null);

  // "Add" sheet (place / event / route). Opened either by tapping the map (with a
  // coordinate) or by the "＋ Add" pill (no coordinate — user sets location in the form).
  const [mapAddCoord, setMapAddCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const closeAddSheet = useCallback(() => { setMapAddCoord(null); setAddSheetOpen(false); }, []);
  const openCreateAt = useCallback((type: string) => {
    const coord = mapAddCoord;
    setMapAddCoord(null);
    setAddSheetOpen(false);
    navigation.navigate('CreateCommunityPost', {
      initialType: type,
      initialCity: selectedPlacesCity?.city || '',
      ...(coord ? { initialCoords: coord } : {}),
    });
  }, [mapAddCoord, navigation, selectedPlacesCity]);

  // --- Render helpers ---

  const renderPostItem = useCallback(
    ({ item }) => {
      const isOwn = !!user?.id && (item.authorId === user.id || item.author?.id === user.id);
      if (item.type === 'EVENT') {
        return (
          <EventCard
            post={item}
            isOwn={isOwn}
            onPress={() => navigation.navigate('CommunityPostDetail', { postId: item.id })}
            onAttend={() => handleAttend(item.id)}
          />
        );
      }
      if (item.type === 'ROUTE') {
        return (
          <RouteCard
            post={item}
            isOwn={isOwn}
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
        lockedMembership={item.type === 'COUNTRY' && item.isMember}
        onPress={() => navigation.navigate('CommunityGroup', { groupId: item.id, groupName: resolveGroupName(item, t) })}
        onJoin={() => handleJoinGroup(item.id)}
      />
    ),
    [navigation, handleJoinGroup, t],
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
    return null;
  };

  // Decluttered Places header: one compact row (city pill + List/Map toggle).
  // Cuisine chips are shown only in List mode — on the map the built-in
  // All/Places/Events/Routes filter already does the job, so we don't stack filters.
  const placesHeader = () => (
    <View style={styles.placesTopBar}>
      <View style={styles.placesRow}>
        <TouchableOpacity
          style={[styles.cityPill, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('BestPlaces')}
          activeOpacity={0.75}
        >
          <Ionicons name="location-outline" size={15} color={colors.primary} />
          <Text style={[styles.cityPillText, { color: colors.textPrimary || colors.text }]} numberOfLines={1}>
            {selectedPlacesCity?.city || t('community.placesFilterCity', 'Filter by city')}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={[styles.viewToggle, { backgroundColor: colors.surfaceSecondary || colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, placesViewMode === 'list' && { backgroundColor: colors.primary }]}
            onPress={() => setPlacesViewMode('list')}
          >
            <Ionicons name="list" size={16} color={placesViewMode === 'list' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, placesViewMode === 'map' && { backgroundColor: colors.primary }]}
            onPress={() => setPlacesViewMode('map')}
          >
            <Ionicons name="map" size={16} color={placesViewMode === 'map' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {placesViewMode === 'list' && (
        <FlatList
          horizontal
          data={CUISINES}
          keyExtractor={(c) => c.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cuisineRow}
          renderItem={({ item: c }) => {
            const active = cuisineFilter === c.key;
            return (
              <TouchableOpacity
                style={[styles.cuisineFilterChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent' }]}
                onPress={() => setCuisineFilter(active ? null : c.key)}
              >
                <Ionicons name={c.icon} size={13} color={active ? '#fff' : colors.textSecondary} />
                <Text style={[styles.cuisineFilterText, { color: active ? '#fff' : colors.textSecondary }]}>
                  {t(c.labelKey, c.key)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );

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
              lockedMembership={group.type === 'COUNTRY' && group.isMember}
              onPress={() => navigation.navigate('CommunityGroup', { groupId: group.id, groupName: resolveGroupName(group, t) })}
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

      {/* Tabs — Places first (pilot focus on the map) */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
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
      ) : placesViewMode === 'map' ? (
        <View style={styles.mapModeWrap}>
          {placesHeader()}
          <CommunityPlacesMap
            fill
            colors={colors}
            t={t}
            places={mapPlaces}
            events={mapEvents}
            routes={mapRoutes}
            onSelect={(post) => setMapPreviewPost(post)}
            onMapPress={(coord) => setMapAddCoord(coord)}
          />
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          renderItem={renderBestPlaceItem}
          ListHeaderComponent={placesHeader}
          ListEmptyComponent={renderEmptyPlaces}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add — extended pill, bottom-center. Always opens the type chooser
          (Post / Place / Event / Route / Recipe) for one consistent entry point. */}
      <TouchableOpacity
        style={[styles.addPill, { backgroundColor: colors.primary }]}
        onPress={() => {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          setMapAddCoord(null);
          setAddSheetOpen(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.addPillText}>{t('community.add', 'Add')}</Text>
      </TouchableOpacity>

      {/* Author Profile Sheet */}
      <AuthorProfileSheet
        visible={authorSheetVisible}
        authorId={selectedAuthorId}
        onClose={() => setAuthorSheetVisible(false)}
      />

      {/* Add sheet — opened by the pill (no coord) or by tapping the map (with coord) */}
      <BottomSheet visible={!!mapAddCoord || addSheetOpen} onClose={closeAddSheet}>
        <Text style={[styles.mapAddTitle, { color: colors.textPrimary || colors.text }]}>
          {mapAddCoord ? t('community.mapAdd.title', "What's here?") : t('community.add', 'Add')}
        </Text>
        <Text style={[styles.mapAddSubtitle, { color: colors.textTertiary }]}>
          {mapAddCoord ? t('community.mapAdd.subtitle', 'Add to this spot') : t('community.mapAdd.pickType', 'What do you want to add?')}
        </Text>
        {(mapAddCoord
          ? [
              // Tapped a specific spot on the map → only location-bound types.
              { type: 'BEST_PLACES', icon: 'location-outline', label: t('community.postType.bestPlaces', 'Place') },
              { type: 'EVENT', icon: 'calendar-outline', label: t('community.postType.event', 'Event') },
              { type: 'ROUTE', icon: 'map-outline', label: t('community.postType.route', 'Route') },
            ]
          : [
              // Core 5 post types from the "＋ Add" pill.
              { type: 'TEXT', icon: 'chatbubble-outline', label: t('community.postType.post', 'Post') },
              { type: 'BEST_PLACES', icon: 'location-outline', label: t('community.postType.bestPlaces', 'Place') },
              { type: 'EVENT', icon: 'calendar-outline', label: t('community.postType.event', 'Event') },
              { type: 'ROUTE', icon: 'map-outline', label: t('community.postType.route', 'Route') },
              { type: 'RECIPE', icon: 'nutrition-outline', label: t('community.postType.recipe', 'Recipe') },
            ]
        ).map((opt) => (
          <TouchableOpacity
            key={opt.type}
            style={[styles.mapAddRow, { borderColor: colors.border }]}
            onPress={() => openCreateAt(opt.type)}
            activeOpacity={0.7}
          >
            <View style={[styles.mapAddIcon, { backgroundColor: (colors.primary || '#4F46E5') + '18' }]}>
              <Ionicons name={opt.icon as any} size={20} color={colors.primary || '#4F46E5'} />
            </View>
            <Text style={[styles.mapAddLabel, { color: colors.textPrimary || colors.text }]}>{opt.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </BottomSheet>

      {/* Map pin preview — name + meta + one-tap Join (events/routes) + Details. */}
      <BottomSheet visible={!!mapPreviewPost} onClose={() => setMapPreviewPost(null)}>
        {(() => {
          const p = mapPreviewPost;
          if (!p) return null;
          const meta = p.metadata || {};
          const isOwn = !!user?.id && (p.authorId === user.id || p.author?.id === user.id);
          const joinable = p.type === 'ROUTE' || p.type === 'EVENT';
          const accent = p.type === 'ROUTE' ? '#8B5CF6' : p.type === 'EVENT' ? '#F59E0B' : (colors.primary || '#4F46E5');
          const icon = p.type === 'ROUTE' ? 'map' : p.type === 'EVENT' ? 'calendar' : 'location';
          const title = meta.routeName || meta.title || meta.placeName || p.content || t('community.post.title', 'Post');
          const km = Number(meta.distanceKm) || 0;
          const subParts = [
            p.type === 'ROUTE' && meta.activity ? t(`community.route.activity.${meta.activity}`, meta.activity) : '',
            km > 0 ? `${km.toFixed(1)} ${t('community.route.km', 'km')}` : '',
            meta.city || meta.address || '',
            [meta.date, meta.time].filter(Boolean).join(' '),
          ].filter(Boolean).join(' · ');
          const openDetail = () => { const id = p.id; setMapPreviewPost(null); navigation.navigate('CommunityPostDetail', { postId: id }); };
          return (
            <>
              <View style={styles.previewHead}>
                <View style={[styles.previewIcon, { backgroundColor: accent + '18' }]}>
                  <Ionicons name={icon as any} size={20} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.previewTitle, { color: colors.textPrimary || colors.text }]} numberOfLines={1}>{title}</Text>
                  {!!subParts && <Text style={[styles.previewSub, { color: colors.textSecondary }]} numberOfLines={1}>{subParts}</Text>}
                </View>
              </View>
              <View style={styles.previewActions}>
                {joinable && !isOwn && (
                  <TouchableOpacity
                    style={[styles.previewJoin, { backgroundColor: p.isAttending ? accent : accent + '1A' }]}
                    onPress={() => { handleAttend(p.id); setMapPreviewPost((cur: any) => cur ? { ...cur, isAttending: !cur.isAttending } : cur); }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={p.isAttending ? 'checkmark-circle' : 'add-circle-outline'} size={18} color={p.isAttending ? '#fff' : accent} />
                    <Text style={[styles.previewJoinText, { color: p.isAttending ? '#fff' : accent }]}>
                      {p.isAttending ? t('community.route.joined', 'Going') : t('community.route.join', 'Join')}
                    </Text>
                  </TouchableOpacity>
                )}
                {joinable && isOwn && (
                  <View style={[styles.previewJoin, { backgroundColor: accent + '12' }]}>
                    <Ionicons name="ribbon-outline" size={18} color={accent} />
                    <Text style={[styles.previewJoinText, { color: accent }]}>{t('community.route.youOrganizer', 'You organize this')}</Text>
                  </View>
                )}
                <TouchableOpacity style={[styles.previewDetail, { borderColor: colors.border }]} onPress={openDetail} activeOpacity={0.8}>
                  <Text style={[styles.previewDetailText, { color: colors.textPrimary || colors.text }]}>{t('community.preview.details', 'Details')}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </>
          );
        })()}
      </BottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any, fabBottom: number) =>
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
    cityFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      gap: 10,
    },
    cityFilterCopy: {
      flex: 1,
    },
    placesTopBar: {
      paddingTop: 12,
    },
    placesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 10,
      gap: 10,
    },
    cityPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
    },
    cityPillText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
    },
    viewToggle: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 12,
      borderWidth: 1,
      gap: 4,
    },
    viewToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      paddingVertical: 8,
      borderRadius: 9,
    },
    viewToggleText: {
      fontSize: 14,
      fontWeight: '600',
    },
    cuisineRow: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    cuisineFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 18,
      borderWidth: 1,
    },
    cuisineFilterText: {
      fontSize: 13,
      fontWeight: '500',
    },
    cityFilterTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    cityFilterSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    // Full-screen map mode: header on top, map fills the rest.
    mapModeWrap: { flex: 1 },
    // "＋ Add" extended pill, centered above the floating tab bar.
    addPill: {
      position: 'absolute',
      bottom: fabBottom,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 16,
      paddingRight: 20,
      height: 52,
      borderRadius: 26,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    addPillText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    mapAddTitle: { fontSize: 18, fontWeight: '700' },
    mapAddSubtitle: { fontSize: 13, marginTop: 2, marginBottom: 12 },
    mapAddRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    mapAddIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    mapAddLabel: { fontSize: 16, fontWeight: '600' },
    // Map pin preview card
    previewHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    previewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    previewTitle: { fontSize: 17, fontWeight: '700' },
    previewSub: { fontSize: 13, marginTop: 2 },
    previewActions: { flexDirection: 'row', gap: 10 },
    previewJoin: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
    previewJoinText: { fontSize: 15, fontWeight: '700' },
    previewDetail: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    previewDetailText: { fontSize: 15, fontWeight: '600' },
  });
