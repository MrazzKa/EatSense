import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';

import DisclaimerModal from '../components/common/DisclaimerModal';
import { shouldShowDisclaimer } from '../legal/disclaimerUtils';

/**
 * ExpertProfileScreen - Detailed view of a specialist
 */
export default function ExpertProfileScreen({ route, navigation }) {
    const { specialistId } = route.params;
    const { t } = useI18n();
    const themeContext = useTheme();
    const tokens = useDesignTokens();

    const [specialist, setSpecialist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);

    const loadSpecialist = useCallback(async () => {
        try {
            const response = await ApiService.getSpecialist(specialistId);
            if (response) {
                setSpecialist(response);
            }
        } catch (error) {
            console.error('[ExpertProfileScreen] Failed to load:', error);
            Alert.alert(t('common.error') || 'Error', t('experts.load_error') || 'Failed to load specialist');
        } finally {
            setLoading(false);
        }
    }, [specialistId, t]);

    useEffect(() => {
        loadSpecialist();
    }, [loadSpecialist]);

    const initChatRequest = async () => {
        // Check if we need to show disclaimer
        const show = await shouldShowDisclaimer('data_sharing_consent');
        if (show) {
            setShowDisclaimer(true);
        } else {
            handleRequestConsultation();
        }
    };

    const handleDisclaimerAccept = () => {
        setShowDisclaimer(false);
        handleRequestConsultation();
    };

    const handleRequestConsultation = async () => {
        setRequesting(true);
        try {
            const consultation = await ApiService.requestConsultation(specialistId);
            if (consultation?.id) {
                navigation.navigate('ConsultationChat', { consultationId: consultation.id });
            }
        } catch (error) {
            console.error('[ExpertProfileScreen] Request failed:', error);
            Alert.alert(
                t('common.error') || 'Error',
                t('experts.request_error') || 'Failed to request consultation'
            );
        } finally {
            setRequesting(false);
        }
    };

    const styles = useMemo(() => {
        const colors = themeContext?.colors || {};
        return createStyles(tokens, colors);
    }, [tokens, themeContext?.colors]);

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer} edges={['top']}>
                <ActivityIndicator size="large" color={tokens.colors?.primary || '#4CAF50'} />
            </SafeAreaView>
        );
    }

    if (!specialist) {
        return (
            <SafeAreaView style={styles.errorContainer} edges={['top']}>
                <Text style={styles.errorText}>{t('experts.not_found') || 'Specialist not found'}</Text>
            </SafeAreaView>
        );
    }

    const priceLabel = specialist.pricePerWeek === 0 || !specialist.pricePerWeek
        ? t('experts.free') || 'Free Consultation'
        : `${specialist.currency || '$'}${specialist.pricePerWeek}/${t('experts.week') || 'week'}`;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={tokens.colors?.textPrimary || '#212121'} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('experts.profile') || 'Profile'}</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Avatar & Basic Info */}
                <View style={styles.profileHeader}>
                    {specialist.avatarUrl ? (
                        <Image source={{ uri: specialist.avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={48} color="#9CA3AF" />
                        </View>
                    )}

                    <View style={styles.nameContainer}>
                        <Text style={styles.name}>{specialist.displayName}</Text>
                        {specialist.isVerified && (
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.verifiedIcon} />
                        )}
                    </View>

                    <Text style={styles.type}>
                        {specialist.type === 'dietitian'
                            ? t('experts.dietitian.title') || 'Dietitian'
                            : t('experts.nutritionist.title') || 'Nutritionist'}
                    </Text>

                    {/* Rating */}
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={18} color="#FFC107" />
                        <Text style={styles.rating}>{specialist.rating?.toFixed(1) || '5.0'}</Text>
                        <Text style={styles.reviewCount}>
                            ({specialist.reviewCount || 0} {t('experts.reviews') || 'reviews'})
                        </Text>
                    </View>
                </View>

                {/* Bio */}
                {specialist.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.about') || 'About'}</Text>
                        <Text style={styles.bioText}>{specialist.bio}</Text>
                    </View>
                )}

                {/* Credentials */}
                {specialist.credentials && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.credentials') || 'Credentials'}</Text>
                        <Text style={styles.credentialsText}>{specialist.credentials}</Text>
                    </View>
                )}

                {/* Languages */}
                {specialist.languages?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.languages') || 'Languages'}</Text>
                        <View style={styles.languagesContainer}>
                            {specialist.languages.map((lang, idx) => (
                                <View key={idx} style={styles.languageChip}>
                                    <Text style={styles.languageText}>{lang.toUpperCase()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Reviews */}
                {specialist.reviews?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.reviews') || 'Reviews'}</Text>
                        {specialist.reviews.slice(0, 3).map((review) => (
                            <View key={review.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewRating}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Ionicons
                                                key={star}
                                                name={star <= review.rating ? 'star' : 'star-outline'}
                                                size={14}
                                                color="#FFC107"
                                            />
                                        ))}
                                    </View>
                                    <Text style={styles.reviewDate}>
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                {review.comment && (
                                    <Text style={styles.reviewText}>{review.comment}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Spacer for button */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomContainer}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>{t('experts.consultation') || 'Consultation'}</Text>
                    <Text style={styles.priceValue}>{priceLabel}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.ctaButton, requesting && styles.ctaButtonDisabled]}
                    onPress={initChatRequest}
                    disabled={requesting}
                >
                    {requesting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="chatbubbles" size={20} color="#FFF" />
                            <Text style={styles.ctaButtonText}>
                                {t('experts.start_chat') || 'Start Chat'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
            {/* Disclaimer Modal */}
            <DisclaimerModal
                disclaimerKey="data_sharing_consent"
                visible={showDisclaimer}
                onAccept={handleDisclaimerAccept}
                onCancel={() => setShowDisclaimer(false)}
            />
        </SafeAreaView>
    );
}

const createStyles = (tokens, _colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors?.background || '#FAFAFA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: tokens.colors?.background || '#FAFAFA',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: tokens.colors?.background || '#FAFAFA',
    },
    errorText: {
        fontSize: 16,
        color: tokens.colors?.textSecondary || '#666',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: tokens.colors?.surface || '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: tokens.colors?.border || '#E0E0E0',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: tokens.colors?.textPrimary || '#212121',
    },
    headerPlaceholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 12,
    },
    avatarPlaceholder: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
        color: tokens.colors?.textPrimary || '#212121',
    },
    verifiedIcon: {
        marginLeft: 8,
    },
    type: {
        fontSize: 16,
        color: tokens.colors?.primary || '#4CAF50',
        fontWeight: '500',
        marginBottom: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        fontSize: 16,
        fontWeight: '600',
        color: tokens.colors?.textPrimary || '#212121',
        marginLeft: 4,
    },
    reviewCount: {
        fontSize: 14,
        color: tokens.colors?.textSecondary || '#6B7280',
        marginLeft: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: tokens.colors?.textSecondary || '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    bioText: {
        fontSize: 15,
        color: tokens.colors?.textPrimary || '#374151',
        lineHeight: 22,
    },
    credentialsText: {
        fontSize: 14,
        color: tokens.colors?.textSecondary || '#6B7280',
        lineHeight: 20,
    },
    languagesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    languageChip: {
        backgroundColor: tokens.colors?.surfaceSecondary || '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    languageText: {
        fontSize: 12,
        fontWeight: '600',
        color: tokens.colors?.textPrimary || '#374151',
    },
    reviewCard: {
        backgroundColor: tokens.colors?.surface || '#FFF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: tokens.colors?.border || '#E5E7EB',
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewRating: {
        flexDirection: 'row',
    },
    reviewDate: {
        fontSize: 12,
        color: tokens.colors?.textSecondary || '#9CA3AF',
    },
    reviewText: {
        fontSize: 14,
        color: tokens.colors?.textPrimary || '#374151',
        lineHeight: 20,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: tokens.colors?.surface || '#FFF',
        borderTopWidth: 1,
        borderTopColor: tokens.colors?.border || '#E0E0E0',
    },
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: tokens.colors?.textSecondary || '#6B7280',
    },
    priceValue: {
        fontSize: 18,
        fontWeight: '700',
        color: tokens.colors?.textPrimary || '#212121',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: tokens.colors?.primary || '#4CAF50',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    ctaButtonDisabled: {
        opacity: 0.6,
    },
    ctaButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
