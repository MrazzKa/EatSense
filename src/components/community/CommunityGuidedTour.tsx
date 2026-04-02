// @ts-nocheck
/**
 * CommunityGuidedTour — Step-by-step onboarding for first-time community visitors
 * Shows 3 steps: Join a group → Create first post → Like & comment
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';

const TOUR_STORAGE_KEY = 'community_tour_completed';

interface Step {
  icon: string;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  actionKey: string;
  actionFallback: string;
}

const STEPS: Step[] = [
  {
    icon: 'people-outline',
    titleKey: 'community.tour.step1.title',
    titleFallback: 'Join a Group',
    descKey: 'community.tour.step1.desc',
    descFallback: 'Find a group in your country or create your own to connect with people who share your goals.',
    actionKey: 'community.tour.step1.action',
    actionFallback: 'Browse Groups',
  },
  {
    icon: 'create-outline',
    titleKey: 'community.tour.step2.title',
    titleFallback: 'Share Your Journey',
    descKey: 'community.tour.step2.desc',
    descFallback: 'Post about your meals, achievements, or ask the community for advice. Photos welcome!',
    actionKey: 'community.tour.step2.action',
    actionFallback: 'Create a Post',
  },
  {
    icon: 'heart-outline',
    titleKey: 'community.tour.step3.title',
    titleFallback: 'Support Others',
    descKey: 'community.tour.step3.desc',
    descFallback: 'Like and comment on posts to encourage fellow members. Community thrives on support!',
    actionKey: 'community.tour.step3.action',
    actionFallback: 'Got it!',
  },
];

interface Props {
  onStepAction?: (stepIndex: number) => void;
  onDismiss?: () => void;
}

export default function CommunityGuidedTour({ onStepAction, onDismiss }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(TOUR_STORAGE_KEY).then(val => {
      if (!val) {
        setVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    });
  }, []);

  const handleAction = useCallback(() => {
    onStepAction?.(currentStep);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleDismiss();
    }
  }, [currentStep, onStepAction]);

  const handleDismiss = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true').catch(() => {});
      onDismiss?.();
    });
  }, [fadeAnim, onDismiss]);

  const handleSkip = useCallback(() => {
    handleDismiss();
  }, [handleDismiss]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible) return null;

  const step = STEPS[currentStep];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i <= currentStep ? colors.primary : colors.border || '#E0E0E0' },
            ]}
          />
        ))}
      </View>

      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={step.icon as any} size={32} color={colors.primary} />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t(step.titleKey, step.titleFallback)}
      </Text>

      {/* Description */}
      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        {t(step.descKey, step.descFallback)}
      </Text>

      {/* Step counter */}
      <Text style={[styles.stepCounter, { color: colors.textTertiary }]}>
        {currentStep + 1} / {STEPS.length}
      </Text>

      {/* Action button */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
        onPress={handleAction}
        activeOpacity={0.8}
      >
        <Text style={styles.actionBtnText}>
          {t(step.actionKey, step.actionFallback)}
        </Text>
        {currentStep < STEPS.length - 1 && (
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
        )}
      </TouchableOpacity>

      {/* Skip */}
      <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
        <Text style={[styles.skipText, { color: colors.textTertiary }]}>
          {t('community.tour.skip', 'Skip tour')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginVertical: 12,
      padding: 20,
      borderRadius: 16,
      backgroundColor: colors.surface || colors.card || '#FFF',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 16,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 6,
      textAlign: 'center',
    },
    desc: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 8,
      paddingHorizontal: 8,
    },
    stepCounter: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 14,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      paddingHorizontal: 28,
      borderRadius: 12,
      width: '100%',
    },
    actionBtnText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
    },
    skipBtn: {
      marginTop: 10,
      paddingVertical: 6,
    },
    skipText: {
      fontSize: 13,
      fontWeight: '500',
    },
  });
