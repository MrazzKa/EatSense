// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

export const ALLERGEN_KEYS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulfites',
  'lupin',
  'molluscs',
] as const;

export type AllergenKey = (typeof ALLERGEN_KEYS)[number];

interface Props {
  selected: string[];
  hasNone?: boolean;
  otherText?: string;
  onChange: (next: { selected: string[]; hasNone: boolean; otherText: string }) => void;
  showSubtitle?: boolean;
  compact?: boolean;
}

/**
 * Reusable allergies multi-select used in Profile and Onboarding.
 * Stores top-14 EU allergen IDs + an explicit "no allergies" flag + free-text.
 *
 * Wire format saved to user.preferences.allergies (string[]):
 *   - canonical IDs from ALLERGEN_KEYS
 *   - free-text tokens (lower-case, trimmed)
 *   - empty array iff hasNone === true
 */
export default function AllergiesSelector({
  selected,
  hasNone = false,
  otherText = '',
  onChange,
  showSubtitle = true,
  compact = false,
}: Props) {
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const [localOther, setLocalOther] = useState(otherText);

  const styles = useMemo(() => createStyles(tokens, colors, compact), [tokens, colors, compact]);

  const toggle = (key: AllergenKey) => {
    if (selected.includes(key)) {
      onChange({ selected: selected.filter((k) => k !== key), hasNone: false, otherText: localOther });
    } else {
      onChange({ selected: [...selected, key], hasNone: false, otherText: localOther });
    }
  };

  const toggleNone = () => {
    if (hasNone) {
      onChange({ selected, hasNone: false, otherText: localOther });
    } else {
      onChange({ selected: [], hasNone: true, otherText: '' });
      setLocalOther('');
    }
  };

  const handleOtherChange = (text: string) => {
    setLocalOther(text);
    onChange({ selected, hasNone: false, otherText: text });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('allergies.title')}</Text>
      {showSubtitle ? <Text style={styles.subtitle}>{t('allergies.subtitle')}</Text> : null}

      <TouchableOpacity
        style={[styles.noneRow, hasNone && styles.chipActive]}
        onPress={toggleNone}
        activeOpacity={0.85}
      >
        <Text style={[styles.noneText, hasNone && styles.chipActiveText]}>
          {t('allergies.none')}
        </Text>
      </TouchableOpacity>

      <View style={[styles.chipsWrap, hasNone && styles.disabled]} pointerEvents={hasNone ? 'none' : 'auto'}>
        {ALLERGEN_KEYS.map((key) => {
          const active = selected.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipActiveText]}>
                {t(`allergies.items.${key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.otherBlock, hasNone && styles.disabled]} pointerEvents={hasNone ? 'none' : 'auto'}>
        <Text style={styles.otherLabel}>{t('allergies.otherLabel')}</Text>
        <TextInput
          value={localOther}
          onChangeText={handleOtherChange}
          placeholder={t('allergies.otherPlaceholder')}
          placeholderTextColor={colors.textSecondary || '#888'}
          style={styles.otherInput}
          multiline
        />
      </View>
    </View>
  );
}

const createStyles = (tokens: any, colors: any, compact: boolean) =>
  StyleSheet.create({
    container: {
      paddingVertical: compact ? 8 : 12,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text || '#111',
    },
    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textSecondary || '#666',
      lineHeight: 18,
    },
    noneRow: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border || 'rgba(0,0,0,0.1)',
      backgroundColor: colors.surface || '#fff',
    },
    noneText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text || '#111',
    },
    chipsWrap: {
      marginTop: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border || 'rgba(0,0,0,0.1)',
      backgroundColor: colors.surface || '#fff',
      marginRight: 8,
      marginBottom: 8,
    },
    chipActive: {
      backgroundColor: colors.primary || '#4CAF50',
      borderColor: colors.primary || '#4CAF50',
    },
    chipText: {
      fontSize: 13,
      color: colors.text || '#111',
    },
    chipActiveText: {
      color: '#fff',
      fontWeight: '600',
    },
    disabled: {
      opacity: 0.4,
    },
    otherBlock: {
      marginTop: 12,
    },
    otherLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary || '#666',
      marginBottom: 6,
    },
    otherInput: {
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border || 'rgba(0,0,0,0.1)',
      backgroundColor: colors.surface || '#fff',
      color: colors.text || '#111',
      fontSize: 14,
    },
  });

/** Helper: split free-text "peanut, crab" into trimmed lower-case tokens. */
export function parseOtherText(input: string): string[] {
  return (input || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Helper: serialize selector state into a flat string[] for backend. */
export function serializeAllergies(state: {
  selected: string[];
  hasNone: boolean;
  otherText: string;
}): string[] {
  if (state.hasNone) return [];
  const others = parseOtherText(state.otherText);
  return [...new Set([...state.selected, ...others])];
}

/** Helper: decode flat backend string[] into selector state. */
export function deserializeAllergies(stored: string[] | undefined | null): {
  selected: string[];
  hasNone: boolean;
  otherText: string;
} {
  const arr = Array.isArray(stored) ? stored : [];
  const known = ALLERGEN_KEYS as readonly string[];
  const selected = arr.filter((a) => known.includes(a));
  const others = arr.filter((a) => !known.includes(a));
  return {
    selected,
    hasNone: false,
    otherText: others.join(', '),
  };
}
