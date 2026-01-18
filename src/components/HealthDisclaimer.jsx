import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../app/i18n/hooks';
import { getDisclaimer } from '../legal/disclaimerUtils';

export default function HealthDisclaimer({ style }) {
    const { language } = useI18n();

    const disclaimerText = useMemo(() => {
        const data = getDisclaimer('analysis_results_footer', language);
        return data?.text || data?.content || '';
    }, [language]);

    if (!disclaimerText) return null;

    return (
        <View style={[styles.container, style]}>
            <Text style={styles.text}>
                {disclaimerText}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 12,
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    text: {
        fontSize: 12,
        color: '#E65100',
        lineHeight: 18,
    },
});
