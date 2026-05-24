// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { MASCOT_COMPONENTS, MASCOT_COLORS } from '../assets/mascots';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STAGE_KEYS = ['', 'egg', 'baby', 'teen', 'adult', 'master'];
const STAGE_DEFAULTS = ['', 'Egg', 'Baby', 'Teen', 'Adult', 'Master'];

// Simple confetti particle
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(Math.random() * SCREEN_WIDTH - SCREEN_WIDTH / 2)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 400, duration: 2000, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: color,
          transform: [{ translateY }, { translateX }, { rotate: spin }],
          opacity,
        },
      ]}
    />
  );
}

const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F97316', '#22D3EE'];

interface LevelUpModalProps {
  visible: boolean;
  newLevel: number;
  onClose: () => void;
  mascotType?: string;
  mascotName?: string;
}

export function LevelUpModal({ visible, newLevel, onClose, mascotType, mascotName }: LevelUpModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!mascotType) return null;

  const MascotComp = MASCOT_COMPONENTS[mascotType];
  const mascotColor = MASCOT_COLORS[mascotType]?.primary || colors.primary;
  const stageKey = STAGE_KEYS[Math.min(newLevel, 5)];
  const stageDefault = STAGE_DEFAULTS[Math.min(newLevel, 5)];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Confetti */}
        {visible && Array.from({ length: 30 }).map((_, i) => (
          <ConfettiParticle
            key={i}
            delay={i * 60}
            color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
          />
        ))}

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface || colors.card || '#FFF',
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Star burst */}
          <View style={[styles.starBurst, { backgroundColor: mascotColor + '15' }]}>
            <MascotComp size="large" level={newLevel} mood="excited" />
          </View>

          <Text style={[styles.title, { color: mascotColor }]}>
            {t('mascot.levelUp.title', 'Level Up!')}
          </Text>

          <View style={[styles.levelBadge, { backgroundColor: mascotColor }]}>
            <Text style={styles.levelBadgeText}>
              Lv.{newLevel} — {t(`mascot.stage.${stageKey}`, stageDefault)}
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {mascotName || 'Mascot'} {t('mascot.levelUp.evolved', 'has evolved!')}
          </Text>

          <Text style={[styles.message, { color: colors.textTertiary }]}>
            {t('mascot.levelUp.keepGoing', 'Keep eating healthy to unlock the next stage!')}
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: mascotColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={18} color="#FFF" />
            <Text style={styles.buttonText}>
              {t('mascot.levelUp.awesome', 'Awesome!')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
    left: SCREEN_WIDTH / 2,
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  starBurst: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  levelBadge: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 12,
  },
  levelBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
