import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Switch, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/apiService';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { clientLog } from '../utils/clientLog';
import AppCard from '../components/common/AppCard';
import PrimaryButton from '../components/common/PrimaryButton';

const ProfileScreen = () => {
  const { t, language, changeLanguage, availableLanguages } = useI18n();
  const themeContext = useTheme();
  const authContext = useAuth();
  
  const tokens = themeContext?.tokens || {};
  const colors = themeContext?.colors || {};
  const isDark = themeContext?.isDark || false;
  const themeMode = themeContext?.themeMode || 'light';
  
  const toggleTheme = useCallback((mode) => {
    if (themeContext?.toggleTheme && typeof themeContext.toggleTheme === 'function') {
      themeContext.toggleTheme(mode);
    }
  }, [themeContext]);
  
  const signOut = useCallback(async () => {
    if (authContext?.signOut && typeof authContext.signOut === 'function') {
      await authContext.signOut();
    }
  }, [authContext]);
  
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const safeT = useCallback((key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  }, [t]);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    height: 0,
    weight: 0,
    age: 0,
    dailyCalories: 0,
    preferences: null,
  });
  const [subscription, setSubscription] = useState({
    planId: 'free',
    billingCycle: 'lifetime',
  });
  const [goal, setGoal] = useState('maintain_weight');
  const [dietPreferences, setDietPreferences] = useState([]);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [pendingPlan, setPendingPlan] = useState('free');
  const deviceTimezone = useMemo(() => {
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return tz || 'UTC';
      }
    } catch (e) {
    }
    return 'UTC';
  }, []);
  const [notificationPreferences, setNotificationPreferences] = useState(
    () => ({
      dailyPushEnabled: false,
      dailyPushHour: 8,
      timezone: deviceTimezone,
    }),
  );
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const initials = useMemo(() => {
    const parts = [profile.firstName, profile.lastName].filter(Boolean);
    if (parts.length === 0 && profile.email) {
      return profile.email.charAt(0).toUpperCase();
    }
    if (parts.length === 0) {
      return 'ES';
    }
    return parts
      .map((value) => value.trim().charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }, [profile.firstName, profile.lastName, profile.email]);

  const bmi = useMemo(() => {
    if (profile.height > 0 && profile.weight > 0) {
      const heightInMeters = profile.height / 100;
      return profile.weight / (heightInMeters * heightInMeters);
    }
    return null;
  }, [profile.height, profile.weight]);

  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    if (bmi < 18.5) return safeT('profile.bmiUnderweight', 'Underweight');
    if (bmi < 25) return safeT('profile.bmiNormal', 'Normal');
    if (bmi < 30) return safeT('profile.bmiOverweight', 'Overweight');
    return safeT('profile.bmiObesity', 'Obesity');
  }, [bmi, safeT]);

  const loadProfile = useCallback(async () => {
    try {
      const result = await ApiService.getUserProfile();
      if (result) {
        const userProfile = result.userProfile || result.profile || {};
        const preferences =
          userProfile.preferences ||
          result.preferences ||
          null;
        const subscriptionPref =
          preferences?.subscription || {};
        setProfile({
          firstName: userProfile.firstName || result.firstName || '',
          lastName: userProfile.lastName || result.lastName || '',
          email: result.email || '',
          height: userProfile.height || result.height || 0,
          weight: userProfile.weight || result.weight || 0,
          age: userProfile.age || result.age || 0,
          dailyCalories: userProfile.dailyCalories || result.dailyCalories || 0,
          preferences,
        });
        setSubscription({
          planId: subscriptionPref.planId || 'free',
          billingCycle:
            subscriptionPref.billingCycle ||
            (subscriptionPref.planId === 'free' ? 'lifetime' : 'monthly'),
        });
        setPendingPlan(subscriptionPref.planId || 'free');
        
        const goalPref = preferences?.goal || 'maintain_weight';
        const dietsPref = Array.isArray(preferences?.diets) ? preferences.diets : [];
        setGoal(goalPref);
        setDietPreferences(dietsPref);
      }
    } catch (error) {
      console.warn('Unable to load profile, using demo data.', error);
      setProfile({
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@eatsense.ch',
        height: 170,
        weight: 70,
        age: 28,
        dailyCalories: 2000,
        preferences: null,
      });
      setSubscription({
        planId: 'free',
        billingCycle: 'lifetime',
      });
      setPendingPlan('free');
      setGoal('maintain_weight');
      setDietPreferences([]);
    }
  }, []);

  const loadNotificationPreferences = useCallback(async () => {
    try {
      setNotificationLoading(true);
      const prefs = await ApiService.getNotificationPreferences();
      if (prefs) {
        setNotificationPreferences({
          dailyPushEnabled: !!prefs.dailyPushEnabled,
          dailyPushHour: typeof prefs.dailyPushHour === 'number' ? prefs.dailyPushHour : 8,
          timezone: prefs.timezone || deviceTimezone,
        });
      }
    } catch (error) {
      console.warn('Unable to load notification preferences', error);
      setNotificationPreferences((prev) => ({ ...prev, timezone: deviceTimezone }));
    } finally {
      setNotificationLoading(false);
    }
  }, [deviceTimezone]);

  useEffect(() => {
    loadProfile();
    loadNotificationPreferences();
  }, [loadProfile, loadNotificationPreferences]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedProfile = {
        ...profile,
        preferences: {
          ...(profile.preferences || {}),
          goal,
          diets: dietPreferences,
          subscription: {
            ...(profile.preferences?.subscription || {}),
            planId: subscription.planId,
            billingCycle: subscription.billingCycle,
          },
        },
      };
      await ApiService.updateUserProfile(updatedProfile);
      setProfile(updatedProfile);
      setEditing(false);
      // Reload profile to get updated data and recalculate BMI
      await loadProfile();
      Alert.alert(safeT('profile.savedTitle', 'Saved'), safeT('profile.savedMessage', 'Profile updated successfully'));
    } catch (error) {
      console.error('Profile update failed', error);
      Alert.alert(safeT('profile.errorTitle', 'Error'), safeT('profile.errorMessage', 'Failed to update profile'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reload original profile data to discard changes
    loadProfile();
    setEditing(false);
  };

  const reminderOptions = [6, 8, 12, 18, 20];

  const planOptions = [
    {
      id: 'free',
      billingCycle: 'lifetime',
      price: 0,
      featureKeys: ['limitedAnalyses', 'calorieTracking', 'basicStats'],
      badgeKey: 'included',
    },
    {
      id: 'pro_monthly',
      billingCycle: 'monthly',
      price: 9.99,
      featureKeys: ['unlimitedAnalyses', 'advancedInsights', 'coachingTips'],
      badgeKey: 'mostPopular',
    },
    {
      id: 'pro_annual',
      billingCycle: 'annual',
      price: 79.99,
      featureKeys: ['everythingInProMonthly', 'annualWebinars', 'earlyAccess'],
      badgeKey: 'save33',
    },
  ];

  // Always use USD for plans
  const getCurrencySymbol = () => '$';

  const getPlanDetails = (planId) => {
    const basePlan = planOptions.find((plan) => plan.id === planId) || planOptions[0];
    const currency = getCurrencySymbol(); // Always USD

    const name =
      basePlan.id === 'free'
        ? safeT('profile.planFreeName', 'EatSense Free')
        : safeT('profile.planProName', 'EatSense Pro');

    let priceText;
    if (basePlan.id === 'free') {
      priceText = safeT('profile.planFreePrice', 'Free');
    } else if (basePlan.billingCycle === 'monthly') {
      priceText = safeT('profile.planMonthlyPrice', '{{price}} / month').replace(
        '{{price}}',
        `${currency}${basePlan.price.toFixed(2)}`,
      );
    } else {
      priceText = safeT('profile.planAnnualPrice', '{{price}} / year').replace(
        '{{price}}',
        `${currency}${basePlan.price.toFixed(2)}`,
      );
    }

    const description =
      basePlan.id === 'free'
        ? safeT('profile.planFreeDescription', 'Start tracking meals with essential features.')
        : basePlan.billingCycle === 'monthly'
        ? safeT('profile.planProMonthlyDescription', 'Unlock unlimited AI tools with flexible billing.')
        : safeT('profile.planProAnnualDescription', 'Best value — save 33% vs monthly billing.');

    const features =
      (basePlan.featureKeys || []).map((key) =>
        safeT(`profile.planFeatures.${key}`, key),
      ) || [];

    const badge =
      basePlan.id === 'free'
        ? safeT('profile.planBadges.included', 'Included')
        : basePlan.id === 'pro_monthly'
        ? safeT('profile.planBadges.mostPopular', 'Most Popular')
        : safeT('profile.planBadges.save33', 'Save 33%');

    return {
      ...basePlan,
      name,
      priceText,
      description,
      features,
      badge,
    };
  };

  const formatReminderTime = (hour) => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date.toLocaleTimeString(language || 'en', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleNotificationToggle = async (value) => {
    try {
      setNotificationSaving(true);
      const updated = await ApiService.updateNotificationPreferences({
        dailyPushEnabled: value,
        timezone: notificationPreferences.timezone || deviceTimezone,
        dailyPushHour: notificationPreferences.dailyPushHour,
      });
      setNotificationPreferences({
        dailyPushEnabled: !!updated.dailyPushEnabled,
        dailyPushHour: typeof updated.dailyPushHour === 'number' ? updated.dailyPushHour : notificationPreferences.dailyPushHour,
        timezone: updated.timezone || notificationPreferences.timezone || deviceTimezone,
      });
    } catch (error) {
      console.error('Failed to update push preferences', error);
      Alert.alert(safeT('profile.notificationsErrorTitle', 'Error'), safeT('profile.notificationsErrorMessage', 'Failed to update notifications'));
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleNotificationHourChange = async () => {
    const currentIndex = reminderOptions.indexOf(notificationPreferences.dailyPushHour);
    const nextHour = reminderOptions[(currentIndex + 1 + reminderOptions.length) % reminderOptions.length];
    try {
      setNotificationSaving(true);
      const updated = await ApiService.updateNotificationPreferences({
        dailyPushEnabled: notificationPreferences.dailyPushEnabled,
        dailyPushHour: nextHour,
        timezone: notificationPreferences.timezone || deviceTimezone,
      });
      setNotificationPreferences({
        dailyPushEnabled: !!updated.dailyPushEnabled,
        dailyPushHour: typeof updated.dailyPushHour === 'number' ? updated.dailyPushHour : nextHour,
        timezone: updated.timezone || notificationPreferences.timezone || deviceTimezone,
      });
    } catch (error) {
      console.error('Failed to update reminder hour', error);
      Alert.alert(safeT('profile.notificationsErrorTitle', 'Error'), safeT('profile.notificationsErrorMessage', 'Failed to update notifications'));
    } finally {
      setNotificationSaving(false);
    }
  };

  const handlePlanChange = async (planId) => {
    const selectedPlan = planOptions.find((plan) => plan.id === planId);
    if (!selectedPlan) {
      return;
    }
    try {
      setPlanSaving(true);
      await ApiService.updateUserProfile({
        preferences: {
          ...(profile.preferences || {}),
          goal,
          diets: dietPreferences,
          subscription: {
            ...(profile.preferences?.subscription || {}),
            planId: selectedPlan.id,
            billingCycle: selectedPlan.billingCycle,
          },
        },
      });
      setProfile(prev => ({
        ...prev,
        preferences: {
          ...(prev.preferences || {}),
          subscription: {
            ...(prev.preferences?.subscription || {}),
            planId: selectedPlan.id,
            billingCycle: selectedPlan.billingCycle,
          },
        },
      }));
      setSubscription({
        planId: selectedPlan.id,
        billingCycle: selectedPlan.billingCycle,
      });
      setPendingPlan(selectedPlan.id);
      setPlanModalVisible(false);
      Alert.alert(
        safeT('profile.planUpdatedTitle', 'Plan updated'),
        safeT('profile.planUpdatedMessage', 'Your subscription preference has been saved.')
      );
    } catch (error) {
      console.error('Failed to update plan', error);
      Alert.alert(
        safeT('profile.errorTitle', 'Error'),
        safeT('profile.planUpdateError', 'Unable to update plan right now.')
      );
    } finally {
      setPlanSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      safeT('profile.deleteAccountTitle', 'Delete Account'),
      safeT('profile.deleteAccountMessage', 'Are you sure you want to delete your account? This action cannot be undone.'),
      [
        {
          text: safeT('profile.deleteAccountCancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: safeT('profile.deleteAccountConfirm', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              if (ApiService && typeof ApiService.deleteAccount === 'function') {
                await ApiService.deleteAccount();
              } else {
                await clientLog('Profile:deleteAccountNotAvailable').catch(() => {});
              }
              
              if (ApiService && typeof ApiService.setToken === 'function') {
                await ApiService.setToken(null, null);
              }
              
              if (signOut && typeof signOut === 'function') {
                await signOut();
              } else {
                await clientLog('Profile:signOutNotAvailable').catch(() => {});
              }
              
              Alert.alert(safeT('profile.deleteAccountSuccess', 'Account deleted'), '', [
                {
                  text: 'OK',
                  onPress: () => {
                  },
                },
              ]);
            } catch (error) {
              console.error('[ProfileScreen] Failed to delete account:', error);
              await clientLog('Profile:deleteAccountError', {
                message: error?.message || String(error),
              }).catch(() => {});
              Alert.alert(
                safeT('profile.errorTitle', 'Error'),
                safeT('profile.deleteAccountError', 'Failed to delete account')
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const toggleDietPreference = (dietId) => {
    setDietPreferences(prev => {
      if (prev.includes(dietId)) {
        return prev.filter(id => id !== dietId);
      }
      return [...prev, dietId];
    });
  };

  const metrics = [
    { label: t('profile.metricWeight'), value: `${profile.weight || '--'} kg`, icon: 'barbell' },
    { label: t('profile.metricHeight'), value: `${profile.height || '--'} cm`, icon: 'body' },
    { label: t('profile.metricAge'), value: `${profile.age || '--'}`, icon: 'calendar' },
    { label: t('profile.metricCalories'), value: `${profile.dailyCalories || '--'} kcal`, icon: 'flame' },
  ];

  if (bmi !== null) {
    metrics.push({
      label: bmiCategory ? `${safeT('profile.metricBmi', 'BMI')} (${bmiCategory})` : safeT('profile.metricBmi', 'BMI'),
      value: bmi.toFixed(1),
      icon: 'fitness',
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View>
          <AppCard style={styles.heroCard} padding="xl">
            <View style={styles.heroHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroEyebrow}>{t('profile.welcomeBack')}</Text>
                <Text style={styles.heroTitle}>
                  {profile.firstName || t('profile.defaultName')} {profile.lastName}
                </Text>
                <Text style={styles.heroSubtitle}>{profile.email}</Text>
              </View>
            </View>
            <View style={styles.metricsRow}>
              {(metrics || []).map((metric) => (
                <View
                  key={metric.label}
                  style={styles.metricWrapper}
                >
                  <View style={styles.metricCard}>
                    <View style={styles.metricIcon}>
                      <Ionicons name={metric.icon} size={18} color={tokens.colors.primary} />
                    </View>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                  </View>
                </View>
              ))}
            </View>
            <PrimaryButton
              title={editing ? t('common.save') : t('profile.editProfile')}
              onPress={editing && typeof handleSave === 'function' ? handleSave : typeof setEditing === 'function' ? () => setEditing(true) : () => {}}
              loading={loading}
              style={styles.heroButton}
            />
          </AppCard>
        </View>

        <AppCard style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.sectionTitle}>
              {safeT('profile.subscriptionTitle', 'Subscription')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setPendingPlan(subscription.planId);
                setPlanModalVisible(true);
              }}
            >
              <Text style={styles.planChangeText}>
                {safeT('profile.changePlan', 'Change plan')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.planSummary}>
            <View style={styles.planSummaryText}>
              <Text style={styles.planSummaryName}>
                {getPlanDetails(subscription.planId).name}
              </Text>
              <Text style={styles.planSummaryPrice}>
                {getPlanDetails(subscription.planId).priceText}
              </Text>
            </View>
          </View>
          <View style={styles.planSummaryFeatures}>
            {(getPlanDetails(subscription.planId).features || []).slice(0, 3).map((feature) => (
              <View key={feature} style={styles.planFeatureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={tokens.colors?.success ?? '#34C759'}
                />
                <Text style={styles.planFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.planMeta}>
            {subscription.billingCycle === 'annual'
              ? safeT('profile.billingAnnual', 'Billed annually')
              : subscription.billingCycle === 'monthly'
              ? safeT('profile.billingMonthly', 'Billed monthly')
              : safeT('profile.billingFree', 'Free forever')}
          </Text>
        </AppCard>

        <Modal
          visible={editing}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={handleCancel}
        >
          <SafeAreaView style={[styles.editModalContainer, { backgroundColor: tokens.colors.background }]}>
            <View style={[styles.editModalHeader, { borderBottomColor: tokens.colors.border }]}>
              <View style={styles.editModalCloseButton} />
              <Text style={[styles.editModalTitle, { color: tokens.colors.textPrimary }]}>
                {t('profile.editProfile') || 'Edit Profile'}
              </Text>
              <View style={styles.editModalCloseButton} />
            </View>
            <ScrollView style={styles.editModalContent} contentContainerStyle={styles.editModalContentInner}>
              <AppCard style={styles.formCard}>
                <Text style={styles.sectionTitle}>{t('profile.details')}</Text>
            <View style={styles.fieldRow}>
              <ProfileField
                label={t('profile.firstName')}
                value={profile.firstName}
                onChangeText={(text) => setProfile((prev) => ({ ...prev, firstName: text }))}
              />
              <ProfileField
                label={t('profile.lastName')}
                value={profile.lastName}
                onChangeText={(text) => setProfile((prev) => ({ ...prev, lastName: text }))}
              />
            </View>
            <ProfileField
              label={t('profile.email')}
              value={profile.email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(text) => setProfile((prev) => ({ ...prev, email: text }))}
            />
            <View style={styles.fieldRow}>
              <ProfileField
                label={t('profile.weight')}
                value={profile.weight ? String(profile.weight) : ''}
                keyboardType="numeric"
                onChangeText={(text) => setProfile((prev) => ({ ...prev, weight: parseFloat(text) || 0 }))}
              />
              <ProfileField
                label={t('profile.height')}
                value={profile.height ? String(profile.height) : ''}
                keyboardType="numeric"
                onChangeText={(text) => setProfile((prev) => ({ ...prev, height: parseFloat(text) || 0 }))}
              />
            </View>
            <View style={styles.fieldRow}>
              <ProfileField
                label={t('profile.age')}
                value={profile.age ? String(profile.age) : ''}
                keyboardType="numeric"
                onChangeText={(text) => setProfile((prev) => ({ ...prev, age: parseInt(text, 10) || 0 }))}
              />
              <ProfileField
                label={t('profile.dailyCalories')}
                value={profile.dailyCalories ? String(profile.dailyCalories) : ''}
                keyboardType="numeric"
                onChangeText={(text) => setProfile((prev) => ({ ...prev, dailyCalories: parseInt(text, 10) || 0 }))}
              />
            </View>

            <View style={styles.goalsSection}>
              <Text style={styles.sectionTitle}>{safeT('profile.goalsTitle', 'Goals & diet')}</Text>
              
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{safeT('profile.goalLabel', 'Goal')}</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, goal === 'lose_weight' && styles.chipActive]}
                    onPress={() => setGoal('lose_weight')}
                  >
                    <Text style={[styles.chipLabel, goal === 'lose_weight' && styles.chipLabelActive]}>
                      {safeT('profile.goalLoseWeight', 'Lose weight')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, goal === 'maintain_weight' && styles.chipActive]}
                    onPress={() => setGoal('maintain_weight')}
                  >
                    <Text style={[styles.chipLabel, goal === 'maintain_weight' && styles.chipLabelActive]}>
                      {safeT('profile.goalMaintainWeight', 'Maintain weight')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, goal === 'gain_muscle' && styles.chipActive]}
                    onPress={() => setGoal('gain_muscle')}
                  >
                    <Text style={[styles.chipLabel, goal === 'gain_muscle' && styles.chipLabelActive]}>
                      {safeT('profile.goalGainMuscle', 'Gain muscle')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>{safeT('profile.dietLabel', 'Diet type')}</Text>
                <View style={styles.chipWrap}>
                  <TouchableOpacity
                    style={[styles.chip, dietPreferences.includes('balanced') && styles.chipActive]}
                    onPress={() => toggleDietPreference('balanced')}
                  >
                    <Text style={[styles.chipLabel, dietPreferences.includes('balanced') && styles.chipLabelActive]}>
                      {safeT('profile.dietBalanced', 'Balanced')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, dietPreferences.includes('high_protein') && styles.chipActive]}
                    onPress={() => toggleDietPreference('high_protein')}
                  >
                    <Text style={[styles.chipLabel, dietPreferences.includes('high_protein') && styles.chipLabelActive]}>
                      {safeT('profile.dietHighProtein', 'High protein')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, dietPreferences.includes('low_carb') && styles.chipActive]}
                    onPress={() => toggleDietPreference('low_carb')}
                  >
                    <Text style={[styles.chipLabel, dietPreferences.includes('low_carb') && styles.chipLabelActive]}>
                      {safeT('profile.dietLowCarb', 'Low carb')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, dietPreferences.includes('mediterranean') && styles.chipActive]}
                    onPress={() => toggleDietPreference('mediterranean')}
                  >
                    <Text style={[styles.chipLabel, dietPreferences.includes('mediterranean') && styles.chipLabelActive]}>
                      {safeT('profile.dietMediterranean', 'Mediterranean')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, dietPreferences.includes('plant_based') && styles.chipActive]}
                    onPress={() => toggleDietPreference('plant_based')}
                  >
                    <Text style={[styles.chipLabel, dietPreferences.includes('plant_based') && styles.chipLabelActive]}>
                      {safeT('profile.dietPlantBased', 'Plant-based')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
              </AppCard>
            </ScrollView>
            <View style={[styles.editModalFooter, { borderTopColor: tokens.colors.border, backgroundColor: tokens.colors.surface }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: tokens.colors.borderMuted }]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, { color: tokens.colors.textSecondary }]}>
                  {t('common.cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <PrimaryButton
                title={t('common.save')}
                onPress={typeof handleSave === 'function' ? handleSave : () => {}}
                loading={loading}
                style={styles.formSaveButton}
              />
            </View>
          </SafeAreaView>
        </Modal>

        <AppCard style={styles.preferencesCard}>
          <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>{t('profile.language')}</Text>
            <View style={styles.languageSelectorContainer}>
              <LanguageSelector
                selectedLanguage={language}
                languages={availableLanguages}
                onLanguageChange={changeLanguage}
              />
            </View>
          </View>
          <View style={[styles.preferenceRow, styles.themeRow]}>
            <View>
              <Text style={styles.preferenceLabel}>{t('profile.theme')}</Text>
              <Text style={styles.preferenceCaption}>
                {themeMode === 'system' ? t('profile.systemTheme') : isDark ? t('profile.darkModeSubtitle') : t('profile.lightMode')}
              </Text>
            </View>
            <View style={styles.themeToggles}>
              <TouchableOpacity
                style={[styles.themeChip, !isDark && styles.themeChipActive]}
                onPress={() => {
                  if (typeof toggleTheme === 'function') {
                    toggleTheme('light');
                  }
                }}
              >
                <Ionicons name="partly-sunny" size={18} color={!isDark ? tokens.colors.onPrimary : tokens.colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeChip, isDark && styles.themeChipActive]}
                onPress={() => {
                  if (typeof toggleTheme === 'function') {
                    toggleTheme('dark');
                  }
                }}
              >
                <Ionicons name="moon" size={18} color={isDark ? tokens.colors.onPrimary : tokens.colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeChip, themeMode === 'system' && styles.themeChipActive]}
                onPress={() => {
                  if (typeof toggleTheme === 'function') {
                    toggleTheme('system');
                  }
                }}
              >
                <Ionicons name="phone-portrait" size={18} color={themeMode === 'system' ? tokens.colors.onPrimary : tokens.colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.preferenceRow}>
            <View style={styles.notificationCopy}>
              <Text style={styles.preferenceLabel}>{t('profile.notificationsDailyTitle')}</Text>
              <Text style={styles.notificationDescription}>
                {notificationPreferences.dailyPushEnabled
                  ? t('profile.notificationsDailyDescription', {
                      time: formatReminderTime(notificationPreferences.dailyPushHour),
                    })
                  : t('profile.notificationsDailyDisabled')}
              </Text>
              {notificationPreferences.dailyPushEnabled && (
                <TouchableOpacity
                  style={styles.notificationTimeButton}
                  onPress={handleNotificationHourChange}
                  disabled={notificationSaving}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time" size={16} color={tokens.colors.primary} />
                  <Text style={styles.notificationTimeText}>
                    {t('profile.notificationsChangeTime', {
                      time: formatReminderTime(notificationPreferences.dailyPushHour),
                    })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Switch
              value={notificationPreferences.dailyPushEnabled}
              onValueChange={(value) => handleNotificationToggle(value)}
              trackColor={{ false: tokens.colors.borderMuted, true: tokens.colors.primary }}
              thumbColor={tokens.states.primary.on}
              disabled={notificationLoading || notificationSaving}
            />
          </View>
        </AppCard>

        <AppCard style={styles.dangerCard}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>{t('profile.deleteAccount')}</Text>
          <Text style={styles.dangerDescription}>{t('profile.deleteAccountMessage')}</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={typeof handleDeleteAccount === 'function' ? handleDeleteAccount : () => {}}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={18} color={tokens.colors.error} />
            <Text style={styles.dangerButtonText}>{t('profile.deleteAccount')}</Text>
          </TouchableOpacity>
        </AppCard>
      </ScrollView>

      <Modal
        visible={planModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !planSaving && setPlanModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: tokens.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {safeT('profile.choosePlan', 'Choose a plan')}
              </Text>
              <TouchableOpacity
                onPress={() => !planSaving && setPlanModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={tokens.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(planOptions || []).map((plan) => {
                const isSelected = pendingPlan === plan.id;
                const isCurrentPlan = subscription.planId === plan.id;
                const planDetails = getPlanDetails(plan.id);
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.modalPlanCard,
                      isSelected && styles.modalPlanCardSelected,
                      isCurrentPlan && styles.modalPlanCardCurrent,
                    ]}
                    activeOpacity={0.9}
                    onPress={() => !planSaving && !isCurrentPlan && setPendingPlan(plan.id)}
                    disabled={isCurrentPlan}
                  >
                    <View style={styles.modalPlanHeader}>
                      <View>
                        <Text style={styles.modalPlanName}>{planDetails.name}</Text>
                        <Text style={styles.modalPlanPrice}>{planDetails.priceText}</Text>
                      </View>
                      {planDetails.badge && (
                        <View style={styles.modalPlanBadge}>
                          <Text style={styles.modalPlanBadgeText}>
                            {planDetails.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.modalPlanDescription}>
                      {planDetails.description}
                    </Text>
                    <View style={styles.modalPlanFeatures}>
                      {(planDetails.features || []).map((feature, index) => (
                        <View key={`${plan.id}-feature-${index}`} style={styles.planFeatureRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={
                              isSelected ? tokens.states.primary.on : colors.primary
                            }
                          />
                          <Text
                            style={[
                              styles.planFeatureText,
                              isSelected && styles.planFeatureSelectedText,
                            ]}
                          >
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {isCurrentPlan && (
                      <Text style={styles.currentPlanLabel}>
                        {safeT('profile.currentPlan', 'Current plan')}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <PrimaryButton
              title={
                planSaving
                  ? safeT('profile.savingButton', 'Saving...')
                  : safeT('profile.applyPlan', 'Apply plan')
              }
              onPress={() => handlePlanChange(pendingPlan)}
              loading={planSaving}
              style={styles.modalApplyButton}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const ProfileField = ({ label, style, ...rest }) => {
  const tokens = useDesignTokens();
  const styles = useMemo(() => createFieldStyles(tokens), [tokens]);
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} {...rest} />
    </View>
  );
};

const createStyles = (tokens) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: tokens.colors.background,
    },
    container: {
      padding: tokens.spacing.xl,
      gap: tokens.spacing.xl,
    },
    heroCard: {
      gap: tokens.spacing.md,
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.lg,
    },
    heroInfo: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    heroEyebrow: {
      fontSize: 13,
      color: tokens.colors.textSubdued,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: tokens.colors.textPrimary,
    },
    heroSubtitle: {
      fontSize: 15,
      color: tokens.colors.textSecondary,
    },
    metricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.md,
      marginVertical: tokens.spacing.sm,
    },
    metricWrapper: {
      flexGrow: 1,
      minWidth: 140,
    },
    metricCard: {
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      backgroundColor: tokens.colors.card,
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      gap: tokens.spacing.xs,
      ...(tokens.states.cardShadow || tokens.elevations.xs),
    },
    metricIcon: {
      width: 32,
      height: 32,
      borderRadius: tokens.radii.full,
      backgroundColor: tokens.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricValue: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    metricLabel: {
      fontSize: 13,
      color: tokens.colors.textSecondary,
    },
    heroButton: {
      marginTop: tokens.spacing.md,
      alignSelf: 'flex-start',
    },
    planCard: {
      gap: tokens.spacing.md,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.sm,
    },
    planSummary: {
      marginBottom: tokens.spacing.sm,
    },
    planSummaryText: {
      flex: 1,
    },
    planSummaryName: {
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      color: tokens.colors.textPrimary,
    },
    planSummaryPrice: {
      fontSize: tokens.typography.headingL.fontSize,
      fontWeight: tokens.typography.headingL.fontWeight,
      color: tokens.colors.primary,
      marginTop: tokens.spacing.xs,
    },
    planSummaryFeatures: {
      gap: tokens.spacing.xs,
      marginBottom: tokens.spacing.sm,
    },
    planFeatureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    planFeatureText: {
      color: tokens.colors.textSecondary,
      fontSize: 13,
    },
    planMeta: {
      color: tokens.colors.textSecondary,
      fontSize: tokens.typography.caption.fontSize,
    },
    planChangeText: {
      fontSize: 14,
      fontWeight: '600',
      color: tokens.colors.primary,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: tokens.spacing.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: tokens.colors.surfacePrimary || tokens.colors.surface,
      borderRadius: tokens.radii.xl,
      maxHeight: '85%',
      width: '100%',
      maxWidth: 500,
      padding: tokens.spacing.xl,
      gap: tokens.spacing.lg,
      ...(tokens.states.cardShadow || tokens.elevations.md),
    },
    editModalContainer: {
      flex: 1,
    },
    editModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      borderBottomWidth: 1,
    },
    editModalTitle: {
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      flex: 1,
      textAlign: 'center',
    },
    editModalCloseButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editModalContent: {
      flex: 1,
    },
    editModalContentInner: {
      paddingHorizontal: tokens.spacing.xl,
      paddingTop: tokens.spacing.xxl,
      paddingBottom: tokens.spacing.xxxl,
      gap: tokens.spacing.lg,
    },
    editModalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      borderTopWidth: 1,
      gap: tokens.spacing.md,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      color: tokens.colors.textPrimary,
    },
    modalPlanCard: {
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.lg,
      marginBottom: tokens.spacing.md,
      gap: tokens.spacing.sm,
    },
    modalPlanCardSelected: {
      borderColor: tokens.colors.primary,
      backgroundColor: tokens.colors.primaryTint || tokens.colors.surfaceMuted,
    },
    modalPlanCardCurrent: {
      borderColor: tokens.colors.borderMuted,
      opacity: 0.8,
    },
    modalPlanHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalPlanName: {
      fontSize: tokens.typography.headingS.fontSize,
      fontWeight: tokens.typography.headingS.fontWeight,
      color: tokens.colors.textPrimary,
    },
    modalPlanPrice: {
      fontSize: tokens.typography.bodyStrong.fontSize,
      color: tokens.colors.primary,
      marginTop: tokens.spacing.xs,
    },
    modalPlanBadge: {
      backgroundColor: tokens.colors.primary,
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: tokens.spacing.xs / 2,
      borderRadius: tokens.radii.full,
    },
    modalPlanBadgeText: {
      color: tokens.states.primary.on,
      fontSize: tokens.typography.caption.fontSize,
      fontWeight: '600',
    },
    modalPlanDescription: {
      color: tokens.colors.textSecondary,
    },
    modalPlanFeatures: {
      gap: tokens.spacing.xs,
    },
    currentPlanLabel: {
      fontSize: tokens.typography.caption.fontSize,
      fontWeight: '600',
      color: tokens.colors.primary,
      marginTop: tokens.spacing.xs,
      textAlign: 'center',
    },
    modalApplyButton: {
      marginTop: tokens.spacing.sm,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: tokens.radii.full,
      backgroundColor: tokens.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      color: tokens.colors.primary,
    },
    formCard: {
      gap: tokens.spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
      marginBottom: tokens.spacing.md,
    },
    fieldRow: {
      flexDirection: 'row',
      gap: tokens.spacing.md,
    },
    formActions: {
      flexDirection: 'row',
      gap: tokens.spacing.md,
      marginTop: tokens.spacing.lg,
    },
    formSaveButton: {
      flex: 1,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    goalsSection: {
      gap: tokens.spacing.lg,
      marginTop: tokens.spacing.md,
    },
    subsection: {
      gap: tokens.spacing.sm,
    },
    subsectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    chipRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      flexWrap: 'wrap',
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
    },
    chip: {
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radii.pill,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      backgroundColor: tokens.colors.surface,
    },
    chipActive: {
      backgroundColor: tokens.colors.primary,
      borderColor: tokens.colors.primary,
    },
    chipLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: tokens.colors.textSecondary,
    },
    chipLabelActive: {
      color: tokens.colors.onPrimary,
    },
    preferencesCard: {
      gap: tokens.spacing.lg,
    },
    languageSelectorContainer: {
      flex: 1,
      marginLeft: tokens.spacing.md,
      maxWidth: '100%',
    },
    preferenceRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      backgroundColor: tokens.colors.card,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.lg,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    notificationCopy: {
      flex: 1,
      marginRight: tokens.spacing.lg,
      gap: tokens.spacing.xs,
    },
    preferenceLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    preferenceCaption: {
      fontSize: 13,
      color: tokens.colors.textSecondary,
      marginTop: 4,
    },
    themeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    themeToggles: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    themeChip: {
      width: 40,
      height: 40,
      borderRadius: tokens.radii.pill,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.states.surface.base ?? tokens.colors.surface,
    },
    themeChipActive: {
      backgroundColor: tokens.states.primary.base,
      borderColor: tokens.states.primary.border || tokens.states.primary.base,
    },
    notificationDescription: {
      fontSize: 13,
      color: tokens.colors.textSecondary,
    },
    notificationTimeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    notificationTimeText: {
      fontSize: 13,
      color: tokens.colors.primary,
      fontWeight: '500',
    },
    dangerCard: {
      gap: tokens.spacing.lg,
      borderWidth: 1,
      borderColor: tokens.colors.error + '33',
      backgroundColor: tokens.colors.error + '0A',
    },
    dangerTitle: {
      color: tokens.colors.error,
    },
    dangerDescription: {
      fontSize: tokens.typography.body.fontSize,
      lineHeight: tokens.typography.body.lineHeight,
      color: tokens.colors.textSecondary,
      marginBottom: tokens.spacing.md,
    },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radii.lg,
      borderWidth: 1,
      borderColor: tokens.colors.error,
      backgroundColor: 'transparent',
    },
    dangerButtonText: {
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
      color: tokens.colors.error,
    },
  });

const createFieldStyles = (tokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    label: {
      fontSize: 13,
      color: tokens.colors.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      borderRadius: tokens.radii.md,
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      backgroundColor: tokens.colors.inputBackground,
      color: tokens.colors.textPrimary,
      fontSize: 15,
    },
  });

export default ProfileScreen;
