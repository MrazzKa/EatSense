// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

// ISO 3166-1 alpha-2 + display name (English). Display names get localized
// via the `country.${code}` i18n key when available, otherwise fall back to
// the English name shipped here.
export const COUNTRY_OPTIONS: Array<{ code: string; name: string }> = [
  { code: 'RU', name: 'Russia' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'BY', name: 'Belarus' },
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'PL', name: 'Poland' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'GE', name: 'Georgia' },
  { code: 'AM', name: 'Armenia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'EE', name: 'Estonia' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'IL', name: 'Israel' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'OTHER', name: 'Other' },
];

export const SUPPORTED_COUNTRY_CODES = COUNTRY_OPTIONS
  .filter((country) => country.code !== 'OTHER')
  .map((country) => country.code);

export function normalizeSupportedCountryCode(input?: string | null): string | null {
  const code = (input || '').trim().toUpperCase();
  return SUPPORTED_COUNTRY_CODES.includes(code) ? code : null;
}

interface Props {
  value: string | null;
  onChange: (code: string) => void;
  label?: string;
}

export default function CountryPicker({ value, onChange, label }: Props) {
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const localizedName = (opt: { code: string; name: string }) => {
    const key = `country.${opt.code}`;
    const localized = t(key);
    if (localized && localized !== key) return localized;
    return opt.name;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((c) =>
      localizedName(c).toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q),
    );
  }, [search, t]);

  const selectedLabel = useMemo(() => {
    if (!value) return t('country.placeholder', 'Select country');
    const opt = COUNTRY_OPTIONS.find((c) => c.code === value);
    return opt ? localizedName(opt) : value;
  }, [value, t]);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={styles.field}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={[styles.fieldText, !value && styles.fieldTextPlaceholder]}>
          {selectedLabel}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('country.title', 'Select country')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('country.search', 'Search…')}
              placeholderTextColor={colors.textSecondary || '#888'}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, value === item.code && styles.rowActive]}
                onPress={() => {
                  onChange(item.code);
                  setModalVisible(false);
                  setSearch('');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.rowText}>{localizedName(item)}</Text>
                <Text style={styles.rowCode}>{item.code}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    container: { paddingVertical: 8 },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary || '#666',
      marginBottom: 6,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border || 'rgba(0,0,0,0.1)',
      borderRadius: 12,
      backgroundColor: colors.surface || '#fff',
    },
    fieldText: { fontSize: 15, color: colors.text || '#111' },
    fieldTextPlaceholder: { color: colors.textSecondary || '#888' },
    chevron: { fontSize: 22, color: colors.textSecondary || '#888' },
    modalSafe: { flex: 1, backgroundColor: colors.background || '#fff' },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border || 'rgba(0,0,0,0.1)',
    },
    modalTitle: { fontSize: 17, fontWeight: '600', color: colors.text || '#111' },
    closeButton: { padding: 6 },
    closeText: { fontSize: 18, color: colors.text || '#111' },
    searchWrap: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    searchInput: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border || 'rgba(0,0,0,0.1)',
      backgroundColor: colors.surface || '#fff',
      color: colors.text || '#111',
      fontSize: 15,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border || 'rgba(0,0,0,0.05)',
    },
    rowActive: { backgroundColor: colors.primarySubtle || 'rgba(76,175,80,0.10)' },
    rowText: { fontSize: 15, color: colors.text || '#111', flex: 1 },
    rowCode: { fontSize: 12, color: colors.textSecondary || '#888' },
  });
