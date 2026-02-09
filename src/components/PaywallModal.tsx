/**
 * PaywallModal - Shows subscription offer when user tries to access premium content
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { TRIAL_DAYS } from '../config/freeContent';
import IAPService from '../services/iapService';
import ApiService from '../services/apiService';
import { SUBSCRIPTION_SKUS } from '../config/subscriptions';
import { LinearGradient } from 'expo-linear-gradient';
import { formatPrice } from '../utils/currency';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
  featureName?: string;
}

export default function PaywallModal({
  visible,
  onClose,
  onSubscribed,
  featureName,
}: PaywallModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [iapPrice, setIapPrice] = useState<string | null>(null);

  // Fetch IAP products on mount to get accurate pricing
  useEffect(() => {
    if (visible) {
      IAPService.init().then(() => {
        IAPService.getAvailableProducts().then(({ subscriptions }) => {
          const monthlyPlan = subscriptions.find(s => s.productId === SUBSCRIPTION_SKUS.MONTHLY);
          if (monthlyPlan) {
            // @ts-ignore - localizedPrice exists at runtime
            setIapPrice(monthlyPlan.localizedPrice);
          }
        });
      }).catch(err => console.warn('[Paywall] Failed to load IAP products:', err));
    }
  }, [visible]);
  // Introductory offer (free trial) is handled automatically by Apple for new subscribers
  // We still check eligibility to show/hide the "3 days free" badge in the UI
  const [isTrialEligible, setIsTrialEligible] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [showModal, setShowModal] = useState(visible);

  // Check trial eligibility for UI badge display
  useEffect(() => {
    if (visible) {
      ApiService.checkTrialEligibility()
        .then((result: { eligible: boolean }) => {
          setIsTrialEligible(result.eligible);
        })
        .catch(() => {
          // Default to eligible on error - Apple will handle actual eligibility
          setIsTrialEligible(true);
        });
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          mass: 1,
          stiffness: 100,
        }),
      ]).start();
    } else {
      // Handle external close if needed
      if (!visible && showModal) {
        setShowModal(false);
        fadeAnim.setValue(0);
        slideAnim.setValue(SCREEN_HEIGHT);
      }
    }
  }, [visible, fadeAnim, slideAnim, showModal]);

  // Safety timeout: auto-reset loading if stuck for more than 60 seconds
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      console.warn('[Paywall] Loading timeout - resetting after 60s');
      setLoading(false);
    }, 60000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(() => {
      setShowModal(false);
      onClose();
    });
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      console.log('[Paywall] Starting monthly subscription...');
      await IAPService.init();
      const { subscriptions } = await IAPService.getAvailableProducts();

      const monthlyPlan = subscriptions.find(s => s.productId === SUBSCRIPTION_SKUS.MONTHLY);
      if (monthlyPlan) {
        // @ts-ignore - localizedPrice exists at runtime
        setIapPrice(monthlyPlan.localizedPrice);
      }

      await IAPService.purchaseSubscription(
        SUBSCRIPTION_SKUS.MONTHLY,
        (productId: string) => {
          console.log('[Paywall] Subscription successful:', productId);
          setLoading(false);
          if (onSubscribed) {
            console.log('[Paywall] Calling onSubscribed prop from Modal');
            onSubscribed();
          } else {
            console.warn('[Paywall] onSubscribed prop is undefined');
          }
          console.log('[Paywall] Calling onClose');
          onClose();
        },
        (error: any) => {
          console.error('[Paywall] Subscription error:', error);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('[Paywall] Subscribe error:', error);
      setLoading(false);
    }
  };

  const features = [
    t('paywall.features.unlimited') || 'Unlimited AI food analysis',
    t('paywall.features.diets') || 'Access to all diets & lifestyles',
    t('paywall.features.insights') || 'Advanced nutrition insights',
    t('paywall.features.support') || 'Priority support',
  ];

  if (!showModal) return null;

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlayContainer}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.background,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Handle bar for visual cue */}
          <View style={styles.dragHandle} />

          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surfaceMuted || colors.surfaceSecondary }]}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#7C3AED', '#5B21B6']}
              style={styles.iconContainer}
            >
              <Ionicons name="star" size={32} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('paywall.title') || 'Upgrade to Pro'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {featureName
                ? t('paywall.unlockFeature', { feature: featureName }) || `Unlock "${featureName}" and more`
                : t('paywall.subtitle') || 'Get unlimited access to all features'}
            </Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={[styles.featureIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Trial badge - shown only if eligible (Apple handles actual eligibility) */}
          {isTrialEligible && (
            <View style={[styles.trialBadge, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="gift-outline" size={20} color={colors.primary} />
              <Text style={[styles.trialBadgeText, { color: colors.primary }]}>
                {t('paywall.trialBadge', { days: TRIAL_DAYS.SHORT }) || `${TRIAL_DAYS.SHORT} days free trial`}
              </Text>
            </View>
          )}

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButtonContainer}
            onPress={handleSubscribe}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7C3AED', '#5B21B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name={isTrialEligible ? 'flash' : 'card-outline'}
                    size={18}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.ctaText}>
                    {isTrialEligible
                      ? (t('paywall.tryFree', { days: TRIAL_DAYS.SHORT }) || `Try free for ${TRIAL_DAYS.SHORT} days`)
                      : (t('paywall.subscribeNow') || 'Subscribe Now')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Price info */}
          <Text style={[styles.priceInfo, { color: colors.textSecondary }]}>
            {isTrialEligible
              ? (t('paywall.priceAfterTrial', { price: iapPrice || formatPrice('monthly') }) || `Then ${iapPrice || formatPrice('monthly')}/month after trial`)
              : (t('paywall.priceMonthly', { price: iapPrice || formatPrice('monthly') }) || `${iapPrice || formatPrice('monthly')}/month`)}
          </Text>

          {/* Fine print */}
          <Text style={[styles.finePrint, { color: colors.textTertiary }]}>
            {isTrialEligible
              ? (t('paywall.finePrint') || 'Cancel anytime. You won\'t be charged during the trial period.')
              : (t('paywall.finePrintNoTrial') || 'Subscription renews monthly. Cancel anytime.')}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    // Add glow
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  features: {
    marginBottom: 32,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  trialBadgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  ctaButtonContainer: {
    width: '100%',
    borderRadius: 16,
    marginBottom: 16,
    // Premium shadow
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButton: {
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  priceInfo: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  finePrint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
  },
});
