import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

interface ManualAnalysisCardProps {
  onPressAddManual: () => void;
}

export const ManualAnalysisCard: React.FC<ManualAnalysisCardProps> = ({ onPressAddManual }) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: colors.surface || colors.card,
        borderColor: colors.border || colors.borderMuted,
      }]}
      activeOpacity={0.8}
      onPress={onPressAddManual}
    >
      <View style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryTint || colors.primary + '20' }]}>
          <Ionicons name="create-outline" size={20} color={colors.primary || '#007AFF'} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
            {t('dashboard.manualAnalysis.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('dashboard.manualAnalysis.subtitle')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary || colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});

