/**
 * DisclaimerBanner - Reusable disclaimer component for Lifestyle Programs
 * Shows mandatory "lifestyle, not medical advice" disclaimer
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../app/i18n/hooks';
import { useTheme } from '../../../contexts/ThemeContext';

export default function DisclaimerBanner() {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.warningBackground || '#FFF3E0',
          borderColor: colors.warning || '#FF9800',
        },
      ]}
    >
      <Ionicons
        name="information-circle"
        size={20}
        color={colors.warning || '#FF9800'}
        style={styles.icon}
      />
      <Text
        style={[
          styles.text,
          {
            color: colors.warningText || colors.textPrimary,
          },
        ]}
      >
        {t('lifestyles.disclaimer') ||
          'This is lifestyle inspiration, not medical advice. Consult a healthcare professional for medical guidance.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default React.memo(DisclaimerBanner);
