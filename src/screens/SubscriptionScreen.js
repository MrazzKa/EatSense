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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useI18n } from '../../app/i18n/hooks';
import { openLegalLink } from '../utils/legal';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import IAPService from '../services/iapService';
import { SUBSCRIPTION_SKUS, NON_CONSUMABLE_SKUS } from '../config/subscriptions';
import { getCurrency, formatPrice, getDeviceRegion, getOriginalPrice } from '../utils/currency';

// Plan descriptions for Apple App Store Review compliance
// Each subscription must clearly state what features are included

// Default plan texts for fallback when translations are missing
const PLAN_DEFAULTS = {
    monthly: {
        title: 'Monthly',
        subtitle: 'Flexible billing',
        features: ['Unlimited AI analysis', 'Advanced nutrition insights', 'Personalized coaching', 'Priority support'],
    },
    yearly: {
        title: 'Yearly',
        subtitle: 'Best value — save 33%',
        features: ['Everything in Monthly', 'Exclusive webinars', 'Early access to features'],
    },
    student: {
        title: 'Student',
        subtitle: 'Special student pricing',
        features: ['Unlimited AI analysis', 'Advanced nutrition insights', 'Student ID required'],
    },
    founders: {
        title: 'Founder',
        subtitle: 'Lifetime access + Exclusive badge',
        badge: 'LIMITED',
        features: ['One-time payment, forever access', 'Exclusive Founder Badge', 'Direct developer access'],
    },
};

// Plan configuration with I18n keys (using onboarding.plans.* which exist)
const PLAN_CONFIG = {
    monthly: {
        titleKey: 'onboarding.plans.monthly',
        subtitleKey: 'onboarding.plans.monthlyHeadline',
        featuresKey: 'onboarding.plans.proMonthly.features',
        originalPrice: { USD: 14.99, EUR: 12.99, CHF: 15.00 },
    },
    yearly: {
        titleKey: 'onboarding.plans.yearly',
        subtitleKey: 'onboarding.plans.yearlyHeadline',
        featuresKey: 'onboarding.plans.proAnnual.features',
        originalPrice: { USD: 119.99, EUR: 99.99, CHF: 120.00 },
    },
    student: {
        titleKey: 'onboarding.plans.student.name',
        subtitleKey: 'onboarding.plans.studentHeadline',
        featuresKey: 'onboarding.plans.student.features',
        originalPrice: { USD: 59.99, EUR: 49.99, CHF: 60.00 },
    },
    founders: {
        titleKey: 'onboarding.plans.founder.name',
        subtitleKey: 'onboarding.plans.founderHeadline',
        featuresKey: 'onboarding.plans.founder.features',
        badgeKey: 'onboarding.plans.founderBadge',
        badgeColor: '#FFD700',
        originalPrice: null,
    },
};

/**
 * SubscriptionScreen - Shows available subscription plans with multi-currency support
 * Integrated with react-native-iap for Apple/Google purchases
 */
