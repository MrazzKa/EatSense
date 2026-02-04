/**
 * LifestyleDetailScreen - Full detail screen for Lifestyle Programs
 * Based on EatSense_Lifestyles_V2 specification
 * 
 * Sections:
 * - Header: name, tagline, category, disclaimer (mandatory)
 * - Daily Mantra (mantra)
 * - Philosophy (philosophy)
 * - Embrace (embrace list)
 * - Minimize (minimize list)
 * - Daily Inspiration (dailyInspiration list)
 * - Sample Day (sampleDay: morning/midday/evening)
 * - Vibe (keywords/chips)
 * - CTA button: "Start Program" / "Continue" if active
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../app/i18n/hooks';
import { useTheme } from '../../../contexts/ThemeContext';
import type { LifestyleProgram } from '../types';
import { LIFESTYLE_CATEGORIES } from '../constants';
import DisclaimerBanner from './DisclaimerBanner';
import { getLifestyleImage } from '../lifestyleImages';

interface LifestyleDetailScreenProps {
  program: LifestyleProgram;
  isActive?: boolean;
  onStartProgram: () => void;
  onContinueProgram?: () => void;
  onBack: () => void;
  children?: React.ReactNode;
}

export default function LifestyleDetailScreen({
  program,
  isActive = false,
  onStartProgram,
  onContinueProgram,
  onBack,
  children,
}: LifestyleDetailScreenProps) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  // FIX 2026-02-04: List of lifestyle names that should stay in original English
  const KEEP_ENGLISH_NAMES = [
    'Old Money', 'Hot Girl Walk', 'That Girl', 'Clean Girl',
    'Soft Girl', 'Coquette', 'Vanilla Girl', 'Dark Academia',
    'Light Academia', 'Cottagecore', 'Coastal Grandmother',
    'Mob Wife', 'Pilates Princess', 'It Girl', 'Tomato Girl Summer',
  ];

  const getLocalizedText = (
    text: { en?: string; ru?: string; kk?: string; fr?: string } | undefined | null,
    t?: (_key: string) => string
  ): string => {
    if (!text) return '';

    // Helper to translate if t provided
    const translateIfNeeded = (str: string) => {
      if (t && str && /^[a-z_][a-z0-9_.]*\.[a-z0-9_.]+$/i.test(str) && str.includes('.')) {
        return t(str);
      }
      return str;
    };

    if (typeof text === 'string') return translateIfNeeded(text);

    // FIX: Keep certain aesthetic names in English regardless of language
    const englishName = text.en || '';
    if (KEEP_ENGLISH_NAMES.some(name => englishName.toLowerCase().includes(name.toLowerCase()))) {
      return englishName;
    }

    // Fallback logic
    const result = text[language as keyof typeof text] || text.en || text.ru || text.kk || text.fr || '';
    return translateIfNeeded(result);
  };

  const getLocalizedTextArray = (
    text: { en?: string[]; ru?: string[]; kk?: string[]; fr?: string[] } | undefined | null,
    t?: (_key: string) => string
  ): string[] => {
    if (!text) return [];

    // Helper to translate array items
    const translateArray = (arr: string[]) => {
      if (!t) return arr;
      return arr.map((str, _) => {
        if (str && /^[a-z_][a-z0-9_.]*\.[a-z0-9_.]+$/i.test(str) && str.includes('.')) {
          return t(str);
        }
        return str;
      });
    };

    if (Array.isArray(text)) return translateArray(text);
    const result = text[language as keyof typeof text] || text.en || text.ru || text.kk || text.fr || [];
    return translateArray(result);
  };

  // Category lookup - available for future use
  // const category = LIFESTYLE_CATEGORIES.find(c => c.id === program.categoryId);

  // Get local image if available, prefer local assets over backend URL
  const localImage = useMemo(() => {
    return getLifestyleImage(program.id, program.name);
  }, [program.id, program.name]);

  // Determine image source: prefer local asset, then backend URL
  const imageSource = localImage || (program.imageUrl ? { uri: program.imageUrl } : null);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background || '#FFF' }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image - Same as DietProgramDetailScreen */}
        {imageSource ? (
          <Image source={imageSource} style={styles.headerImage} />
        ) : (
          <View style={[styles.headerImagePlaceholder, { backgroundColor: colors.primary + '20' }]}>
            <Text style={styles.emojiPlaceholder}>{program.emoji || '✨'}</Text>
          </View>
        )}

        {/* Back button overlay */}
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        {/* Program Header: Name + Tagline (emoji removed, image shown above) */}
        <View style={styles.programHeader}>
          <Text
            style={[
              styles.programName,
              { color: colors.textPrimary || '#212121' },
            ]}
          >
            {getLocalizedText(program.name, t)}
          </Text>
          <Text
            style={[
              styles.programTagline,
              { color: colors.textSecondary || '#666' },
            ]}
          >
            {getLocalizedText(program.tagline || program.subtitle, t)}
          </Text>
        </View>

        {/* Mandatory Disclaimer */}
        <DisclaimerBanner />

        {/* Daily Mantra */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#212121' }]}>
            {t('lifestyles.detail.mantra') || 'Мантра дня'}
          </Text>
          <View style={[styles.mantraCard, { backgroundColor: colors.card || colors.surface || '#FFF' }]}>
            <Ionicons name="sparkles" size={24} color={colors.primary || '#4CAF50'} />
            <Text
              style={[
                styles.mantraText,
                { color: colors.textPrimary || '#212121' },
              ]}
            >
              {getLocalizedText(program.mantra || (program.rules && program.rules.mantra), t)}
            </Text>
          </View>
        </View>

        {/* Philosophy */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#212121' }]}>
            {t('lifestyles.detail.philosophy') || 'Философия'}
          </Text>
          <Text
            style={[
              styles.sectionText,
              { color: colors.textSecondary || '#666' },
            ]}
          >
            {getLocalizedText(program.philosophy || (program.rules && program.rules.philosophy), t)}
          </Text>
        </View>

        {/* Embrace */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#212121' }]}>
            {t('lifestyles.detail.embrace') || 'Выбирать чаще'}
          </Text>
          <View style={styles.listContainer}>
            {getLocalizedTextArray(program.embrace || (program.rules && program.rules.embrace) || program.allowedFoods, t).map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success || '#4CAF50'} />
                <Text style={[styles.listItemText, { color: colors.textSecondary || '#666' }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Minimize */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#212121' }]}>
            {t('lifestyles.detail.minimize') || 'Уменьшить'}
          </Text>
          <View style={styles.listContainer}>
            {getLocalizedTextArray(program.minimize || (program.rules && program.rules.minimize) || program.restrictedFoods, t).map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="remove-circle" size={20} color={colors.error || '#F44336'} />
                <Text style={[styles.listItemText, { color: colors.textSecondary || '#666' }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Daily Inspiration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#212121' }]}>
            {t('lifestyles.detail.dailyInspiration') || 'Идеи на сегодня'}
          </Text>
          <View style={styles.listContainer}>
            {getLocalizedTextArray(program.dailyInspiration || (program.rules && program.rules.dailyInspiration), t).map((item, index) => (
              <View key={index} style={styles.inspirationItem}>
                <View style={[styles.inspirationBullet, { backgroundColor: colors.primary || '#4CAF50' }]} />
                <Text style={[styles.listItemText, { color: colors.textSecondary || '#666' }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sample Day - only render if sampleDay exists */}
        {(program.sampleDay || (program.rules && program.rules.sampleDay)) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#212121' }]}>
              {t('lifestyles.detail.sampleDay') || 'Пример дня'}
            </Text>
            <View style={styles.sampleDayContainer}>
              {(program.sampleDay?.morning || program.rules?.sampleDay?.morning) && (
                <View style={[styles.sampleDayItem, { backgroundColor: colors.card || colors.surface || '#FFF' }]}>
                  <Text style={[styles.sampleDayTime, { color: colors.primary || '#4CAF50' }]}>
                    {t('lifestyles.detail.morning') || 'Утро'}
                  </Text>
                  <Text style={[styles.sampleDayText, { color: colors.textSecondary || '#666' }]}>
                    {getLocalizedText(program.sampleDay?.morning || program.rules?.sampleDay?.morning, t)}
                  </Text>
                </View>
              )}
              {(program.sampleDay?.midday || program.rules?.sampleDay?.midday) && (
                <View style={[styles.sampleDayItem, { backgroundColor: colors.card || colors.surface || '#FFF' }]}>
                  <Text style={[styles.sampleDayTime, { color: colors.primary || '#4CAF50' }]}>
                    {t('lifestyles.detail.midday') || 'День'}
                  </Text>
                  <Text style={[styles.sampleDayText, { color: colors.textSecondary || '#666' }]}>
                    {getLocalizedText(program.sampleDay?.midday || program.rules?.sampleDay?.midday, t)}
                  </Text>
                </View>
              )}
              {(program.sampleDay?.evening || program.rules?.sampleDay?.evening) && (
                <View style={[styles.sampleDayItem, { backgroundColor: colors.card || colors.surface || '#FFF' }]}>
                  <Text style={[styles.sampleDayTime, { color: colors.primary || '#4CAF50' }]}>
                    {t('lifestyles.detail.evening') || 'Вечер'}
                  </Text>
                  <Text style={[styles.sampleDayText, { color: colors.textSecondary || '#666' }]}>
                    {getLocalizedText(program.sampleDay?.evening || program.rules?.sampleDay?.evening, t)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Vibe */}
        {(program.vibe || (program.rules && program.rules.vibe)) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#212121' }]}>
              {t('lifestyles.detail.vibe') || 'Вайб'}
            </Text>
            <View style={styles.vibeContainer}>
              {(program.vibe || program.rules.vibe).split(',').map((keyword: string, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.vibeChip,
                    { backgroundColor: colors.inputBackground || colors.surfaceSecondary || '#F5F5F5' },
                  ]}
                >
                  <Text
                    style={[
                      styles.vibeText,
                      { color: colors.textSecondary || '#666' },
                    ]}
                  >
                    {keyword.trim()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA Button */}
      <View style={[styles.buttonContainer, { backgroundColor: colors.background || '#FFF' }]}>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            { backgroundColor: colors.primary || '#4CAF50' },
          ]}
          onPress={isActive && onContinueProgram ? onContinueProgram : onStartProgram}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaButtonText}>
            {isActive && onContinueProgram
              ? t('lifestyles.detail.continueProgram') || 'Продолжить'
              : t('lifestyles.detail.startProgram') || 'Начать программу'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerImage: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPlaceholder: {
    fontSize: 80,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  programHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 48,
  },
  programName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  programTagline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  mantraCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  mantraText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  inspirationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  inspirationBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  sampleDayContainer: {
    gap: 12,
  },
  sampleDayItem: {
    padding: 16,
    borderRadius: 12,
  },
  sampleDayTime: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  sampleDayText: {
    fontSize: 15,
    lineHeight: 22,
  },
  vibeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  vibeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
