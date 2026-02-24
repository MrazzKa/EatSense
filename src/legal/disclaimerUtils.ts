import AsyncStorage from '@react-native-async-storage/async-storage';
import disclaimers from './disclaimers.json';

const DISCLAIMER_STORAGE_PREFIX = 'disclaimer_agreed_';

/**
 * Gets the disclaimer content for a specific key and locale.
 * @param {string} key - The disclaimer key (e.g., 'ai_assistant')
 * @param {string} locale - The user's locale (e.g., 'en', 'ru')
 * @returns {object|null} The disclaimer object {title, content, checkbox, ...} or null if not found
 */
export const getDisclaimer = (key, locale = 'en') => {
    const disclaimer = disclaimers[key];
    if (!disclaimer) return null;

    // Fallback to English if exact locale not found
    const localKey = locale.split('-')[0];
    const content = disclaimer[localKey] || disclaimer['en'];

    return {
        ...content,
        _meta: {
            requires_checkbox: disclaimer.requires_checkbox,
            show_once: disclaimer.show_once,
            version: disclaimers._meta.version
        }
    };
};

/**
 * Checks if a disclaimer should be shown to the user.
 * @param {string} key - The disclaimer key
 * @returns {Promise<boolean>} True if should show, False otherwise
 */
export const shouldShowDisclaimer = async (key) => {
    const disclaimer = disclaimers[key];
    if (!disclaimer) return false;

    // If explicitly not show_once (always show), return true unless it's handled elsewhere
    // But generally "show_once: false" means it might be a static text (handled by component)
    // or a modal that shows every time (handled here).
    // Assuming "show_once: false" + modal = show every time.
    if (!disclaimer.show_once) return true;

    try {
        const version = disclaimers._meta.version;
        const storageKey = `${DISCLAIMER_STORAGE_PREFIX}${key}_v${version}`;
        const agreed = await AsyncStorage.getItem(storageKey);
        return agreed !== 'true';
    } catch (error) {
        console.warn('[DisclaimerUtils] Error checking status', error);
        return true; // Fail safe: show disclaimer
    }
};

/**
 * Marks a disclaimer as viewed/accepted.
 * @param {string} key - The disclaimer key
 * @returns {Promise<void>}
 */
export const markDisclaimerViewed = async (key) => {
    try {
        const version = disclaimers._meta.version;
        const storageKey = `${DISCLAIMER_STORAGE_PREFIX}${key}_v${version}`;
        await AsyncStorage.setItem(storageKey, 'true');
    } catch (error) {
        console.warn('[DisclaimerUtils] Error saving status', error);
    }
};
