import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import ru from './locales/ru.json';
import kk from './locales/kk.json';
import es from './locales/es.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

// FIX: Removed language storage - language is now auto-detected from device and cannot be changed
// const STORAGE_KEY = '@eatsense:language'; // No longer used

// Безопасная нормализация ENV переменных
const DEFAULT_FALLBACK = String(process.env.EXPO_PUBLIC_DEFAULT_LOCALE || 'en').trim() || 'en';

const SUPPORTED_LOCALES_RAW = String(
  process.env.EXPO_PUBLIC_SUPPORTED_LOCALES || 'en,ru,kk,es,de,fr,ko,ja,zh',
).trim();
const SUPPORTED_LOCALES = SUPPORTED_LOCALES_RAW
  .split(',')
  .map(locale => locale.trim())
  .filter(Boolean);

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  kk: { translation: kk },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  ko: { translation: ko },
  ja: { translation: ja },
  zh: { translation: zh },
} as const;

const resolveSupportedLocale = (candidate?: string) => {
  if (!candidate) {
    return DEFAULT_FALLBACK;
  }

  const normalized = candidate.toLowerCase();
  if (SUPPORTED_LOCALES.includes(normalized)) {
    return normalized;
  }

  // Try matching base language from locales like "en-US"
  const base = normalized.split('-')[0];
  if (SUPPORTED_LOCALES.includes(base)) {
    return base;
  }

  return DEFAULT_FALLBACK;
};

const detectDeviceLocale = () => {
  try {
    const locales = getLocales();
    if (Array.isArray(locales) && locales.length > 0) {
      return resolveSupportedLocale(locales[0]?.languageCode || locales[0]?.languageTag);
    }
  } catch (error) {
    console.warn('[i18n] Failed to detect device locale:', error);
  }

  return DEFAULT_FALLBACK;
};

let initializationPromise: Promise<void> | null = null;

const initializeI18next = () => {
  if (!initializationPromise) {
    initializationPromise = i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: detectDeviceLocale(),
        fallbackLng: DEFAULT_FALLBACK,
        supportedLngs: SUPPORTED_LOCALES,
        compatibilityJSON: 'v3',
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
        // Log missing keys in dev mode
        missingKeyHandler: __DEV__ ? (lng, ns, key) => {
          console.warn(`[i18n] Missing translation key: "${key}" for language: ${lng}`);
        } : undefined,
        saveMissing: false, // Don't save missing keys to backend
      })
      .then(() => { });
  }

  return initializationPromise;
};

export const getCurrentLocale = () => i18n.language;

export const getSupportedLocales = () => [...SUPPORTED_LOCALES];

// FIX: Removed loadStoredLocale - language is now auto-detected from device
// Language cannot be changed manually
export const loadStoredLocale = async () => {
  // Always return null - language is determined by device locale only
  return null;
};

// FIX: setAppLocale is now a no-op - language cannot be changed manually
// Language is determined automatically from device settings
export const setAppLocale = async (_locale: string) => {
  // No-op: Language is auto-detected and cannot be changed
  console.warn('[i18n] setAppLocale called but language switching is disabled. Language is auto-detected from device.');
};

export const ensureI18nReady = async () => {
  // FIX: Initialize i18n with device locale - language is auto-detected and cannot be changed
  await initializeI18next();

  // Language is determined automatically from device settings
  // No stored language preference - always use device locale
  const deviceLocale = detectDeviceLocale();
  if (i18n.language !== deviceLocale) {
    await i18n.changeLanguage(deviceLocale);
  }
};

export default i18n;
