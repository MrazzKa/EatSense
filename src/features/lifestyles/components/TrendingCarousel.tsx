/**
 * TrendingCarousel - Horizontal carousel for TRENDING category programs
 * Updated to use LifestyleProgram type and local images
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../app/i18n/hooks';
import { useTheme } from '../../../contexts/ThemeContext';
import type { LifestyleProgram } from '../types';
import { getLifestyleImage } from '../lifestyleImages';

interface TrendingCarouselProps {
  programs: LifestyleProgram[];
  onProgramPress: (_programId: string) => void;
}

export default function TrendingCarousel({
  programs,
  onProgramPress,
}: TrendingCarouselProps) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  if (programs.length === 0) {
    return null;
  }

  // FIX 2026-02-05: List of lifestyle names that should stay in original English
  // These trendy aesthetic names lose meaning when translated
  const KEEP_ENGLISH_NAMES = [
    'Old Money', 'Hot Girl Walk', 'That Girl', 'Clean Girl',
    'Soft Girl', 'Coquette', 'Vanilla Girl', 'Dark Academia',
    'Light Academia', 'Cottagecore', 'Coastal Grandmother',
    'Mob Wife', 'Pilates Princess', 'It Girl', 'Tomato Girl Summer',
    'Lazy Girl', 'Summer Shred', 'Glass Skin', 'French Girl',
  ];

  // Map Russian translations back to English names (for backend that sends localized names)
  const RU_TO_EN_MAP: Record<string, string> = {
    'Старые деньги': 'Old Money',
    '"Старые деньги"': 'Old Money',
    'Hot Girl Walk': 'Hot Girl Walk',
    'Та самая девушка': 'That Girl',
    '"Та самая девушка"': 'That Girl',
    'Чистая девушка': 'Clean Girl',
    '"Чистая девушка"': 'Clean Girl',
    'Прибрежная Бабушка': 'Coastal Grandmother',
    'Жена Мафиози': 'Mob Wife',
    'Принцесса пилатеса': 'Pilates Princess',
    'Лето Томатной Девушки': 'Tomato Girl Summer',
    'Французская Девушка': 'French Girl',
  };

  const getLocalizedText = (
    text: { en?: string; ru?: string; kk?: string; fr?: string } | string | undefined | null
  ): string => {
    if (!text) return '';

    // If text is already a string (backend sends localized name)
    if (typeof text === 'string') {
      // Check if this is a Russian translation that should be English
      const englishName = RU_TO_EN_MAP[text];
      if (englishName && KEEP_ENGLISH_NAMES.some(name => englishName.toLowerCase().includes(name.toLowerCase()))) {
        return englishName;
      }
      // Check if the string itself is in KEEP_ENGLISH_NAMES
      if (KEEP_ENGLISH_NAMES.some(name => text.toLowerCase().includes(name.toLowerCase()))) {
        return text;
      }
      return text;
    }

    // Text is an object with language keys
    const englishName = text.en || '';
    if (KEEP_ENGLISH_NAMES.some(name => englishName.toLowerCase().includes(name.toLowerCase()))) {
      return englishName;
    }

    return text[language as keyof typeof text] || text.en || text.ru || text.kk || text.fr || '';
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="flame" size={20} color={colors.warning || '#FF6B00'} />
        <Text style={[styles.title, { color: colors.textPrimary || '#212121' }]}>
          {t('lifestyles.trending') || '🔥 Trending'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      >
        {programs.map((program) => {
          // Get local image if available, prefer local assets over backend URL
          const localImage = getLifestyleImage(program.id, program.name);
          const imageSource = localImage || (program.imageUrl ? { uri: program.imageUrl } : null);

          return (
            <TouchableOpacity
              key={program.id}
              style={[
                styles.card,
                { backgroundColor: imageSource ? 'transparent' : (colors.primary || '#4CAF50') },
              ]}
              onPress={() => onProgramPress(program.id)}
              activeOpacity={0.85}
            >
              {/* Background Image - prefer local assets */}
              {imageSource && (
                <Image
                  source={imageSource}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              )}

              {/* Gradient overlay for text readability - minimal coverage to show more photo */}
              {imageSource && (
                <LinearGradient
                  colors={['transparent', 'transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                  locations={[0, 0.5, 0.75, 1]}
                  style={StyleSheet.absoluteFill}
                />
              )}

              {/* Duration Badge - top right */}
              {program.durationDays && (
                <View style={styles.durationBadge}>
                  <Ionicons name="calendar-outline" size={12} color="#FFF" />
                  <Text style={styles.durationText}>
                    {program.durationDays} {t('common.days') || 'days'}
                  </Text>
                </View>
              )}

              {/* Content at bottom */}
              <View style={styles.cardContent}>
                <Text style={styles.emoji}>{program.emoji}</Text>
                <Text style={styles.cardName} numberOfLines={1}>
                  {getLocalizedText(program.name)}
                </Text>
                <Text style={styles.cardDesc} numberOfLines={1}>
                  {getLocalizedText(program.tagline)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Card dimensions - using 9:16 aspect ratio for optimal photo display
// This ratio matches phone screens and shows photos without excessive cropping
const CARD_WIDTH = 160;
const CARD_ASPECT_RATIO = 9 / 16; // Portrait ratio (0.5625)
const CARD_HEIGHT = CARD_WIDTH / CARD_ASPECT_RATIO; // ~284

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  carouselContent: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: CARD_ASPECT_RATIO, // Adaptive height based on aspect ratio
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 4,
  },
  cardContent: {
    padding: 12,
    paddingTop: 8, // Smaller top padding to show more photo
  },
  emoji: {
    fontSize: 22,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11,
    lineHeight: 14,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  durationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
