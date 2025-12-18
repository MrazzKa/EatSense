import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  TextInput,
  InteractionManager,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, CommonActions } from '@react-navigation/native';
import PropTypes from 'prop-types';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { clientLog } from '../utils/clientLog';

const { width } = Dimensions.get('window');

const createStyles = (tokens, colors) => {
  const onPrimary = colors.onPrimary ?? tokens.colors?.onPrimary ?? '#FFFFFF';
  const surface = colors.surface ?? '#FFFFFF';
  const surfaceMuted = colors.surfaceMuted ?? colors.background;
  const borderMuted = colors.borderMuted ?? colors.border ?? '#C8C8C8';
  const textSecondary = colors.textSecondary ?? '#6B7280';
  const textTertiary = colors.textTertiary ?? textSecondary;
  const success = colors.success ?? tokens.colors?.success ?? '#34C759';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: tokens.spacing?.xl ?? 20,
      paddingTop: tokens.spacing?.xl ?? 20,
      paddingBottom: tokens.spacing?.md ?? 10,
    },
    progressContainer: {
      alignItems: 'center',
    },
    progressBar: {
      width: '100%',
      height: 4,
      backgroundColor: surfaceMuted,
      borderRadius: 2,
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: tokens.typography?.caption?.fontSize ?? 14,
      color: textTertiary,
    },
    scrollView: {
      flex: 1,
    },
    stepWrapper: {
      width,
      flex: 1,
    },
    stepContainer: {
      flex: 1,
      paddingHorizontal: tokens.spacing?.xl ?? 20,
      paddingVertical: tokens.spacing?.xxl ?? 40,
    },
    stepTitle: {
      fontSize: tokens.typography?.headingL?.fontSize ?? 28,
      fontWeight: tokens.typography?.headingL?.fontWeight ?? '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: tokens.spacing?.xxl ?? 40,
    },
    welcomeContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: surfaceMuted,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: tokens.spacing?.xl ?? 30,
    },
    welcomeTitle: {
      fontSize: tokens.typography?.headingXL?.fontSize ?? 32,
      fontWeight: tokens.typography?.headingXL?.fontWeight ?? '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: tokens.spacing?.md ?? 16,
    },
    welcomeSubtitle: {
      fontSize: tokens.typography?.bodyStrong?.fontSize ?? 18,
      color: textSecondary,
      textAlign: 'center',
      lineHeight: tokens.typography?.bodyStrong?.lineHeight ?? 24,
      marginBottom: tokens.spacing?.xxl ?? 40,
    },
    featuresList: {
      width: '100%',
      gap: tokens.spacing?.sm ?? 12,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: tokens.spacing?.md ?? 12,
      paddingHorizontal: tokens.spacing?.xl ?? 20,
      backgroundColor: surface,
      borderRadius: tokens.radii?.lg ?? 12,
      marginBottom: tokens.spacing?.sm ?? 12,
      borderWidth: 1,
      borderColor: borderMuted,
    },
    featureText: {
      fontSize: tokens.typography?.body.fontSize ?? 16,
      color: colors.text,
      marginLeft: tokens.spacing?.md ?? 16,
    },
    inputGroup: {
      marginBottom: tokens.spacing?.xl ?? 30,
      gap: tokens.spacing?.sm ?? 12,
    },
    inputLabel: {
      fontSize: tokens.typography?.headingS?.fontSize ?? 18,
      fontWeight: tokens.typography?.headingS?.fontWeight ?? '600',
      color: colors.text,
    },
    textInput: {
      backgroundColor: surface,
      borderRadius: tokens.radii?.lg ?? 12,
      padding: tokens.spacing?.lg ?? 16,
      borderWidth: 1,
      borderColor: borderMuted,
      fontSize: tokens.typography?.body.fontSize ?? 16,
      color: colors.text,
    },
    textInputValue: {
      fontSize: tokens.typography?.body.fontSize ?? 16,
      color: colors.text,
    },
    sliderContainer: {
      backgroundColor: surface,
      borderRadius: tokens.radii?.lg ?? 12,
      padding: tokens.spacing?.xl ?? 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: borderMuted,
    },
    sliderValue: {
      fontSize: tokens.typography?.headingM?.fontSize ?? 24,
      fontWeight: tokens.typography?.headingM?.fontWeight ?? '600',
      color: colors.primary,
      marginBottom: tokens.spacing?.md ?? 16,
    },
    slider: {
      width: '100%',
      height: 40,
    },
    sliderThumb: {
      backgroundColor: colors.primary,
      width: 20,
      height: 20,
    },
    optionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: tokens.spacing?.sm ?? 12,
    },
    optionButton: {
      flex: 1,
      backgroundColor: surface,
      borderRadius: tokens.radii?.lg ?? 12,
      padding: tokens.spacing?.xl ?? 20,
      alignItems: 'center',
      marginHorizontal: 8,
      borderWidth: 2,
      borderColor: borderMuted,
    },
    optionButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionText: {
      fontSize: tokens.typography?.bodyStrong?.fontSize ?? 16,
      fontWeight: tokens.typography?.bodyStrong?.fontWeight ?? '600',
      color: colors.primary,
      marginTop: tokens.spacing?.sm ?? 8,
    },
    optionTextSelected: {
      color: onPrimary,
    },
    activityContainer: {
      gap: tokens.spacing?.md ?? 12,
    },
    activityButton: {
      backgroundColor: surface,
      borderRadius: tokens.radii?.lg ?? 12,
      padding: tokens.spacing?.xl ?? 20,
      borderWidth: 2,
      borderColor: borderMuted,
    },
    activityButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    activityLabel: {
      fontSize: tokens.typography?.headingS?.fontSize ?? 18,
      fontWeight: tokens.typography?.headingS?.fontWeight ?? '600',
      color: colors.text,
      marginBottom: tokens.spacing?.xs ?? 4,
    },
    activityLabelSelected: {
      color: onPrimary,
    },
    activityDescription: {
      fontSize: tokens.typography?.caption?.fontSize ?? 14,
      color: textSecondary,
    },
    activityDescriptionSelected: {
      color: onPrimary,
    },
    goalsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: tokens.spacing?.sm ?? 12,
    },
    goalButton: {
      flex: 1,
      backgroundColor: surface,
      borderRadius: tokens.radii?.lg ?? 12,
      padding: tokens.spacing?.xl ?? 20,
      alignItems: 'center',
      marginHorizontal: 8,
      borderWidth: 2,
      borderColor: borderMuted,
    },
    goalButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    goalText: {
      fontSize: tokens.typography?.bodyStrong?.fontSize ?? 16,
      fontWeight: tokens.typography?.bodyStrong?.fontWeight ?? '600',
      color: colors.primary,
      marginTop: tokens.spacing?.sm ?? 12,
    },
    goalTextSelected: {
      color: onPrimary,
    },
    plansContainer: {
      gap: tokens.spacing?.md ?? 12,
      flex: 1,
    },
    planButton: {
      backgroundColor: surface,
      borderRadius: tokens.radii?.xl ?? 16,
      padding: tokens.spacing?.lg ?? 16,
      borderWidth: 2,
      borderColor: borderMuted,
      position: 'relative',
      flex: 1,
      minHeight: 140,
    },
    planButtonPopular: {
      borderColor: colors.primary,
    },
    popularBadge: {
      position: 'absolute',
      top: -8,
      right: 20,
      backgroundColor: colors.primary,
      paddingHorizontal: tokens.spacing?.sm ?? 12,
      paddingVertical: tokens.spacing?.xs ?? 4,
      borderRadius: tokens.radii?.md ?? 12,
    },
    popularText: {
      fontSize: tokens.typography?.caption?.fontSize ?? 12,
      fontWeight: tokens.typography?.caption?.fontWeight ?? '600',
      color: onPrimary,
    },
    planName: {
      fontSize: tokens.typography?.headingS?.fontSize ?? 18,
      fontWeight: tokens.typography?.headingS?.fontWeight ?? '700',
      color: colors.text,
      marginBottom: tokens.spacing?.xs ?? 4,
    },
    planHeadline: {
      fontSize: tokens.typography?.caption?.fontSize ?? 12,
      color: textSecondary,
    },
    planPrice: {
      fontSize: tokens.typography?.headingM?.fontSize ?? 20,
      fontWeight: tokens.typography?.headingM?.fontWeight ?? '700',
      color: colors.primary,
      marginBottom: tokens.spacing?.sm ?? 8,
      marginTop: tokens.spacing?.xs ?? 4,
    },
    planFeatures: {
      gap: tokens.spacing?.xs ?? 4,
    },
    planFeature: {
      fontSize: tokens.typography?.caption?.fontSize ?? 12,
      color: textSecondary,
    },
    planFeatureSelected: {
      color: onPrimary,
    },
    planFeatureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing?.xs ?? 8,
    },
    planButtonSelected: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    planToggle: {
      paddingVertical: tokens.spacing?.sm ?? 8,
    },
    planToggleText: {
      textAlign: 'center',
      color: textSecondary,
      fontSize: tokens.typography?.body?.fontSize ?? 14,
      marginBottom: tokens.spacing?.md ?? 12,
    },
    planFinePrint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing?.xs ?? 6,
      marginTop: tokens.spacing?.lg ?? 16,
    },
    planFinePrintText: {
      fontSize: tokens.typography?.caption?.fontSize ?? 12,
      color: textSecondary,
    },
    footer: {
      paddingHorizontal: tokens.spacing?.xl ?? 20,
      paddingBottom: tokens.spacing?.xl ?? 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: tokens.spacing?.md ?? 12,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: tokens.spacing?.md ?? 12,
      paddingHorizontal: tokens.spacing?.lg ?? 16,
    },
    backButtonText: {
      fontSize: tokens.typography?.bodyStrong?.fontSize ?? 16,
      color: colors.primary,
      marginLeft: tokens.spacing?.xs ?? 4,
    },
    nextButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingVertical: tokens.spacing?.lg ?? 16,
      paddingHorizontal: tokens.spacing?.xl ?? 24,
      borderRadius: tokens.radii?.lg ?? 12,
    },
    completeButton: {
      backgroundColor: success,
    },
    nextButtonText: {
      fontSize: tokens.typography?.bodyStrong?.fontSize ?? 16,
      fontWeight: tokens.typography?.bodyStrong?.fontWeight ?? '600',
      color: onPrimary,
      marginRight: tokens.spacing?.xs ?? 8,
    },
    skipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: tokens.spacing?.md ?? 12,
      paddingHorizontal: tokens.spacing?.lg ?? 16,
      borderRadius: tokens.radii?.lg ?? 12,
      backgroundColor: 'transparent',
    },
    skipButtonText: {
      fontSize: tokens.typography?.body?.fontSize ?? 16,
      color: colors.primary,
      fontWeight: tokens.typography?.body?.fontWeight ?? '500',
    },
    // Interactive Slider Styles
    interactiveSliderContainer: {
      backgroundColor: surface,
      borderRadius: tokens.radii?.xl ?? 16,
      padding: tokens.spacing?.xxl ?? 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: borderMuted,
      shadowColor: colors.shadow ?? colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    gestureSliderContainer: {
      width: '100%',
      alignItems: 'center',
    },
    sliderIndicators: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: tokens.spacing?.sm ?? 8,
    },
    sliderIndicatorText: {
      fontSize: tokens.typography?.caption?.fontSize ?? 12,
      color: textTertiary,
      fontWeight: tokens.typography?.caption?.fontWeight ?? '500',
    },
    unitToggleContainer: {
      flexDirection: 'row',
      backgroundColor: surfaceMuted,
      borderRadius: tokens.radii?.lg ?? 12,
      padding: tokens.spacing?.xs ?? 4,
      marginBottom: tokens.spacing?.lg ?? 16,
      alignSelf: 'center',
    },
    unitToggleButton: {
      paddingVertical: tokens.spacing?.sm ?? 8,
      paddingHorizontal: tokens.spacing?.lg ?? 16,
      borderRadius: tokens.radii?.md ?? 8,
    },
    unitToggleButtonActive: {
      backgroundColor: colors.primary,
    },
    unitToggleText: {
      fontSize: tokens.typography?.body?.fontSize ?? 14,
      fontWeight: tokens.typography?.body?.fontWeight ?? '500',
      color: textSecondary,
    },
    unitToggleTextActive: {
      color: onPrimary,
      fontWeight: tokens.typography?.bodyStrong?.fontWeight ?? '600',
    },
  });
};

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const { colors, tokens } = useTheme();
  const { setUser, refreshUser } = useAuth();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);
  const onPrimaryColor = colors.onPrimary ?? tokens.colors?.onPrimary ?? '#FFFFFF';
  const [currentStep, setCurrentStep] = useState(0);
  const [confirmedSteps, setConfirmedSteps] = useState(new Set());
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    age: 25,
    height: 170, // cm - will be properly initialized in slider
    weight: 70, // kg
    gender: '',
    activityLevel: '',
    goal: '',
    targetWeight: 70,
    selectedPlan: 'free',
    planBillingCycle: 'lifetime',
  });
  const [unitSystem, setUnitSystem] = useState('metric'); // 'metric' or 'imperial'

  const scrollViewRef = useRef(null);

  // Simplified steps order: Welcome -> Personal Info (name, age, gender) -> Physical Stats (height, weight) -> Activity & Goals -> Plan
  const steps = [
    { id: 'welcome', title: 'Welcome to EatSense' },
    { id: 'personal', title: 'Personal Information' }, // Combined: name, age, gender
    { id: 'physical', title: 'Physical Stats' }, // height, weight with unit toggle
    { id: 'activity', title: 'Activity & Goals' }, // Combined: activity level and goals
    { id: 'plan', title: 'Choose Your Plan' },
  ];

  // Removed unused genders array
  // const genders = [
  //   { id: 'male', label: 'Male', icon: 'male' },
  //   { id: 'female', label: 'Female', icon: 'female' },
  //   { id: 'other', label: 'Other', icon: 'person' },
  // ];

  const activityLevels = [
    { id: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
    { id: 'lightly_active', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
    { id: 'moderately_active', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
    { id: 'very_active', label: 'Very Active', description: 'Heavy exercise 6-7 days/week' },
    { id: 'extremely_active', label: 'Extremely Active', description: 'Very heavy exercise, physical job' },
  ];

  const goals = [
    { id: 'lose_weight', label: 'Lose Weight', icon: 'trending-down' },
    { id: 'maintain_weight', label: 'Maintain Weight', icon: 'remove' },
    { id: 'gain_weight', label: 'Gain Weight', icon: 'trending-up' },
  ];

  const plans = [
    {
      id: 'free',
      name: 'EatSense Free',
      price: '$0 forever',
      billingCycle: 'lifetime',
      headline: 'Get started with the essentials',
      features: ['AI food analysis (3/day)', 'Daily calorie tracking', 'Basic statistics'],
      badge: 'Included',
      popular: false,
    },
    {
      id: 'pro_monthly',
      name: 'EatSense Pro',
      price: '$9.99 / month',
      billingCycle: 'monthly',
      headline: 'Unlock everything with flexible billing',
      features: [
        'Unlimited AI analysis',
        'Advanced nutrition insights',
        'Personalized coaching tips',
        'Priority support',
      ],
      badge: 'Most Popular',
      popular: true,
    },
    {
      id: 'pro_annual',
      name: 'EatSense Pro',
      price: '$79.99 / year',
      billingCycle: 'annual',
      headline: 'Best value — save 33%',
      features: [
        'Everything in Pro Monthly',
        'Exclusive annual webinars',
        'Early access to new features',
      ],
      badge: 'Save 33%',
      popular: true,
    },
  ];

  const markStepConfirmed = (stepIndex) => {
    setConfirmedSteps((prev) => {
      if (prev.has(stepIndex)) return prev;
      const next = new Set(prev);
      next.add(stepIndex);
      return next;
    });
  };

  const nextStep = () => {
    // Валидация для каждого шага
    if (currentStep === 1) { // Personal step
      if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
        Alert.alert('Required Fields', 'Please enter your first and last name.');
        return;
      }
    } else if (currentStep === 2) { // Physical step
      if (!profileData.gender) {
        Alert.alert('Required Field', 'Please select your gender.');
        return;
      }
    } else if (currentStep === 3) { // Combined Activity & Goals step
      if (!profileData.activityLevel) {
        Alert.alert('Required Field', 'Please select your activity level.');
        return;
      }
      if (!profileData.goal) {
        Alert.alert('Required Field', 'Please select your goal.');
        return;
      }
    }

    // Шаг считается "подтверждённым" только когда пользователь явно нажал Next
    markStepConfirmed(currentStep);

    if (currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      scrollViewRef.current?.scrollTo({ x: nextStepIndex * width, animated: true });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      scrollViewRef.current?.scrollTo({ x: prevStepIndex * width, animated: true });
    }
  };

  const handleComplete = async () => {
    try {
      const {
        selectedPlan,
        planBillingCycle,
        preferences: profilePreferences,
        ...profileDataWithoutPlan
      } = profileData;

      const subscriptionPreference = {
        planId: selectedPlan || 'free',
        billingCycle:
          planBillingCycle ||
          (selectedPlan === 'free' ? 'lifetime' : 'monthly'),
      };

      const mergedPreferences = {
        ...(profilePreferences ?? {}),
        subscription: {
          ...(profilePreferences?.subscription ?? {}),
          ...subscriptionPreference,
        },
      };

      profileDataWithoutPlan.preferences = mergedPreferences;
      
      // Проверяем, есть ли уже профиль
      try {
        await ApiService.getUserProfile();
        // Если профиль существует, обновляем его
        await ApiService.updateUserProfile(profileDataWithoutPlan);
      } catch {
        // Если профиля нет, создаем новый
        await ApiService.createUserProfile(profileDataWithoutPlan);
      }
      
      const onboardingResult = await ApiService.completeOnboarding();
      console.log('[OnboardingScreen] Onboarding completed, result:', onboardingResult);
      
      await clientLog('Onboarding:completed').catch(() => {});
      
      // Update user profile in context to mark onboarding as completed
      try {
        const updatedProfile = await ApiService.getUserProfile();
        if (updatedProfile && setUser) {
          setUser({ ...updatedProfile, isOnboardingCompleted: true });
          console.log('[OnboardingScreen] User context updated with isOnboardingCompleted: true');
        }
      } catch (updateError) {
        console.warn('[OnboardingScreen] Failed to update user context:', updateError);
        // Try to refresh user anyway
        if (refreshUser && typeof refreshUser === 'function') {
          refreshUser().catch(() => {});
        }
      }
      
      // Используем InteractionManager для безопасного вызова navigation после завершения всех анимаций
      InteractionManager.runAfterInteractions(() => {
        // Дополнительная задержка для гарантии готовности navigation
        setTimeout(() => {
          try {
            if (navigation && navigation.isReady && navigation.isReady()) {
              console.log('[OnboardingScreen] Navigation is ready, calling reset');
              clientLog('Onboarding:navigateToMainTabs').catch(() => {});
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                })
              );
            } else if (navigation && typeof navigation.reset === 'function') {
              console.log('[OnboardingScreen] Navigation reset available, calling directly');
              clientLog('Onboarding:navigateToMainTabs').catch(() => {});
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            } else {
              console.error('[OnboardingScreen] Navigation not available or not ready');
              console.error('[OnboardingScreen] Navigation object:', navigation);
              Alert.alert('Error', 'Navigation not available. Please restart the app.');
            }
          } catch (navError) {
            console.error('[OnboardingScreen] Navigation reset error:', navError);
            Alert.alert('Error', `Navigation error: ${navError.message}. Please restart the app.`);
          }
        }, 100);
      });
    } catch (err) {
      console.error('Onboarding error:', err);
      // Показываем предупреждение, но все равно переходим к главному экрану
      const navigateToMain = () => {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            try {
              if (navigation && navigation.isReady && navigation.isReady()) {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                  })
                );
              } else if (navigation && typeof navigation.reset === 'function') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              } else {
                console.error('[OnboardingScreen] Navigation not available in error handler');
              }
            } catch (navError) {
              console.error('[OnboardingScreen] Navigation error in catch block:', navError);
            }
          }, 100);
        });
      };

      if (navigation && (navigation.isReady || typeof navigation.reset === 'function')) {
        Alert.alert(
          'Setup Complete', 
          'Profile saved locally. You can complete setup later in settings.',
          [{ 
            text: 'OK', 
            onPress: navigateToMain
          }]
        );
      } else {
        Alert.alert(
          'Setup Complete', 
          'Profile saved locally. Please restart the app to continue.'
        );
      }
    }
  };

  // Interactive Slider Component with haptics
  const InteractiveSlider = ({
    value,
    minimumValue,
    maximumValue,
    onValueChange,
    unit,
    step = 1,
    sliderKey,
    enableHaptics = true,
  }) => {
    const clampedValue = Math.max(minimumValue, Math.min(maximumValue, value));
    const [tempValue, setTempValue] = useState(clampedValue);
    const [isSliding, setIsSliding] = useState(false);
    const lastHapticValue = useRef(clampedValue);
    
    useEffect(() => {
      const newValue = Math.max(minimumValue, Math.min(maximumValue, value));
      setTempValue(newValue);
      lastHapticValue.current = newValue;
    }, [sliderKey]);
    
    useEffect(() => {
      if (!isSliding) {
        const newValue = Math.max(minimumValue, Math.min(maximumValue, value));
        if (Math.abs(newValue - tempValue) > 0.1) {
          setTempValue(newValue);
          lastHapticValue.current = newValue;
        }
      }
    }, [value, minimumValue, maximumValue, isSliding, tempValue, sliderKey]);
    
    const triggerHaptic = () => {
      if (enableHaptics && Platform.OS === 'ios') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // Haptics not available
        }
      }
    };
    
    return (
      <View style={styles.interactiveSliderContainer}>
        <Animated.Text style={styles.sliderValue}>
          {Math.round(tempValue)}{unit}
        </Animated.Text>
        
        <View style={styles.gestureSliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={minimumValue}
            maximumValue={maximumValue}
            value={tempValue}
            step={step}
            onValueChange={(v) => {
              setIsSliding(true);
              setTempValue(v);
              // Trigger haptic feedback on step change
              if (enableHaptics && Math.abs(Math.round(v) - Math.round(lastHapticValue.current)) >= step) {
                triggerHaptic();
                lastHapticValue.current = v;
              }
            }}
            onSlidingStart={() => {
              setIsSliding(true);
              triggerHaptic();
            }}
            onSlidingComplete={(v) => {
              setIsSliding(false);
              triggerHaptic();
              if (onValueChange && typeof onValueChange === 'function') {
                onValueChange(v);
              }
            }}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.borderMuted}
            thumbStyle={styles.sliderThumb}
          />
          
          <View style={styles.sliderIndicators}>
            <Text style={styles.sliderIndicatorText}>{minimumValue}{unit}</Text>
            <Text style={styles.sliderIndicatorText}>{maximumValue}{unit}</Text>
          </View>
        </View>
      </View>
    );
  };

  InteractiveSlider.propTypes = {
    value: PropTypes.number.isRequired,
    minimumValue: PropTypes.number.isRequired,
    maximumValue: PropTypes.number.isRequired,
    onValueChange: PropTypes.func.isRequired,
    unit: PropTypes.string.isRequired,
    step: PropTypes.number,
    sliderKey: PropTypes.string,
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeContent}>
        <View style={styles.logoContainer}>
          <Ionicons name="camera" size={80} color={colors.primary} />
        </View>
        <Text style={styles.welcomeTitle}>Welcome to EatSense</Text>
        <Text style={styles.welcomeSubtitle}>
          Your AI-powered nutrition companion. Let&apos;s personalize your experience!
        </Text>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="camera" size={24} color={colors.primary} />
            <Text style={styles.featureText}>AI Food Analysis</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="analytics" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Smart Tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="heart" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Health Insights</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPersonalStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>First Name</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.firstName}
          onChangeText={(text) => setProfileData({ ...profileData, firstName: text })}
          placeholder="Enter your first name"
          placeholderTextColor={colors.textTertiary}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Last Name</Text>
        <TextInput
          style={styles.textInput}
          value={profileData.lastName}
          onChangeText={(text) => setProfileData({ ...profileData, lastName: text })}
          placeholder="Enter your last name"
          placeholderTextColor={colors.textTertiary}
        />
      </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Age</Text>
            <InteractiveSlider
              key="age-slider"
              sliderKey="age"
              value={profileData.age}
              minimumValue={16}
              maximumValue={100}
              onValueChange={(value) => setProfileData({ ...profileData, age: Math.round(value) })}
              unit=" years"
              step={1}
            />
          </View>
    </View>
  );

  // Convert between metric and imperial
  const cmToFeetInches = (cm) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches, totalInches };
  };

  const feetInchesToCm = (feet, inches) => {
    return Math.round((feet * 12 + inches) * 2.54);
  };

  const kgToLbs = (kg) => Math.round(kg * 2.20462);
  const lbsToKg = (lbs) => Math.round((lbs / 2.20462) * 10) / 10;

  const renderPhysicalStep = () => {
    // Convert values based on unit system
    const heightValue = unitSystem === 'metric' 
      ? profileData.height 
      : cmToFeetInches(profileData.height).totalInches;
    const weightValue = unitSystem === 'metric'
      ? profileData.weight
      : kgToLbs(profileData.weight);

    const heightMin = unitSystem === 'metric' ? 120 : 47; // ~120cm = ~47in
    const heightMax = unitSystem === 'metric' ? 220 : 87; // ~220cm = ~87in
    const weightMin = unitSystem === 'metric' ? 30 : 66; // ~30kg = ~66lbs
    const weightMax = unitSystem === 'metric' ? 200 : 440; // ~200kg = ~440lbs

    const heightUnit = unitSystem === 'metric' ? ' cm' : ' in';
    const weightUnit = unitSystem === 'metric' ? ' kg' : ' lbs';

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Your physical stats</Text>
        
        {/* Unit System Toggle */}
        <View style={styles.unitToggleContainer}>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              unitSystem === 'metric' && styles.unitToggleButtonActive,
            ]}
            onPress={() => {
              // Convert values when switching
              if (unitSystem === 'imperial') {
                const heightIn = profileData.height / 2.54;
                const feet = Math.floor(heightIn / 12);
                const inches = Math.round(heightIn % 12);
                const newHeight = feetInchesToCm(feet, inches);
                const newWeight = lbsToKg(profileData.weight * 2.20462);
                setProfileData({ ...profileData, height: newHeight, weight: newWeight });
              }
              setUnitSystem('metric');
            }}
          >
            <Text
              style={[
                styles.unitToggleText,
                unitSystem === 'metric' && styles.unitToggleTextActive,
              ]}
            >
              Metric
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              unitSystem === 'imperial' && styles.unitToggleButtonActive,
            ]}
            onPress={() => {
              // Convert values when switching
              if (unitSystem === 'metric') {
                const heightIn = cmToFeetInches(profileData.height).totalInches;
                const weightLbs = kgToLbs(profileData.weight);
                setProfileData({ ...profileData, height: heightIn * 2.54, weight: weightLbs / 2.20462 });
              }
              setUnitSystem('imperial');
            }}
          >
            <Text
              style={[
                styles.unitToggleText,
                unitSystem === 'imperial' && styles.unitToggleTextActive,
              ]}
            >
              Imperial
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Height</Text>
          <InteractiveSlider
            key={`height-slider-${unitSystem}`}
            sliderKey={`height-${unitSystem}`}
            value={heightValue}
            minimumValue={heightMin}
            maximumValue={heightMax}
            onValueChange={(value) => {
              const newHeight = unitSystem === 'metric' 
                ? Math.round(value)
                : feetInchesToCm(Math.floor(value / 12), Math.round(value % 12));
              setProfileData({ ...profileData, height: newHeight });
            }}
            unit={heightUnit}
            step={unitSystem === 'metric' ? 1 : 1}
            enableHaptics={true}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight</Text>
          <InteractiveSlider
            key={`weight-slider-${unitSystem}`}
            sliderKey={`weight-${unitSystem}`}
            value={weightValue}
            minimumValue={weightMin}
            maximumValue={weightMax}
            onValueChange={(value) => {
              const newWeight = unitSystem === 'metric'
                ? Math.round(value * 10) / 10
                : lbsToKg(value);
              setProfileData({ ...profileData, weight: newWeight });
            }}
            unit={weightUnit}
            step={unitSystem === 'metric' ? 0.5 : 1}
            enableHaptics={true}
          />
        </View>
      </View>
    );
  };

  // Combined Activity & Goals step
  const renderActivityStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Activity & Goals</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>How active are you?</Text>
        <View style={styles.activityContainer}>
          {(activityLevels || []).map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.activityButton,
                profileData.activityLevel === level.id && styles.activityButtonSelected,
              ]}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setProfileData({ ...profileData, activityLevel: level.id });
              }}
            >
              <Text
                style={[
                  styles.activityLabel,
                  profileData.activityLevel === level.id && styles.activityLabelSelected,
                ]}
              >
                {level.label}
              </Text>
              <Text
                style={[
                  styles.activityDescription,
                  profileData.activityLevel === level.id && styles.activityDescriptionSelected,
                ]}
              >
                {level.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>What&apos;s your goal?</Text>
        <View style={styles.goalsContainer}>
          {(goals || []).map((goal) => {
            const isSelected = profileData.goal === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalButton,
                  isSelected && styles.goalButtonSelected,
                ]}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setProfileData({ ...profileData, goal: goal.id });
                }}
              >
                <Ionicons
                  name={goal.icon}
                  size={32}
                  color={isSelected ? onPrimaryColor : colors.primary}
                />
                <Text
                  style={[
                    styles.goalText,
                    isSelected && styles.goalTextSelected,
                  ]}
                >
                  {goal.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderPlanStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose your plan</Text>
      <View style={styles.planToggle}>
        <Text style={styles.planToggleText}>
          Choose a plan to unlock EatSense
        </Text>
      </View>
      <View style={styles.plansContainer}>
        {(plans || []).map((plan) => {
          const isSelected =
            profileData.selectedPlan === plan.id ||
            (plan.id === 'free' &&
              profileData.selectedPlan === 'free' &&
              profileData.planBillingCycle === 'lifetime');

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planButton,
                plan.popular && styles.planButtonPopular,
                isSelected && styles.planButtonSelected,
              ]}
              activeOpacity={0.9}
              onPress={() =>
                setProfileData({
                  ...profileData,
                  selectedPlan: plan.id,
                  planBillingCycle: plan.billingCycle,
                })
              }
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planHeadline}>{plan.headline}</Text>
                </View>
                {plan.badge && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>{plan.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <View style={styles.planFeatures}>
                {(plan.features || []).map((feature, index) => (
                  <View key={feature + index} style={styles.planFeatureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={isSelected ? onPrimaryColor : colors.primary}
                    />
                    <Text
                      style={[
                        styles.planFeature,
                        isSelected && styles.planFeatureSelected,
                      ]}
                    >
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.planFinePrint}>
        <Ionicons name="information-circle" size={16} color={colors.textTertiary} />
        <Text style={styles.planFinePrintText}>
          You can change plans or cancel anytime from Settings.
        </Text>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderWelcomeStep();
      case 1:
        return renderPersonalStep();
      case 2:
        return renderPhysicalStep();
      case 3:
        return renderActivityStep(); // Combined Activity & Goals
      case 4:
        return renderPlanStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    (Math.max(1, confirmedSteps.size || 1) / steps.length) * 100
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.max(1, confirmedSteps.size || 1)} of {steps.length}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {(steps || []).map((_, index) => {
          const shouldRender = index === currentStep;
          return (
            <View key={index} style={styles.stepWrapper}>
              {shouldRender && typeof renderStep === 'function' ? renderStep() : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonContainer}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              currentStep === steps.length - 1 && styles.completeButton,
            ]}
            onPress={currentStep === steps.length - 1 ? handleComplete : nextStep}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
            </Text>
            <Ionicons
              name={currentStep === steps.length - 1 ? 'checkmark' : 'chevron-forward'}
              size={24}
              color={onPrimaryColor}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
