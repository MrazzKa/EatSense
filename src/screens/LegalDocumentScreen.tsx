import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import type { LegalDocumentType } from '../legal/legalContent';
import { legalDocuments } from '../legal/legalContent';

type RootStackParamList = {
  LegalDocument: { type: LegalDocumentType };
};

type LegalRouteProp = RouteProp<RootStackParamList, 'LegalDocument'>;

export const LegalDocumentScreen: React.FC = () => {
  const route = useRoute<LegalRouteProp>();
  const navigation = useNavigation();
  const { t, language } = useI18n();
  const { colors } = useTheme();

  const type: LegalDocumentType = route.params?.type ?? 'privacy';

  const lang =
    language?.startsWith('ru') ? 'ru' : language?.startsWith('kk') ? 'kk' : 'en';

  const doc =
    legalDocuments[type]?.[lang as 'en' | 'ru' | 'kk'] ??
    legalDocuments[type].en;

  React.useLayoutEffect(() => {
    navigation.setOptions?.({
      headerTitle:
        type === 'privacy'
          ? t('legal.privacyTitle') || 'Privacy Policy'
          : t('legal.termsTitle') || 'Terms of Use',
    });
  }, [navigation, t, type]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator
      >
        <Text
          style={[
            styles.bodyText,
            { color: colors.textPrimary || colors.text },
          ]}
        >
          {doc}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default LegalDocumentScreen;


