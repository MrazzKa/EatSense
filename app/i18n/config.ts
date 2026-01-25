import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const STORAGE_KEY = '@eatsense:language';

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

export const loadStoredLocale = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      return resolveSupportedLocale(saved);
    }
  } catch (error) {
    console.warn('[i18n] Failed to read stored locale:', error);
  }
  return null;
};

export const setAppLocale = async (locale: string) => {
  const target = resolveSupportedLocale(locale);
  await initializeI18next();
  if (i18n.language !== target) {
    await i18n.changeLanguage(target);
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEY, target);
  } catch (error) {
    console.warn('[i18n] Failed to persist locale:', error);
  }
};

export const ensureI18nReady = async () => {
  // FIX: Initialize i18n first (fast - just sets up resources)
  await initializeI18next();

  // FIX: Load stored locale in parallel with language change (non-blocking)
  // Use Promise.race to prevent slow AsyncStorage from blocking
  const [saved] = await Promise.race([
    Promise.all([loadStoredLocale()]),
    new Promise(resolve => setTimeout(() => resolve([null]), 50)), // Max 50ms wait for AsyncStorage
  ]).catch(() => [null]);
  
  const initial = saved || detectDeviceLocale();
  if (i18n.language !== initial) {
    await i18n.changeLanguage(initial);
  }
};

export default i18n;
