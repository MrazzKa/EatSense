import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo } from 'react-native';
import { LANGUAGE_OPTIONS, type LanguageOption } from '../../app/i18n/languages';
import { useTheme } from '../contexts/ThemeContext';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (_languageCode: string) => void | Promise<void>;
  languages?: LanguageOption[];
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  languages = LANGUAGE_OPTIONS,
}) => {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  const handlePress = async (code: string) => {
    if (code === selectedLanguage) {
      return;
    }
    if (onLanguageChange && typeof onLanguageChange === 'function') {
      await onLanguageChange(code);
    }
    if (AccessibilityInfo.announceForAccessibility && typeof AccessibilityInfo.announceForAccessibility === 'function') {
      AccessibilityInfo.announceForAccessibility(code);
    }
  };

  // Prioritize EN, RU, KK - show them first
  const sortedLanguages = React.useMemo(() => {
    const priority = ['en', 'ru', 'kk'];
    const priorityLangs = (languages || []).filter(l => priority.includes(l.code));
    const otherLangs = (languages || []).filter(l => !priority.includes(l.code));
    return [...priorityLangs, ...otherLangs];
  }, [languages]);

  return (
    <View style={styles.wrapper}>
      {sortedLanguages.map((language) => {
        const isActive = language.code === selectedLanguage;
        return (
          <TouchableOpacity
            key={language.code}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => handlePress(language.code)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${language.label} (${language.nativeLabel})`}
          >
            <Text style={styles.flag}>{language.flag}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {language.code.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const createStyles = (tokens: any) =>
  StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: tokens.spacing.sm,
      rowGap: tokens.spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.xs,
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radii.pill,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      backgroundColor: tokens.colors.surface,
      flexShrink: 0,
    },
    chipActive: {
      backgroundColor: tokens.states.primary.base,
      borderColor: tokens.states.primary.border || tokens.states.primary.base,
    },
    flag: {
      fontSize: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    labelActive: {
      color: tokens.states.primary.on,
    },
  });
