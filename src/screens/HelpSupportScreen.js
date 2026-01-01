import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { PADDING, SPACING, BORDER_RADIUS, SHADOW } from '../utils/designConstants';

export default function HelpSupportScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const faqItems = [
    { id: 1, key: 'howToUse' },
    { id: 2, key: 'photoLimit' },
    { id: 3, key: 'saveMeal' },
    { id: 4, key: 'editResults' },
    { id: 5, key: 'aiAssistant' },
  ];

  const contactOptions = [
    {
      id: 1,
      title: 'Email Support',
      subtitle: 'support@eatsense.ch',
      icon: 'mail-outline',
      color: '#007AFF',
      onPress: () => Linking.openURL('mailto:support@eatsense.ch'),
    },
    {
      id: 2,
      title: t('help.feedbackTitle'),
      subtitle: t('help.feedbackSubtitle'),
      icon: 'chatbubble-outline',
      color: '#34C759',
      onPress: () => {
        Alert.alert(t('help.feedbackTitle'), t('help.feedbackAlert'));
      },
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation && typeof navigation.goBack === 'function' ? navigation.goBack() : null}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('help.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* FAQ Section */}
        <View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help.faqTitle')}</Text>
            {(faqItems || []).map((item) => (
              <View key={item.id}>
                <View style={[styles.faqCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>{t(`help.faq.${item.key}.question`)}</Text>
                  <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{t(`help.faq.${item.key}.answer`)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Section */}
        <View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('help.contactTitle')}</Text>
            {(contactOptions || []).map((option) => (
              <View key={option.id}>
                <TouchableOpacity
                  style={[styles.contactCard, { backgroundColor: colors.card }]}
                  onPress={() => option.onPress && typeof option.onPress === 'function' ? option.onPress() : null}
                >
                  <View style={[styles.contactIcon, { backgroundColor: `${option.color}15` }]}>
                    <Ionicons name={option.icon} size={24} color={option.color} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactTitle, { color: colors.text }]}>{option.title}</Text>
                    <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>{option.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING.screen,
    paddingVertical: PADDING.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerPlaceholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: PADDING.screen,
    paddingTop: PADDING.xl,
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: PADDING.lg,
  },
  faqCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: PADDING.lg,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: PADDING.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOW.sm,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: PADDING.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 14,
  },
});

