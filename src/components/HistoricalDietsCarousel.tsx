import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';
// FIX: Use shared getLocalizedText for consistency and fr support
import { getLocalizedText as getLocalizedTextShared } from './programs/types';

interface Diet {
    id: string;
    name: any; // Can be string or localized object
    subtitle?: any;
    shortDescription?: any;
    duration: number;
    color?: string;
}

interface HistoricalDietsCarouselProps {
    diets: Diet[];
    onDietPress: (_dietId: string) => void;
}

/**
 * HistoricalDietsCarousel - A visually distinct carousel for historical/inspired diets
 * Features warm sepia tones and a fun, vintage aesthetic
 */
export default function HistoricalDietsCarousel({ diets, onDietPress }: HistoricalDietsCarouselProps) {
    const { t, language } = useI18n();

    // Helper to extract localized text - use shared implementation
    const getLocalizedText = (value: any, t?: (key: string) => string): string => {
        return getLocalizedTextShared(value, language, t);
    };

    if (!diets || diets.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Ionicons name="time" size={24} color="#795548" />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.title}>
                        {t('diets_historical_section_title') || 'Historical & Inspired'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {t('diets_historical_section_subtitle') || 'Fun diets inspired by history and culture'}
                    </Text>
                </View>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
                <Ionicons name="information-circle-outline" size={16} color="#8D6E63" />
                <Text style={styles.disclaimerText}>
                    {t('diets_historical_section_disclaimer_banner') || 'These are approximations for fun, not medical recommendations'}
                </Text>
            </View>

            {/* Carousel */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
            >
                {diets.map((diet, index) => (
                    <TouchableOpacity
                        key={diet.id}
                        style={[
                            styles.card,
                            { backgroundColor: diet.color || VINTAGE_COLORS[index % VINTAGE_COLORS.length] }
                        ]}
                        onPress={() => onDietPress(diet.id)}
                        activeOpacity={0.85}
                    >
                        {/* Decorative Icon */}
                        <View style={styles.cardIconContainer}>
                            <Ionicons
                                name={getVintageIcon(index)}
                                size={28}
                                color="rgba(255,255,255,0.85)"
                            />
                        </View>

                        {/* Content */}
                        <Text style={styles.cardName} numberOfLines={2}>
                            {getLocalizedText(diet.name, t)}
                        </Text>

                        {diet.subtitle && (
                            <Text style={styles.cardSubtitle} numberOfLines={1}>
                                {getLocalizedText(diet.subtitle, t)}
                            </Text>
                        )}

                        <Text style={styles.cardDesc} numberOfLines={2}>
                            {getLocalizedText(diet.shortDescription, t)}
                        </Text>

                        {/* Duration Badge */}
                        <View style={styles.durationBadge}>
                            <Ionicons name="calendar-outline" size={12} color="#FFF" />
                            <Text style={styles.durationText}>
                                {diet.duration} {t('diets_days') || 'days'}
                            </Text>
                        </View>

                        {/* Vintage Pattern Overlay */}
                        <View style={styles.patternOverlay} />
                    </TouchableOpacity >
                ))
                }
            </ScrollView >
        </View >
    );
}

// Vintage color palette
const VINTAGE_COLORS = [
    '#795548', // Brown
    '#6D4C41', // Dark Brown
    '#8D6E63', // Light Brown
    '#5D4037', // Deep Brown
    '#A1887F', // Warm Taupe
    '#4E342E', // Espresso
];

// Get vintage-themed icons
const getVintageIcon = (index: number): any => {
    const icons = ['leaf', 'nutrition', 'cafe', 'wine', 'fish', 'pizza'];
    return icons[index % icons.length];
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F5F0E6',
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 20,
        padding: 16,
        // Subtle shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(121, 85, 72, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        marginLeft: 12,
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#4E342E',
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 13,
        color: '#8D6E63',
        marginTop: 2,
    },
    disclaimer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(141, 110, 99, 0.12)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 14,
        gap: 8,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 12,
        color: '#6D4C41',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    carouselContent: {
        paddingRight: 8,
    },
    card: {
        width: 170,
        height: 180,
        borderRadius: 16,
        padding: 14,
        marginRight: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    cardIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    cardSubtitle: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 11,
        marginTop: 2,
        fontStyle: 'italic',
    },
    cardDesc: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        marginTop: 6,
        lineHeight: 16,
    },
    durationBadge: {
        position: 'absolute',
        bottom: 12,
        left: 14,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    durationText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
    },
    patternOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 60,
        height: 60,
        borderBottomLeftRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
});

