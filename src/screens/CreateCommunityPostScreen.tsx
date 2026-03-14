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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';

const POST_TYPES = [
  { key: 'TEXT', icon: 'chatbubble-outline', labelKey: 'community.postType.text' },
  { key: 'PHOTO', icon: 'camera-outline', labelKey: 'community.postType.photo' },
  { key: 'RECOMMENDATION', icon: 'restaurant-outline', labelKey: 'community.postType.recommendation' },
  { key: 'ACHIEVEMENT', icon: 'trophy-outline', labelKey: 'community.postType.achievement' },
  { key: 'EVENT', icon: 'calendar-outline', labelKey: 'community.postType.event' },
];

export default function CreateCommunityPostScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();

  const [postType, setPostType] = useState('TEXT');
  const [content, setContent] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Event-specific fields
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await ApiService.getCommunityGroups();
        const allGroups = Array.isArray(data) ? data : data?.data || [];
        // Show only groups user is a member of
        const myGroups = allGroups.filter((g: any) => g.isMember);
        setGroups(myGroups);
        if (myGroups.length > 0 && !selectedGroupId) {
          setSelectedGroupId(myGroups[0].id);
        }
      } catch (err) {
        console.warn('Failed to load groups:', err);
      }
    };
    loadGroups();
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      Alert.alert(t('community.error', 'Error'), t('community.emptyContent', 'Please write something'));
      return;
    }
    if (!selectedGroupId) {
      Alert.alert(t('community.error', 'Error'), t('community.selectGroup', 'Please select a group'));
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        content: trimmedContent,
        type: postType,
        groupId: selectedGroupId,
      };

      if (postType === 'EVENT') {
        payload.metadata = {
          title: eventTitle.trim() || trimmedContent,
          date: eventDate.trim(),
          time: eventTime.trim(),
          location: eventLocation.trim(),
        };
      }

      await ApiService.createCommunityPost(payload);
      navigation.goBack();
    } catch (err) {
      console.warn('Failed to create post:', err);
      Alert.alert(t('community.error', 'Error'), t('community.postFailed', 'Failed to create post'));
    } finally {
      setSubmitting(false);
    }
  }, [content, postType, selectedGroupId, eventTitle, eventDate, eventTime, eventLocation, navigation, t]);

  const isValid = content.trim().length > 0 && selectedGroupId;

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
            <Text style={styles.postBtnText}>{t('community.post', 'Post')}</Text>
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

          {/* Group selector */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('community.selectGroupLabel', 'Post to group')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupChipsContainer}
          >
            {groups.map((group: any) => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.groupChip,
                  {
                    backgroundColor: selectedGroupId === group.id ? colors.primary + '15' : colors.surfaceSecondary || colors.surface,
                    borderColor: selectedGroupId === group.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedGroupId(group.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.groupChipText,
                    { color: selectedGroupId === group.id ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
            {groups.length === 0 && (
              <Text style={[styles.noGroupsText, { color: colors.textTertiary }]}>
                {t('community.noGroups', 'Join a group first to post')}
              </Text>
            )}
          </ScrollView>

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
            </View>
          )}
        </ScrollView>
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
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
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
    fieldInput: {
      fontSize: 15,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
    },
  });
