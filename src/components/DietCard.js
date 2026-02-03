import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';
import { useDesignTokens } from '../contexts/ThemeContext';
import { getLocalizedText as getLocalizedTextShared } from './programs/types';

// Helper to extract localized string from object or return string directly
const getLocalizedText = (value, lang, t) => {
    return getLocalizedTextShared(value, lang, t);
};

const difficultyColors = {
    EASY: '#4CAF50',
    MODERATE: '#FF9800',
    HARD: '#F44336',
    // Fallbacks
    easy: '#4CAF50',
    moderate: '#FF9800',
    hard: '#F44336'
};

const getDifficultyLabel = (difficulty, t) => {
    const key = difficulty?.toUpperCase();
    switch (key) {
        case 'EASY': return t('diets_difficulty_easy') || 'Easy';
        case 'MODERATE': return t('diets_difficulty_moderate') || 'Moderate';
        case 'HARD': return t('diets_difficulty_hard') || 'Hard';
        default: return difficulty;
    }
};

const getTypeLabel = (type, t) => {
    const key = type?.toUpperCase();
    switch (key) {
        case 'LIFESTYLE': return t('diets_lifestyle') || 'Lifestyle';
        case 'HEALTH': return t('diets_health') || 'Health';
        case 'WEIGHT_LOSS': return t('diets_weight_loss') || 'Weight Loss';
        case 'MUSCLE_BUILDING': return t('diets_muscle_building') || 'Muscle Building';
        case 'ENERGY': return t('diets_energy') || 'Energy';
        default: return type;
    }
};

/**
 * DietCard - Card component for displaying diet in list
 */
export default function DietCard({ diet, onPress, isLocked = false }) {
    const { t, language } = useI18n();
    const tokens = useDesignTokens();

    const diffColor = difficultyColors[diet.difficulty] || difficultyColors[diet.difficulty?.toUpperCase()] || '#999';

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: tokens.colors?.surface || '#FFF' }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Image */}
            <View style={styles.imageContainer}>
                {diet.imageUrl ? (
                    <Image source={{ uri: diet.imageUrl }} style={[styles.image, isLocked && { opacity: 0.6 }]} />
                ) : (
                    <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: diet.color || '#4CAF50' }, isLocked && { opacity: 0.6 }]}>
                        <Ionicons name="restaurant" size={32} color="#FFF" />
                    </View>
                )}

                {/* Lock badge */}
                {isLocked && (
                    <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={24} color="#FFF" />
                    </View>
                )}

                {/* Featured badge */}
                {!isLocked && diet.isFeatured && (
                    <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={12} color="#FFF" />
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={[styles.content, isLocked && { opacity: 0.6 }]}>
                <Text style={[styles.name, { color: tokens.colors?.textPrimary || '#212121' }]} numberOfLines={1}>
                    {getLocalizedText(diet.name, language, t)}
                </Text>

                <Text style={[styles.description, { color: tokens.colors?.textSecondary || '#666' }]} numberOfLines={2}>
                    {getLocalizedText(diet.shortDescription, language, t) || getLocalizedText(diet.description, language, t)}
                </Text>

                {/* Tags row */}
                <View style={styles.tagsRow}>
                    {/* Type */}
                    <View style={[styles.tag, { backgroundColor: `${diet.color || '#4CAF50'}20` }]}>
                        <Text style={[styles.tagText, { color: diet.color || '#4CAF50' }]}>
                            {getTypeLabel(diet.type, t)}
                        </Text>
                    </View>

                    {/* Difficulty */}
                    <View style={[styles.tag, { backgroundColor: `${diffColor}20` }]}>
                        <Text style={[styles.tagText, { color: diffColor }]}>
                            {getDifficultyLabel(diet.difficulty, t)}
                        </Text>
                    </View>

                    {/* Duration */}
                    <View style={[styles.tag, { backgroundColor: tokens.colors?.surfaceSecondary || '#F0F0F0' }]}>
                        <Ionicons name="time-outline" size={12} color={tokens.colors?.textSecondary || '#666'} />
                        <Text style={[styles.tagText, { color: tokens.colors?.textSecondary || '#666', marginLeft: 4 }]}>
                            {diet.duration} {t('diets_days') || 'days'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Arrow or Lock */}
            <View style={styles.arrowContainer}>
                {isLocked ? (
                    <Ionicons name="lock-closed-outline" size={20} color={tokens.colors?.textTertiary || '#999'} />
                ) : (
                    <Ionicons name="chevron-forward" size={20} color={tokens.colors?.textTertiary || '#999'} />
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
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
    lockOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
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
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '500',
    },
    arrowContainer: {
        marginLeft: 8,
    },
});
