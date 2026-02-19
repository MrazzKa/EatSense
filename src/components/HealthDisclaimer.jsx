import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { getDisclaimer } from '../legal/disclaimerUtils';
import { useNavigation } from '@react-navigation/native';

export default function HealthDisclaimer({ style }) {
    const { language, t } = useI18n();
    const { colors } = useTheme();
    const navigation = useNavigation();

    const disclaimerText = useMemo(() => {
        const data = getDisclaimer('analysis_results_footer', language);
        return data?.text || data?.content || '';
    }, [language]);

    if (!disclaimerText) return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '40' }, style]}>
            <Text style={[styles.text, { color: colors.warning }]}>
                {disclaimerText}
            </Text>
            <TouchableOpacity
                onPress={() => {
                    try {
                        navigation.navigate('ScientificSources');
                    } catch (e) { }
                }}
                activeOpacity={0.7}
                style={styles.linkContainer}
            >
                <Text style={[styles.linkText, { color: colors.warning }]}>
                    {t('citations.viewAllSources', 'View scientific sources & references')} →
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
        borderWidth: 1,
    },
    text: {
        fontSize: 12,
        lineHeight: 18,
    },
    linkContainer: {
        marginTop: 8,
    },
    linkText: {
        fontSize: 12,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
