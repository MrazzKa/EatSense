/**
 * Lifestyle Share Service
 * Handles sharing lifestyle choices via text or image
 */

import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const APP_DOWNLOAD_LINK = 'https://eatsense.me/download';

export interface ShareLifestyleOptions {
    name: string;
    imageUrl?: string;
    language?: 'en' | 'ru' | 'kk' | 'fr';
}

/**
 * Get localized share text template
 */
function getShareText(name: string, language: string = 'ru'): string {
    const templates: Record<string, string> = {
        en: `🌟 I chose the "${name}" lifestyle ✨\n\nWhat about you? Discover your style in EatSense!\n\n📲 Download: ${APP_DOWNLOAD_LINK}`,
        ru: `🌟 Я выбрала lifestyle «${name}» ✨\n\nА ты кто? Узнай свой стиль в EatSense!\n\n📲 Скачать: ${APP_DOWNLOAD_LINK}`,
        kk: `🌟 Мен "${name}" өмір салтын таңдадым ✨\n\nАл сен ше? EatSense-те өз стиліңді тап!\n\n📲 Жүктеу: ${APP_DOWNLOAD_LINK}`,
        fr: `🌟 J'ai choisi le lifestyle "${name}" ✨\n\nEt vous ? Découvrez votre style dans EatSense!\n\n📲 Télécharger: ${APP_DOWNLOAD_LINK}`,
    };
    return templates[language] || templates.ru;
}

/**
 * Share lifestyle as text message
 */
export async function shareLifestyleAsText(options: ShareLifestyleOptions): Promise<boolean> {
    try {
        const message = getShareText(options.name, options.language);

        const result = await Share.share({
            message,
            title: options.name,
        });

        return result.action === Share.sharedAction;
    } catch (error) {
        console.error('[LifestyleShare] Text share error:', error);
        return false;
    }
}

/**
 * Share lifestyle with image
 * Downloads the lifestyle's image and shares it
 */
export async function shareLifestyleWithImage(
    options: ShareLifestyleOptions
): Promise<boolean> {
    try {
        // If we have an image URL, download and share it
        if (options.imageUrl) {
            const fileName = `lifestyle_${Date.now()}.jpg`;
            const filePath = `${FileSystem.cacheDirectory}${fileName}`;

            const downloadResult = await FileSystem.downloadAsync(options.imageUrl, filePath);

            if (downloadResult.status === 200) {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        dialogTitle: options.name,
                        mimeType: 'image/jpeg',
                    });
                    return true;
                }
            }
        }

        // Fallback: text share
        return shareLifestyleAsText(options);
    } catch (error) {
        console.error('[LifestyleShare] Image share error:', error);
        // Fallback to text share on error
        return shareLifestyleAsText(options);
    }
}

/**
 * Show share options (text or image)
 * On iOS: Uses native share sheet
 * On Android: Uses share intent
 */
export async function shareLifestyle(
    options: ShareLifestyleOptions,
    preferImage: boolean = false
): Promise<boolean> {
    if (preferImage && options.imageUrl) {
        return shareLifestyleWithImage(options);
    }
    return shareLifestyleAsText(options);
}

export default {
    shareAsText: shareLifestyleAsText,
    shareWithImage: shareLifestyleWithImage,
    share: shareLifestyle,
};
