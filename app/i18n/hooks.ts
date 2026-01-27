import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from './config';

export const useI18n = () => {
  // Хуки должны вызываться безусловно
  // Вызываем useTranslation всегда, без try-catch, так как хук не может быть условным
  const translation = useTranslation();

  const { t } = translation;

  // FIX: Language switching disabled - language is auto-detected from device
  const changeLanguage = useCallback(async (_locale: string) => {
    // No-op: Language cannot be changed manually
    console.warn('[useI18n] changeLanguage called but language switching is disabled. Language is auto-detected from device.');
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
  }, [t]);

  return {
    t: t || ((key: string) => key),
    safeT, // Enhanced version with warnings
    language: i18n?.language || 'en',
    changeLanguage, // No-op - language switching disabled
    // FIX: availableLanguages removed - language is auto-detected and cannot be changed
    availableLanguages: [], // Empty array - language switching is disabled
  } as const;
};
