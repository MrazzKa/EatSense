/**
 * LifestyleDetailScreen - Detail screen for Lifestyle Programs
 * Fetches program data from API
 */

import React, { useState, useEffect } from 'react';
import { Alert, View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LifestyleDetailScreenComponent from '../features/lifestyles/components/LifestyleDetailScreen';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useProgramProgress } from '../stores/ProgramProgressStore';
import { useI18n } from '../../app/i18n/hooks';
// FIX: Use shared getLocalizedText for consistency
import { getLocalizedText } from '../components/programs/types';

export default function LifestyleDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { refreshProgress } = useProgramProgress();
  const params = route.params as { id?: string; programId?: string } | undefined;
  const programId = params?.id || params?.programId;

  const [program, setProgram] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!programId) {
        navigation.goBack();
        return;
      }

      try {
        // Load program details and active status in parallel
        const [programRes, activeDietRes] = await Promise.all([
          ApiService.getDiet(programId).catch(() => null),
          ApiService.getActiveDiet().catch(() => null),
        ]);

        if (programRes) {
          setProgram(programRes);
        } else {
          Alert.alert(
            t('common.error', 'Error'),
            t('lifestyles.programNotFound', 'Program not found')
          );
          navigation.goBack();
          return;
        }

        // Check if this program is active
        if (activeDietRes && activeDietRes.program?.id === programId) {
          setIsActive(true);
        }
      } catch (error) {
        console.error('[LifestyleDetail] Load error:', error);
        Alert.alert(
          t('common.error', 'Error'),
          t('lifestyles.loadError', 'Failed to load program')
        );
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [programId, navigation, t]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background || '#FFF' }]}>
        <ActivityIndicator size="large" color={colors.primary || '#4CAF50'} />
        <Text style={[styles.loadingText, { color: colors.textSecondary || '#666' }]}>
          {t('lifestyles.loading', 'Loading program...')}
        </Text>
      </View>
    );
  }

  if (!program) {
    return null;
  }

  const handleStartProgram = async () => {
    if (starting) return;
    setStarting(true);

    try {
      // FIX: Start program without invalidating cache - prevents unnecessary reloads
      // Use the diet API to start the lifestyle program (they share the same backend)
      await ApiService.startDiet(program.id || program.slug);
      setIsActive(true);

      // FIX: Refresh store in background (non-blocking) - don't wait for it
      // This prevents loading screen and improves UX
      refreshProgress().catch(err => {
        console.warn('[LifestyleDetail] Background refresh failed:', err);
      });

      // FIX: Improved fallback chain to ensure proper translations for all languages
      // This prevents showing English keys instead of translated names
      // FIX: Use shared getLocalizedText for consistency
      const programName = getLocalizedText(program.name, language);

      Alert.alert(
        t('lifestyles.programStarted', 'Program started!'),
        t('lifestyles.programStartedMessage', 'You started "{{name}}". Track your progress on the main screen.', { name: programName }),
        [
          {
            text: t('common.goTo', 'Go to'),
            onPress: () => (navigation as any).navigate('MainTabs', { screen: 'Dashboard' })
          }
        ]
      );
    } catch (error: any) {
      console.error('[LifestyleDetail] Start failed:', error);
      const status = error?.response?.status || error?.status;
      
      // Handle specific error cases
      if (status === 409) {
        // Already enrolled in this program - refresh and show success
        await refreshProgress();
        setIsActive(true);
        Alert.alert(
          t('lifestyles.programStarted', 'Program started!'),
          t('lifestyles.programAlreadyActive', 'You are already enrolled in this program.')
        );
      } else if (status === 400) {
        // Another program is active
        await refreshProgress();
        Alert.alert(
          t('common.error', 'Error'),
          t('dietPrograms.anotherDietActiveMessage', 'You already have an active program. Complete or abandon it first.'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('dietPrograms.viewActive', 'View Active'),
              onPress: () => (navigation as any).navigate('MainTabs', { screen: 'Dashboard' }),
            },
          ]
        );
      } else {
        const message = error?.response?.data?.message || t('lifestyles.startFailed', 'Failed to start program. Please try again later.');
        Alert.alert(t('common.error', 'Error'), message);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleContinueProgram = () => {
    // Navigate to tracker/dashboard to continue
    (navigation as any).navigate('MainTabs', { screen: 'Dashboard' });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <LifestyleDetailScreenComponent
      program={program}
      isActive={isActive}
      onStartProgram={handleStartProgram}
      onContinueProgram={isActive ? handleContinueProgram : undefined}
      onBack={handleBack}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
