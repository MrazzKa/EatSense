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

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../app/i18n/hooks';
import { useTheme } from '../../../contexts/ThemeContext';
import type { LifestyleProgram } from '../types';
import { LIFESTYLE_CATEGORIES } from '../constants';
import DisclaimerBanner from './DisclaimerBanner';

interface LifestyleDetailScreenProps {
  program: LifestyleProgram;
  isActive?: boolean;
  onStartProgram: () => void;
  onContinueProgram?: () => void;
  onBack: () => void;
}

export default function LifestyleDetailScreen({
  program,
  isActive = false,
  onStartProgram,
  onContinueProgram,
  onBack,
}: LifestyleDetailScreenProps) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  const getLocalizedText = (
    text: { en?: string; ru?: string; kk?: string } | undefined | null
  ): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[language as keyof typeof text] || text.en || '';
  };

  const getLocalizedTextArray = (
    text: { en?: string[]; ru?: string[]; kk?: string[] } | undefined | null
  ): string[] => {
    if (!text) return [];
    if (Array.isArray(text)) return text;
    return text[language as keyof typeof text] || text.en || [];
  };

  const category = LIFESTYLE_CATEGORIES.find(c => c.id === program.categoryId);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background || '#FFF' }]}
      edges={['top']}
    >
      {/* Header with back button */}
      <View style={[styles.header, { backgroundColor: colors.card || colors.surface || '#FFF' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary || '#212121'} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          {category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={[styles.categoryText, { color: colors.textSecondary || '#666' }]}>
                {t(category.nameKey) || category.id}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Program Header: Emoji + Name + Tagline */}
        <View style={styles.programHeader}>
          <View style={[styles.emojiContainer, { backgroundColor: colors.surfaceSecondary || '#F5F5F5' }]}>
            <Text style={styles.emoji}>{program.emoji}</Text>
          </View>
          <Text
            style={[
              styles.programName,
              { color: colors.textPrimary || '#212121' },
            ]}
          >
            {getLocalizedText(program.name)}
          </Text>
          <Text
            style={[
              styles.programTagline,
              { color: colors.textSecondary || '#666' },
            ]}
          >
            {getLocalizedText(program.tagline || program.subtitle)}
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
              {getLocalizedText(program.mantra || (program.rules && program.rules.mantra))}
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
            {getLocalizedText(program.philosophy || (program.rules && program.rules.philosophy))}
          </Text>
        </View>

        {/* Embrace */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary || '#212121' }]}>
            {t('lifestyles.detail.embrace') || 'Выбирать чаще'}
          </Text>
          <View style={styles.listContainer}>
            {getLocalizedTextArray(program.embrace || (program.rules && program.rules.embrace) || program.allowedFoods).map((item, index) => (
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
            {getLocalizedTextArray(program.minimize || (program.rules && program.rules.minimize) || program.restrictedFoods).map((item, index) => (
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
            {getLocalizedTextArray(program.dailyInspiration || (program.rules && program.rules.dailyInspiration)).map((item, index) => (
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
                    {getLocalizedText(program.sampleDay?.morning || program.rules?.sampleDay?.morning)}
                  </Text>
                </View>
              )}
              {(program.sampleDay?.midday || program.rules?.sampleDay?.midday) && (
                <View style={[styles.sampleDayItem, { backgroundColor: colors.card || colors.surface || '#FFF' }]}>
                  <Text style={[styles.sampleDayTime, { color: colors.primary || '#4CAF50' }]}>
                    {t('lifestyles.detail.midday') || 'День'}
                  </Text>
                  <Text style={[styles.sampleDayText, { color: colors.textSecondary || '#666' }]}>
                    {getLocalizedText(program.sampleDay?.midday || program.rules?.sampleDay?.midday)}
                  </Text>
                </View>
              )}
              {(program.sampleDay?.evening || program.rules?.sampleDay?.evening) && (
                <View style={[styles.sampleDayItem, { backgroundColor: colors.card || colors.surface || '#FFF' }]}>
                  <Text style={[styles.sampleDayTime, { color: colors.primary || '#4CAF50' }]}>
                    {t('lifestyles.detail.evening') || 'Вечер'}
                  </Text>
                  <Text style={[styles.sampleDayText, { color: colors.textSecondary || '#666' }]}>
                    {getLocalizedText(program.sampleDay?.evening || program.rules?.sampleDay?.evening)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 12,
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
