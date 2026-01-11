import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CircularProgress } from './CircularProgress';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { spacing, radii, elevations } from '../design/tokens';

export const HealthScoreCard = ({ healthScore, dishName }) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  // Определяем, является ли блюдо напитком (вызываем хук ДО раннего return)
  const isDrink = React.useMemo(() => {
    if (!dishName) return false;
    const nameLower = dishName.toLowerCase();
    const drinkKeywords = [
      'milk', 'молоко', 'молочко',
      'coffee', 'кофе', 'капучино', 'cappuccino', 'латте', 'latte',
      'tea', 'чай', 'chai',
      'juice', 'сок',
      'soda', 'газировка',
      'water', 'вода',
      'drink', 'напиток', 'напитки',
    ];
    return drinkKeywords.some(keyword => nameLower.includes(keyword));
  }, [dishName]);

  if (!healthScore) {
    return null;
  }

  // Support both new format (total, level, factors) and legacy format (score, grade, factors)
  // Ensure total is a valid number between 0 and 100
  const rawTotal = healthScore.total ?? healthScore.score ?? 0;
  const parsedTotal = Number(rawTotal);
  const safeTotal = Number.isFinite(parsedTotal) ? parsedTotal : 0;
  const total = Math.max(0, Math.min(100, Math.round(safeTotal))); // Clamp and round to 0-100
  const level = healthScore.level || (total >= 80 ? 'excellent' : total >= 60 ? 'good' : total >= 40 ? 'average' : 'poor');
  const factors = healthScore.factors || {};
  const feedback = healthScore.feedback || healthScore.feedbackLegacy || [];

  // Helper to normalize factor data
  // New format: factors = { protein: 75, fiber: 60, ... } (numbers 0-100)
  // Legacy format: factors = { protein: { score: 75, label: 'Protein' }, ... }
  const normalizeFactor = (key, value) => {
    const score = typeof value === 'number' ? value : value?.score ?? 0;
    const weight = typeof value === 'number' ? undefined : value?.weight;

    // Map key names (saturatedFat -> satFat for i18n, sugars -> sugar)
    const i18nKey = key === 'saturatedFat' ? 'satFat' : key === 'sugars' ? 'sugar' : key;
    const label = typeof value === 'number'
      ? t(`healthScore.factors.${i18nKey}`, { defaultValue: key })
      : t(`healthScore.factors.${i18nKey}`, { defaultValue: value?.label || key });

    const scorePercent = Math.max(0, Math.min(100, Math.round(score)));

    return { key, label, scorePercent, weight };
  };

  // Helper to get risk level label for negative factors
  const getRiskLabel = (key, scorePercent) => {
    // Map key names for negative factors check
    const normalizedKey = key === 'saturatedFat' ? 'satFat' : key === 'sugars' ? 'sugar' : key;
    const negativeFactors = ['satFat', 'sugar', 'energyDensity'];
    if (!negativeFactors.includes(normalizedKey)) return null;

    if (scorePercent >= 80) return t('healthScore.factorLevel.good', { defaultValue: 'Good' });
    if (scorePercent >= 40) return t('healthScore.factorLevel.ok', { defaultValue: 'Okay' });
    return t('healthScore.factorLevel.bad', { defaultValue: 'Needs attention' });
  };

  const factorEntries = Object.entries(factors).map(([key, value]) => normalizeFactor(key, value));

  const getGradeColor = () => {
    // Use theme primary color for good scores, warning/error for others
    // Для напитков смягчаем нижнюю границу
    if (isDrink) {
      if (total < 30) return colors.error || '#EF4444';
      if (total < 70) return colors.warning || '#F59E0B';
      return colors.primary || '#C6A052'; // Use primary color (gold/amber) instead of green
    } else {
      // Для обычной еды
      if (total < 40) return colors.error || '#EF4444';
      if (total < 70) return colors.warning || '#F59E0B';
      return colors.primary || '#C6A052'; // Use primary color (gold/amber) instead of green
    }
  };

  const gradeColor = getGradeColor();

  // Support both new format (HealthFeedbackItem[]) and legacy format (string[])
  const feedbackEntries = Array.isArray(feedback)
    ? feedback.map((entry, index) => {
      // New format: { type: 'positive' | 'warning', code: string, message: string }
      if (typeof entry === 'object' && entry.type && entry.message) {
        return {
          key: entry.code || `note-${index}`,
          label: 'overall',
          action: entry.type === 'positive' ? 'celebrate' : 'monitor',
          message: entry.message,
          type: entry.type,
        };
      }
      // Legacy format: string
      if (typeof entry === 'string') {
        return {
          key: `note-${index}`,
          label: 'overall',
          action: 'monitor',
          message: entry,
          type: 'warning',
        };
      }
      // Legacy format: { key, label, action, message }
      const fallbackLabel = entry.label || entry.key || 'overall';
      const translatedLabel = entry.key
        ? t(`healthScore.factors.${entry.key}`, { defaultValue: fallbackLabel })
        : fallbackLabel;
      const action = entry.action || 'monitor';
      return {
        key: entry.key || `note-${index}`,
        label: translatedLabel,
        action,
        message:
          entry.message ||
          t(`healthScore.feedbackMessages.${action}`, {
            defaultValue: entry.message,
            factor: translatedLabel,
          }),
        type: entry.type || (action === 'celebrate' ? 'positive' : 'warning'),
      };
    })
    : [];

  const actionColorMap = {
    celebrate: colors.success,
    increase: colors.primary,
    reduce: colors.error,
    monitor: colors.warning,
  };

  const actionIconMap = {
    celebrate: 'sparkles-outline',
    increase: 'trending-up-outline',
    reduce: 'trending-down-outline',
    monitor: 'information-circle-outline',
  };

  const getFeedbackMessage = (entry) => {
    const translatedFactor = entry.label || t(`healthScore.factors.${entry.key}`, {
      defaultValue: entry.label || entry.key,
    });
    return (
      entry.message ||
      t(`healthScore.feedbackMessages.${entry.action}`, {
        defaultValue: entry.message,
        factor: translatedFactor,
      })
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header with Circular Score */}
      <View style={styles.headerCentered}>
        <CircularProgress
          progress={total / 100}
          size={120}
          strokeWidth={10}
          value={total}
        >
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={[styles.scoreText, { color: gradeColor, fontSize: 32, lineHeight: 36 }]}>{total}</Text>
          </View>
        </CircularProgress>
        {/* Level text below the circle */}
        <Text style={[styles.levelText, { color: gradeColor, marginTop: 8 }]}>
          {t(`healthScore.level.${level}`, { defaultValue: level })}
        </Text>
      </View>

      {/* Factors */}
      <View style={styles.factorsContainer}>
        <Text style={[styles.factorsTitle, { color: colors.textSecondary }]}>{t('healthScore.qualityFactors')}</Text>
        <View style={styles.factorsGrid}>
          {factorEntries.map(entry => {
            const riskLabel = getRiskLabel(entry.key, entry.scorePercent);
            const isNegativeFactor = ['satFat', 'sugar', 'energyDensity', 'saturatedFat', 'sugars'].includes(entry.key);

            return (
              <View key={entry.key} style={styles.factorItem}>
                <View style={styles.factorHeader}>
                  <View style={styles.factorLabelContainer}>
                    <Text style={[styles.factorLabel, { color: colors.textTertiary }]}>{entry.label}</Text>
                    {riskLabel && (
                      <Text style={[styles.factorRiskLabel, { color: colors.textTertiary }]}>
                        {' • '}{riskLabel}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.factorValue, { color: colors.textSecondary }]}>
                    {entry.scorePercent}%
                  </Text>
                </View>
                <View style={[styles.factorBar, { backgroundColor: colors.inputBackground || colors.surfaceMuted || '#F3F4F6' }]}>
                  <View
                    style={[
                      styles.factorFill,
                      {
                        width: `${Math.max(0, Math.min(100, entry.scorePercent))}%`, // Ensure valid percentage
                        backgroundColor: isNegativeFactor && entry.scorePercent < 40
                          ? (colors.error || '#EF4444')
                          : isNegativeFactor && entry.scorePercent < 80
                            ? (colors.warning || '#F59E0B')
                            : (colors.primary || '#C6A052') // Use primary color instead of green
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Feedback */}
      {feedbackEntries.length > 0 && (
        <View style={[styles.feedbackContainer, { borderTopColor: colors.border || colors.borderMuted || 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.feedbackTitle, { color: colors.textSecondary }]}>{t('healthScore.feedback')}</Text>
          {feedbackEntries.map((entry, index) => {
            const color = actionColorMap[entry.action] || colors.textSecondary;
            const icon = actionIconMap[entry.action] || 'information-circle-outline';
            return (
              <View key={index} style={styles.feedbackItem}>
                <Ionicons name={icon} size={16} color={color} style={styles.feedbackIcon} />
                <Text
                  style={[styles.feedbackText, { color: colors.textPrimary || colors.textSecondary }]}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {getFeedbackMessage(entry)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
    borderWidth: 1,
    ...elevations.sm,
  },
  headerCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
    flexWrap: 'wrap', // Allow wrapping if content is too wide
    maxWidth: '100%', // Prevent overflow
    flexShrink: 1, // Allow shrinking if needed
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorsContainer: {
    marginBottom: spacing.lg,
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  factorsGrid: {
    gap: spacing.md,
  },
  factorItem: {
    gap: spacing.xs,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  factorLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  factorRiskLabel: {
    fontSize: 11,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  factorBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%', // Ensure full width
  },
  factorFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 0, // Allow shrinking to 0 if score is 0
  },
  factorValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  feedbackIcon: {
    marginTop: 2,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default HealthScoreCard;