export default function SubscriptionScreen() {
    const navigation = useNavigation();
    const route = useRoute();
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
    // Currency with regional prices for fallback
    const [currency, setCurrency] = useState(() => {
        const config = getCurrency();
        return {
            symbol: config.symbol,
            code: config.code,
            monthlyPrice: formatPrice('monthly'),
            yearlyPrice: formatPrice('yearly'),
            studentPrice: formatPrice('student'),
            founderPrice: formatPrice('founder'),
        };
    });
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showStudentPlans, setShowStudentPlans] = useState(false); // Toggle for student plans visibility

    // Load currency from device region (fallback when IAP unavailable)
    // Use currency utility to get correct currency and prices for all 175 countries
    React.useEffect(() => {
        const currencyConfig = getCurrency();
        const currencyCode = currencyConfig.code;

        // Format prices using currency utility (handles all 175 countries correctly)
        setCurrency({
            symbol: currencyConfig.symbol,
            code: currencyCode,
            monthlyPrice: formatPrice('monthly'),
            yearlyPrice: formatPrice('yearly'),
            studentPrice: formatPrice('student'),
            founderPrice: formatPrice('founder'),
        });
        const deviceRegion = getDeviceRegion();
        console.log('[SubscriptionScreen] Using fallback prices from device region:', {
            region: deviceRegion,
            currency: currencyCode,
            symbol: currencyConfig.symbol,
            note: 'IAP prices are more accurate - these are approximate',
        });
    }, []);



    // Fallback to local plan data when IAP is unavailable (e.g., simulator, sandbox issues)
    const loadBackendPlans = React.useCallback(async () => {
        try {
            // Use local plan descriptions as fallback with proper localization
            const getPlanData = (type) => {
                const config = PLAN_CONFIG[type];
                const defaults = PLAN_DEFAULTS[type];

                // Features with fallback
                let features = t(config.featuresKey, { returnObjects: true });
                if (!Array.isArray(features) || features.length === 0) {
                    features = defaults.features;
                }

                // Title with fallback
                let title = t(config.titleKey);
                if (!title || title === config.titleKey || title.startsWith('subscription.') || title.startsWith('onboarding.')) {
                    title = defaults.title;
                }

                // Headline with fallback
                let headline = t(config.subtitleKey);
                if (!headline || headline === config.subtitleKey || headline.startsWith('subscription.') || headline.startsWith('onboarding.')) {
                    headline = defaults.subtitle;
                }

                // Badge with fallback
                let badge = config.badgeKey ? t(config.badgeKey) : null;
                if (badge && (badge === config.badgeKey || badge.startsWith('subscription.') || badge.startsWith('onboarding.'))) {
                    badge = defaults.badge || null;
                }

                return {
                    title,
                    headline,
                    features,
                    badge,
                    badgeColor: config.badgeColor,
                    originalPrice: config.originalPrice
                };
            };

            const monthlyData = getPlanData('monthly');
            const yearlyData = getPlanData('yearly');
            const studentData = getPlanData('student');
            const foundersData = getPlanData('founders');

            const monthLabel = t('onboarding.plans.month', 'mo');
            const yearLabel = t('onboarding.plans.year', 'yr');

            const fallbackPlans = [
                {
                    id: SUBSCRIPTION_SKUS.MONTHLY,
                    name: 'monthly',
                    price: currency.monthlyPrice,
                    priceFormatted: currency.monthlyPrice + '/' + monthLabel,
                    priceNumber: 9.99,
                    currency: currency.code,
                    title: monthlyData.title,
                    headline: monthlyData.headline,
                    features: monthlyData.features,
                    isSubscription: true,
                    badge: null,
                    badgeColor: null,
                },
                {
                    id: SUBSCRIPTION_SKUS.YEARLY,
                    name: 'yearly',
                    price: currency.yearlyPrice,
                    priceFormatted: currency.yearlyPrice + '/' + yearLabel,
                    priceNumber: 69.99,
                    currency: currency.code,
                    title: yearlyData.title,
                    headline: yearlyData.headline,
                    features: yearlyData.features,
                    isSubscription: true,
                    originalPrice: yearlyData.originalPrice,
                    badge: yearlyData.badge,
                    badgeColor: yearlyData.badgeColor,
                },
                {
                    id: SUBSCRIPTION_SKUS.STUDENT,
                    name: 'student',
                    price: currency.studentPrice,
                    priceFormatted: currency.studentPrice + '/' + yearLabel,
                    priceNumber: 49.00,
                    currency: currency.code,
                    title: studentData.title,
                    headline: studentData.headline,
                    features: studentData.features,
                    isSubscription: true,
                    badge: studentData.badge,
                    badgeColor: studentData.badgeColor,
                },
                {
                    id: NON_CONSUMABLE_SKUS.FOUNDERS,
                    name: 'founders',
                    price: currency.founderPrice,
                    priceFormatted: currency.founderPrice, // One time
                    priceNumber: 99.99,
                    currency: currency.code,
                    title: foundersData.title,
                    headline: foundersData.headline,
                    features: foundersData.features,
                    isSubscription: false,
                    badge: foundersData.badge,
                    badgeColor: foundersData.badgeColor,
                },
            ];

            setPlans(fallbackPlans);
            // Select yearly by default
            setSelectedPlanId(SUBSCRIPTION_SKUS.YEARLY);
            console.log('[SubscriptionScreen] Using local fallback plans with currency:', currency.code);
        } catch (error) {
            console.error('[SubscriptionScreen] Failed to load fallback plans:', error);
        }
    }, [t, currency]);

    // Initialize IAP and load products with Apple prices
    const initIAP = React.useCallback(async () => {
        try {
            setLoading(true);

            // Init IAP connection
            await IAPService.init();

            // Get products from Apple/Google with localized prices
            const { all } = await IAPService.getAvailableProducts();
            setIapProducts(all);

            // FIX 2026-01-21: If IAP returns 0 products, fallback to backend
            if (all.length === 0) {
                console.log('[SubscriptionScreen] IAP returned 0 products, falling back to backend');
                await loadBackendPlans();
                return;
            }

            // IMPORTANT: IAP prices are the MOST ACCURATE source
            // IAP automatically returns correct prices for user's App Store country
            // product.localizedPrice contains exact price from App Store Connect for user's country
            // Map IAP products to our plan format. Use IAP price and currency as-is (Store localizes by user's App Store country).
            const deviceRegion = getDeviceRegion();
            const iapCurrency = all[0]?.currency;
            console.log('[SubscriptionScreen] Using IAP prices (most accurate):', {
                deviceRegion,
                currency: iapCurrency,
                productsCount: all.length,
                note: 'IAP prices are country-specific from App Store Connect',
            });

            const mappedPlans = all.map(product => {
                const isFounders = product.productId === NON_CONSUMABLE_SKUS.FOUNDERS;
                const isYearly = product.productId === SUBSCRIPTION_SKUS.YEARLY;
                const isStudent = product.productId === SUBSCRIPTION_SKUS.STUDENT;

                const planType = isFounders ? 'founders' :
                    isYearly ? 'yearly' :
                        isStudent ? 'student' : 'monthly';

                const config = PLAN_CONFIG[planType] || PLAN_CONFIG.monthly;
                const defaults = PLAN_DEFAULTS[planType] || PLAN_DEFAULTS.monthly;

                // Resolve features with fallback to defaults
                let features = t(config.featuresKey, { returnObjects: true });
                if (!Array.isArray(features) || features.length === 0) {
                    features = defaults.features;
                }

                // Title and Subtitle with fallbacks
                let title = t(config.titleKey);
                if (!title || title === config.titleKey || title.startsWith('subscription.') || title.startsWith('onboarding.')) {
                    title = defaults.title;
                }

                let headline = t(config.subtitleKey);
                if (!headline || headline === config.subtitleKey || headline.startsWith('subscription.') || headline.startsWith('onboarding.')) {
                    headline = defaults.subtitle;
                }

                // Badge with fallback
                let badge = config.badgeKey ? t(config.badgeKey) : null;
                if (badge && (badge === config.badgeKey || badge.startsWith('subscription.') || badge.startsWith('onboarding.'))) {
                    badge = defaults.badge || null;
                }

                return {
                    id: product.productId,
                    name: planType,
                    price: product.localizedPrice,
                    priceFormatted: product.localizedPrice,
                    priceNumber: parseFloat(product.price),
                    currency: product.currency,
                    title: title,
                    headline: headline,
                    features: features,
                    isSubscription: !isFounders,
                    // Strike-through pricing support
                    originalPrice: config.originalPrice,
                    badge: badge,
                    badgeColor: config.badgeColor,
                };
            });

            setPlans(mappedPlans);

            // Select yearly plan by default (best value)
            if (route.params?.selectedPlanId) {
                setSelectedPlanId(route.params.selectedPlanId);
            } else {
                const yearlyPlan = mappedPlans.find(p => p.name === 'yearly');
                if (yearlyPlan) {
                    setSelectedPlanId(yearlyPlan.id);
                } else if (mappedPlans.length > 0) {
                    setSelectedPlanId(mappedPlans[0].id);
                }
            }
        } catch (error) {
            console.error('[SubscriptionScreen] IAP init error:', error);
            // Fallback to backend plans if IAP fails
            await loadBackendPlans();
        } finally {
            setLoading(false);
        }
    }, [route.params?.selectedPlanId, t, loadBackendPlans]);

    useEffect(() => {
        initIAP();
        return () => {
            IAPService.destroy();
        };
    }, [initIAP]);

    // Handle purchase via IAPService
    // FIX 2026-01-19: Accept planId directly to avoid race condition with async setState
    const handlePurchase = async (planId = null) => {
        const targetPlanId = planId || selectedPlanId;
        if (!targetPlanId || purchasing) return;

        const plan = plans.find(p => p.id === targetPlanId);
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
            // FIX #9: Ensure IAP is initialized before purchase
            const initResult = await IAPService.init();
            if (!initResult) {
                throw new Error('Failed to initialize IAP service');
            }

            if (plan.isSubscription) {
                await IAPService.purchaseSubscription(targetPlanId, onSuccess, onError);
            } else {
                await IAPService.purchaseProduct(targetPlanId, onSuccess, onError);
            }
        } catch (error) {
            console.error('[SubscriptionScreen] Purchase initiation error:', error);
            setPurchasing(false);
            onError(error);
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
                                    {t('subscription.freeFeature1') || '3 analyses per day'}
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
                        const isFounders = plan.name === 'founders';
                        const isSelected = selectedPlanId === plan.id;
                        // Use plan specific features if available, otherwise generic ones for recurring plans
                        const features = plan.features || [
                            t('subscription.feature_unlimited_analyses') || 'Unlimited food analysis',
                            t('subscription.feature_detailed_reports') || 'Detailed nutrition reports',
                            t('subscription.feature_ai_chat') || 'AI Nutrition Assistant'
                        ];

                        // Get badge text - show for popular, founders, or custom badges
                        const badgeText = isFounders
                            ? (plan.badge || t('subscription.lifetime') || 'LIFETIME')
                            : isPopular
                                ? (t('subscription.most_popular') || 'BEST VALUE')
                                : plan.badge || null;

                        return (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planButtonCompact,
                                    isPopular && styles.planButtonPopular,
                                    isFounders && styles.planButtonFounders,
                                    isSelected && styles.planButtonSelected,
                                    isStudent && styles.planButtonStudent,
                                ]}
                                activeOpacity={0.9}
                                onPress={() => {
                                    // FIX: Убрать подтверждение документа для студенческой подписки - сразу оплата
                                    setSelectedPlanId(plan.id);
                                    handlePurchase(plan.id);
                                }}
                                disabled={purchasing}
                            >
                                {/* Badge */}
                                {badgeText && (
                                    <View style={[
                                        styles.popularBadgeCompact,
                                        isStudent && styles.studentBadge,
                                        isFounders && styles.foundersBadge,
                                    ]}>
                                        {isFounders && <Ionicons name="star" size={10} color="#5D4037" style={{ marginRight: 4 }} />}
                                        <Text style={[styles.popularTextCompact, isFounders && { color: '#5D4037' }]}>{badgeText}</Text>
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

                                    {/* Price with optional strike-through */}
                                    <View style={styles.priceRow}>
                                        {(() => {
                                            const planId = plan.name === 'monthly' ? 'monthly' : plan.name === 'yearly' ? 'yearly' : plan.name === 'student' ? 'student' : 'founder';
                                            const originalPrice = getOriginalPrice(planId, plan.currency);
                                            return (
                                                <>
                                                    {originalPrice && (
                                                        <Text style={[
                                                            styles.originalPrice,
                                                            { color: tokens.colors?.textSecondary || '#999' }
                                                        ]}>
                                                            {originalPrice}
                                                        </Text>
                                                    )}
                                                    <Text style={[
                                                        styles.planPriceCompact,
                                                        isSelected && styles.planPriceSelected,
                                                        { color: tokens.colors?.textPrimary || '#212121' }
                                                    ]}>
                                                        {plan.priceFormatted}
                                                    </Text>
                                                </>
                                            );
                                        })()}
                                    </View>
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
                                            // FIX: Убрать подтверждение документа для студенческой подписки - сразу оплата
                                            setSelectedPlanId(plan.id);
                                            handlePurchase(plan.id);
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
            padding: 12,
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
            marginBottom: 16, // Increased to prevent badge overlap (badge is top -10)
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
        planButtonFounders: {
            borderColor: '#FFD700',
            backgroundColor: '#FFF8E1',
            marginTop: 20, // Increased margin for badge
        },
        popularBadgeCompact: {
            position: 'absolute',
            top: -12,
            right: 12,
            backgroundColor: colors?.primary || tokens.colors?.primary || '#4CAF50',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10, // Ensure badge is above content
        },
        studentBadge: {
            backgroundColor: '#7C3AED',
        },
        foundersBadge: {
            backgroundColor: '#FFD700',
            paddingHorizontal: 10,
            paddingVertical: 4,
            width: 'auto', // Ensure it doesn't stretch weirdly
        },
        popularTextCompact: {
            fontSize: 10,
            fontWeight: '700',
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
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
        // Strike-through pricing styles
        priceRow: {
            flexDirection: 'column',
            alignItems: 'flex-end',
        },
        originalPrice: {
            fontSize: 12,
            textDecorationLine: 'line-through',
            marginBottom: 2,
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
