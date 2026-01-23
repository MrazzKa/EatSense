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

export default function LifestyleDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { refreshProgress, invalidateCache } = useProgramProgress();
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
          Alert.alert('Ошибка', 'Программа не найдена');
          navigation.goBack();
          return;
        }

        // Check if this program is active
        if (activeDietRes && activeDietRes.program?.id === programId) {
          setIsActive(true);
        }
      } catch (error) {
        console.error('[LifestyleDetail] Load error:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить программу');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [programId, navigation]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background || '#FFF' }]}>
        <ActivityIndicator size="large" color={colors.primary || '#4CAF50'} />
        <Text style={[styles.loadingText, { color: colors.textSecondary || '#666' }]}>
          Загрузка программы...
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
      // Invalidate cache before starting to ensure fresh data
      invalidateCache();
      
      // Use the diet API to start the lifestyle program (they share the same backend)
      await ApiService.startDiet(program.id || program.slug);
      setIsActive(true);

      // Refresh progress store to update dashboard immediately
      await refreshProgress();

      Alert.alert(
        'Программа запущена!',
        `Вы начали "${program.name?.ru || program.name?.en || program.name}". Отслеживайте прогресс на главном экране.`,
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
