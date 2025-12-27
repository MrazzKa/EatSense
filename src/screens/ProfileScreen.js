import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Switch, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import ApiService from '../services/apiService';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { LanguageSelector } from '../components/LanguageSelector';
// import { clientLog } from '../utils/clientLog'; // Unused
import AppCard from '../components/common/AppCard';
import PrimaryButton from '../components/common/PrimaryButton';
import { ProfileNumberRow } from '../components/ProfileNumberRow';
import { ProfileSegmentedControl } from '../components/ProfileSegmentedControl';
import { ProfileToggleRow } from '../components/ProfileToggleRow';
import { API_BASE_URL } from '../config/env';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { t, language, changeLanguage, availableLanguages } = useI18n();
  const themeContext = useTheme();
  const { signOut } = useAuth();

  const handleClearHealthData = useCallback(() => {
    Alert.alert(
      safeT('profile.health.clearTitle', 'Clear Health Data'),
      safeT('profile.health.clearMessage', 'Are you sure you want to clear all health parameters? This action cannot be undone.'),
      [
        {
          text: safeT('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: safeT('common.clear', 'Clear'),
          style: 'destructive',
          onPress: async () => {
            // Reset local state to defaults
            setHealthProfile({
              metabolic: {
                bodyFatPercent: undefined,
                waistCm: undefined,
                hipCm: undefined,
                whr: undefined,
                fatDistributionType: 'visceral',
              },
              eatingBehavior: {
                mealsPerDay: 3,
                snackingTendency: 'medium',
                eveningAppetite: true,
              },
              sleep: {
                sleepHours: 7.5,
                chronotype: 'late',
              },
              glp1Module: {
                isGlp1User: false,
                drugType: 'semaglutide',
                therapyGoal: 'preserve_muscle',
              },
              healthFocus: {
                sugarControl: false,
                cholesterol: false,
                inflammation: false,
                iron: false,
                microbiome: false,
                hormonalBalance: false,
              },
            });
            // Trigger auto-save if needed, or just let user save via modal?
            // Given the current flow, we might want to save immediately for clarity
            try {
              await ApiService.updateUserProfile({
                healthProfile: null // Sending null or empty object to clear? API might need specific handling, but let's try sending empty structure or just reset values.
                // Actually, simpler to just save the emptied profile
              });
              Alert.alert(safeT('common.success', 'Success'), safeT('profile.health.cleared', 'Health data cleared'));
            } catch (err) {
              console.error('Failed to clear health data', err);
              // Even if API fails, local state is cleared, user can try saving again
            }
          },
        },
      ]
    );
  }, [safeT]);

  const tokens = useMemo(() => themeContext?.tokens || {}, [themeContext?.tokens]);
  const colors = themeContext?.colors || {};
  const isDark = themeContext?.isDark || false;
  const themeMode = themeContext?.themeMode || 'light';

  const toggleTheme = useCallback((mode) => {
    if (themeContext?.toggleTheme && typeof themeContext.toggleTheme === 'function') {
      themeContext.toggleTheme(mode);
    }
  }, [themeContext]);


  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const safeT = useCallback((key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  }, [t]);

  const handleResetAppData = useCallback(async () => {
    Alert.alert(
      safeT('profile.resetAppDataTitle', 'Reset App Data'),
      safeT('profile.resetAppDataMessage', 'This will clear all app data and log you out. You will need to sign in again and complete onboarding. Continue?'),
      [
        {
          text: safeT('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: safeT('profile.resetAppDataConfirm', 'Reset'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear AsyncStorage
              await AsyncStorage.clear();

              // Clear SecureStore
              try {
                await SecureStore.deleteItemAsync('auth.refreshToken');
              } catch (e) {
                // Ignore errors
              }

              // Clear tokens from ApiService
              await ApiService.setToken(null, null);

              // Sign out - AuthContext will handle navigation via user state change
              await signOut();

              // Navigation will be handled automatically by App.js based on user state
              // No manual navigation needed - App.js listens to user changes
            } catch (error) {
              console.error('[ProfileScreen] Error resetting app data:', error);
              Alert.alert(
                safeT('common.error', 'Error'),
                safeT('profile.resetAppDataError', 'Failed to reset app data. Please try again.'),
              );
            }
          },
        },
      ],
    );
  }, [safeT, signOut, navigation]);

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
  const [healthProfile, setHealthProfile] = useState({
    metabolic: {
      bodyFatPercent: undefined,
      waistCm: undefined,
      hipCm: undefined,
      whr: undefined,
      fatDistributionType: 'visceral',
    },
    eatingBehavior: {
      mealsPerDay: 3,
      snackingTendency: 'medium',
      eveningAppetite: true,
    },
    sleep: {
      sleepHours: 7.5,
      chronotype: 'late',
    },
    glp1Module: {
      isGlp1User: false,
      drugType: 'semaglutide',
      therapyGoal: 'preserve_muscle',
    },
    healthFocus: {
      sugarControl: false,
      cholesterol: false,
      inflammation: false,
      iron: false,
      microbiome: false,
      hormonalBalance: false,
    },
  });
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [pendingPlan, setPendingPlan] = useState('free');
  const deviceTimezone = useMemo(() => {
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return tz || 'UTC';
      }
    } catch {
      // Ignore timezone detection errors
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
  const [showHealthDetails, setShowHealthDetails] = useState(false);
  const [chevronRotation] = useState(new Animated.Value(0));

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
        const healthProfile = userProfile.healthProfile || null;
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

        // Load healthProfile - properly map all fields from API
        if (healthProfile) {
          if (__DEV__) {
            console.log('[ProfileScreen] Health profile data received:', healthProfile);
          }
          setHealthProfile({
            metabolic: healthProfile.metabolic ? {
              bodyFatPercent: healthProfile.metabolic.bodyFatPercent ?? null,
              waistCm: healthProfile.metabolic.waistCm ?? null,
              hipCm: healthProfile.metabolic.hipCm ?? healthProfile.metabolic.hipsCm ?? null,
              whr: healthProfile.metabolic.whr ?? null,
              fatDistributionType: healthProfile.metabolic.fatDistributionType ?? healthProfile.metabolic.fatDistribution ?? 'visceral',
            } : {
              bodyFatPercent: null,
              waistCm: null,
              hipCm: null,
              whr: null,
              fatDistributionType: 'visceral',
            },
            eatingBehavior: healthProfile.eatingBehavior ? {
              mealsPerDay: healthProfile.eatingBehavior.mealsPerDay ?? 3,
              snackingTendency: healthProfile.eatingBehavior.snackingTendency ?? 'medium',
              eveningAppetite: healthProfile.eatingBehavior.eveningAppetite ?? true,
            } : {
              mealsPerDay: 3,
              snackingTendency: 'medium',
              eveningAppetite: true,
            },
            sleep: healthProfile.sleep ? {
              sleepHours: healthProfile.sleep.sleepHours ?? 7.5,
              chronotype: healthProfile.sleep.chronotype ?? 'late',
            } : {
              sleepHours: 7.5,
              chronotype: 'late',
            },
            glp1Module: healthProfile.glp1Module ? {
              isGlp1User: healthProfile.glp1Module.isGlp1User ?? false,
              drugType: healthProfile.glp1Module.drugType ?? healthProfile.glp1Module.medicationType ?? 'semaglutide',
              therapyGoal: healthProfile.glp1Module.therapyGoal ?? 'preserve_muscle',
            } : {
              isGlp1User: false,
              drugType: 'semaglutide',
              therapyGoal: 'preserve_muscle',
            },
            healthFocus: healthProfile.healthFocus || {
              sugarControl: false,
              cholesterol: false,
              inflammation: false,
              iron: false,
              microbiome: false,
              hormonalBalance: false,
            },
          });
        }
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
      // Validate email if provided (email is not sent to backend, but validate for UI consistency)
      const trimmedEmail = (profile.email || '').trim();
      if (trimmedEmail.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          Alert.alert(
            safeT('profile.errorTitle', 'Error'),
            safeT('profile.errors.invalidEmail', 'Please enter a valid email address.')
          );
          setLoading(false);
          return;
        }
      }

      // Sanitize profile data - only include fields that exist in UserProfile model
      // Exclude email (it's in User model, not UserProfile)
      const { email, ...profileWithoutEmail } = profile;

      // Normalize empty strings to null/undefined for optional fields
      const sanitizedProfile = {};

      // String fields: normalize empty strings
      if (profileWithoutEmail.firstName !== undefined) {
        sanitizedProfile.firstName = profileWithoutEmail.firstName?.trim() || undefined;
      }
      if (profileWithoutEmail.lastName !== undefined) {
        sanitizedProfile.lastName = profileWithoutEmail.lastName?.trim() || undefined;
      }

      // Number fields: only include if valid
      if (profileWithoutEmail.height !== undefined && profileWithoutEmail.height !== null && profileWithoutEmail.height > 0) {
        sanitizedProfile.height = Number(profileWithoutEmail.height);
      }
      if (profileWithoutEmail.weight !== undefined && profileWithoutEmail.weight !== null && profileWithoutEmail.weight > 0) {
        sanitizedProfile.weight = Number(profileWithoutEmail.weight);
      }
      if (profileWithoutEmail.age !== undefined && profileWithoutEmail.age !== null && profileWithoutEmail.age > 0) {
        sanitizedProfile.age = Number(profileWithoutEmail.age);
      }
      if (profileWithoutEmail.dailyCalories !== undefined && profileWithoutEmail.dailyCalories !== null && profileWithoutEmail.dailyCalories > 0) {
        sanitizedProfile.dailyCalories = Number(profileWithoutEmail.dailyCalories);
      }

      // Build preferences object
      const preferencesObj = {
        ...(profile.preferences || {}),
      };
      if (goal) {
        preferencesObj.goal = goal;
      }
      if (dietPreferences && dietPreferences.length > 0) {
        preferencesObj.diets = dietPreferences;
      }
      if (subscription.planId || subscription.billingCycle) {
        preferencesObj.subscription = {
          ...(profile.preferences?.subscription || {}),
          planId: subscription.planId,
          billingCycle: subscription.billingCycle,
        };
      }
      if (Object.keys(preferencesObj).length > 0) {
        sanitizedProfile.preferences = preferencesObj;
      }

      // Health profile
      if (healthProfile && Object.keys(healthProfile).length > 0) {
        sanitizedProfile.healthProfile = healthProfile;
      }

      await ApiService.updateUserProfile(sanitizedProfile);

      // Update local state (keep email in local state for display, but don't send to backend)
      setProfile({
        ...profileWithoutEmail,
        email: profile.email, // Keep email in local state
      });
      setEditing(false);

      // Reload profile to get updated data and recalculate BMI
      await loadProfile();
      Alert.alert(
        safeT('profile.savedTitle', 'Saved'),
        safeT('profile.savedMessage', 'Profile updated successfully')
      );
    } catch (error) {
      console.error('Profile update failed', error);
      Alert.alert(
        safeT('profile.errorTitle', 'Error'),
        safeT('profile.errors.updateFailed', 'Could not update profile. Please try again.')
      );
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
      // Ensure all values are properly typed
      const payload = {
        dailyPushEnabled: Boolean(value),
        timezone: (notificationPreferences.timezone || deviceTimezone || 'UTC').trim(),
        dailyPushHour: Number(notificationPreferences.dailyPushHour) || 8,
      };

      // Validate dailyPushHour is between 0-23
      if (payload.dailyPushHour < 0 || payload.dailyPushHour > 23) {
        payload.dailyPushHour = 8;
      }

      const updated = await ApiService.updateNotificationPreferences(payload);
      setNotificationPreferences({
        dailyPushEnabled: Boolean(updated.dailyPushEnabled),
        dailyPushHour: typeof updated.dailyPushHour === 'number' ? updated.dailyPushHour : notificationPreferences.dailyPushHour,
        timezone: (updated.timezone || notificationPreferences.timezone || deviceTimezone || 'UTC').trim(),
      });
    } catch (error) {
      console.error('Failed to update push preferences', error);
      Alert.alert(
        safeT('profile.notificationsErrorTitle', 'Error'),
        safeT('profile.notificationsErrorMessage', 'Failed to update notifications')
      );
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleNotificationHourChange = async () => {
    const currentIndex = reminderOptions.indexOf(notificationPreferences.dailyPushHour);
    const nextHour = reminderOptions[(currentIndex + 1 + reminderOptions.length) % reminderOptions.length];
    try {
      setNotificationSaving(true);
      // Ensure all values are properly typed
      const payload = {
        dailyPushEnabled: Boolean(notificationPreferences.dailyPushEnabled),
        dailyPushHour: Number(nextHour) || 8,
        timezone: (notificationPreferences.timezone || deviceTimezone || 'UTC').trim(),
      };

      // Validate dailyPushHour is between 0-23
      if (payload.dailyPushHour < 0 || payload.dailyPushHour > 23) {
        payload.dailyPushHour = 8;
      }

      const updated = await ApiService.updateNotificationPreferences(payload);
      setNotificationPreferences({
        dailyPushEnabled: Boolean(updated.dailyPushEnabled),
        dailyPushHour: typeof updated.dailyPushHour === 'number' ? updated.dailyPushHour : nextHour,
        timezone: (updated.timezone || notificationPreferences.timezone || deviceTimezone || 'UTC').trim(),
      });
    } catch (error) {
      console.error('Failed to update reminder hour', error);
      Alert.alert(
        safeT('profile.notificationsErrorTitle', 'Error'),
        safeT('profile.notificationsErrorMessage', 'Failed to update notifications')
      );
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


  const toggleDietPreference = (dietId) => {
    setDietPreferences(prev => {
      if (prev.includes(dietId)) {
        return prev.filter(id => id !== dietId);
      }
      return [...prev, dietId];
    });
  };

  const handleOpenPolicy = () => {
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('PrivacyPolicy');
    }
  };

  const handleOpenTerms = () => {
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('TermsOfService');
    }
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
                <Text style={styles.heroEyebrow}>{safeT('profile.welcomeBack', 'Welcome back')}</Text>
                <Text style={styles.heroTitle}>
                  {profile.firstName || safeT('profile.defaultName', 'User')} {profile.lastName}
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
              title={editing ? safeT('common.save', 'Save') : safeT('profile.editProfile', 'Edit Profile')}
              onPress={editing && typeof handleSave === 'function' ? handleSave : typeof setEditing === 'function' ? () => setEditing(true) : () => { }}
              loading={loading}
              style={styles.heroButton}
            />
          </AppCard>
        </View>

        {/* Health Profile Summary - Under Edit Profile */}
        <AppCard style={styles.healthSection}>
          <View style={styles.healthSummaryHeader}>
            <View style={styles.healthSummaryContent}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary || tokens.colors.textPrimary }]}>
                {safeT('profile.health.advanced', 'Расширенные параметры здоровья')}
              </Text>
              <Text style={[styles.healthSummaryText, { color: colors.textSecondary }]}>
                {(() => {
                  const parts = [];
                  if (healthProfile.metabolic?.bodyFatPercent) parts.push(`${healthProfile.metabolic.bodyFatPercent}% жира`);
                  if (healthProfile.metabolic?.waistCm) parts.push(`Талия ${healthProfile.metabolic.waistCm} см`);
                  if (healthProfile.sleep?.sleepHours) parts.push(`Сон ${healthProfile.sleep.sleepHours} ч`);
                  const focusAreas = Object.entries(healthProfile.healthFocus || {})
                    .filter(([, val]) => val === true)
                    .map(([key]) => {
                      const keyMap = {
                        sugarControl: safeT('profile.health.focus.sugarControl', 'Контроль сахара'),
                        cholesterol: safeT('profile.health.focus.cholesterol', 'Холестерин'),
                        inflammation: safeT('profile.health.focus.inflammation', 'Воспаление'),
                        iron: safeT('profile.health.focus.iron', 'Железо'),
                        microbiome: safeT('profile.health.focus.microbiome', 'Микробиом'),
                        hormonalBalance: safeT('profile.health.focus.hormonalBalance', 'Гормоны'),
                      };
                      return keyMap[key] || key;
                    });
                  if (focusAreas.length > 0) parts.push(`${safeT('profile.health.focusAreas', 'Цели')}: ${focusAreas.slice(0, 2).join(', ')}${focusAreas.length > 2 ? '...' : ''}`);
                  return parts.length > 0 ? parts.join(' • ') : safeT('profile.health.noData', 'Нет данных');
                })()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editHealthButton}
              onPress={() => {
                if (__DEV__) {
                  console.log('[ProfileScreen] Toggling health details, current state:', showHealthDetails);
                }
                const toValue = showHealthDetails ? 0 : 1;
                Animated.timing(chevronRotation, {
                  toValue,
                  duration: 250,
                  useNativeDriver: true,
                }).start();
                setShowHealthDetails(!showHealthDetails);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.editHealthButtonContent}>
                <Text style={[styles.editHealthButtonText, { color: colors.primary }]}>
                  {showHealthDetails ? safeT('common.hide', 'Скрыть') : safeT('common.show', 'Показать')}
                </Text>
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: chevronRotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <Ionicons name="chevron-down" size={20} color={colors.primary} />
                </Animated.View>
              </View>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Health Profile Sections - Collapsible - only show when expanded */}
        {showHealthDetails && (
          <>
            {__DEV__ && console.log('[ProfileScreen] Rendering health details sections, showHealthDetails:', showHealthDetails)}
            <AppCard style={styles.healthSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary || tokens.colors.textPrimary }]}>
                {safeT('profile.health.metabolic', 'Метаболические параметры')}
              </Text>

              <ProfileNumberRow
                label={safeT('profile.health.bodyFatPercent', 'Процент жира')}
                suffix="%"
                value={healthProfile.metabolic.bodyFatPercent}
                min={5}
                max={60}
                onChange={(val) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    metabolic: { ...prev.metabolic, bodyFatPercent: val },
                  }))
                }
              />

              <ProfileNumberRow
                label={safeT('profile.health.waistCm', 'Окружность талии')}
                suffix="см"
                value={healthProfile.metabolic.waistCm}
                min={50}
                max={150}
                onChange={(val) =>
                  setHealthProfile((prev) => {
                    const hip = prev.metabolic.hipCm;
                    const whr = hip && hip > 0 ? Number((val / hip).toFixed(2)) : prev.metabolic.whr;
                    return {
                      ...prev,
                      metabolic: { ...prev.metabolic, waistCm: val, whr },
                    };
                  })
                }
              />

              <ProfileNumberRow
                label={safeT('profile.health.hipCm', 'Окружность бёдер')}
                suffix="см"
                value={healthProfile.metabolic.hipCm}
                min={70}
                max={160}
                onChange={(val) =>
                  setHealthProfile((prev) => {
                    const waist = prev.metabolic.waistCm;
                    const whr = waist && waist > 0 && val > 0 ? Number((waist / val).toFixed(2)) : prev.metabolic.whr;
                    return {
                      ...prev,
                      metabolic: { ...prev.metabolic, hipCm: val, whr },
                    };
                  })
                }
              />

              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.textSecondary || tokens.colors.textSecondary }]}>
                  {safeT('profile.health.whr', 'WHR')}
                </Text>
                <Text style={[styles.value, { color: colors.textPrimary || tokens.colors.textPrimary }]}>
                  {healthProfile.metabolic.whr != null
                    ? `${healthProfile.metabolic.whr.toFixed(2)} (${safeT('profile.health.auto', 'авто')})`
                    : `— (${safeT('profile.health.auto', 'авто')})`}
                </Text>
              </View>

              <ProfileSegmentedControl
                label={safeT('profile.health.fatDistributionType', 'Тип распределения жира')}
                value={healthProfile.metabolic.fatDistributionType || 'visceral'}
                options={[
                  { value: 'visceral', label: safeT('profile.health.fatDistribution.visceral', 'Висцеральный') },
                  { value: 'gynoid', label: safeT('profile.health.fatDistribution.gynoid', 'Гиноидный') },
                  { value: 'mixed', label: safeT('profile.health.fatDistribution.mixed', 'Смешанный') },
                ]}
                onChange={(value) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    metabolic: { ...prev.metabolic, fatDistributionType: value },
                  }))
                }
              />
            </AppCard>

            <AppCard style={styles.healthSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary || tokens.colors.textPrimary }]}>
                {safeT('profile.health.eatingBehavior', 'Пищевое поведение')}
              </Text>

              <ProfileNumberRow
                label={safeT('profile.health.mealsPerDay', 'Количество приёмов пищи')}
                value={healthProfile.eatingBehavior.mealsPerDay}
                min={1}
                max={8}
                onChange={(val) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    eatingBehavior: { ...prev.eatingBehavior, mealsPerDay: val },
                  }))
                }
              />

              <ProfileSegmentedControl
                label={safeT('profile.health.snackingTendency', 'Склонность к перекусам')}
                value={healthProfile.eatingBehavior.snackingTendency || 'medium'}
                options={[
                  { value: 'low', label: safeT('profile.health.snacking.low', 'Низкая') },
                  { value: 'medium', label: safeT('profile.health.snacking.medium', 'Средняя') },
                  { value: 'high', label: safeT('profile.health.snacking.high', 'Высокая') },
                ]}
                onChange={(value) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    eatingBehavior: { ...prev.eatingBehavior, snackingTendency: value },
                  }))
                }
              />

              <ProfileSegmentedControl
                label={safeT('profile.health.eveningAppetite', 'Аппетит вечером')}
                value={healthProfile.eatingBehavior.eveningAppetite ? 'yes' : 'no'}
                options={[
                  { value: 'yes', label: safeT('common.yes', 'Да') },
                  { value: 'no', label: safeT('common.no', 'Нет') },
                ]}
                onChange={(value) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    eatingBehavior: { ...prev.eatingBehavior, eveningAppetite: value === 'yes' },
                  }))
                }
              />
            </AppCard>

            <AppCard style={styles.healthSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary || tokens.colors.textPrimary }]}>
                {safeT('profile.health.sleep', 'Сон и циркадные ритмы')}
              </Text>

              <ProfileNumberRow
                label={safeT('profile.health.sleepHours', 'Сон (часы)')}
                value={healthProfile.sleep.sleepHours}
                min={3}
                max={12}
                step={0.5}
                onChange={(val) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    sleep: { ...prev.sleep, sleepHours: val },
                  }))
                }
              />

              <ProfileSegmentedControl
                label={safeT('profile.health.chronotype', 'Хронотип')}
                value={healthProfile.sleep.chronotype || 'late'}
                options={[
                  { value: 'early', label: safeT('profile.health.chronotypeOptions.early', safeT('profile.health.chronotype.early', 'Ранний')) },
                  { value: 'mid', label: safeT('profile.health.chronotypeOptions.mid', safeT('profile.health.chronotype.mid', 'Средний')) },
                  { value: 'late', label: safeT('profile.health.chronotypeOptions.late', safeT('profile.health.chronotype.late', 'Поздний')) },
                ]}
                onChange={(value) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    sleep: { ...prev.sleep, chronotype: value },
                  }))
                }
              />
            </AppCard>

            <AppCard style={styles.healthSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary || tokens.colors.textPrimary }]}>
                {safeT('profile.health.glp1Module', 'GLP-1 модуль')}
              </Text>

              <ProfileSegmentedControl
                label={safeT('profile.health.isGlp1User', 'GLP-1 пользователь')}
                value={healthProfile.glp1Module.isGlp1User ? 'yes' : 'no'}
                options={[
                  { value: 'yes', label: safeT('common.yes', 'Да') },
                  { value: 'no', label: safeT('common.no', 'Нет') },
                ]}
                onChange={(value) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    glp1Module: { ...prev.glp1Module, isGlp1User: value === 'yes' },
                  }))
                }
              />

              {healthProfile.glp1Module.isGlp1User && (
                <>
                  <ProfileSegmentedControl
                    label={safeT('profile.health.drugType', 'Тип препарата')}
                    value={healthProfile.glp1Module.drugType || 'semaglutide'}
                    options={[
                      { value: 'semaglutide', label: safeT('profile.health.drugType.semaglutide', 'Semaglutide') },
                      { value: 'tirzepatide', label: safeT('profile.health.drugType.tirzepatide', 'Tirzepatide') },
                      { value: 'liraglutide', label: safeT('profile.health.drugType.liraglutide', 'Liraglutide') },
                    ]}
                    onChange={(value) =>
                      setHealthProfile((prev) => ({
                        ...prev,
                        glp1Module: { ...prev.glp1Module, drugType: value },
                      }))
                    }
                  />

                  <ProfileSegmentedControl
                    label={safeT('profile.health.therapyGoal', 'Цель терапии')}
                    value={healthProfile.glp1Module.therapyGoal || 'preserve_muscle'}
                    options={[
                      { value: 'preserve_muscle', label: safeT('profile.health.therapyGoalOptions.preserve_muscle', 'Сохранить мышцы') },
                      { value: 'appetite_control', label: safeT('profile.health.therapyGoalOptions.appetite_control', 'Контроль аппетита') },
                      { value: 'weight_maintenance', label: safeT('profile.health.therapyGoalOptions.weight_maintenance', 'Поддерживать вес') },
                      { value: 'slow_weight_loss', label: safeT('profile.health.therapyGoalOptions.slow_weight_loss', 'Плавное снижение веса') },
                    ]}
                    onChange={(value) =>
                      setHealthProfile((prev) => ({
                        ...prev,
                        glp1Module: { ...prev.glp1Module, therapyGoal: value },
                      }))
                    }
                  />
                </>
              )}
            </AppCard>

            <AppCard style={styles.healthSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary || tokens.colors.textPrimary }]}>
                {safeT('profile.health.healthFocus', 'Области фокуса здоровья')}
              </Text>

              <ProfileToggleRow
                label={safeT('profile.health.focus.sugarControl', 'Контроль сахара')}
                value={healthProfile.healthFocus.sugarControl}
                onChange={(val) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    healthFocus: { ...prev.healthFocus, sugarControl: val },
                  }))
                }
              />

              <ProfileToggleRow
                label={safeT('profile.health.focus.cholesterol', 'Холестерин')}
                value={healthProfile.healthFocus.cholesterol}
                onChange={(val) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    healthFocus: { ...prev.healthFocus, cholesterol: val },
                  }))
                }
              />

              <ProfileToggleRow
                label={safeT('profile.health.focus.inflammation', 'Воспаление')}
                value={healthProfile.healthFocus.inflammation}
                onChange={(val) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    healthFocus: { ...prev.healthFocus, inflammation: val },
                  }))
                }
              />

              <ProfileToggleRow
                label={safeT('profile.health.focus.iron', 'Железо')}
                value={healthProfile.healthFocus.iron}
                onChange={(val) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    healthFocus: { ...prev.healthFocus, iron: val },
                  }))
                }
              />

              <ProfileToggleRow
                label={safeT('profile.health.focus.microbiome', 'Микробиом')}
                value={healthProfile.healthFocus.microbiome}
                onChange={(val) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    healthFocus: { ...prev.healthFocus, microbiome: val },
                  }))
                }
              />

              <ProfileToggleRow
                label={safeT('profile.health.focus.hormonalBalance', 'Гормональный баланс')}
                value={healthProfile.healthFocus.hormonalBalance}
                onChange={(val) =>
                  setHealthProfile((prev) => ({
                    ...prev,
                    healthFocus: { ...prev.healthFocus, hormonalBalance: val },
                  }))
                }
              />
            </AppCard>

            <View style={{ marginTop: 16, marginBottom: 16 }}>
              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: colors.error, backgroundColor: 'transparent' }]}
                onPress={handleClearHealthData}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={[styles.dangerButtonText, { color: colors.error }]}>
                  {safeT('profile.health.clearData', 'Clear Health Data')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

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
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <SafeAreaView style={[styles.editModalContainer, { backgroundColor: tokens.colors.background }]} edges={['top', 'bottom']}>
              <View style={[styles.editModalHeader, { borderBottomColor: tokens.colors.border }]}>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.editModalCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={tokens.colors.textPrimary || tokens.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.editModalTitle, { color: tokens.colors.textPrimary }]}>
                  {t('profile.editProfile') || 'Edit Profile'}
                </Text>
                <View style={styles.editModalCloseButton} />
              </View>
              <ScrollView
                style={styles.editModalContent}
                contentContainerStyle={styles.editModalContentInner}
                keyboardShouldPersistTaps="handled"
              >
                <AppCard style={styles.formCard}>
                  <Text style={styles.sectionTitle}>{safeT('profile.details', 'Details')}</Text>
                  <View style={styles.fieldRow}>
                    <ProfileField
                      label={safeT('profile.firstName', 'First Name')}
                      value={profile.firstName}
                      onChangeText={(text) => setProfile((prev) => ({ ...prev, firstName: text }))}
                    />
                    <ProfileField
                      label={safeT('profile.lastName', 'Last Name')}
                      value={profile.lastName}
                      onChangeText={(text) => setProfile((prev) => ({ ...prev, lastName: text }))}
                    />
                  </View>
                  <ProfileField
                    label={safeT('profile.email', 'Email')}
                    value={profile.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(text) => setProfile((prev) => ({ ...prev, email: text }))}
                  />
                  <View style={styles.fieldRow}>
                    <ProfileField
                      label={safeT('profile.weight', 'Weight')}
                      value={profile.weight ? String(profile.weight) : ''}
                      keyboardType="numeric"
                      onChangeText={(text) => setProfile((prev) => ({ ...prev, weight: parseFloat(text) || 0 }))}
                    />
                    <ProfileField
                      label={safeT('profile.height', 'Height')}
                      value={profile.height ? String(profile.height) : ''}
                      keyboardType="numeric"
                      onChangeText={(text) => setProfile((prev) => ({ ...prev, height: parseFloat(text) || 0 }))}
                    />
                  </View>
                  <View style={styles.fieldRow}>
                    <ProfileField
                      label={safeT('profile.age', 'Age')}
                      value={profile.age ? String(profile.age) : ''}
                      keyboardType="numeric"
                      onChangeText={(text) => setProfile((prev) => ({ ...prev, age: parseInt(text, 10) || 0 }))}
                    />
                    <ProfileField
                      label={safeT('profile.dailyCalories', 'Daily Calories')}
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

                <PrimaryButton
                  title={safeT('common.save', 'Save')}
                  onPress={typeof handleSave === 'function' ? handleSave : () => { }}
                  loading={loading}
                  style={styles.formSaveButton}
                />
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>

        <AppCard style={styles.preferencesCard}>
          <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>{safeT('profile.language', 'Language')}</Text>
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
              <Text style={styles.preferenceLabel}>{safeT('profile.theme', 'Theme')}</Text>
              <Text style={styles.preferenceCaption}>
                {themeMode === 'system' ? safeT('profile.systemTheme', 'System') : isDark ? safeT('profile.darkModeSubtitle', 'Dark mode') : safeT('profile.lightMode', 'Light mode')}
              </Text>
            </View>
            <View style={styles.themeToggles}>
              <TouchableOpacity
                style={[styles.themeChip, themeMode === 'light' && styles.themeChipActive]}
                onPress={() => {
                  if (typeof toggleTheme === 'function') {
                    toggleTheme('light');
                  }
                }}
              >
                <Ionicons name="partly-sunny" size={18} color={themeMode === 'light' ? tokens.colors.onPrimary : tokens.colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeChip, themeMode === 'dark' && styles.themeChipActive]}
                onPress={() => {
                  if (typeof toggleTheme === 'function') {
                    toggleTheme('dark');
                  }
                }}
              >
                <Ionicons name="moon" size={18} color={themeMode === 'dark' ? tokens.colors.onPrimary : tokens.colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeChip, themeMode === 'monochrome' && styles.themeChipActive]}
                onPress={() => {
                  if (typeof toggleTheme === 'function') {
                    toggleTheme('monochrome');
                  }
                }}
              >
                <Ionicons name="contrast" size={18} color={themeMode === 'monochrome' ? tokens.colors.onPrimary : tokens.colors.textPrimary} />
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

        {/* Medications Section */}
        <AppCard style={styles.medicationsCard}>
          <TouchableOpacity
            onPress={() => {
              if (navigation && typeof navigation.navigate === 'function') {
                navigation.navigate('MedicationSchedule');
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.cardContent}>
              <Ionicons name="medkit-outline" size={24} color={colors.primary} />
              <View style={styles.cardTextContainer}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary || colors.text }]}>
                  {safeT('medications.title', safeT('profile.medications', 'Medications'))}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {safeT('medications.subtitle', safeT('profile.medicationsSubtitle', 'Manage your medication schedule'))}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </AppCard>

        {/* Reset App Data Button - for testing */}
        {__DEV__ && (
          <AppCard style={styles.resetCard}>
            <TouchableOpacity
              onPress={handleResetAppData}
              style={[styles.resetButton, { backgroundColor: colors.error || '#FF3B30' }]}
            >
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              <Text style={styles.resetButtonText}>
                {safeT('profile.resetAppData', 'Reset App Data')}
              </Text>
            </TouchableOpacity>
          </AppCard>
        )}

        {/* Footer links: Privacy Policy / Terms of Use */}
        <View style={[styles.footerLinksContainer, { borderTopColor: tokens.colors.border || colors.border }]}>
          <TouchableOpacity
            onPress={handleOpenPolicy}
            style={styles.footerLink}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary || tokens.colors.textSecondary }]}>
              {t('legal.privacyLink') || t('profile.policy') || 'Privacy Policy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenTerms}
            style={styles.footerLink}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary || tokens.colors.textSecondary }]}>
              {t('legal.termsLink') || t('profile.termsOfService') || 'Terms of Use'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={planModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !planSaving && setPlanModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.scrim || 'rgba(0, 0, 0, 0.6)' }]}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => !planSaving && setPlanModalVisible(false)}
          />
          <SafeAreaView edges={['bottom']} style={{ justifyContent: 'flex-end' }}>
            <View style={[styles.modalContent, { backgroundColor: tokens.colors.surface || colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: tokens.colors.textPrimary || tokens.colors.text }]}>
                  {safeT('profile.choosePlan', 'Choose a plan')}
                </Text>
                <TouchableOpacity
                  onPress={() => !planSaving && setPlanModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={tokens.colors.textPrimary || tokens.colors.text} />
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
                        <Text style={[styles.currentPlanLabel, { color: tokens.colors.primary }]}>
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
          </SafeAreaView>
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
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: tokens.colors.surfacePrimary || tokens.colors.surface,
      borderTopLeftRadius: tokens.radii.xl,
      borderTopRightRadius: tokens.radii.xl,
      maxHeight: '90%',
      width: '100%',
      paddingHorizontal: tokens.spacing.xl,
      paddingTop: tokens.spacing.lg,
      paddingBottom: tokens.spacing.xl,
      padding: tokens.spacing.xl,
      gap: tokens.spacing.lg,
      ...(tokens.states.cardShadow || tokens.elevations.md),
    },
    editModalContainer: {
      flex: 1,
      // Prevent layout jumps
      minHeight: '100%',
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
    healthSection: {
      gap: tokens.spacing.md,
      marginTop: tokens.spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    label: {
      fontSize: 14,
      color: tokens.colors.textSecondary,
      flex: 1,
    },
    value: {
      fontSize: 14,
      color: tokens.colors.textPrimary,
      fontWeight: '500',
    },
    healthSummaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: tokens.spacing.md,
    },
    healthSummaryContent: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    healthSummaryText: {
      fontSize: tokens.typography.body.fontSize,
      lineHeight: tokens.typography.body.lineHeight,
    },
    editHealthButton: {
      paddingVertical: tokens.spacing.xs,
      paddingHorizontal: tokens.spacing.md,
    },
    editHealthButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    editHealthButtonText: {
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    footerLinksContainer: {
      marginTop: tokens.spacing.xl,
      paddingTop: tokens.spacing.lg,
      paddingHorizontal: tokens.spacing.xl,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: tokens.spacing.sm,
    },
    footerLink: {
      paddingVertical: tokens.spacing.sm,
    },
    footerLinkText: {
      fontSize: 14,
      color: tokens.colors.textSecondary,
    },
    resetCard: {
      marginTop: tokens.spacing.lg,
      marginBottom: tokens.spacing.md,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radii.md,
    },
    resetButtonText: {
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
      color: '#FFFFFF',
    },
    card: {
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      padding: tokens.spacing.md,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.md,
    },
    cardTextContainer: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    cardSubtitle: {
      fontSize: 13,
      lineHeight: 18,
    },
    medicationsCard: {
      marginTop: tokens.spacing.lg,
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
