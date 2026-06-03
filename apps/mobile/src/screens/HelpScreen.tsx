import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { HELP_VIDEOS } from '../config/helpVideos';
import HelpVideoPlayer from '../components/help/HelpVideoPlayer';
import { ENABLE_PHARMACY } from '../config/pharmacy';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Topic = { id: string; icon: keyof typeof Ionicons.glyphMap; steps: number };

// How-to topics. `steps` = number of step keys (help.topics.<id>.step1..stepN).
const TOPICS: Topic[] = [
  { id: 'mealAnalysis', icon: 'camera-outline', steps: 4 },
  { id: 'medications', icon: 'medkit-outline', steps: 3 },
  { id: 'experts', icon: 'people-outline', steps: 3 },
  // Pharmacy guide hidden while the pharmacy feature is gated off.
  ...(ENABLE_PHARMACY ? [{ id: 'pharmacy', icon: 'storefront-outline' as const, steps: 3 }] : []),
];

const HelpScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useI18n();
  // First topic open by default so the screen never looks empty.
  const [expanded, setExpanded] = useState<string | null>('mealAnalysis');

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((cur) => (cur === id ? null : id));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border || '#E5E7EB' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('help.title', 'Help & guides')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('help.subtitle', 'Short guides to get the most out of EatSense.')}
        </Text>

        {TOPICS.map((topic) => {
          const isOpen = expanded === topic.id;
          return (
            <View
              key={topic.id}
              style={[styles.card, { backgroundColor: colors.cardBackground || colors.surface || '#F9FAFB', borderColor: colors.border || '#E5E7EB' }]}
            >
              <TouchableOpacity style={styles.cardHeader} onPress={() => toggle(topic.id)} activeOpacity={0.7}>
                <View style={[styles.cardIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={topic.icon} size={20} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>
                  {t(`help.topics.${topic.id}.title`, topic.id)}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textTertiary || '#9CA3AF'}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.cardBody}>
                  <HelpVideoPlayer source={HELP_VIDEOS[topic.id] ?? null} colors={colors} t={t} />

                  <View style={styles.steps}>
                    {Array.from({ length: topic.steps }).map((_, i) => {
                      const n = i + 1;
                      return (
                        <View key={n} style={styles.stepRow}>
                          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                            <Text style={styles.stepNumText}>{n}</Text>
                          </View>
                          <Text style={[styles.stepText, { color: colors.textPrimary || colors.text }]}>
                            {t(`help.topics.${topic.id}.step${n}`, '')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          {t('help.footer', 'Need more help? Contact us from Profile → Support.')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  cardIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 16 },
  steps: { marginTop: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1,
  },
  stepNumText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  footer: { fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});

export default HelpScreen;
