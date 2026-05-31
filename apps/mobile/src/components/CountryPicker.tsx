// @ts-nocheck
import React, { useCallback, useMemo, useState } from 'react';
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
import * as Localization from 'expo-localization';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

const ISO_COUNTRY_CODES = [
  'CH', 'KZ', 'RU', 'US', 'DE', 'FR', 'ES', 'IT', 'GB', 'PL', 'TR',
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
  'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO',
  'GA', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
];

const englishRegionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

export const COUNTRY_OPTIONS: Array<{ code: string; name: string }> = ISO_COUNTRY_CODES.map((code) => ({
  code,
  name: englishRegionNames?.of(code) || code,
}));

export const SUPPORTED_COUNTRY_CODES = COUNTRY_OPTIONS.map((country) => country.code);

export function normalizeSupportedCountryCode(input?: string | null): string | null {
  const code = (input || '').trim().toUpperCase();
  return SUPPORTED_COUNTRY_CODES.includes(code) ? code : null;
}

interface Props {
  value: string | null;
  onChange: (_code: string) => void;
  label?: string;
}

export default function CountryPicker({ value, onChange, label }: Props) {
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const localizedName = useCallback((opt: { code: string; name: string }) => {
    const key = `country.${opt.code}`;
    const localized = t(key);
    if (localized && localized !== key) return localized;
    try {
      const locale = new Intl.DisplayNames(undefined, { type: 'region' });
      return locale.of(opt.code) || opt.name;
    } catch {
      return opt.name;
    }
  }, [t]);

  // Pin the user's detected region and CH (pilot HQ) at the top of the list
  // so the most likely choices are one tap away. Falls back gracefully if
  // the locale module is unavailable.
  const orderedOptions = useMemo(() => {
    let detected: string | null = null;
    try {
      detected = normalizeSupportedCountryCode(Localization.getLocales()?.[0]?.regionCode || null);
    } catch {
      detected = null;
    }
    const pinned: string[] = [];
    if (detected) pinned.push(detected);
    if (!pinned.includes('CH')) pinned.push('CH');
    const pinnedSet = new Set(pinned);
    const rest = COUNTRY_OPTIONS.filter((c) => !pinnedSet.has(c.code));
    const head = pinned
      .map((code) => COUNTRY_OPTIONS.find((c) => c.code === code))
      .filter(Boolean) as Array<{ code: string; name: string }>;
    return [...head, ...rest];
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedOptions;
    return orderedOptions.filter((c) =>
      localizedName(c).toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q),
    );
  }, [localizedName, orderedOptions, search]);

  const selectedLabel = useMemo(() => {
    if (!value) return t('country.placeholder', 'Select country');
    const opt = COUNTRY_OPTIONS.find((c) => c.code === value);
    return opt ? localizedName(opt) : value;
  }, [localizedName, t, value]);

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
