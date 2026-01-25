import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import i18n, { getSupportedLocales, setAppLocale } from './config';
import { LANGUAGE_OPTIONS } from './languages';

export const useI18n = () => {
  // Хуки должны вызываться безусловно
  // Вызываем useTranslation всегда, без try-catch, так как хук не может быть условным
  const translation = useTranslation();

  const { t } = translation;

  const changeLanguage = useCallback(async (locale: string) => {
    try {
      await setAppLocale(locale);
    } catch (error) {
      console.warn('[useI18n] Failed to change language:', error);
    }
  }, []);

  // FIX: Enhanced t function that warns in dev mode when key is returned (missing translation)
  const safeT = useCallback((key: string, fallback?: string) => {
    const result = t ? t(key) : key;
    
    // FIX: In dev mode, warn if translation key is returned (indicates missing translation)
    if (__DEV__ && result === key && !fallback) {
      console.warn(`[useI18n] Missing translation for key: "${key}" in language: ${i18n?.language || 'en'}`);
    }
    
    // If result is the same as key (missing translation), use fallback if provided
    return result === key && fallback ? fallback : result;
  }, [t, i18n?.language]);

  return {
    t: t || ((key: string) => key),
    safeT, // Enhanced version with warnings
    language: i18n?.language || 'en',
    changeLanguage,
    availableLanguages: LANGUAGE_OPTIONS.filter(option =>
      getSupportedLocales().includes(option.code)
    ),
  } as const;
};
