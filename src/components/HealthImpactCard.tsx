// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { GlassCard } from './glass/GlassCard';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';

/**
 * HealthImpactCard
 *
 * Renders the "how this meal affects your health" panel under the ingredients list.
 * Free users see a teaser title (a question) with the four-system summary blurred
 * + a single "Unlock" CTA. Premium users see a neutral title and the full breakdown,
 * with the body systems re-ordered so that the user's chosen healthFocus areas
 * appear first.
 *
 * The body-systems data comes from the backend (AnalysisData.bodySystems);
 * this component does not compute anything itself.
 */
export interface BodySystemImpact {
  id: 'cardiovascular' | 'bloodSugar' | 'bloodIron' | 'gut';
  level: -2 | -1 | 0 | 1 | 2;
  summary: string;
  signals: string[];
  userFocus?: boolean;
}

export interface BodySystemsImpact {
  systems: BodySystemImpact[];
  aiSummary?: string;
}

interface Props {
  bodySystems?: BodySystemsImpact | null;
}

const SYSTEM_KEYS: Array<BodySystemImpact['id']> = [
  'cardiovascular',
  'bloodSugar',
  'bloodIron',
  'gut',
];

export default function HealthImpactCard({ bodySystems }: Props) {
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const navigation = useNavigation();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ApiService.getCurrentSubscription();
        if (!cancelled) setIsPremium(Boolean(data?.hasSubscription));
      } catch {
        if (!cancelled) setIsPremium(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!bodySystems || !Array.isArray(bodySystems.systems) || bodySystems.systems.length === 0) {
    return null;
  }

  // Stable display order: backend may already reorder by userFocus; ensure all 4 are present.
  const byId: Record<string, BodySystemImpact> = {};
  for (const s of bodySystems.systems) byId[s.id] = s;
  const orderedSystems = SYSTEM_KEYS
    .map((id) => byId[id])
    .filter(Boolean) as BodySystemImpact[];
  // If backend reordered (focused first), respect that for non-blurred view.
  const systemsForDisplay = bodySystems.systems.length === 4 ? bodySystems.systems : orderedSystems;

  const styles = createStyles(tokens, colors);

  if (isPremium === null) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </GlassCard>
    );
  }

  if (!isPremium) {
    return (
      <GlassCard style={styles.card}>
        <Text style={styles.lockedTitle}>{t('analysis.healthImpact.lockedTitle')}</Text>
        <Text style={styles.lockedSubtitle}>{t('analysis.healthImpact.lockedSubtitle')}</Text>

        <View style={styles.blurContainer}>
          <View style={styles.blurContent} pointerEvents="none">
            {systemsForDisplay.map((sys) => (
              <SystemRow key={sys.id} system={sys} t={t} colors={colors} tokens={tokens} dimmed />
            ))}
          </View>
          <BlurView intensity={28} tint="default" style={StyleSheet.absoluteFill} />
        </View>

        <TouchableOpacity
          style={styles.unlockButton}
          onPress={() => {
            try { navigation.navigate('Subscription' as never); } catch {}
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.unlockButtonText}>{t('analysis.healthImpact.unlock')}</Text>
        </TouchableOpacity>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>{t('analysis.healthImpact.title')}</Text>
      <Text style={styles.subtitle}>{t('analysis.healthImpact.subtitle')}</Text>
      {bodySystems.aiSummary ? (
        <Text style={styles.aiSummary}>{bodySystems.aiSummary}</Text>
      ) : null}
      <View style={styles.systemsList}>
        {systemsForDisplay.map((sys) => (
          <SystemRow key={sys.id} system={sys} t={t} colors={colors} tokens={tokens} />
        ))}
      </View>
    </GlassCard>
  );
}

function levelBadgeColor(level: number, colors: any): { bg: string; fg: string; label: string } {
  if (level >= 2) return { bg: colors.successSubtle || 'rgba(40,167,69,0.18)', fg: colors.success || '#1e8a3a', label: 'veryPositive' };
  if (level === 1) return { bg: colors.successSubtle || 'rgba(40,167,69,0.12)', fg: colors.success || '#1e8a3a', label: 'positive' };
  if (level === 0) return { bg: colors.surfaceMuted || 'rgba(120,120,120,0.12)', fg: colors.textSecondary || '#666', label: 'neutral' };
  if (level === -1) return { bg: colors.warningSubtle || 'rgba(255,160,0,0.16)', fg: colors.warning || '#cc7a00', label: 'negative' };
  return { bg: colors.errorSubtle || 'rgba(220,53,69,0.16)', fg: colors.error || '#b32d3a', label: 'veryNegative' };
}

function SystemRow({ system, t, colors, tokens, dimmed }: { system: BodySystemImpact; t: any; colors: any; tokens: any; dimmed?: boolean }) {
  const styles = createStyles(tokens, colors);
  const badge = levelBadgeColor(system.level, colors);
  const name = t(`analysis.healthImpact.systems.${system.id}`) || system.id;
  const levelLabel = t(`analysis.healthImpact.levels.${badge.label}`);
  const focus = system.userFocus;

  return (
    <View style={[styles.row, dimmed && styles.rowDimmed]}>
      <View style={styles.rowHeader}>
        <View style={styles.rowTitleWrap}>
          <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
          {focus ? (
            <View style={styles.focusPill}>
              <Text style={styles.focusPillText}>{t('analysis.healthImpact.focusPill')}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.levelBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.levelBadgeText, { color: badge.fg }]}>{levelLabel}</Text>
        </View>
      </View>
      {system.summary ? (
        <Text style={styles.rowSummary} numberOfLines={2}>{system.summary}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (tokens: any, colors: any) => StyleSheet.create({
  card: {
    marginTop: tokens?.spacing?.lg ?? 16,
    marginHorizontal: tokens?.spacing?.lg ?? 16,
    overflow: 'hidden',
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text || '#111',
  },
  lockedTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text || '#111',
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary || '#666',
    marginTop: 4,
  },
  lockedSubtitle: {
    fontSize: 13,
    color: colors.textSecondary || '#666',
    marginTop: 4,
  },
  aiSummary: {
    fontSize: 14,
    color: colors.text || '#111',
    marginTop: 12,
    lineHeight: 20,
  },
  systemsList: {
    marginTop: 12,
  },
  blurContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  blurContent: {
    paddingVertical: 4,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border || colors.borderMuted || 'rgba(0,0,0,0.06)',
  },
  rowDimmed: {
    opacity: 0.55,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text || '#111',
  },
  focusPill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.primarySubtle || 'rgba(76,175,80,0.14)',
  },
  focusPillText: {
    fontSize: 11,
    color: colors.primary || '#3a9b3e',
    fontWeight: '600',
  },
  rowSummary: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary || '#666',
    lineHeight: 18,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unlockButton: {
    marginTop: 16,
    backgroundColor: colors.primary || '#4CAF50',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
