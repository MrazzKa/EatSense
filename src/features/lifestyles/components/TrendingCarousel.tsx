/**
 * TrendingCarousel - Horizontal carousel for TRENDING category programs
 * Updated to use LifestyleProgram type and local images
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
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

  const getLocalizedText = (
    text: { en?: string; ru?: string; kk?: string; fr?: string } | undefined | null
  ): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
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
              <>
                <Image
                  source={imageSource}
                  style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                  resizeMode="cover"
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16 },
                  ]}
                />
              </>
            )}

            {/* Emoji */}
            <View style={styles.cardIconContainer}>
              <Text style={styles.emoji}>{program.emoji}</Text>
            </View>

            {/* Content */}
            <Text style={styles.cardName} numberOfLines={2}>
              {getLocalizedText(program.name)}
            </Text>

            <Text style={styles.cardDesc} numberOfLines={2}>
              {getLocalizedText(program.tagline)}
            </Text>

            {/* Duration Badge */}
            {program.durationDays && (
              <View style={styles.durationBadge}>
                <Ionicons name="calendar-outline" size={12} color="#FFF" />
                <Text style={styles.durationText}>
                  {program.durationDays} {t('common.days') || 'days'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  carouselContent: {
    paddingRight: 16,
  },
  card: {
    width: 180,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    justifyContent: 'space-between',
    minHeight: 200,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 32,
  },
  cardName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
    flex: 1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
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
