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

  return {
    t: t || ((key: string) => key),
    language: i18n?.language || 'en',
    changeLanguage,
    availableLanguages: LANGUAGE_OPTIONS.filter(option =>
      getSupportedLocales().includes(option.code)
    ),
  } as const;
};
