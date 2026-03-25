// @ts-nocheck
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';

export default function CommunityGuidelinesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId = '', groupName = '' } = (route.params as any) || {};
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const [accepting, setAccepting] = useState(false);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const guidelines = [
    {
      icon: 'chatbubble-ellipses-outline' as const,
      title: t('community.guidelines.respectTitle', 'Be Respectful'),
      text: t('community.guidelines.respectText', 'Treat everyone with kindness. No harassment, hate speech, or personal attacks.'),
    },
    {
      icon: 'bookmark-outline' as const,
      title: t('community.guidelines.topicTitle', 'Stay On Topic'),
      text: t('community.guidelines.topicText', 'Keep discussions relevant to the group theme. Off-topic posts may be removed.'),
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: t('community.guidelines.safetyTitle', 'No Harmful Advice'),
      text: t('community.guidelines.safetyText', 'Do not share dangerous health advice. Always recommend consulting professionals for medical decisions.'),
    },
    {
      icon: 'ban-outline' as const,
      title: t('community.guidelines.spamTitle', 'No Spam or Self-Promotion'),
      text: t('community.guidelines.spamText', 'Avoid excessive self-promotion, advertisements, or repetitive content.'),
    },
    {
      icon: 'eye-outline' as const,
      title: t('community.guidelines.privacyTitle', 'Respect Privacy'),
      text: t('community.guidelines.privacyText', 'Do not share personal information of others without their consent.'),
    },
    {
      icon: 'flag-outline' as const,
      title: t('community.guidelines.reportTitle', 'Report Violations'),
      text: t('community.guidelines.reportText', 'If you see content that violates these guidelines, use the report feature. Our team reviews all reports.'),
    },
  ];

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    try {
      await ApiService.acceptCommunityGuidelines(groupId);
      navigation.goBack();
    } catch (err) {
      console.warn('Failed to accept guidelines:', err);
    } finally {
      setAccepting(false);
    }
  }, [groupId, navigation]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerBarTitle, { color: colors.textPrimary || colors.text }]} numberOfLines={1}>
          {t('community.guidelines.title', 'Community Guidelines')}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="document-text-outline" size={40} color={colors.primary} />
        </View>

        <Text style={[styles.heading, { color: colors.textPrimary || colors.text }]}>
          {t('community.guidelines.heading', 'Welcome to {{group}}!', { group: groupName })}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('community.guidelines.subtitle', 'Please review and accept the community guidelines before participating.')}
        </Text>

        <View style={styles.guidelinesList}>
          {guidelines.map((item, index) => (
            <View key={index} style={[styles.guidelineItem, { backgroundColor: colors.surface || colors.card }]}>
              <View style={[styles.guidelineIcon, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.guidelineContent}>
                <Text style={[styles.guidelineTitle, { color: colors.textPrimary || colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.guidelineText, { color: colors.textSecondary }]}>
                  {item.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.note, { color: colors.textTertiary }]}>
          {t('community.guidelines.note', 'Violating these guidelines may result in content removal or suspension from the community.')}
        </Text>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
          onPress={handleAccept}
          disabled={accepting}
          activeOpacity={0.7}
        >
          {accepting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.acceptBtnText}>
              {t('community.guidelines.accept', 'I Agree & Continue')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    content: {
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 100,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },
    heading: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    guidelinesList: {
      gap: 12,
    },
    guidelineItem: {
      flexDirection: 'row',
      padding: 14,
      borderRadius: 12,
      alignItems: 'flex-start',
    },
    guidelineIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      flexShrink: 0,
    },
    guidelineContent: {
      flex: 1,
    },
    guidelineTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 3,
    },
    guidelineText: {
      fontSize: 13,
      lineHeight: 19,
    },
    note: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 20,
      lineHeight: 18,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 32,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    acceptBtn: {
      height: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    acceptBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
