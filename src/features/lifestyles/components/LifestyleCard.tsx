/**
 * LifestyleCard - Card component for Lifestyle Programs list view
 * Displays: emoji, name, tagline, target badge, vibe keywords, CTA button
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../app/i18n/hooks';
import { useTheme } from '../../../contexts/ThemeContext';
import type { LifestyleProgram } from '../types';
import { getLifestyleImage } from '../lifestyleImages';

interface LifestyleCardProps {
  program: LifestyleProgram;
  isLocked?: boolean;
  onPress: () => void;
}

export default function LifestyleCard({ program, isLocked, onPress }: LifestyleCardProps) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  const getLocalizedText = (
    text: { en?: string; ru?: string; kk?: string; fr?: string } | undefined | null,
    t?: (key: string) => string
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

    // Fallback logic
    const result = text[language as keyof typeof text] || text.en || text.ru || text.kk || text.fr || Object.values(text)[0] || '';
    return translateIfNeeded(result);
  };

  const targetColor = {
    male: '#2196F3',
    female: '#E91E63',
    all: '#4CAF50',
  }[program.target];

  // Get local image if available, prefer local assets over backend URL
  const localImage = useMemo(() => {
    return getLifestyleImage(program.id, program.name);
  }, [program.id, program.name]);

  // Determine image source: prefer local asset, then backend URL, then emoji
  const imageSource = localImage || (program.imageUrl ? { uri: program.imageUrl } : null);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.card || colors.surface || '#FFF',
          shadowColor: colors.shadow || '#000',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header: Emoji + Name + Target Badge */}
      <View style={styles.header}>
        <View style={styles.emojiContainer}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={{ width: '100%', height: '100%', borderRadius: 24, opacity: isLocked ? 0.6 : 1 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.emoji}>{program.emoji}</Text>
          )}
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={16} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.headerContent}>
          <Text
            style={[
              styles.name,
              {
                color: colors.textPrimary || '#212121',
              },
            ]}
            numberOfLines={2}
          >
            {getLocalizedText(program.name, t)}
          </Text>
        </View>

        {/* Target Badge */}
        <View
          style={[
            styles.targetBadge,
            {
              backgroundColor: targetColor,
            },
          ]}
        >
          <Text style={styles.targetText}>
            {program.target === 'male' ? '♂' : program.target === 'female' ? '♀' : '⚥'}
          </Text>
        </View>
      </View>

      {/* Tagline */}
      <Text
        style={[
          styles.tagline,
          {
            color: colors.textSecondary || '#666',
          },
        ]}
        numberOfLines={3}
      >
        {getLocalizedText(program.tagline, t) || getLocalizedText(program.shortDescription, t) || getLocalizedText(program.description, t) || getLocalizedText(program.subtitle, t)}
      </Text>



      {/* Vibe keywords */}
      {program.vibe && (
        <View style={styles.vibeContainer}>
          {program.vibe.split(',').slice(0, 3).map((keyword, index) => (
            <View
              key={index}
              style={[
                styles.vibeChip,
                {
                  backgroundColor: colors.inputBackground || colors.surfaceSecondary || '#F5F5F5',
                },
              ]}
            >
              <Text
                style={[
                  styles.vibeText,
                  {
                    color: colors.textSecondary || '#666',
                  },
                ]}
              >
                {keyword.trim()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Tags: Category, Difficulty, Duration */}
      <View style={styles.tagsRow}>
        {/* Duration (Moved from above) */}
        <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary || '#F0F0F0' }]}>
          <Ionicons name="time-outline" size={12} color={colors.textSecondary || '#666'} />
          <Text style={[styles.tagText, { color: colors.textSecondary || '#666', marginLeft: 4 }]}>
            {program.durationDays || 14} {t('diets_days') || 'days'}
          </Text>
        </View>

        {/* Category Tag */}
        {program.category && (
          <View style={[styles.tag, { backgroundColor: (colors.primary || '#4CAF50') + '20' }]}>
            <Text style={[styles.tagText, { color: colors.primary || '#4CAF50' }]}>
              {(program.category.charAt(0).toUpperCase() + program.category.slice(1)).replace(/_/g, ' ')}
            </Text>
          </View>
        )}
        {/* Difficulty Tag */}
        {program.difficulty && (
          <View style={[styles.tag, { backgroundColor: (colors.warning || '#FFC107') + '20' }]}>
            <Text style={[styles.tagText, { color: colors.warning || '#856404' }]}>
              {(program.difficulty.charAt(0).toUpperCase() + program.difficulty.slice(1))}
            </Text>
          </View>
        )}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[
          styles.ctaButton,
          {
            backgroundColor: isLocked ? (colors.surfaceSecondary || '#E0E0E0') : (colors.primary || '#4CAF50'),
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {isLocked ? (
          <>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.ctaText, { color: colors.textSecondary }]}>
              {t('lifestyles.card.locked') || 'Paid Plan'}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.ctaText}>
              {t('lifestyles.card.view') || 'View Program'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#FFF" />
          </>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 24,
  },
  headerContent: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  targetBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetText: {
    fontSize: 14,
    color: '#FFF',
  },
  tagline: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 0,
  },
  vibeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  vibeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vibeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFA500',
    borderRadius: 10,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
});
