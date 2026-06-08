// @ts-nocheck
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';
import { useMascot } from '../contexts/MascotContext';
import { resolveGroupName } from '../components/community/GroupCard';
import { CUISINES } from '../config/cuisines';
import LocationPickerModal from '../components/community/LocationPickerModal';
import RouteBuilderModal from '../components/community/RouteBuilderModal';

const ROUTE_ACTIVITIES = [
  { key: 'run', icon: 'walk-outline', labelKey: 'community.route.activity.run' },
  { key: 'walk', icon: 'footsteps-outline', labelKey: 'community.route.activity.walk' },
  { key: 'bike', icon: 'bicycle-outline', labelKey: 'community.route.activity.bike' },
];

const POST_TYPES = [
  { key: 'TEXT', icon: 'chatbubble-outline', labelKey: 'community.postType.text' },
  { key: 'PHOTO', icon: 'camera-outline', labelKey: 'community.postType.photo' },
  { key: 'RECOMMENDATION', icon: 'restaurant-outline', labelKey: 'community.postType.recommendation' },
  { key: 'ACHIEVEMENT', icon: 'trophy-outline', labelKey: 'community.postType.achievement' },
  { key: 'EVENT', icon: 'calendar-outline', labelKey: 'community.postType.event' },
  { key: 'ROUTE', icon: 'map-outline', labelKey: 'community.postType.route' },
  { key: 'LIFESTYLE', icon: 'heart-outline', labelKey: 'community.postType.lifestyle' },
  { key: 'BEST_PLACES', icon: 'location-outline', labelKey: 'community.postType.bestPlaces' },
  { key: 'RECIPE', icon: 'nutrition-outline', labelKey: 'community.postType.recipe' },
  { key: 'QUESTION', icon: 'help-circle-outline', labelKey: 'community.postType.question' },
  { key: 'CHALLENGE', icon: 'flame-outline', labelKey: 'community.postType.challenge' },
];

