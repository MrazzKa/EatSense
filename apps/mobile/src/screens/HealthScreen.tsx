import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { ManualAnalysisCard } from '../components/ManualAnalysisCard';
import LabResultsModal from '../components/LabResultsModal';

export default function HealthScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const [showLabResultsModal, setShowLabResultsModal] = useState(false);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityLabel={t('common.goBack', 'Go back')}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
          {t('health.title', 'My Health')}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('health.subtitle', 'Track your medical tests and get AI-powered insights')}
        </Text>

        <ManualAnalysisCard onPressAddManual={() => setShowLabResultsModal(true)} />
      </ScrollView>

      <LabResultsModal
        visible={showLabResultsModal}
        onClose={() => setShowLabResultsModal(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
    },
    scrollContent: {
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.lg,
      paddingBottom: 40,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: tokens.spacing.lg,
    },
  });
