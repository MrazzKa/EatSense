// src/components/CarcinogenicRiskCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import {
  type CarcinogenicRiskResult,
  type CarcinogenicRiskLevel,
} from '../types/carcinogenicRisk';

interface Props {
  risk: CarcinogenicRiskResult;
}

const CarcinogenicRiskCard: React.FC<Props> = ({ risk }) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const level = risk.summary?.level ?? 'none';
  const score = risk.summary?.score ?? 0;
  const summaryText = risk.summary?.summaryText;

  const levelLabel = t(
    `carcinogenicRisk.level.${level}`,
    defaultLevelLabel(level),
  );


  return (
    <View style={[styles.card, { backgroundColor: colors.card || colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary || colors.text }]}>
        {t('carcinogenicRisk.title', 'Long-term risk factors')}
      </Text>

      <View style={styles.levelRow}>
        <Text style={[styles.levelChip, { borderColor: colors.primary || colors.textPrimary }]}>
          {levelLabel}
        </Text>
        <Text style={[styles.score, { color: colors.textSecondary }]}>
          {score.toFixed(0)}/100
        </Text>
      </View>

      {summaryText ? (
        <Text style={[styles.summary, { color: colors.textSecondary }]}>
          {summaryText}
        </Text>
      ) : null}

      {risk.highRiskItems?.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text }]}>
            {t('carcinogenicRisk.highRiskItems', 'Items to keep in moderation')}
          </Text>
          {risk.highRiskItems.slice(0, 3).map((item, index) => (
            <Text
              key={item.itemName + item.level + index}
              style={[styles.itemText, { color: colors.textSecondary }]}
            >
              • {item.itemName}
            </Text>
          ))}
        </View>
      )}

      {risk.summary?.disclaimer && (
        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
          {risk.summary.disclaimer}
        </Text>
      )}
    </View>
  );
};

function defaultLevelLabel(level: CarcinogenicRiskLevel): string {
  switch (level) {
    case 'none':
      return 'No significant factors';
    case 'low':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'Elevated';
    default:
      return 'Unknown';
  }
}

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
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  score: {
    fontSize: 12,
    fontWeight: '500',
  },
  summary: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  disclaimer: {
    marginTop: 10,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default CarcinogenicRiskCard;

