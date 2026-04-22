// @ts-nocheck
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
import MarketplaceService from '../services/marketplaceService';
import ApiService from '../services/apiService';
import DisclaimerModal from '../components/common/DisclaimerModal';
import { shouldShowDisclaimer } from '../legal/disclaimerUtils';

const LANGUAGE_LABELS = {
    en: 'English', ru: 'Русский', kk: 'Қазақша', fr: 'Français', de: 'Deutsch', es: 'Español',
};

const pickLocalized = (value: any, locale: string): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        return value[locale] || value.en || value.ru || Object.values(value).find(Boolean) || '';
    }
    return '';
};

export default function ExpertProfileScreen({ route, navigation }) {
    const { specialistId } = route.params || {};
    const { t, language } = useI18n();
    const themeContext = useTheme();
    const tokens = useDesignTokens();
    const colors = themeContext?.colors || {};

    const [expert, setExpert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);

    const loadExpert = useCallback(async () => {
        try {
            const response = await MarketplaceService.getExpert(specialistId);
            if (response) {
                setExpert(response);
            }
        } catch (error) {
            console.error('[ExpertProfileScreen] Failed to load:', error);
            Alert.alert(t('common.error') || 'Error', t('experts.load_error') || 'Failed to load expert profile');
        } finally {
            setLoading(false);
        }
    }, [specialistId, t]);

    useEffect(() => {
        loadExpert();
    }, [loadExpert]);

    const initChatRequest = async () => {
        const show = await shouldShowDisclaimer('data_sharing_consent');
        if (show) {
            setShowDisclaimer(true);
        } else {
            handleStartConversation();
        }
    };

    const handleDisclaimerAccept = () => {
        setShowDisclaimer(false);
        handleStartConversation();
    };

    const handleStartConversation = async () => {
        const expertIdToUse = expert?.id || specialistId;
        if (!expertIdToUse) {
            Alert.alert(t('common.error') || 'Error', t('experts.not_found') || 'Expert not found');
            return;
        }
        setRequesting(true);
        try {
            const conversation = await MarketplaceService.startConversation(expertIdToUse);
            if (conversation?.id) {
                navigation.navigate('Chat', { conversationId: conversation.id });
            }
        } catch (error) {
            console.error('[ExpertProfileScreen] Start conversation failed:', error);
            Alert.alert(
                t('common.error') || 'Error',
                t('experts.request_error') || 'Failed to start conversation'
            );
        } finally {
            setRequesting(false);
        }
    };

    const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer} edges={['top']}>
                <ActivityIndicator size="large" color={colors.primary || '#4CAF50'} />
            </SafeAreaView>
        );
    }

    if (!expert) {
        return (
            <SafeAreaView style={styles.errorContainer} edges={['top']}>
                <Text style={styles.errorText}>{t('experts.not_found') || 'Expert not found'}</Text>
                <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                    <Text style={styles.backLinkText}>{t('common.goBack') || 'Go back'}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const normalizedType = (expert.type || '').toLowerCase();
    const typeKey = normalizedType === 'dietitian' ? 'experts.typeDietitian' : 'experts.typeNutritionist';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary || '#212121'} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{expert.displayName}</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    {expert.avatarUrl ? (
                        <Image source={{ uri: ApiService.resolveMediaUrl(expert.avatarUrl) }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={48} color="#9CA3AF" />
                        </View>
                    )}

                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{expert.displayName}</Text>
                        {expert.isVerified && (
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={{ marginLeft: 6 }} />
                        )}
                    </View>

                    {expert.title && (
                        <Text style={styles.titleText}>{expert.title}</Text>
                    )}

                    <Text style={styles.typeText}>{t(typeKey) || expert.type}</Text>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="star" size={16} color="#FFC107" />
                            <Text style={styles.statValue}>{expert.rating?.toFixed(1) || '—'}</Text>
                            <Text style={styles.statLabel}>
                                ({expert.reviewCount || expert._count?.reviews || 0})
                            </Text>
                        </View>
                        {expert.experienceYears > 0 && (
                            <View style={styles.statItem}>
                                <Ionicons name="briefcase-outline" size={16} color={colors.textSecondary || '#6B7280'} />
                                <Text style={styles.statValue}>{expert.experienceYears}</Text>
                                <Text style={styles.statLabel}>{t('experts.yearsExp') || 'years'}</Text>
                            </View>
                        )}
                        {expert.consultationCount > 0 && (
                            <View style={styles.statItem}>
                                <Ionicons name="chatbubbles-outline" size={16} color={colors.textSecondary || '#6B7280'} />
                                <Text style={styles.statValue}>{expert.consultationCount}</Text>
                                <Text style={styles.statLabel}>{t('experts.consultations') || 'consultations'}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* About / Bio */}
                {expert.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.about') || 'About'}</Text>
                        <Text style={styles.bioText}>{expert.bio}</Text>
                    </View>
                )}

                {/* Education */}
                {expert.education && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.education') || 'Education'}</Text>
                        <Text style={styles.bioText}>{expert.education}</Text>
                    </View>
                )}

                {/* Specializations */}
                {expert.specializations?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.specializations') || 'Specializations'}</Text>
                        <View style={styles.chipsContainer}>
                            {expert.specializations.map((spec) => (
                                <View key={spec} style={styles.chip}>
                                    <Text style={styles.chipText}>
                                        {t(`experts.specializations.${spec}`) || spec}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Languages */}
                {expert.languages?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.languages') || 'Languages'}</Text>
                        <View style={styles.chipsContainer}>
                            {expert.languages.map((lang) => (
                                <View key={lang} style={[styles.chip, styles.langChip]}>
                                    <Text style={styles.chipText}>
                                        {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Credentials */}
                {expert.credentials?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.credentials') || 'Credentials'}</Text>
                        {expert.credentials.map((cred) => (
                            <View key={cred.id} style={styles.credentialCard}>
                                <Ionicons name="ribbon-outline" size={20} color={colors.primary || '#4CAF50'} />
                                <View style={styles.credentialInfo}>
                                    <Text style={styles.credentialName}>{cred.name}</Text>
                                    {cred.issuer && (
                                        <Text style={styles.credentialIssuer}>{cred.issuer}</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Offers */}
                {expert.offers?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('experts.services') || 'Services'}</Text>
                        {expert.offers.map((offer) => {
                            const offerName = pickLocalized(offer.name, language);
                            const offerDesc = pickLocalized(offer.description, language);
                            return (
                                <View key={offer.id} style={styles.offerCard}>
                                    <Text style={styles.offerName}>{offerName}</Text>
                                    {offerDesc && <Text style={styles.offerDesc}>{offerDesc}</Text>}
                                    <Text style={styles.offerPrice}>
                                        {offer.priceType === 'FREE' || offer.priceAmount == null
                                            ? (t('experts.free') || 'Free')
                                            : `${offer.currency || '$'}${offer.priceAmount}`}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Reviews */}
                {expert.reviews?.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t('experts.reviews') || 'Reviews'} ({expert.reviewCount || expert.reviews.length})
                        </Text>
                        {expert.reviews.map((review) => (
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
                                {review.client?.userProfile?.firstName && (
                                    <Text style={styles.reviewAuthor}>{review.client.userProfile.firstName}</Text>
                                )}
                                {review.comment && (
                                    <Text style={styles.reviewText}>{review.comment}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Spacer for bottom CTA */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomContainer}>
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
                                {t('experts.messageExpert') || 'Message Expert'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <DisclaimerModal
                disclaimerKey="data_sharing_consent"
                visible={showDisclaimer}
                onAccept={handleDisclaimerAccept}
                onCancel={() => setShowDisclaimer(false)}
            />
        </SafeAreaView>
    );
}

const createStyles = (tokens, colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#FAFAFA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background || '#FAFAFA',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background || '#FAFAFA',
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        color: colors.textSecondary || '#666',
        marginBottom: 16,
    },
    backLink: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    backLinkText: {
        fontSize: 15,
        color: colors.primary || '#4CAF50',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.surface || '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: colors.border || '#E0E0E0',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary || '#212121',
        textAlign: 'center',
    },
    headerPlaceholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingBottom: 16,
    },
    // Hero
    heroSection: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
        backgroundColor: colors.surface || '#FFF',
        marginBottom: 8,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
    },
    avatarPlaceholder: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary || '#212121',
    },
    titleText: {
        fontSize: 15,
        color: colors.textSecondary || '#6B7280',
        marginBottom: 4,
        textAlign: 'center',
    },
    typeText: {
        fontSize: 14,
        color: colors.primary || '#4CAF50',
        fontWeight: '500',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary || '#212121',
    },
    statLabel: {
        fontSize: 13,
        color: colors.textSecondary || '#6B7280',
    },
    // Sections
    section: {
        padding: 16,
        backgroundColor: colors.surface || '#FFF',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary || '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    bioText: {
        fontSize: 15,
        color: colors.textPrimary || '#374151',
        lineHeight: 22,
    },
    // Chips
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: (colors.primary || '#4CAF50') + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    langChip: {
        backgroundColor: colors.surfaceSecondary || '#F3F4F6',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textPrimary || '#374151',
    },
    // Credentials
    credentialCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.surfaceSecondary || '#F9FAFB',
        borderRadius: 10,
        marginBottom: 8,
    },
    credentialInfo: {
        marginLeft: 12,
        flex: 1,
    },
    credentialName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary || '#374151',
    },
    credentialIssuer: {
        fontSize: 13,
        color: colors.textSecondary || '#6B7280',
        marginTop: 2,
    },
    // Offers
    offerCard: {
        padding: 12,
        backgroundColor: colors.surfaceSecondary || '#F9FAFB',
        borderRadius: 10,
        marginBottom: 8,
    },
    offerName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary || '#374151',
    },
    offerDesc: {
        fontSize: 13,
        color: colors.textSecondary || '#6B7280',
        marginTop: 4,
    },
    offerPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary || '#4CAF50',
        marginTop: 6,
    },
    // Reviews
    reviewCard: {
        padding: 12,
        backgroundColor: colors.surfaceSecondary || '#F9FAFB',
        borderRadius: 10,
        marginBottom: 8,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    reviewRating: {
        flexDirection: 'row',
    },
    reviewDate: {
        fontSize: 12,
        color: colors.textSecondary || '#9CA3AF',
    },
    reviewAuthor: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary || '#6B7280',
        marginBottom: 4,
    },
    reviewText: {
        fontSize: 14,
        color: colors.textPrimary || '#374151',
        lineHeight: 20,
    },
    // Bottom CTA
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 24,
        backgroundColor: colors.surface || '#FFF',
        borderTopWidth: 1,
        borderTopColor: colors.border || '#E0E0E0',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary || '#4CAF50',
        paddingVertical: 16,
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
