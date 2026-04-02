const SMALL_WORDS = new Set(['and', 'with', 'of', 'in', 'on', 'the', '&', 'a', 'an', 'at', 'for']);

/**
 * Normalize food name: remove ALL CAPS, trim, apply casing, limit words.
 * Uses sentence case for Cyrillic text, title case for Latin.
 */
export function normalizeFoodName(raw: string, maxWords = 8): string {
  if (!raw) return '';

  let value = raw.trim();
  const isAllCaps = value === value.toUpperCase() && value.length > 1;

  // Convert ALL CAPS to lowercase
  if (isAllCaps) {
    value = value.toLowerCase();
  }

  // Clean up: remove extra spaces, parentheses
  value = value
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .trim();

  // Split and limit words
  const words = value.split(' ').slice(0, maxWords);

  // Detect Cyrillic text — use sentence case (only first letter capitalized)
  const hasCyrillic = /[а-яёА-ЯЁ]/.test(value);
  if (hasCyrillic) {
    return words
      .map((w, idx) => {
        if (!w) return w;
        if (idx === 0) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        // Preserve abbreviations (all-caps Cyrillic words)
        if (w.length > 1 && w === w.toUpperCase() && /^[А-ЯЁ]+$/.test(w)) return w;
        return w.toLowerCase();
      })
      .join(' ');
  }

  // Title case for Latin text: capitalize first letter, keep small words lowercase (except first word)
  const titled = words
    .map((w, idx) => {
      const lw = w.toLowerCase();
      if (idx > 0 && SMALL_WORDS.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(' ');

  return titled;
}

