import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { useTooltip, TooltipIds } from '../Tooltip/TooltipContext';
import { HELP_VIDEOS } from '../../config/helpVideos';
import HelpVideoPlayer from '../help/HelpVideoPlayer';

type Props = {
  /** Number of meals the user has already analyzed — card auto-hides once > 0. */
  analyzedCount: number;
};

/**
 * Non-intrusive "Getting started" card shown at the top of the dashboard for
 * brand-new users. Tapping it opens a clean video demo of the meal-analysis
 * flow. It can be dismissed with the X (persisted) and auto-hides once the user
 * has analyzed their first meal. Permanent access stays in Profile → Help.
 */
// Darken a #RRGGBB color toward black by `amt` (0..1) for a subtle gradient.
function darken(hex: string, amt: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const f = Math.max(0, 1 - amt);
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * f);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * f);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * f);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

const GettingStartedCard: React.FC<Props> = ({ analyzedCount }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { shouldShowTooltip, dismissTooltip } = useTooltip();
  const [videoOpen, setVideoOpen] = useState(false);

  const visible = shouldShowTooltip(TooltipIds.GETTING_STARTED) && analyzedCount === 0;
  if (!visible) return null;

  const STEP_COUNT = 4;

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.cardBackground || colors.surface || '#FFF', borderColor: colors.border || '#E5E7EB' }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.welcome, { color: colors.textPrimary || colors.text }]}>
            {t('gettingStarted.welcome', 'Welcome! 👋')}
          </Text>
          <TouchableOpacity
            onPress={() => dismissTooltip(TooltipIds.GETTING_STARTED)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={t('common.close', 'Close')}
          >
            <Ionicons name="close" size={20} color={colors.textTertiary || '#9CA3AF'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={() => setVideoOpen(true)}>
          <LinearGradient
            colors={[colors.primary || '#4F46E5', darken(colors.primary || '#4F46E5', 0.2)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.thumb}
          >
            <View style={styles.playCircle}>
              <Ionicons name="play" size={26} color={colors.primary || '#4F46E5'} />
            </View>
            <Text style={styles.thumbTitle}>{t('gettingStarted.videoTitle', 'How to analyze a meal')}</Text>
            <Text style={styles.thumbDuration}>0:30</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
          {t('gettingStarted.tapHint', 'Tap to watch a quick demo')}
        </Text>
      </View>

      {/* Video demo modal */}
      <Modal visible={videoOpen} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={() => setVideoOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border || '#E5E7EB' }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary || colors.text }]}>
              {t('help.topics.mealAnalysis.title', 'Analyze a meal')}
            </Text>
            <TouchableOpacity onPress={() => setVideoOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <HelpVideoPlayer source={HELP_VIDEOS.mealAnalysis ?? null} colors={colors} t={t} />

            <View style={{ marginTop: 18 }}>
              {Array.from({ length: STEP_COUNT }).map((_, i) => {
                const n = i + 1;
                return (
                  <View key={n} style={styles.stepRow}>
                    <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumText}>{n}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.textPrimary || colors.text }]}>
                      {t(`help.topics.mealAnalysis.step${n}`, '')}
                    </Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.gotItBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setVideoOpen(false);
                dismissTooltip(TooltipIds.GETTING_STARTED);
              }}
            >
              <Text style={styles.gotItText}>{t('gettingStarted.gotIt', 'Got it')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  welcome: { fontSize: 16, fontWeight: '700' },
  thumb: {
    height: 150,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  thumbTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginTop: 12 },
  thumbDuration: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  tapHint: { fontSize: 13, textAlign: 'center', marginTop: 10 },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1 },
  stepNumText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  gotItBtn: { marginTop: 16, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  gotItText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default GettingStartedCard;
