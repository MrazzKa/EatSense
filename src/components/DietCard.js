import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';
import { useDesignTokens } from '../contexts/ThemeContext';

// Helper to extract localized string from object or return string directly
const getLocalizedText = (value, lang) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        return value[lang] || value['en'] || value[Object.keys(value)[0]] || '';
    }
    return String(value);
};

/**
 * DietCard - Card component for displaying diet in list
 */
export default function DietCard({ diet, onPress }) {
    const { t, language } = useI18n();
    const tokens = useDesignTokens();

    const difficultyColors = {
        EASY: '#4CAF50',
        MODERATE: '#FF9800',
        HARD: '#F44336',
    };

    const difficultyLabels = {
        EASY: t('diets.easy') || 'Easy',
        MODERATE: t('diets.moderate') || 'Moderate',
        HARD: t('diets.hard') || 'Hard',
    };

    const typeLabels = {
        WEIGHT_LOSS: t('diets.weight_loss') || 'Weight Loss',
        WEIGHT_GAIN: t('diets.weight_gain') || 'Weight Gain',
        HEALTH: t('diets.health') || 'Health',
        MEDICAL: t('diets.medical') || 'Medical',
        LIFESTYLE: t('diets.lifestyle') || 'Lifestyle',
        SPORTS: t('diets.sports') || 'Sports',
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: tokens.colors?.surface || '#FFF' }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Image */}
            <View style={styles.imageContainer}>
                {diet.imageUrl ? (
                    <Image source={{ uri: diet.imageUrl }} style={styles.image} />
                ) : (
                    <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: diet.color || '#4CAF50' }]}>
                        <Ionicons name="restaurant" size={32} color="#FFF" />
                    </View>
                )}

                {/* Featured badge */}
                {diet.isFeatured && (
                    <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={12} color="#FFF" />
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={[styles.name, { color: tokens.colors?.textPrimary || '#212121' }]} numberOfLines={1}>
                    {getLocalizedText(diet.name, language)}
                </Text>

                <Text style={[styles.description, { color: tokens.colors?.textSecondary || '#666' }]} numberOfLines={2}>
                    {getLocalizedText(diet.shortDescription, language) || getLocalizedText(diet.description, language)}
                </Text>

                {/* Tags row */}
                <View style={styles.tagsRow}>
                    {/* Type */}
                    <View style={[styles.tag, { backgroundColor: `${diet.color || '#4CAF50'}20` }]}>
                        <Text style={[styles.tagText, { color: diet.color || '#4CAF50' }]}>
                            {typeLabels[diet.type] || diet.type}
                        </Text>
                    </View>

                    {/* Difficulty */}
                    <View style={[styles.tag, { backgroundColor: `${difficultyColors[diet.difficulty]}20` }]}>
                        <Text style={[styles.tagText, { color: difficultyColors[diet.difficulty] }]}>
                            {difficultyLabels[diet.difficulty] || diet.difficulty}
                        </Text>
                    </View>

                    {/* Duration */}
                    <View style={[styles.tag, { backgroundColor: tokens.colors?.surfaceSecondary || '#F0F0F0' }]}>
                        <Ionicons name="time-outline" size={12} color={tokens.colors?.textSecondary || '#666'} />
                        <Text style={[styles.tagText, { color: tokens.colors?.textSecondary || '#666', marginLeft: 4 }]}>
                            {diet.duration} {t('diets.days') || 'days'}
                        </Text>
                    </View>
                </View>

                {/* Disclaimer badge for historical/inspired diets */}
                {diet.disclaimerKey && (
                    <View style={styles.disclaimerBadge}>
                        <Ionicons name="information-circle-outline" size={12} color="#795548" />
                        <Text style={styles.disclaimerBadgeText}>
                            {diet.disclaimerKey === 'DISCLAIMER_HISTORICAL'
                                ? (t('diets.disclaimers.historical_short') || 'Historical')
                                : diet.disclaimerKey === 'DISCLAIMER_PUBLIC_FIGURE'
                                    ? (t('diets.disclaimers.public_figure_short') || 'Inspired')
                                    : diet.disclaimerKey === 'DISCLAIMER_MEDICAL'
                                        ? (t('diets.disclaimers.medical_short') || 'Medical')
                                        : ''}
                        </Text>
                    </View>
                )}

                {/* Rating */}
                {diet.averageRating > 0 && (
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#FFC107" />
                        <Text style={styles.rating}>{diet.averageRating.toFixed(1)}</Text>
                        <Text style={styles.ratingCount}>({diet.ratingCount || 0})</Text>
                        <Text style={styles.userCount}>
                            • {diet.userCount || 0} {t('diets.users') || 'users'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={20} color={tokens.colors?.textTertiary || '#999'} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    imageContainer: {
        position: 'relative',
        marginRight: 12,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    featuredBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#FFC107',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '500',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
        marginLeft: 4,
    },
    ratingCount: {
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 2,
    },
    userCount: {
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 4,
    },
    disclaimerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F0E6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginBottom: 6,
        alignSelf: 'flex-start',
        gap: 4,
    },
    disclaimerBadgeText: {
        fontSize: 10,
        color: '#795548',
        fontWeight: '500',
    },
});