export default function CreateCommunityPostScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const preselectedGroupId = (route.params as any)?.groupId || null;
  const initialType = (route.params as any)?.initialType || 'TEXT';
  const initialCity = (route.params as any)?.initialCity || '';
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const { addXp } = useMascot();

  const [postType, setPostType] = useState(initialType);
  const [content, setContent] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(preselectedGroupId);
  const [groups, setGroups] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Event-specific fields
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCity, setEventCity] = useState(initialCity);

  // Recipe-specific fields
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [recipeSteps, setRecipeSteps] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [servings, setServings] = useState('');

  // Best Places fields
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeCity, setPlaceCity] = useState(initialCity);
  const [placeRating, setPlaceRating] = useState(0);
  const [cuisine, setCuisine] = useState<string | null>(null);

  // Map coordinates (places + events). Captured via the LocationPickerModal.
  const initialCoords = (route.params as any)?.initialCoords || null;
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialType === 'BEST_PLACES' && initialCoords ? initialCoords : null,
  );
  const [eventCoords, setEventCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialType === 'EVENT' && initialCoords ? initialCoords : null,
  );
  // Which field the location picker is editing: 'place' | 'event' | null.
  const [locationTarget, setLocationTarget] = useState<null | 'place' | 'event'>(null);

  // Route (ROUTE post type) fields
  const [routeName, setRouteName] = useState('');
  const [routeActivity, setRouteActivity] = useState('run');
  const [routeCity, setRouteCity] = useState(initialCity);
  const [routeDate, setRouteDate] = useState('');
  const [routeTime, setRouteTime] = useState('');
  const [builtRoute, setBuiltRoute] = useState<any>(
    initialType === 'ROUTE' && initialCoords
      ? { points: [initialCoords], meetingPoint: initialCoords, distanceKm: 0 }
      : null,
  );
  const [routeBuilderVisible, setRouteBuilderVisible] = useState(false);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await ApiService.getCommunityGroups();
        const allGroups = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : [];
        // Show only groups user is a member of
        const myGroups = allGroups.filter((g: any) => g.isMember);
        setGroups(myGroups);
        if (myGroups.length > 0 && !preselectedGroupId && !selectedGroupId) {
          setSelectedGroupId(myGroups[0].id);
        }
      } catch (err) {
        console.warn('Failed to load groups:', err);
      }
    };
    loadGroups();
  }, []);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    // For typed posts (place/event/route) the "what's on your mind" text is optional —
    // fall back to the entity's own name so the user isn't blocked when they only
    // fill the place/route fields. Plain posts still require text.
    const nameFallback =
      postType === 'BEST_PLACES' ? placeName
        : postType === 'ROUTE' ? routeName
          : postType === 'EVENT' ? eventTitle
            : '';
    const trimmedContent = content.trim() || nameFallback.trim();
    if (!trimmedContent) {
      Alert.alert(t('community.error', 'Error'), t('community.emptyContent', 'Please write something'));
      return;
    }
    if (postType === 'BEST_PLACES' && !placeName.trim()) {
      Alert.alert(t('community.error', 'Error'), t('community.bestPlaces.placeNameRequired', 'Please add the place name'));
      return;
    }
    if (postType === 'BEST_PLACES' && !placeCity.trim()) {
      Alert.alert(t('community.error', 'Error'), t('community.bestPlaces.cityRequired', 'Please add the city'));
      return;
    }
    if (postType === 'ROUTE' && !routeName.trim()) {
      Alert.alert(t('community.error', 'Error'), t('community.route.nameRequired', 'Please name the route'));
      return;
    }
    if (postType === 'ROUTE' && !routeCity.trim()) {
      Alert.alert(t('community.error', 'Error'), t('community.route.cityRequired', 'Please add the city'));
      return;
    }
    if (postType === 'ROUTE' && (!builtRoute || !(builtRoute.points?.length >= 2))) {
      Alert.alert(t('community.error', 'Error'), t('community.route.drawRequired', 'Please draw the route on the map (at least 2 points)'));
      return;
    }
    setSubmitting(true);
    try {
      // Upload image if attached
      let uploadedImageUrl = null;
      if (imageUri) {
        setUploadingImage(true);
        try {
          const uploadResult = await ApiService.uploadImage(imageUri);
          uploadedImageUrl = uploadResult?.url || uploadResult?.imageUrl || null;
        } catch (err) {
          console.warn('Image upload failed:', err);
        }
        setUploadingImage(false);
      }

      const payload: any = {
        content: trimmedContent,
        type: postType,
      };
      if (selectedGroupId) {
        payload.groupId = selectedGroupId;
      }

      if (uploadedImageUrl) {
        payload.imageUrl = uploadedImageUrl;
      }

      if (postType === 'EVENT') {
        payload.metadata = {
          title: eventTitle.trim() || trimmedContent,
          date: eventDate.trim(),
          time: eventTime.trim(),
          location: eventLocation.trim(),
          city: eventCity.trim(),
          ...(eventCoords ? { latitude: eventCoords.latitude, longitude: eventCoords.longitude } : {}),
        };
      }

      if (postType === 'CHALLENGE') {
        payload.metadata = {
          ...payload.metadata,
          title: eventTitle.trim() || trimmedContent.split('\n')[0],
          durationDays: 7,
        };
      }

      if (postType === 'RECIPE') {
        payload.metadata = {
          recipeName: recipeName.trim(),
          ingredients: ingredients.trim(),
          steps: recipeSteps.trim(),
          prepTime: prepTime.trim(),
          servings: servings.trim(),
        };
      }

      if (postType === 'BEST_PLACES') {
        payload.metadata = {
          placeName: placeName.trim(),
          address: placeAddress.trim(),
          city: placeCity.trim(),
          rating: placeRating || undefined,
          cuisine: cuisine || undefined,
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        };
      }

      if (postType === 'ROUTE') {
        payload.metadata = {
          routeName: routeName.trim(),
          activity: routeActivity,
          city: routeCity.trim(),
          date: routeDate.trim(),
          time: routeTime.trim(),
          distanceKm: builtRoute?.distanceKm ?? 0,
          // First point = meeting/start spot (used for the map marker + auto-fit).
          latitude: builtRoute?.meetingPoint?.latitude,
          longitude: builtRoute?.meetingPoint?.longitude,
          points: (builtRoute?.points || []).map((p: any) => ({ latitude: p.latitude, longitude: p.longitude })),
        };
      }

      await ApiService.createCommunityPost(payload);
      // Award mascot XP for community activity
      if (addXp) { try { await addXp(8, 'community_post'); } catch {} }
      navigation.goBack();
    } catch (err: any) {
      console.warn('Failed to create post:', err);
      const status = err?.status || err?.response?.status;
      const code = err?.payload?.code || err?.response?.data?.code || err?.data?.code;
      if (code === 'COMMUNITY_CREATE_LIMIT') {
        // Free creation limit reached — offer upgrade to Pro.
        Alert.alert(
          t('community.createLimit.title', 'Upgrade to add more'),
          t('community.createLimit.message', 'Free members can add a few places and events. Go Pro to create unlimited.'),
          [
            { text: t('common.notNow', 'Not now'), style: 'cancel' },
            { text: t('community.createLimit.upgrade', 'Go Pro'), onPress: () => navigation.navigate('Subscription') },
          ],
        );
        return;
      }
      if (status === 403 && selectedGroupId) {
        // Guidelines not accepted — navigate to guidelines screen
        navigation.navigate('CommunityGuidelines', { groupId: selectedGroupId, groupName: '' });
        return;
      }
      Alert.alert(t('community.error', 'Error'), t('community.postFailed', 'Failed to create post'));
    } finally {
      setSubmitting(false);
    }
  }, [content, postType, selectedGroupId, eventTitle, eventDate, eventTime, eventLocation, eventCity, eventCoords, imageUri, recipeName, ingredients, recipeSteps, prepTime, servings, placeName, placeAddress, placeCity, placeRating, cuisine, coords, routeName, routeActivity, routeCity, routeDate, routeTime, builtRoute, addXp, navigation, t]);

  const isValid = (() => {
    if (!(selectedGroupId || groups.length === 0)) return false;
    if (postType === 'BEST_PLACES') return placeName.trim().length > 0 && placeCity.trim().length > 0;
    if (postType === 'ROUTE') return routeName.trim().length > 0 && routeCity.trim().length > 0 && (builtRoute?.points?.length >= 2);
    if (postType === 'EVENT') return eventTitle.trim().length > 0 || content.trim().length > 0;
    return content.trim().length > 0;
  })();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
            {t('common.cancel', 'Cancel')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('community.newPost', 'New Post')}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          style={[styles.postBtn, { backgroundColor: isValid ? colors.primary : colors.primary + '40' }]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>{t('community.post.submit', 'Post')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post type pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typePillsContainer}
          >
            {POST_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typePill,
                  {
                    backgroundColor: postType === type.key ? colors.primary : colors.surfaceSecondary || colors.surface,
                    borderColor: postType === type.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setPostType(type.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={type.icon}
                  size={16}
                  color={postType === type.key ? '#fff' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typePillText,
                    { color: postType === type.key ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {t(type.labelKey, type.key)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {groups[0] ? (
            <View style={[styles.groupChip, styles.groupChipStatic, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
              <Ionicons name="flag-outline" size={16} color={colors.primary} />
              <Text style={[styles.groupChipText, { color: colors.primary }]}>
                {resolveGroupName(groups[0], t)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noGroupsText, { color: colors.textTertiary }]}>
              {t('community.noGroups', 'Join a group first to post')}
            </Text>
          )}

          {/* Content input */}
          <TextInput
            style={[styles.contentInput, { color: colors.textPrimary || colors.text }]}
            placeholder={t('community.whatOnMind', "What's on your mind?")}
            placeholderTextColor={colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            autoFocus
          />

          {/* Image attachment — temporarily disabled */}

          {/* Event fields */}
          {postType === 'EVENT' && (
            <View style={styles.eventFields}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('community.eventDetails', 'Event Details')}
              </Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.eventTitle', 'Event title')}
                placeholderTextColor={colors.textTertiary}
                value={eventTitle}
                onChangeText={setEventTitle}
              />
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.eventDate', 'Date (e.g. March 20, 2026)')}
                placeholderTextColor={colors.textTertiary}
                value={eventDate}
                onChangeText={setEventDate}
              />
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.eventTime', 'Time (e.g. 14:00)')}
                placeholderTextColor={colors.textTertiary}
                value={eventTime}
                onChangeText={setEventTime}
              />
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.eventLocation', 'Location')}
                placeholderTextColor={colors.textTertiary}
                value={eventLocation}
                onChangeText={setEventLocation}
              />
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.route.cityPlaceholder', 'City / region')}
                placeholderTextColor={colors.textTertiary}
                value={eventCity}
                onChangeText={setEventCity}
              />
              <TouchableOpacity
                style={[styles.mapBtn, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                onPress={() => setLocationTarget('event')}
              >
                <Ionicons name={eventCoords ? 'location' : 'location-outline'} size={18} color={eventCoords ? colors.primary : colors.textSecondary} />
                <Text style={[styles.mapBtnText, { color: eventCoords ? colors.primary : colors.textSecondary }]}>
                  {eventCoords ? t('community.location.onMapSet', 'Location set on map') : t('community.location.setOnMap', 'Set location on map')}
                </Text>
                {eventCoords && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            </View>
          )}

          {/* Recipe fields */}
          {postType === 'RECIPE' && (
            <View style={styles.eventFields}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('community.recipe.details', 'Recipe Details')}
              </Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.recipe.name', 'Recipe name')}
                placeholderTextColor={colors.textTertiary}
                value={recipeName}
                onChangeText={setRecipeName}
              />
              <TextInput
                style={[styles.fieldInput, styles.multilineField, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.recipe.ingredients', 'Ingredients (one per line)')}
                placeholderTextColor={colors.textTertiary}
                value={ingredients}
                onChangeText={setIngredients}
                multiline
                textAlignVertical="top"
              />
              <TextInput
                style={[styles.fieldInput, styles.multilineField, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.recipe.steps', 'Steps')}
                placeholderTextColor={colors.textTertiary}
                value={recipeSteps}
                onChangeText={setRecipeSteps}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.rowFields}>
                <TextInput
                  style={[styles.fieldInput, styles.halfField, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                  placeholder={t('community.recipe.prepTime', 'Prep time')}
                  placeholderTextColor={colors.textTertiary}
                  value={prepTime}
                  onChangeText={setPrepTime}
                />
                <TextInput
                  style={[styles.fieldInput, styles.halfField, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                  placeholder={t('community.recipe.servings', 'Servings')}
                  placeholderTextColor={colors.textTertiary}
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          )}

          {/* Best Places fields */}
          {postType === 'BEST_PLACES' && (
            <View style={styles.eventFields}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('community.bestPlaces.details', 'Place Details')}
              </Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.bestPlaces.placeName', 'Place name')}
                placeholderTextColor={colors.textTertiary}
                value={placeName}
                onChangeText={setPlaceName}
              />
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.bestPlaces.city', 'City')}
                placeholderTextColor={colors.textTertiary}
                value={placeCity}
                onChangeText={setPlaceCity}
              />
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.bestPlaces.address', 'Address')}
                placeholderTextColor={colors.textTertiary}
                value={placeAddress}
                onChangeText={setPlaceAddress}
              />
              <View style={styles.ratingRow}>
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                  {t('community.bestPlaces.rating', 'Rating')}
                </Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setPlaceRating(placeRating === star ? 0 : star)}>
                      <Ionicons
                        name={star <= placeRating ? 'star' : 'star-outline'}
                        size={28}
                        color={star <= placeRating ? '#FFD700' : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cuisine selector */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
                {t('community.bestPlaces.cuisine', 'Cuisine')}
              </Text>
              <View style={styles.cuisineWrap}>
                {CUISINES.map((c) => {
                  const active = cuisine === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        styles.cuisineChip,
                        { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? (colors.primaryTint || colors.primary + '22') : 'transparent' },
                      ]}
                      onPress={() => setCuisine(active ? null : c.key)}
                    >
                      <Ionicons name={c.icon} size={14} color={active ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.cuisineChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                        {t(c.labelKey, c.key)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Location on map */}
              <TouchableOpacity
                style={[styles.mapBtn, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface, marginTop: 12 }]}
                onPress={() => setLocationTarget('place')}
              >
                <Ionicons name={coords ? 'location' : 'location-outline'} size={18} color={coords ? colors.primary : colors.textSecondary} />
                <Text style={[styles.mapBtnText, { color: coords ? colors.primary : colors.textSecondary }]}>
                  {coords ? t('community.location.onMapSet', 'Location set on map') : t('community.location.setOnMap', 'Set location on map')}
                </Text>
                {coords && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            </View>
          )}

          {/* Route fields */}
          {postType === 'ROUTE' && (
            <View style={styles.eventFields}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('community.route.details', 'Route Details')}
              </Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                placeholder={t('community.route.name', 'Route name (e.g. Morning lake run)')}
                placeholderTextColor={colors.textTertiary}
                value={routeName}
                onChangeText={setRouteName}
              />

              {/* Activity type */}
              <View style={styles.cuisineWrap}>
                {ROUTE_ACTIVITIES.map((a) => {
                  const active = routeActivity === a.key;
                  return (
                    <TouchableOpacity
                      key={a.key}
                      style={[styles.cuisineChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? (colors.primaryTint || colors.primary + '22') : 'transparent' }]}
                      onPress={() => setRouteActivity(a.key)}
                    >
                      <Ionicons name={a.icon} size={14} color={active ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.cuisineChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                        {t(a.labelKey, a.key)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface, marginTop: 12 }]}
                placeholder={t('community.route.cityPlaceholder', 'City / region')}
                placeholderTextColor={colors.textTertiary}
                value={routeCity}
                onChangeText={setRouteCity}
              />
              <View style={styles.rowFields}>
                <TextInput
                  style={[styles.fieldInput, styles.halfField, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                  placeholder={t('community.eventDate', 'Date')}
                  placeholderTextColor={colors.textTertiary}
                  value={routeDate}
                  onChangeText={setRouteDate}
                />
                <TextInput
                  style={[styles.fieldInput, styles.halfField, { color: colors.textPrimary || colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}
                  placeholder={t('community.eventTime', 'Time')}
                  placeholderTextColor={colors.textTertiary}
                  value={routeTime}
                  onChangeText={setRouteTime}
                />
              </View>

              {/* Draw route on map */}
              <TouchableOpacity
                style={[styles.mapBtn, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface, marginTop: 4 }]}
                onPress={() => setRouteBuilderVisible(true)}
              >
                <Ionicons name={builtRoute?.points?.length >= 2 ? 'map' : 'map-outline'} size={18} color={builtRoute?.points?.length >= 2 ? colors.primary : colors.textSecondary} />
                <Text style={[styles.mapBtnText, { color: builtRoute?.points?.length >= 2 ? colors.primary : colors.textSecondary }]}>
                  {builtRoute?.points?.length >= 2
                    ? t('community.route.routeSet', { km: (builtRoute.distanceKm ?? 0).toFixed(1) })
                    : t('community.route.drawOnMap', 'Draw route on map')}
                </Text>
                {builtRoute?.points?.length >= 2 && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={locationTarget !== null}
        colors={colors}
        t={t}
        initial={
          locationTarget === 'place'
            ? (coords ? { ...coords, address: placeAddress } : null)
            : locationTarget === 'event'
              ? (eventCoords ? { ...eventCoords, address: eventLocation } : null)
              : null
        }
        onClose={() => setLocationTarget(null)}
        onConfirm={(loc) => {
          if (locationTarget === 'place') {
            setCoords({ latitude: loc.latitude, longitude: loc.longitude });
            if (loc.address && !placeAddress.trim()) setPlaceAddress(loc.address);
          } else if (locationTarget === 'event') {
            setEventCoords({ latitude: loc.latitude, longitude: loc.longitude });
            if (loc.address && !eventLocation.trim()) setEventLocation(loc.address);
          }
          setLocationTarget(null);
        }}
      />

      <RouteBuilderModal
        visible={routeBuilderVisible}
        colors={colors}
        t={t}
        initial={builtRoute}
        onClose={() => setRouteBuilderVisible(false)}
        onConfirm={(r) => {
          setBuiltRoute(r);
          setRouteBuilderVisible(false);
        }}
      />
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cancelBtn: {
      paddingVertical: 6,
    },
    cancelText: {
      fontSize: 16,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    postBtn: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 18,
      minWidth: 64,
      alignItems: 'center',
    },
    postBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    typePillsContainer: {
      flexDirection: 'row',
      paddingBottom: 16,
      gap: 8,
    },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    typePillText: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    groupChipsContainer: {
      flexDirection: 'row',
      paddingBottom: 16,
      gap: 8,
    },
    groupChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    groupChipStatic: {
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    groupChipText: {
      fontSize: 14,
      fontWeight: '500',
    },
    noGroupsText: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    contentInput: {
      fontSize: 17,
      lineHeight: 24,
      minHeight: 120,
      paddingTop: 0,
    },
    eventFields: {
      marginTop: 20,
    },
    cuisineWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    cuisineChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 18,
      borderWidth: 1,
    },
    cuisineChipText: {
      fontSize: 13,
      fontWeight: '500',
    },
    mapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 10,
    },
    mapBtnText: {
      fontSize: 14,
      fontWeight: '500',
    },
    fieldInput: {
      fontSize: 15,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
    },
    attachRow: {
      flexDirection: 'row',
      marginTop: 12,
      marginBottom: 8,
    },
    attachBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      gap: 6,
    },
    attachBtnText: {
      fontSize: 14,
      fontWeight: '500',
    },
    imagePreviewWrap: {
      marginTop: 8,
      marginBottom: 12,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    imagePreview: {
      width: '100%',
      height: 200,
      borderRadius: 12,
    },
    removeImageBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    uploadOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    multilineField: {
      minHeight: 80,
      textAlignVertical: 'top',
      paddingTop: 12,
    },
    rowFields: {
      flexDirection: 'row',
      gap: 10,
    },
    halfField: {
      flex: 1,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 12,
    },
    ratingLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
    stars: {
      flexDirection: 'row',
      gap: 4,
    },
  });
