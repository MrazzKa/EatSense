/**
 * LifestyleDetailScreen - Detail screen for Lifestyle Programs
 * Wrapper around the LifestyleDetailScreen component
 */

import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LifestyleDetailScreenComponent from '../features/lifestyles/components/LifestyleDetailScreen';
import { LIFESTYLE_PROGRAMS } from '../features/lifestyles/data/lifestylePrograms';
import ApiService from '../services/apiService';
import type { LifestyleProgram } from '../features/lifestyles/types';

export default function LifestyleDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as { id?: string; programId?: string } | undefined;
  const programId = params?.id || params?.programId;

  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const program = LIFESTYLE_PROGRAMS.find((p: LifestyleProgram) => p.id === programId);

  useEffect(() => {
    // Check if user already has this program active
    const checkActiveStatus = async () => {
      try {
        const activeDiet = await ApiService.getActiveDiet();
        if (activeDiet && activeDiet.program?.id === programId) {
          setIsActive(true);
        }
      } catch {
        // Not active or error - ignore
      }
    };
    checkActiveStatus();
  }, [programId]);

  if (!program) {
    navigation.goBack();
    return null;
  }

  const handleStartProgram = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Use the diet API to start the lifestyle program (they share the same backend)
      await ApiService.startDiet(program.id);
      setIsActive(true);

      Alert.alert(
        'Программа запущена!',
        `Вы начали "${program.name.ru || program.name.en}". Отслеживайте прогресс на главном экране.`,
        [
          {
            text: 'Перейти',
            onPress: () => (navigation as any).navigate('MainTabs', { screen: 'Dashboard' })
          }
        ]
      );
    } catch (error: any) {
      console.error('[LifestyleDetail] Start failed:', error);
      const message = error?.response?.data?.message || 'Не удалось запустить программу. Попробуйте позже.';
      Alert.alert('Ошибка', message);
    } finally {
      setLoading(false);
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
