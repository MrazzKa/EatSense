/**
 * Pluralization utility for Russian and other languages
 * Handles complex Russian pluralization rules (1 день, 2 дня, 5 дней)
 */

/**
 * Get the correct Russian plural form
 * @param n - number to pluralize
 * @param forms - array of 3 forms: [singular, few, many] (e.g., ['день', 'дня', 'дней'])
 * @returns correct plural form
 */
export function pluralizeRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  // 11-14 always use "many" form
  if (mod100 >= 11 && mod100 <= 14) {
    return forms[2];
  }

  // 1, 21, 31, etc. use singular
  if (mod10 === 1) {
    return forms[0];
  }

  // 2-4, 22-24, 32-34, etc. use "few" form
  if (mod10 >= 2 && mod10 <= 4) {
    return forms[1];
  }

  // Everything else uses "many" form
  return forms[2];
}

/**
 * Get pluralized days string for a given language
 */
export function getDaysText(n: number, language: string): string {
  if (language === 'ru') {
    return `${n} ${pluralizeRu(n, ['день', 'дня', 'дней'])}`;
  }
  if (language === 'kk') {
    // Kazakh doesn't have complex pluralization
    return `${n} күн`;
  }
  if (language === 'fr') {
    return n === 1 ? `${n} jour` : `${n} jours`;
  }
  // English and default
  return n === 1 ? `${n} day` : `${n} days`;
}

/**
 * Get pluralized "days in a row" / "дней подряд" text
 */
export function getStreakDaysText(n: number, language: string): string {
  if (language === 'ru') {
    return `${n} ${pluralizeRu(n, ['день', 'дня', 'дней'])} подряд`;
  }
  if (language === 'kk') {
    return `${n} күн қатарынан`;
  }
  if (language === 'fr') {
    return n === 1 ? `${n} jour de suite` : `${n} jours de suite`;
  }
  // English and default
  return n === 1 ? `${n} day streak` : `${n} days streak`;
}

/**
 * Get pluralized "days left" text
 */
export function getDaysLeftText(n: number, language: string): string {
  if (language === 'ru') {
    return `Осталось ${n} ${pluralizeRu(n, ['день', 'дня', 'дней'])}`;
  }
  if (language === 'kk') {
    return `${n} күн қалды`;
  }
  if (language === 'fr') {
    return n === 1 ? `${n} jour restant` : `${n} jours restants`;
  }
  // English and default
  return n === 1 ? `${n} day left` : `${n} days left`;
}

export default {
  pluralizeRu,
  getDaysText,
  getStreakDaysText,
  getDaysLeftText,
};
