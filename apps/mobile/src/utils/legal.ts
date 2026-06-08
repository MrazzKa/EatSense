import { Linking, Alert } from 'react-native';

export const LEGAL_URLS = {
    privacy: 'https://eatsense.ch/privacy',
    terms: 'https://eatsense.ch/terms',
    support: 'https://eatsense.ch/support',
    about: 'https://eatsense.ch/',
};

export const openLegalLink = async (type) => {
    const url = LEGAL_URLS[type];
    if (!url) {
        console.warn(`Unknown legal link type: ${type}`);
        return;
    }

    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', `Cannot open URL: ${url}`);
        }
    } catch (error) {
        console.error('Failed to open legal URL:', error);
        Alert.alert('Error', 'Could not open the link.');
    }
};
