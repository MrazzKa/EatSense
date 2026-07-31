/**
 * Backend locales. Must stay in sync with `SupportedLocale` on the API
 * (apps/api/food/fridge.service.ts and the analysis pipeline), which accepts
 * all six languages the app ships.
 */
export type AppLocale = 'en' | 'ru' | 'kk' | 'fr' | 'de' | 'es';

/**
 * Map i18n language codes (e.g. 'en', 'en-US', 'ru-RU', 'kk-KZ', 'fr-FR', 'de-DE',
 * 'es-ES') to backend locales.
 *
 * NOTE: 'de' and 'es' used to be missing here, so German and Spanish users silently
 * fell through to English — their food analyses, recipes and AI answers came back
 * in the wrong language even though the UI was translated.
 */
export const mapLanguageToLocale = (lng?: string | null): AppLocale => {
  if (!lng) return 'en';
  const lower = lng.toLowerCase();
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('kk') || lower.startsWith('kz')) return 'kk';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('es')) return 'es';
  return 'en';
};
