import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import { HELP_VIDEOS } from '../../config/helpVideos';
import HelpVideoPlayer from '../help/HelpVideoPlayer';

type Props = {
  visible: boolean;
  /** Called when the user skips or taps the primary CTA. Should persist "seen". */
  onClose: () => void;
};

// Darken a #RRGGBB color toward black by `amt` (0..1) for a subtle gradient.
function darken(hex: string, amt: number): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex || '#4F46E5';
  const f = Math.max(0, 1 - amt);
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * f);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * f);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * f);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

const FEATURES: Array<{ icon: any; key: string }> = [
  { icon: 'camera', key: 'analysis' },
  { icon: 'sparkles', key: 'recommendations' },
  { icon: 'chatbubbles', key: 'assistant' },
];

/**
 * Full-screen welcome shown exactly once to brand-new users. Replaces the old
 * inline GettingStartedCard (which flickered for returning users and sat awkwardly
 * at the top of the dashboard). Appears with a smooth fade + slide, has a clear
 * Skip, and a primary CTA. Permanent access to the demo stays in Profile → Help.
 */
const WelcomeOverlay: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const primary = colors.primary || '#4F46E5';

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      slide.setValue(0);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fade, slide]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            opacity: fade,
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
          },
        ]}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.skip, { color: colors.textSecondary || '#9CA3AF' }]}>
                {t('welcomeOverlay.skip', 'Skip')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('welcomeOverlay.title', 'Welcome to EatSense 👋')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary || '#6B7280' }]}>
              {t('welcomeOverlay.subtitle', 'Snap your meal — get instant nutrition insights.')}
            </Text>

            {/* Demo video hero */}
            <View style={styles.heroWrap}>
              <HelpVideoPlayer source={HELP_VIDEOS.mealAnalysis ?? null} colors={colors} t={t} />
            </View>

            {/* Value props */}
            <View style={{ marginTop: 20 }}>
              {FEATURES.map((f) => (
                <View key={f.key} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: primary + '18' }]}>
                    <Ionicons name={f.icon} size={20} color={primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureTitle, { color: colors.text }]}>
                      {t(`welcomeOverlay.features.${f.key}.title`, '')}
                    </Text>
                    <Text style={[styles.featureDesc, { color: colors.textSecondary || '#6B7280' }]}>
                      {t(`welcomeOverlay.features.${f.key}.desc`, '')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Primary CTA */}
          <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.9}>
              <LinearGradient
                colors={[primary, darken(primary, 0.18)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Ionicons name="camera" size={20} color="#FFF" />
                <Text style={styles.ctaText}>{t('welcomeOverlay.cta', 'Start now')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  skip: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 21, paddingHorizontal: 8 },
  heroWrap: { marginTop: 22, borderRadius: 16, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  featureTitle: { fontSize: 15, fontWeight: '700' },
  featureDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 16 },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default WelcomeOverlay;
