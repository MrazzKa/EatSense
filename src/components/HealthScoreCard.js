import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { spacing, radii, elevations } from '../design/tokens';

export const HealthScoreCard = ({ healthScore, dishName }) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  if (!healthScore) {
    return null;
  }

  const { score, grade, factors = {}, feedback } = healthScore;

  // Определяем, является ли блюдо напитком
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

  // Helper to normalize factor data
  const normalizeFactor = (key, value) => {
    const score = typeof value === 'number' ? value : value?.score ?? 0;
    const weight = typeof value === 'number' ? undefined : value?.weight;
    const label = typeof value === 'number' 
      ? t(`healthScore.factors.${key}`, { defaultValue: key })
      : t(`healthScore.factors.${key}`, { defaultValue: value?.label || key });
    
    const scorePercent = Math.max(0, Math.min(100, Math.round(score)));
    
    return { key, label, scorePercent, weight };
  };

  // Helper to get risk level label for negative factors
  const getRiskLabel = (key, scorePercent) => {
    const negativeFactors = ['satFat', 'sugar', 'energyDensity'];
    if (!negativeFactors.includes(key)) return null;
    
    if (scorePercent >= 80) return t('healthScore.factorLevel.good', { defaultValue: 'Good' });
    if (scorePercent >= 40) return t('healthScore.factorLevel.ok', { defaultValue: 'Okay' });
    return t('healthScore.factorLevel.bad', { defaultValue: 'Needs attention' });
  };

  const factorEntries = Object.entries(factors).map(([key, value]) => normalizeFactor(key, value));

  const getGradeColor = () => {
    const s = typeof score === 'number' ? score : 0;
    
    // Для напитков смягчаем нижнюю границу
    if (isDrink) {
      if (s < 30) return colors.error || '#EF4444';
      if (s < 70) return colors.warning || '#F59E0B';
      return colors.success || colors.primary || '#10B981';
    } else {
      // Для обычной еды
      if (s < 40) return colors.error || '#EF4444';
      if (s < 70) return colors.warning || '#F59E0B';
      return colors.success || colors.primary || '#10B981';
    }
  };

  const getGradeIcon = () => {
    switch (grade) {
      case 'A': return 'checkmark-circle';
      case 'B': return 'checkmark-circle-outline';
      case 'C': return 'information-circle-outline';
      case 'D': return 'warning-outline';
      case 'F': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const gradeColor = getGradeColor();

  const feedbackEntries = Array.isArray(feedback)
    ? feedback.map((entry, index) => {
        if (typeof entry === 'string') {
          return {
            key: `note-${index}`,
            label: 'overall',
            action: 'monitor',
            message: entry,
          };
        }
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="heart" size={24} color={gradeColor} />
          <Text style={[styles.title, { color: colors.text }]}>{t('healthScore.title')}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: gradeColor + '20' }]}>
          <Ionicons name={getGradeIcon()} size={20} color={gradeColor} />
          <Text style={[styles.scoreText, { color: gradeColor }]}>{score}</Text>
          <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
        </View>
      </View>

      {/* Score Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.inputBackground }]}>
          <View
            style={[styles.progressFill, { width: `${score}%`, backgroundColor: gradeColor }]}
          />
        </View>
      </View>

      {/* Factors */}
      <View style={styles.factorsContainer}>
        <Text style={[styles.factorsTitle, { color: colors.textSecondary }]}>{t('healthScore.qualityFactors')}</Text>
        <View style={styles.factorsGrid}>
          {factorEntries.map(entry => {
            const riskLabel = getRiskLabel(entry.key, entry.scorePercent);
            const isNegativeFactor = ['satFat', 'sugar', 'energyDensity'].includes(entry.key);
            
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
                <View style={[styles.factorBar, { backgroundColor: colors.inputBackground }]}>
                  <View
                    style={[
                      styles.factorFill,
                      { 
                        width: `${entry.scorePercent}%`, 
                        backgroundColor: isNegativeFactor && entry.scorePercent < 40 
                          ? colors.error 
                          : isNegativeFactor && entry.scorePercent < 80
                          ? colors.warning
                          : colors.primary 
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
        <View style={styles.feedbackContainer}>
          <Text style={[styles.feedbackTitle, { color: colors.textSecondary }]}>{t('healthScore.feedback')}</Text>
          {feedbackEntries.map((entry, index) => {
            const color = actionColorMap[entry.action] || colors.textSecondary;
            const icon = actionIconMap[entry.action] || 'information-circle-outline';
            return (
            <View key={index} style={styles.feedbackItem}>
                <Ionicons name={icon} size={16} color={color} style={styles.feedbackIcon} />
                <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>{getFeedbackMessage(entry)}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '600',
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
  },
  factorFill: {
    height: '100%',
    borderRadius: 2,
  },
  factorValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
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

