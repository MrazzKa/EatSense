import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../app/i18n/hooks';
import { useTheme } from '../../contexts/ThemeContext';

interface Program {
  id: string;
  name: string | Record<string, string>;
  shortDescription?: string | Record<string, string>;
  description?: string | Record<string, string>;
  imageUrl?: string;
  color?: string;
  duration?: number;
  emoji?: string;
}

interface TrendingCarouselProps {
  programs: Program[];
  onProgramPress: (_programId: string) => void;
}

// Helper to extract localized string
const getLocalizedText = (value: string | Record<string, string> | undefined, language: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[language] || value['en'] || value[Object.keys(value)[0]] || '';
  }
  return String(value);
};

/**
 * TrendingCarousel - Horizontal carousel for trending lifestyle programs
 */
export default function TrendingCarousel({ programs, onProgramPress }: TrendingCarouselProps) {
  const { t, language } = useI18n();
  const { colors } = useTheme();

  if (programs.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="flame" size={20} color={colors.warning || '#FF6B00'} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('diets.lifestyle.trending') || '🔥 Trending'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      >
        {programs.map((program) => (
          <TouchableOpacity
            key={program.id}
            style={[
              styles.card,
              { backgroundColor: program.color || colors.primary }
            ]}
            onPress={() => onProgramPress(program.id)}
            activeOpacity={0.85}
          >
            {/* Emoji or Image */}
            <View style={styles.cardIconContainer}>
              {program.emoji ? (
                <Text style={styles.emoji}>{program.emoji}</Text>
              ) : program.imageUrl ? (
                <Image source={{ uri: program.imageUrl }} style={styles.cardImage} />
              ) : (
                <Ionicons name="sparkles" size={28} color="rgba(255,255,255,0.85)" />
              )}
            </View>

            {/* Content */}
            <Text style={styles.cardName} numberOfLines={2}>
              {getLocalizedText(program.name, language)}
            </Text>

            <Text style={styles.cardDesc} numberOfLines={2}>
              {getLocalizedText(program.shortDescription || program.description, language)}
            </Text>

            {/* Duration Badge */}
            {program.duration && (
              <View style={styles.durationBadge}>
                <Ionicons name="calendar-outline" size={12} color="#FFF" />
                <Text style={styles.durationText}>
                  {program.duration} {t('diets.days') || 'days'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 32,
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
