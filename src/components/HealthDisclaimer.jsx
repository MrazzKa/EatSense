import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HealthDisclaimer({ style }) {
    return (
        <View style={[styles.container, style]}>
            <Text style={styles.text}>
                ⚠️ EatSense provides nutritional information for educational purposes only.
                This app is not a medical device and does not substitute for professional medical advice.
                Always consult a healthcare professional before making significant changes to your diet.
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
