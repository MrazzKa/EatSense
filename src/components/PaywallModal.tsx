/**
 * PaywallModal - Shows subscription offer when user tries to access premium content
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { TRIAL_DAYS } from '../config/freeContent';
import IAPService from '../services/iapService';
import ApiService from '../services/apiService';
import { SUBSCRIPTION_SKUS } from '../config/subscriptions';

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
  const [selectedTrial, setSelectedTrial] = useState<number>(TRIAL_DAYS.STANDARD);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      // Note: The trial period is handled by Apple/Google IAP system
      // When user subscribes to monthly plan, they get the selected trial days automatically
      // The backend will track the trial period based on subscription start date
      await IAPService.purchaseSubscription(
        SUBSCRIPTION_SKUS.MONTHLY,
        async (productId) => {
          console.log('[Paywall] Subscription successful:', productId);
          // Verify purchase with backend to ensure trial period is tracked
          try {
            await ApiService.verifyPurchase({
              productId,
              platform: Platform.OS === 'ios' ? 'ios' : 'android',
              trialDays: selectedTrial,
            });
          } catch (verifyError) {
            console.error('[Paywall] Verify purchase error:', verifyError);
            // Continue anyway - purchase was successful
          }
          setLoading(false);
          onSubscribed?.();
          onClose();
        },
        (error) => {
          console.error('[Paywall] Subscription error:', error);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('[Paywall] Start trial error:', error);
      setLoading(false);
    }
  };

  const features = [
    t('paywall.features.unlimited') || 'Unlimited AI food analysis',
    t('paywall.features.diets') || 'Access to all diets & lifestyles',
    t('paywall.features.insights') || 'Advanced nutrition insights',
    t('paywall.features.support') || 'Priority support',
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="star" size={32} color={colors.primary} />
            </View>
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
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Trial selection */}
          <View style={styles.trialOptions}>
            <TouchableOpacity
              style={[
                styles.trialOption,
                {
                  backgroundColor: selectedTrial === TRIAL_DAYS.SHORT
                    ? colors.primary + '15'
                    : colors.surfaceSecondary,
                  borderColor: selectedTrial === TRIAL_DAYS.SHORT
                    ? colors.primary
                    : 'transparent',
                },
              ]}
              onPress={() => setSelectedTrial(TRIAL_DAYS.SHORT)}
            >
              <Text style={[styles.trialDays, { color: colors.textPrimary }]}>
                {TRIAL_DAYS.SHORT} {t('common.days') || 'days'}
              </Text>
              <Text style={[styles.trialLabel, { color: colors.textSecondary }]}>
                {t('paywall.freeTrial') || 'Free trial'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.trialOption,
                styles.trialOptionRecommended,
                {
                  backgroundColor: selectedTrial === TRIAL_DAYS.STANDARD
                    ? colors.primary + '15'
                    : colors.surfaceSecondary,
                  borderColor: selectedTrial === TRIAL_DAYS.STANDARD
                    ? colors.primary
                    : 'transparent',
                },
              ]}
              onPress={() => setSelectedTrial(TRIAL_DAYS.STANDARD)}
            >
              <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.recommendedText}>
                  {t('paywall.recommended') || 'Recommended'}
                </Text>
              </View>
              <Text style={[styles.trialDays, { color: colors.textPrimary }]}>
                {TRIAL_DAYS.STANDARD} {t('common.days') || 'days'}
              </Text>
              <Text style={[styles.trialLabel, { color: colors.textSecondary }]}>
                {t('paywall.freeTrial') || 'Free trial'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={handleStartTrial}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.ctaText}>
                {t('paywall.startTrial', { days: selectedTrial }) || `Start ${selectedTrial}-Day Free Trial`}
              </Text>
            )}
          </TouchableOpacity>

          {/* Fine print */}
          <Text style={[styles.finePrint, { color: colors.textTertiary }]}>
            {t('paywall.finePrint') || 'Cancel anytime. You won\'t be charged during the trial period.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    marginLeft: 12,
  },
  trialOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  trialOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  trialOptionRecommended: {
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  trialDays: {
    fontSize: 20,
    fontWeight: '700',
  },
  trialLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  ctaButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  finePrint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
