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
                <Image
                  source={imageSource}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              )}

              {/* Gradient overlay for text readability */}
              {imageSource && (
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
                  locations={[0, 0.5, 1]}
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
                <View style={styles.cardIconContainer}>
                  <Text style={styles.emoji}>{program.emoji}</Text>
                </View>
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
    gap: 14,
  },
  card: {
    width: 240,
    height: 160,
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
    padding: 14,
    paddingTop: 20,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 22,
  },
  cardName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 16,
  },
  durationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
