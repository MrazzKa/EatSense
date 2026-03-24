// @ts-nocheck
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useMascot } from '../contexts/MascotContext';
import { useI18n } from '../../app/i18n/hooks';
import { MASCOT_COMPONENTS, MASCOT_COLORS } from '../assets/mascots';

const PHRASES_KEYS = [
  'mascot.phrase.greeting',
  'mascot.phrase.encouragement',
  'mascot.phrase.healthy',
  'mascot.phrase.streak',
  'mascot.phrase.levelUp',
];

function getMood(mascot: any): 'happy' | 'sad' | 'sleeping' | 'excited' {
  if (!mascot) return 'happy';
  // Max level mascots are always excited
  if (mascot.level >= 5) return 'excited';
  // Excited when close to leveling up (>80% within current level)
  if (mascot.nextLevelXp) {
    const thresholds = [0, 100, 300, 600, 1000];
    const currentThreshold = thresholds[mascot.level - 1] || 0;
    const range = mascot.nextLevelXp - currentThreshold;
    const progress = mascot.xp - currentThreshold;
    if (range > 0 && progress / range > 0.8) return 'excited';
  }
  // Level 4+ is always happy
  if (mascot.level >= 4) return 'happy';
  return 'happy';
}

export default function MascotWidget({ onPress }: { onPress?: () => void }) {
  const { mascot } = useMascot();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();

  // Breathing animation
  const breathe = useSharedValue(1);
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1500, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
        withTiming(1, { duration: 1500, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  if (!mascot) return null;

  const MascotComponent = MASCOT_COMPONENTS[mascot.mascotType];
  if (!MascotComponent) return null;

  const mascotColors = MASCOT_COLORS[mascot.mascotType] || { primary: colors.primary, light: colors.primary + '15' };
  const mood = getMood(mascot);

  // XP thresholds must match backend: [0, 100, 300, 600, 1000]
  const XP_THRESHOLDS = [0, 100, 300, 600, 1000];
  const currentLevelXp = XP_THRESHOLDS[Math.min(mascot.level - 1, XP_THRESHOLDS.length - 1)] || 0;
  const xpInLevel = mascot.xp - currentLevelXp;
  const xpNeededForLevel = mascot.nextLevelXp ? mascot.nextLevelXp - currentLevelXp : 1;
  const xpProgress = mascot.nextLevelXp
    ? (xpInLevel / xpNeededForLevel) * 100
    : 100;

  const phraseKey = PHRASES_KEYS[Math.min(mascot.level - 1, PHRASES_KEYS.length - 1)] || PHRASES_KEYS[0];
  const phrase = t(phraseKey, getDefaultPhrase(mascot.level));

  // Stage labels
  const stageLabel = getStageLabel(mascot.level, t);

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: mascotColors.primary + '25' }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <Animated.View style={[styles.mascotContainer, animatedStyle, { backgroundColor: mascotColors.light }]}>
        <MascotComponent size={mascot.size} level={mascot.level} mood={mood} />
      </Animated.View>

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{mascot.name}</Text>
          <View style={[styles.levelBadge, { backgroundColor: mascotColors.primary }]}>
            <Text style={styles.levelText}>Lv.{mascot.level}</Text>
          </View>
        </View>

        {/* Stage label */}
        <Text style={[styles.stageLabel, { color: mascotColors.primary }]}>{stageLabel}</Text>

        {/* XP Bar */}
        <View style={[styles.xpBarBg, { backgroundColor: mascotColors.primary + '20' }]}>
          <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress, 100)}%`, backgroundColor: mascotColors.primary }]} />
        </View>
        <Text style={styles.xpText}>
          {mascot.nextLevelXp
            ? `${mascot.xp} / ${mascot.nextLevelXp} XP`
            : `${mascot.xp} XP ★`}
        </Text>

        {/* Speech bubble */}
        <View style={[styles.speechBubble, { backgroundColor: mascotColors.primary + '10' }]}>
          <Text style={styles.speechText}>{phrase}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getDefaultPhrase(level: number): string {
  switch (level) {
    case 1: return "I'm just hatching! Feed me healthy food!";
    case 2: return "You're doing great, keep going!";
    case 3: return "Healthy choices make me grow!";
    case 4: return "We're an amazing team!";
    default: return "I'm so proud of you!";
  }
}

const STAGE_KEYS = ['', 'mascot.stage.egg', 'mascot.stage.baby', 'mascot.stage.teen', 'mascot.stage.adult', 'mascot.stage.master'];
const STAGE_DEFAULTS = ['', 'Egg', 'Baby', 'Teen', 'Adult', 'Master'];

function getStageLabel(level: number, t?: (key: string, fallback: string) => string): string {
  const idx = Math.min(level, 5);
  if (t) return t(STAGE_KEYS[idx], STAGE_DEFAULTS[idx]);
  return STAGE_DEFAULTS[idx] || 'Master';
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface || colors.card || '#FFF',
      borderRadius: tokens.radii?.lg || 16,
      padding: 12,
      marginHorizontal: 16,
      marginVertical: 8,
      borderWidth: 1.5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    mascotContainer: {
      marginRight: 12,
      borderRadius: 16,
      padding: 4,
    },
    infoContainer: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    name: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary || '#212121',
      flex: 1,
      marginRight: 8,
    },
    levelBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    levelText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFF',
    },
    stageLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 4,
    },
    xpBarBg: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 3,
    },
    xpBarFill: {
      height: 6,
      borderRadius: 3,
    },
    xpText: {
      fontSize: 11,
      color: colors.textTertiary || '#999',
      marginBottom: 6,
    },
    speechBubble: {
      borderRadius: tokens.radii?.md || 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    speechText: {
      fontSize: 12,
      color: colors.textSecondary || '#666',
      fontStyle: 'italic',
    },
  });
