// src/components/FoodCompatibilityCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import {
  type FoodCompatibilityResult,
} from '../types/foodCompatibility';

interface Props {
  compatibility: FoodCompatibilityResult;
}

const FoodCompatibilityCard: React.FC<Props> = ({ compatibility }) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const score = compatibility.score?.value ?? 0;
  const label = compatibility.score?.label ?? 'moderate';

  const labelText = t(`foodCompatibility.scoreLabel.${label}`, label);

  return (
    <View style={[styles.card, { backgroundColor: colors.card || colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
        {t('foodCompatibility.title', 'Food compatibility')}
      </Text>

      <View style={styles.scoreRow}>
        <Text style={[styles.scoreValue, { color: colors.textPrimary || colors.text }]}>
          {score.toFixed(0)}
        </Text>
        <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
          {labelText}
        </Text>
      </View>

      {compatibility.positives?.length > 0 && (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: colors.textPrimary || colors.text }]}>
            {t('foodCompatibility.positives', 'What works well')}
          </Text>
          {compatibility.positives.slice(0, 2).map((p) => (
            <Text
              key={p.code}
              style={[styles.text, { color: colors.textSecondary }]}
            >
              • {p.title}
            </Text>
          ))}
        </View>
      )}

      {compatibility.issues?.length > 0 && (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: colors.textPrimary || colors.text }]}>
            {t('foodCompatibility.issues', 'What could be improved')}
          </Text>
          {compatibility.issues.slice(0, 2).map((i) => (
            <Text
              key={i.code}
              style={[styles.text, { color: colors.textSecondary }]}
            >
              • {i.title}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: '700',
    marginRight: 6,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  block: {
    marginTop: 8,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});

export default FoodCompatibilityCard;

