/**
 * STEP 6: Normalize Localized Food Names
 * Ensures consistent casing across all food names
 */

/**
 * Normalize food name for consistent casing in UI
 * 
 * Rules:
 * - RU: Sentence case ("Куриная грудка на гриле")
 * - KK: Sentence case ("Тауық етінің грильденген")
 * - EN: Title Case ("Grilled Chicken Breast")
 * 
 * @param locale 'en' | 'ru' | 'kk'
 * @param name Food name to normalize
 * @returns Normalized name with proper casing
 */
export function normalizeLocalizedFoodName(locale: 'en' | 'ru' | 'kk', name: string): string {
    if (!name || typeof name !== 'string') {
        return name || '';
    }

    const trimmed = name.trim();
    if (!trimmed) return '';

    // For Russian and Kazakh: Sentence case (first letter uppercase, rest lowercase)
    // Exception: preserve all-caps abbreviations (ККБЖУ, etc.)
    if (locale === 'ru' || locale === 'kk') {
        // Sentence case: capitalize first letter, lowercase the rest
        // But preserve existing capitalization patterns within words (like "McDonald's")
        const words = trimmed.split(' ');
        const normalized = words.map((word, index) => {
            // Skip empty words
            if (!word) return word;

            // Check if word is all uppercase (abbreviation) - preserve it
            if (word.length > 1 && word === word.toUpperCase() && /^[A-ZА-ЯЁ]+$/.test(word)) {
                return word;
            }

            // First word: capitalize first letter
            if (index === 0) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }

            // Other words: lowercase (sentence case)
            return word.toLowerCase();
        });

        return normalized.join(' ');
    }

    // For English: Title Case (capitalize first letter of each word)
    // Exception: common small words like "with", "and", "of", "the"
    const smallWords = new Set(['with', 'and', 'of', 'the', 'a', 'an', 'or', 'for', 'on', 'in', 'to']);

    const words = trimmed.split(' ');
    const normalized = words.map((word, index) => {
        if (!word) return word;

        const lowerWord = word.toLowerCase();

        // First word is always capitalized
        if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }

        // Small words stay lowercase (except first word)
        if (smallWords.has(lowerWord)) {
            return lowerWord;
        }

        // Title Case for other words
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    return normalized.join(' ');
}

/**
 * Clean "and more" suffix and apply normalization
 */
export function cleanAndNormalizeFoodName(locale: 'en' | 'ru' | 'kk', name: string): string {
    if (!name) return '';

    // Remove "and more" suffixes (safety net - should be removed at source)
    const cleanedName = name
        .replace(/\s+(and more|& more|и другое|және басқалары)$/i, '')
        .trim();

    return normalizeLocalizedFoodName(locale, cleanedName);
}
