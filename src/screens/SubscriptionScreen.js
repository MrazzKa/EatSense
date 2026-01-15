import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    // Platform,
    Modal,
    Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { openLegalLink } from '../utils/legal';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';
import IAPService from '../services/iapService';
import { SUBSCRIPTION_SKUS, NON_CONSUMABLE_SKUS } from '../config/subscriptions';

// Plan descriptions for Apple App Store Review compliance
// Each subscription must clearly state what features are included
const PLAN_DESCRIPTIONS = {
    monthly: {
        title: 'Monthly Premium',
        subtitle: 'Billed monthly, cancel anytime',
        features: [
            'Unlimited food analysis with AI',
            'Detailed nutrition reports & insights',
            'Personal AI Nutrition Assistant',
            'Diet & lifestyle programs',
            'Priority customer support',
        ],
    },
    yearly: {
        title: 'Yearly Premium',
        subtitle: 'Best value - save 50%',
        features: [
            'All Monthly features included',
            'Save 50% compared to monthly',
            'Early access to new features',
            'Personalized meal planning',
            'Advanced health metrics',
        ],
    },
    student: {
        title: 'Student Plan',
        subtitle: 'Verified students only',
        features: [
            'All Yearly features included',
            'Special student pricing',
            'Valid student ID required',
            'Renews at student rate',
        ],
    },
    founders: {
        title: 'Founders Pass',
        subtitle: 'One-time purchase, lifetime access',
        features: [
            'Lifetime Premium access',
            'All current & future features',
            'Exclusive Founder badge',
            'No recurring payments ever',
            'Priority feature requests',
        ],
    },
};

/**
 * SubscriptionScreen - Shows available subscription plans with multi-currency support
 * Integrated with react-native-iap for Apple/Google purchases
 */
