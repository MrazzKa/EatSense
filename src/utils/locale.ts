export type AppLocale = 'en' | 'ru' | 'kk' | 'fr';

/**
 * Map i18n language codes (e.g. 'en', 'en-US', 'ru-RU', 'kk-KZ', 'fr-FR') to backend locales.
 */
export const mapLanguageToLocale = (lng?: string | null): AppLocale => {
  if (!lng) return 'en';
  const lower = lng.toLowerCase();
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('kk') || lower.startsWith('kz')) return 'kk';
  if (lower.startsWith('fr')) return 'fr';
  return 'en';
};


