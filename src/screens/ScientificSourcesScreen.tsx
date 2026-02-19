import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { getDisclaimer } from '../legal/disclaimerUtils';

interface Reference {
  title: string;
  authors?: string;
  journal?: string;
  doi?: string;
}

interface Section {
  titleKey: string;
  description?: string;
  references: Reference[];
}

const SECTIONS: Section[] = [
  {
    titleKey: 'citations.sectionCalculations',
    references: [
      {
        title: 'Obesity: Preventing and Managing the Global Epidemic',
        authors: 'World Health Organization',
        journal: 'WHO Technical Report Series 894, 2000',
        doi: 'https://doi.org/10.1016/S0140-6736(03)15268-3',
      },
      {
        title: 'A new predictive equation for resting energy expenditure in healthy individuals',
        authors: 'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO',
        journal: 'Am J Clin Nutr 1990;51(2):241-247',
        doi: 'https://doi.org/10.1093/ajcn/51.2.241',
      },
      {
        title: '2011 Compendium of Physical Activities: A Second Update of Codes and MET Values',
        authors: 'Ainsworth BE, Haskell WL, Herrmann SD, et al.',
        journal: 'Med Sci Sports Exerc 2011;43(8):1575-1581',
        doi: 'https://doi.org/10.1249/MSS.0b013e31821ece12',
      },
      {
        title: 'Experiments on the Metabolism of Matter and Energy in the Human Body',
        authors: 'Atwater WO, Benedict FG',
        journal: 'USDA Office of Experiment Stations, Bulletin 136, 1902',
      },
    ],
  },
  {
    titleKey: 'citations.sectionHealthScore',
    references: [
      {
        title: 'Diet, Nutrition and the Prevention of Chronic Diseases',
        authors: 'WHO/FAO Expert Consultation',
        journal: 'WHO Technical Report Series 916, 2003',
        doi: 'https://doi.org/10.1079/PHN2004666',
      },
      {
        title: 'Guideline: Sugars Intake for Adults and Children',
        authors: 'World Health Organization',
        journal: 'WHO Guidelines, 2015',
      },
      {
        title: 'Saturated Fatty Acid and Trans-fatty Acid Intake for Adults and Children',
        authors: 'World Health Organization',
        journal: 'WHO Guidelines, 2023',
      },
    ],
  },
  {
    titleKey: 'citations.sectionDietPrograms',
    references: [
      {
        title: 'Primary Prevention of Cardiovascular Disease with a Mediterranean Diet Supplemented with Extra-Virgin Olive Oil or Nuts (PREDIMED)',
        authors: 'Estruch R, Ros E, Salas-Salvadó J, et al.',
        journal: 'N Engl J Med 2018;378(25):e34',
        doi: 'https://doi.org/10.1056/NEJMoa1800389',
      },
      {
        title: 'A Clinical Trial of the Effects of Dietary Patterns on Blood Pressure (DASH)',
        authors: 'Appel LJ, Moore TJ, Obarzanek E, et al.',
        journal: 'N Engl J Med 1997;336(16):1117-1124',
        doi: 'https://doi.org/10.1056/NEJM199704173361601',
      },
      {
        title: 'Effects of Intermittent Fasting on Health, Aging, and Disease',
        authors: 'de Cabo R, Mattson MP',
        journal: 'N Engl J Med 2019;381(26):2541-2551',
        doi: 'https://doi.org/10.1056/NEJMra1905136',
      },
      {
        title: 'Caloric Restriction, the Traditional Okinawan Diet, and Healthy Aging',
        authors: 'Willcox BJ, Willcox DC, Todoriki H, et al.',
        journal: 'Ann N Y Acad Sci 2007;1114:434-455',
        doi: 'https://doi.org/10.1196/annals.1396.037',
      },
      {
        title: 'Carbohydrate Restriction has a More Favorable Impact on the Metabolic Syndrome than a Low Fat Diet',
        authors: 'Volek JS, Phinney SD, Forsythe CE, et al.',
        journal: 'Lipids 2009;44(4):297-309',
        doi: 'https://doi.org/10.1007/s11745-008-3274-2',
      },
    ],
  },
];

export default function ScientificSourcesScreen() {
  const navigation = useNavigation();
  const { colors, tokens } = useTheme();
  const { t, language } = useI18n();

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const disclaimerText = useMemo(() => {
    const data = getDisclaimer('general_health_disclaimer', language);
    return data?.content || data?.text || '';
  }, [language]);

  const openDOI = (doi: string) => {
    Linking.openURL(doi).catch(() => { });
  };

  const renderReference = (ref: Reference, index: number) => (
    <View key={index} style={styles.referenceItem}>
      <Text style={[styles.referenceTitle, { color: colors.textPrimary }]}>
        {ref.title}
      </Text>
      {ref.authors && (
        <Text style={[styles.referenceAuthors, { color: colors.textSecondary }]}>
          {ref.authors}
        </Text>
      )}
      {ref.journal && (
        <Text style={[styles.referenceJournal, { color: colors.textTertiary }]}>
          {ref.journal}
        </Text>
      )}
      {ref.doi && (
        <TouchableOpacity onPress={() => openDOI(ref.doi!)} activeOpacity={0.7}>
          <Text style={[styles.referenceDoi, { color: colors.primary }]}>
            {ref.doi}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {t('citations.screenTitle', 'Scientific Sources & References')}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Health Score Methodology */}
        <View style={[styles.methodologyCard, { backgroundColor: colors.surface, borderColor: colors.borderMuted }]}>
          <Ionicons name="flask-outline" size={20} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.methodologyText, { color: colors.textSecondary }]}>
            {t('citations.healthScoreMethodology')}
          </Text>
        </View>

        {SECTIONS.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t(section.titleKey)}
            </Text>
            <View style={[styles.referencesCard, { backgroundColor: colors.surface, borderColor: colors.borderMuted }]}>
              {section.references.map((ref, refIndex) => (
                <React.Fragment key={refIndex}>
                  {refIndex > 0 && (
                    <View style={[styles.divider, { backgroundColor: colors.borderMuted }]} />
                  )}
                  {renderReference(ref, refIndex)}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* General Disclaimer */}
        {disclaimerText ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('citations.sectionDisclaimer', 'General Disclaimer')}
            </Text>
            <View style={[styles.disclaimerCard, { backgroundColor: colors.warningTint, borderColor: colors.warning + '40' }]}>
              <Text style={[styles.disclaimerText, { color: colors.warning }]}>
                {disclaimerText}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, _colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
    },
    content: {
      padding: 16,
    },
    methodologyCard: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 24,
    },
    methodologyText: {
      fontSize: 13,
      lineHeight: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
    },
    referencesCard: {
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    referenceItem: {
      padding: 14,
    },
    referenceTitle: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      marginBottom: 4,
    },
    referenceAuthors: {
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 2,
    },
    referenceJournal: {
      fontSize: 12,
      lineHeight: 18,
      fontStyle: 'italic',
      marginBottom: 2,
    },
    referenceDoi: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 2,
    },
    divider: {
      height: 1,
      marginHorizontal: 14,
    },
    disclaimerCard: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    disclaimerText: {
      fontSize: 12,
      lineHeight: 18,
      color: undefined, // Set dynamically via inline style
    },
  });
