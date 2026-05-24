// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useI18n } from '../../../app/i18n/hooks';
import { useTheme } from '../../contexts/ThemeContext';

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
    descFallback: 'Find a group in your country to connect with people who share your goals.',
    actionKey: 'community.tour.step1.action',
    actionFallback: 'Browse Groups',
  },
  {
    icon: 'create-outline',
    titleKey: 'community.tour.step2.title',
    titleFallback: 'Share Your Journey',
    descKey: 'community.tour.step2.desc',
    descFallback: 'Post about your meals, achievements, or ask the community for advice.',
    actionKey: 'community.tour.step2.action',
    actionFallback: 'Create a Post',
  },
  {
    icon: 'heart-outline',
    titleKey: 'community.tour.step3.title',
    titleFallback: 'Support Others',
    descKey: 'community.tour.step3.desc',
    descFallback: 'Like and comment on posts to encourage fellow members.',
    actionKey: 'community.tour.step3.action',
    actionFallback: 'Got it',
  },
];

interface Props {
  onStepAction?: (stepIndex: number) => void;
  onDismiss?: () => void;
}

export default function CommunityGuidedTour({ onStepAction, onDismiss }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(TOUR_STORAGE_KEY)
      .then((value) => {
        if (!mounted) return;
        setReady(true);
        setVisible(!value);
      })
      .catch(() => {
        if (!mounted) return;
        setReady(true);
        setVisible(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const completeTour = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true').catch(() => {});
    onDismiss?.();
  }, [onDismiss]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }
    completeTour();
  }, [completeTour, currentStep]);

  const handleAction = useCallback(() => {
    completeTour();
    onStepAction?.(currentStep);
  }, [completeTour, currentStep, onStepAction]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!ready || !visible) return null;

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        {STEPS.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setCurrentStep(index)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.dot,
              { backgroundColor: index === currentStep ? colors.primary : colors.border || '#E0E0E0' },
            ]}
          />
        ))}
      </View>

      <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name={step.icon as any} size={32} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t(step.titleKey, step.titleFallback)}
      </Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        {t(step.descKey, step.descFallback)}
      </Text>
      <Text style={[styles.stepCounter, { color: colors.textTertiary }]}>
        {currentStep + 1} / {STEPS.length}
      </Text>

      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.actionBtnText}>
          {isLastStep ? t('community.tour.done', 'Got it') : t('community.tour.next', 'Next')}
        </Text>
        {!isLastStep && <Ionicons name="arrow-forward" size={18} color="#FFF" style={styles.actionIcon} />}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleAction}
        style={[styles.secondaryBtn, { borderColor: colors.border }]}
        activeOpacity={0.75}
      >
        <Text style={[styles.secondaryText, { color: colors.primary }]}>
          {t(step.actionKey, step.actionFallback)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={completeTour} style={styles.skipBtn} activeOpacity={0.7}>
        <Text style={[styles.skipText, { color: colors.textTertiary }]}>
          {t('community.tour.skip', 'Skip tour')}
        </Text>
      </TouchableOpacity>
    </View>
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
      gap: 8,
      marginBottom: 16,
    },
    dot: {
      width: 10,
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
    actionIcon: {
      marginLeft: 6,
    },
    secondaryBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      width: '100%',
    },
    secondaryText: {
      fontSize: 15,
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
