import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

const SECTION_ORDER = [
  'collection',
  'usage',
  'protection',
  'sharing',
  'changes',
  'cookies',
  'children',
  'rights',
  'choices',
  'contact'
];

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const { colors, tokens } = useTheme();
  const { t } = useI18n();

  const styles = React.useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const sections = t('privacy.sections', { returnObjects: true });
  const hasSections = sections && typeof sections === 'object' && !Array.isArray(sections);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation && typeof navigation.goBack === 'function' ? navigation.goBack() : null}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('privacy.title') || 'Privacy Policy'}
        </Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator
      >
        <Text style={[styles.intro, { color: colors.textPrimary || colors.text }]}>
          {t('privacy.intro')}
        </Text>

        {hasSections ? (
          SECTION_ORDER.map((key) => {
            const section = sections[key];
            if (!section) return null;
            return (
              <View key={key} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary || colors.text }]}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionContent, { color: colors.textSecondary || colors.text }]}>
                  {section.content}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={[styles.content, { color: colors.textPrimary }]}>
            {/* Fallback if localization fails */}
            {t('privacy.intro')}
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            {t('privacy.lastUpdated')}: 2025-12-13
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (tokens, colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    intro: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 24,
      lineHeight: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
    },
    sectionContent: {
      fontSize: 15,
      lineHeight: 22,
    },
    content: {
      fontSize: 14,
      lineHeight: 22,
      fontFamily: 'System',
    },
    footer: {
      marginTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.borderMuted,
      paddingTop: 16,
    },
    footerText: {
      fontSize: 12,
      textAlign: 'center',
    }
  });
