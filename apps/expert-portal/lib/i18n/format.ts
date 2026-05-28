import type { Locale } from './messages';

/** Map our 2-letter app locales to BCP-47 tags for Intl date/time formatting. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  kk: 'kk-KZ',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
};

export function localeTag(locale: Locale): string {
  return LOCALE_TAGS[locale] || 'en-US';
}

export function formatDate(
  date: Date | string | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(localeTag(locale), options);
}

export function formatDateTime(
  date: Date | string | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(localeTag(locale), options);
}

/** Localized short weekday names indexed 0=Sunday .. 6=Saturday. */
export function weekdayShortNames(locale: Locale): string[] {
  const fmt = new Intl.DateTimeFormat(localeTag(locale), { weekday: 'short' });
  // 2023-01-01 is a Sunday (UTC). Build Sun..Sat from there.
  return [0, 1, 2, 3, 4, 5, 6].map((d) => {
    const date = new Date(Date.UTC(2023, 0, 1 + d));
    return fmt.format(date);
  });
}
