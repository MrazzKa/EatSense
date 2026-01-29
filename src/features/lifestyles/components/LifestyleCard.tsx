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
  onPress: () => void;
}

export default function LifestyleCard({ program, onPress }: LifestyleCardProps) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  const getLocalizedText = (
    text: { en?: string; ru?: string; kk?: string; fr?: string } | undefined | null
  ): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[language as keyof typeof text] || text.en || text.ru || text.kk || text.fr || '';
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
              style={{ width: '100%', height: '100%', borderRadius: 24 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.emoji}>{program.emoji}</Text>
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
            {getLocalizedText(program.name)}
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
        numberOfLines={2}
      >
        {getLocalizedText(program.tagline)}
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

      {/* CTA Button */}
      <TouchableOpacity
        style={[
          styles.ctaButton,
          {
            backgroundColor: colors.primary || '#4CAF50',
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaText}>
          {t('lifestyles.card.view') || 'Посмотреть'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#FFF" />
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
    marginBottom: 12,
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
});