export default function SubscriptionScreen() {
    const navigation = useNavigation();
    const { t } = useI18n();
    const themeContext = useTheme();
    const tokens = useDesignTokens();
    const insets = useSafeAreaInsets();

    const [plans, setPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [, setIapProducts] = useState([]);
    // Currency is stored for future use with IAP pricing
    const [, setCurrency] = useState({ code: 'USD', symbol: '$' });
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showStudentPlans, setShowStudentPlans] = useState(false); // Toggle for student plans visibility



    // Initialize IAP and load products with Apple prices
    const initIAP = React.useCallback(async () => {
        try {
            setLoading(true);

            // Init IAP connection
            await IAPService.init();

            // Get products from Apple/Google with localized prices
            const { all } = await IAPService.getAvailableProducts();
            setIapProducts(all);

            // Map IAP products to our plan format
            const mappedPlans = all.map(product => {
                const isFounders = product.productId === NON_CONSUMABLE_SKUS.FOUNDERS;
                const isYearly = product.productId === SUBSCRIPTION_SKUS.YEARLY;
                const isStudent = product.productId === SUBSCRIPTION_SKUS.STUDENT;
                // const isMonthly = product.productId === SUBSCRIPTION_SKUS.MONTHLY;

                const planType = isFounders ? 'founders' :
                    isYearly ? 'yearly' :
                        isStudent ? 'student' : 'monthly';

                const descriptions = PLAN_DESCRIPTIONS[planType] || PLAN_DESCRIPTIONS.monthly;

                return {
                    id: product.productId,
                    name: planType,
                    price: product.localizedPrice,
                    priceFormatted: product.localizedPrice,
                    priceNumber: parseFloat(product.price),
                    currency: product.currency,
                    title: descriptions.title,
                    headline: descriptions.subtitle,
                    features: descriptions.features,
                    isSubscription: !isFounders,
                };
            });

            setPlans(mappedPlans);

            // Select yearly plan by default (best value)
            const yearlyPlan = mappedPlans.find(p => p.name === 'yearly');
            if (yearlyPlan) {
                setSelectedPlanId(yearlyPlan.id);
            } else if (mappedPlans.length > 0) {
                setSelectedPlanId(mappedPlans[0].id);
            }
        } catch (error) {
            console.error('[SubscriptionScreen] IAP init error:', error);
            // Fallback to backend plans if IAP fails
            loadBackendPlans();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        initIAP();
        return () => {
            IAPService.destroy();
        };
    }, [initIAP]);

    // Fallback to backend plans when IAP is unavailable (e.g., simulator)
    const loadBackendPlans = async () => {
        try {
            const response = await ApiService.getSubscriptionPlans();
            if (response?.plans) {
                // Enhance backend plans with descriptions
                const enhancedPlans = response.plans.map(plan => ({
                    ...plan,
                    features: PLAN_DESCRIPTIONS[plan.name]?.features || plan.features,
                    headline: PLAN_DESCRIPTIONS[plan.name]?.subtitle || plan.headline,
                }));
                setPlans(enhancedPlans);
                const yearlyPlan = enhancedPlans.find(p => p.name === 'yearly');
                if (yearlyPlan) {
                    setSelectedPlanId(yearlyPlan.id);
                } else if (enhancedPlans.length > 0) {
                    setSelectedPlanId(enhancedPlans[0].id);
                }
                if (response.currency) {
                    setCurrency(response.currency);
                }
            }
        } catch (error) {
            console.error('[SubscriptionScreen] Failed to load backend plans:', error);
        }
    };

    // Handle purchase via IAPService
    const handlePurchase = async () => {
        if (!selectedPlanId || purchasing) return;

        const plan = plans.find(p => p.id === selectedPlanId);
        if (!plan) {
            Alert.alert(t('error.title', 'Error'), t('subscription.planNotFound', 'Plan not found'));
            return;
        }

        setPurchasing(true);

        const onSuccess = (productId) => {
            console.log('[SubscriptionScreen] Purchase success:', productId);
            setPurchasing(false);
            navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
            });
        };

        const onError = (error) => {
            console.error('[SubscriptionScreen] Purchase error:', error);
            setPurchasing(false);
            if (error?.code !== 'E_USER_CANCELLED') {
                Alert.alert(
                    t('error.title', 'Error'),
                    t('subscription.purchaseFailed', 'Purchase failed. Please try again.')
                );
            }
        };

        try {
            if (plan.isSubscription) {
                await IAPService.purchaseSubscription(selectedPlanId, onSuccess, onError);
            } else {
                await IAPService.purchaseProduct(selectedPlanId, onSuccess, onError);
            }
        } catch (error) {
            console.error('[SubscriptionScreen] Purchase initiation error:', error);
            setPurchasing(false);
        }
    };

    // Handle restore purchases (required by Apple)
    const handleRestore = async () => {
        if (restoring) return;

        setRestoring(true);
        try {
            const restored = await IAPService.restorePurchases();
            if (restored) {
                Alert.alert(
                    t('subscription.restored', 'Restored'),
                    t('subscription.purchasesRestored', 'Your purchases have been restored.')
                );
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                });
            } else {
                Alert.alert(
                    t('subscription.noPurchases', 'No Purchases'),
                    t('subscription.noPurchasesFound', 'No previous purchases found.')
                );
            }
        } catch (error) {
            console.error('[SubscriptionScreen] Restore error:', error);
            Alert.alert(
                t('error.title', 'Error'),
                t('subscription.restoreFailed', 'Could not restore purchases.')
            );
        } finally {
            setRestoring(false);
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
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 40 }]}
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

                {/* Restore Purchases - Required by Apple */}
                <TouchableOpacity
                    style={styles.restoreButton}
                    onPress={handleRestore}
                    disabled={restoring || purchasing}
                    activeOpacity={0.7}
                >
                    {restoring ? (
                        <ActivityIndicator size="small" color={tokens.colors?.primary || '#4CAF50'} />
                    ) : (
                        <Text style={[styles.restoreButtonText, { color: tokens.colors?.primary || '#4CAF50' }]}>
                            {t('subscription.restorePurchases', 'Restore Purchases')}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Footer Terms & Legal Links */}
                <View style={[styles.legalLinksContainer, { paddingBottom: 40 }]}>
                    <Text style={styles.termsText}>
                        {t('subscription.terms_notice') || 'Cancel anytime.'}
                    </Text>
                    <View style={styles.legalLinkRow}>
                        <TouchableOpacity
                            onPress={() => openLegalLink('terms')}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.legalLinkText}>
                                {t('legal.termsLink') || 'Terms of Use'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.legalSeparator}> • </Text>

                        <TouchableOpacity
                            onPress={() => openLegalLink('privacy')}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.legalLinkText}>
                                {t('legal.privacyLink') || 'Privacy Policy'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
        // Restore Purchases button styles
        restoreButton: {
            paddingVertical: 16,
            paddingHorizontal: 24,
            alignItems: 'center',
            marginTop: 8,
        },
        restoreButtonText: {
            fontSize: 15,
            fontWeight: '600',
        },
        // Legal Footers
        legalLinksContainer: {
            alignItems: 'center',
            marginTop: 10,
        },
        legalLinkRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
        },
        legalLinkText: {
            fontSize: 13,
            color: colors?.textSecondary || '#666',
            textDecorationLine: 'underline',
        },
        legalSeparator: {
            fontSize: 13,
            color: colors?.textSecondary || '#666',
            marginHorizontal: 8,
        },
    });
};
