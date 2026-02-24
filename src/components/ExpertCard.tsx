import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';

/**
 * ExpertCard - Displays specialist/expert info in a card
 */
export default function ExpertCard({ specialist, onPress }) {
    const { t } = useI18n();

    const typeLabel = specialist.type === 'dietitian'
        ? t('experts.dietitian.title') || 'Dietitian'
        : t('experts.nutritionist.title') || 'Nutritionist';

    const priceLabel = specialist.pricePerWeek === 0 || !specialist.pricePerWeek
        ? t('experts.free') || 'Free'
        : `${specialist.currency || '$'}${specialist.pricePerWeek}/week`;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                {specialist.avatarUrl ? (
                    <Image
                        source={{ uri: specialist.avatarUrl }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={28} color="#9CA3AF" />
                    </View>
                )}
                {specialist.isVerified && (
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    </View>
                )}
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                    {specialist.displayName}
                </Text>

                <View style={styles.typeContainer}>
                    <Text style={styles.type}>{typeLabel}</Text>
                    {specialist.languages?.length > 0 && (
                        <Text style={styles.languages}>
                            • {specialist.languages.slice(0, 3).join(', ')}
                        </Text>
                    )}
                </View>

                {specialist.bio && (
                    <Text style={styles.bio} numberOfLines={2}>
                        {specialist.bio}
                    </Text>
                )}

                <View style={styles.footer}>
                    {/* Rating */}
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color="#FFC107" />
                        <Text style={styles.rating}>
                            {specialist.rating?.toFixed(1) || '5.0'}
                        </Text>
                        <Text style={styles.reviewCount}>
                            ({specialist.reviewCount || 0})
                        </Text>
                    </View>

                    {/* Price */}
                    <View style={[
                        styles.priceBadge,
                        (!specialist.pricePerWeek || specialist.pricePerWeek === 0) && styles.freeBadge
                    ]}>
                        <Text style={[
                            styles.priceText,
                            (!specialist.pricePerWeek || specialist.pricePerWeek === 0) && styles.freeText
                        ]}>
                            {priceLabel}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    avatarPlaceholder: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#FFF',
        borderRadius: 10,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    type: {
        fontSize: 13,
        color: '#4CAF50',
        fontWeight: '500',
    },
    languages: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 4,
    },
    bio: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
        marginBottom: 6,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
        marginLeft: 4,
    },
    reviewCount: {
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 2,
    },
    priceBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    freeBadge: {
        backgroundColor: '#DEF7EC',
    },
    priceText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    freeText: {
        color: '#047857',
    },
});
