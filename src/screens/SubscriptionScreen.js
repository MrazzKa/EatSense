import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';

/**
 * SubscriptionScreen - Shows available subscription plans with multi-currency support
 */
export default function SubscriptionScreen() {
    const navigation = useNavigation();
    const { t } = useI18n();
    const themeContext = useTheme();
    const tokens = useDesignTokens();

    const [plans, setPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    // Currency is stored for future use with IAP pricing
    const [, setCurrency] = useState({ code: 'USD', symbol: '$' });
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showStudentPlans, setShowStudentPlans] = useState(false); // Toggle for student plans visibility

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const response = await ApiService.getSubscriptionPlans();
            if (response?.plans) {
                setPlans(response.plans);
                // Select yearly plan by default (usually best value)
                const yearlyPlan = response.plans.find(p => p.name === 'yearly');
                if (yearlyPlan) {
                    setSelectedPlanId(yearlyPlan.id);
                } else if (response.plans.length > 0) {
                    setSelectedPlanId(response.plans[0].id);
                }

                if (response.currency) {
                    setCurrency(response.currency);
                }
            }
        } catch (error) {
            console.error('[SubscriptionScreen] Failed to load plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedPlanId || purchasing) return;

        setPurchasing(true);
        try {
            const plan = plans.find(p => p.id === selectedPlanId);
            if (!plan) {
                throw new Error('Plan not found');
            }

            // TODO: Integrate with react-native-iap for actual purchases
            // For now, verify purchase with backend
            const result = await ApiService.verifyPurchase({
                planId: selectedPlanId,
                platform: Platform.OS,
                // transactionId: from IAP
            });

            if (result?.success) {
                navigation.navigate('MainTabs', { screen: 'Dashboard' });
            }
        } catch (error) {
            console.error('[SubscriptionScreen] Purchase failed:', error);
        } finally {
            setPurchasing(false);
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

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={tokens.colors?.textPrimary || '#212121'} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('subscription.title') || 'Premium'}</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* Subtitle */}
            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.subtitle}>
                    {t('subscription.subtitle') || 'Unlock all features and enjoy unlimited access'}
                </Text>

                {/* Free Plan Card */}
                <View style={styles.freePlanSection}>
                    <View style={[styles.freePlanCard, { borderColor: tokens.colors?.border || '#E0E0E0' }]}>
                        <View style={styles.freePlanHeader}>
                            <View style={[styles.freePlanIconContainer, { backgroundColor: (tokens.colors?.primary || '#4CAF50') + '15' }]}>
                                <Ionicons name="gift-outline" size={20} color={tokens.colors?.primary || '#4CAF50'} />
                            </View>
                            <View style={styles.freePlanInfo}>
                                <Text style={[styles.freePlanTitle, { color: tokens.colors?.textPrimary || '#212121' }]}>
                                    {t('subscription.freePlan') || 'Free Plan'}
                                </Text>
                                <Text style={[styles.freePlanSubtitle, { color: tokens.colors?.textSecondary || '#666' }]}>
                                    {t('subscription.freePlanIncluded') || 'Currently active'}
                                </Text>
                            </View>
                            <View style={[styles.freePlanBadge, { backgroundColor: (tokens.colors?.success || '#4CAF50') + '20' }]}>
                                <Text style={[styles.freePlanBadgeText, { color: tokens.colors?.success || '#4CAF50' }]}>
                                    {t('subscription.free') || 'Free'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.freePlanFeatures}>
                            <View style={styles.freePlanFeatureRow}>
                                <Ionicons name="checkmark-circle" size={16} color={tokens.colors?.success || '#4CAF50'} />
                                <Text style={[styles.freePlanFeatureText, { color: tokens.colors?.textSecondary || '#666' }]}>
                                    {t('subscription.freeFeature1') || '5 analyses per day'}
                                </Text>
                            </View>
                            <View style={styles.freePlanFeatureRow}>
                                <Ionicons name="checkmark-circle" size={16} color={tokens.colors?.success || '#4CAF50'} />
                                <Text style={[styles.freePlanFeatureText, { color: tokens.colors?.textSecondary || '#666' }]}>
                                    {t('subscription.freeFeature2') || 'Basic nutrition tracking'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Premium Plans */}
                <Text style={[styles.premiumSectionTitle, { color: tokens.colors?.textPrimary || '#212121' }]}>
                    {t('subscription.upgradeToPremium') || 'Upgrade to Premium'}
                </Text>

                {/* Plans List - Compact design like onboarding - Filter out student plans initially */}
                <View style={styles.plansContainer}>
                    {plans.filter(plan => plan.name !== 'student').map((plan) => {
                        const isStudent = plan.name === 'student';
                        const isPopular = plan.name === 'yearly';
                        const isSelected = selectedPlanId === plan.id;
                        // Use plan specific features if available, otherwise generic ones for recurring plans
                        const features = plan.features || [
                            t('subscription.feature_unlimited_analyses') || 'Unlimited food analysis',
                            t('subscription.feature_detailed_reports') || 'Detailed nutrition reports',
                            t('subscription.feature_ai_chat') || 'AI Nutrition Assistant'
                        ];

                        // Get badge text
                        const badgeText = isPopular
                            ? (t('subscription.most_popular') || 'BEST VALUE')
                            : null;

                        return (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planButtonCompact,
                                    isPopular && styles.planButtonPopular,
                                    isSelected && styles.planButtonSelected,
                                    isStudent && styles.planButtonStudent,
                                ]}
                                activeOpacity={0.9}
                                onPress={() => {
                                    if (isStudent) {
                                        setShowStudentModal(true);
                                    } else {
                                        setSelectedPlanId(plan.id);
                                        handlePurchase();
                                    }
                                }}
                                disabled={purchasing}
                            >
                                {/* Badge */}
                                {badgeText && (
                                    <View style={[
                                        styles.popularBadgeCompact,
                                        isStudent && styles.studentBadge,
                                    ]}>
                                        <Text style={styles.popularTextCompact}>{badgeText}</Text>
                                    </View>
                                )}

                                {/* Content */}
                                <View style={styles.planCompactContent}>
                                    <View style={styles.planCompactLeft}>
                                        {/* Radio Circle */}
                                        <View style={[
                                            styles.radioCircle,
                                            isSelected && styles.radioCircleSelected,
                                        ]}>
                                            {isSelected && <View style={styles.radioCircleInner} />}
                                        </View>

                                        {/* Plan Info */}
                                        <View style={styles.planCompactInfo}>
                                            <Text style={[
                                                styles.planNameCompact,
                                                isSelected && styles.planNameSelected,
                                                { color: tokens.colors?.textPrimary || '#212121' }
                                            ]}>
                                                {t(`subscription.plan_${plan.name}`) || plan.name}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.planHeadlineCompact,
                                                    { color: tokens.colors?.textSecondary || '#666' }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {plan.headline || ''}
                                            </Text>

                                            {/* Features Preview - First 2 */}
                                            <View style={{ marginTop: 6 }}>
                                                {features.slice(0, 2).map((feature, idx) => (
                                                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={12}
                                                            color={tokens.colors?.primary || '#4CAF50'}
                                                            style={{ marginRight: 4 }}
                                                        />
                                                        <Text
                                                            style={{
                                                                fontSize: 11,
                                                                color: isSelected
                                                                    ? (tokens.colors?.textPrimary || '#212121')
                                                                    : (tokens.colors?.textSecondary || '#666')
                                                            }}
                                                            numberOfLines={1}
                                                        >
                                                            {feature}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    </View>

                                    {/* Price */}
                                    <Text style={[
                                        styles.planPriceCompact,
                                        isSelected && styles.planPriceSelected,
                                        { color: tokens.colors?.textPrimary || '#212121' }
                                    ]}>
                                        {plan.priceFormatted}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Student Plans Toggle Section */}
                <View style={styles.studentToggleSection}>
                    <TouchableOpacity
                        style={[styles.studentToggleButton, { borderColor: tokens.colors?.border || '#E0E0E0' }]}
                        onPress={() => setShowStudentPlans(!showStudentPlans)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.studentToggleContent}>
                            <Ionicons
                                name={showStudentPlans ? 'chevron-down' : 'chevron-forward'}
                                size={18}
                                color={tokens.colors?.textSecondary || '#666'}
                            />
                            <Text style={[styles.studentToggleText, { color: tokens.colors?.textSecondary || '#666' }]}>
                                {t('subscription.studentToggle') || 'I am a student'}
                            </Text>
                        </View>
                        {!showStudentPlans && (
                            <Text style={[styles.studentToggleHint, { color: tokens.colors?.textTertiary || '#999' }]}>
                                {t('subscription.studentHint') || 'Show student discount'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Student Plans - Show when toggle is on - Compact design */}
                    {showStudentPlans && (
                        <View style={styles.studentPlansContainer}>
                            {plans.filter(plan => plan.name === 'student').map((plan) => {
                                const isStudent = plan.name === 'student';
                                const isSelected = selectedPlanId === plan.id;
                                const features = plan.features || [
                                    t('subscription.feature_unlimited_analyses') || 'Unlimited food analysis',
                                    t('subscription.feature_detailed_reports') || 'Detailed nutrition reports',
                                    t('subscription.feature_ai_chat') || 'AI Nutrition Assistant'
                                ];

                                return (
                                    <TouchableOpacity
                                        key={plan.id}
                                        style={[
                                            styles.planButtonCompact,
                                            isStudent && styles.planButtonStudent,
                                            isSelected && styles.planButtonSelected,
                                        ]}
                                        activeOpacity={0.9}
                                        onPress={() => {
                                            if (isStudent) {
                                                setShowStudentModal(true);
                                            } else {
                                                setSelectedPlanId(plan.id);
                                                handlePurchase();
                                            }
                                        }}
                                        disabled={purchasing}
                                    >
                                        {/* Student Badge */}
                                        {isStudent && (
                                            <View style={[styles.popularBadgeCompact, styles.studentBadge]}>
                                                <Ionicons name="school" size={10} color="#FFF" style={{ marginRight: 4 }} />
                                                <Text style={styles.popularTextCompact}>
                                                    {t('subscription.student') || 'STUDENT'}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Content */}
                                        <View style={styles.planCompactContent}>
                                            <View style={styles.planCompactLeft}>
                                                {/* Radio Circle */}
                                                <View style={[
                                                    styles.radioCircle,
                                                    isSelected && styles.radioCircleSelected,
                                                ]}>
                                                    {isSelected && <View style={styles.radioCircleInner} />}
                                                </View>

                                                {/* Plan Info */}
                                                <View style={styles.planCompactInfo}>
                                                    <Text style={[
                                                        styles.planNameCompact,
                                                        isSelected && styles.planNameSelected,
                                                        { color: tokens.colors?.textPrimary || '#212121' }
                                                    ]}>
                                                        {t(`subscription.plan_${plan.name}`) || plan.name}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.planHeadlineCompact,
                                                            { color: tokens.colors?.textSecondary || '#666' }
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {plan.headline || ''}
                                                    </Text>

                                                    {/* Features Preview - First 2 */}
                                                    <View style={{ marginTop: 6 }}>
                                                        {features.slice(0, 2).map((feature, idx) => (
                                                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                                                <Ionicons
                                                                    name="checkmark"
                                                                    size={12}
                                                                    color={tokens.colors?.primary || '#4CAF50'}
                                                                    style={{ marginRight: 4 }}
                                                                />
                                                                <Text
                                                                    style={{
                                                                        fontSize: 11,
                                                                        color: isSelected
                                                                            ? (tokens.colors?.textPrimary || '#212121')
                                                                            : (tokens.colors?.textSecondary || '#666')
                                                                    }}
                                                                    numberOfLines={1}
                                                                >
                                                                    {feature}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Price */}
                                            <Text style={[
                                                styles.planPriceCompact,
                                                isSelected && styles.planPriceSelected,
                                                { color: tokens.colors?.textPrimary || '#212121' }
                                            ]}>
                                                {plan.priceFormatted}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Footer Terms */}
                <Text style={styles.termsText}>
                    {t('subscription.terms_notice') || 'Cancel anytime. Terms apply.'}
                </Text>
                <View style={{ height: 40 }} />
            </ScrollView>

            <StudentModal
                visible={showStudentModal}
                onClose={() => setShowStudentModal(false)}
                t={t}
                tokens={tokens}
            />
        </SafeAreaView>
    );
}

// Student verification info modal
function StudentModal({ visible, onClose, t, tokens }) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={studentModalStyles.backdrop}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={[studentModalStyles.content, { backgroundColor: tokens.colors?.surface || '#FFF' }]}>
                    <View style={studentModalStyles.handle} />
                    <Ionicons name="school" size={48} color="#7C3AED" style={studentModalStyles.icon} />
                    <Text style={[studentModalStyles.title, { color: tokens.colors?.textPrimary || '#212121' }]}>
                        {t('subscription.studentVerificationTitle') || 'Student Discount'}
                    </Text>
                    <Text style={[studentModalStyles.description, { color: tokens.colors?.textSecondary || '#666' }]}>
                        {t('subscription.studentVerificationDescription') ||
                            'To activate student subscription, please email us at info@eatsense.ch with a photo of your student ID.'}
                    </Text>
                    <TouchableOpacity
                        style={[studentModalStyles.button, { backgroundColor: '#7C3AED' }]}
                        onPress={onClose}
                    >
                        <Text style={studentModalStyles.buttonText}>
                            {t('common.gotIt') || 'Got it'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const studentModalStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        marginBottom: 24,
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

const createStyles = (tokens, colors) => {
    const borderMuted = colors?.borderMuted || colors?.border || tokens.colors?.borderMuted || '#C8C8C8';
    const surface = colors?.surface || '#FFFFFF';

    return StyleSheet.create({
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
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
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
        scrollContent: {
            paddingBottom: 40,
        },
        subtitle: {
            fontSize: 15,
            color: tokens.colors?.textSecondary || '#666',
            textAlign: 'center',
            marginHorizontal: 24,
            marginBottom: 16,
            lineHeight: 22,
        },
        // Free Plan Styles
        freePlanSection: {
            paddingHorizontal: 16,
            marginBottom: 20,
        },
        freePlanCard: {
            backgroundColor: tokens.colors?.surface || '#FFF',
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
        },
        freePlanHeader: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        freePlanIconContainer: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        freePlanInfo: {
            flex: 1,
            marginLeft: 12,
        },
        freePlanTitle: {
            fontSize: 15,
            fontWeight: '600',
        },
        freePlanSubtitle: {
            fontSize: 12,
            marginTop: 2,
        },
        freePlanBadge: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
        },
        freePlanBadgeText: {
            fontSize: 12,
            fontWeight: '600',
        },
        freePlanFeatures: {
            marginTop: 12,
            gap: 6,
        },
        freePlanFeatureRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        freePlanFeatureText: {
            fontSize: 13,
        },
        premiumSectionTitle: {
            fontSize: 16,
            fontWeight: '600',
            marginHorizontal: 16,
            marginBottom: 12,
        },
        plansContainer: {
            paddingHorizontal: 16,
            gap: 14,
        },
        // Student Toggle Section
        studentToggleSection: {
            paddingHorizontal: 16,
            marginTop: 8,
            marginBottom: 16,
        },
        studentToggleButton: {
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            backgroundColor: tokens.colors?.surface || '#FFF',
        },
        studentToggleContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        studentToggleText: {
            fontSize: 15,
            fontWeight: '600',
        },
        studentToggleHint: {
            fontSize: 12,
            marginTop: 4,
            marginLeft: 26,
        },
        studentPlansContainer: {
            marginTop: 12,
            gap: 14,
        },
        // Compact plan styles (matching onboarding design)
        planButtonCompact: {
            backgroundColor: surface,
            borderRadius: tokens.radii?.lg ?? 12,
            padding: tokens.spacing?.md ?? 12,
            paddingVertical: tokens.spacing?.sm ?? 10,
            borderWidth: 2,
            borderColor: borderMuted,
            position: 'relative',
            marginBottom: 8,
        },
        planButtonPopular: {
            borderColor: '#FFA000',
        },
        planButtonSelected: {
            borderColor: colors?.primary || tokens.colors?.primary || '#4CAF50',
            backgroundColor: (colors?.primary || tokens.colors?.primary || '#4CAF50') + '10',
        },
        planButtonStudent: {
            borderColor: '#7C3AED',
        },
        popularBadgeCompact: {
            position: 'absolute',
            top: -10,
            right: 12,
            backgroundColor: colors?.primary || tokens.colors?.primary || '#4CAF50',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },
        studentBadge: {
            backgroundColor: '#7C3AED',
        },
        popularTextCompact: {
            fontSize: 10,
            fontWeight: '700',
            color: '#FFFFFF',
            textTransform: 'uppercase',
        },
        planCompactContent: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        planCompactLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        radioCircle: {
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: borderMuted,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
        },
        radioCircleSelected: {
            borderColor: colors?.primary || tokens.colors?.primary || '#4CAF50',
        },
        radioCircleInner: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors?.primary || tokens.colors?.primary || '#4CAF50',
        },
        planCompactInfo: {
            flex: 1,
        },
        planNameCompact: {
            fontSize: 15,
            fontWeight: '600',
        },
        planNameSelected: {
            color: colors?.primary || tokens.colors?.primary || '#4CAF50',
        },
        planHeadlineCompact: {
            fontSize: 12,
            marginTop: 2,
        },
        planPriceCompact: {
            fontSize: 16,
            fontWeight: '700',
            marginLeft: 8,
        },
        planPriceSelected: {
            color: colors?.primary || tokens.colors?.primary || '#4CAF50',
        },
    });
};
