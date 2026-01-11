/**
 * LifestyleDetailScreen - Detail screen for Lifestyle Programs
 * Wrapper around the LifestyleDetailScreen component
 */

import React from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import LifestyleDetailScreenComponent from '../features/lifestyles/components/LifestyleDetailScreen';
import { LIFESTYLE_PROGRAMS } from '../features/lifestyles/data/lifestylePrograms';
import type { LifestyleProgram } from '../features/lifestyles/types';

export default function LifestyleDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as { id?: string; programId?: string } | undefined;
  const programId = params?.id || params?.programId;

  const program = LIFESTYLE_PROGRAMS.find((p: LifestyleProgram) => p.id === programId);

  if (!program) {
    // TODO: Show error/not found state
    navigation.goBack();
    return null;
  }

  const handleStartProgram = () => {
    // TODO: Implement start program logic
    console.log('Start lifestyle program:', program.id);
    navigation.goBack();
  };

  const handleContinueProgram = () => {
    // TODO: Implement continue program logic
    console.log('Continue lifestyle program:', program.id);
    navigation.goBack();
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // TODO: Check if program is active
  const isActive = false;

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
