import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useNavigation, CommonActions } from '@react-navigation/native';

// import Slider from '@react-native-community/slider'; // Unused
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { clientLog } from '../utils/clientLog';
import { useI18n } from '../../app/i18n/hooks';

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
      marginBottom: tokens.spacing?.md ?? 16,
    },
    stepSubtitle: {
      fontSize: tokens.typography?.body?.fontSize ?? 16,
      fontWeight: tokens.typography?.body?.fontWeight ?? '400',
      color: textTertiary,
      marginBottom: tokens.spacing?.xl ?? 24,
      textAlign: 'center',
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
      padding: tokens.spacing?.md ?? 12,
      paddingVertical: tokens.spacing?.sm ?? 10,
      borderWidth: 2,
      borderColor: borderMuted,
      position: 'relative',
      minHeight: 100,
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
      flex: 1,
      flexWrap: 'wrap',
    },
    planFeatureSelected: {
      color: onPrimary,
    },
    planFeatureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: tokens.spacing?.xs ?? 8,
      paddingRight: 4,
    },
    planButtonSelected: {
      borderColor: colors.primary,
      borderWidth: 3,
      backgroundColor: isDark ? `${colors.primary}25` : `${colors.primary}10`,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    planHeaderText: {
      flex: 1,
      marginRight: 8,
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
    // Vertical Scroll Picker Styles
    verticalPickerContainer: {
      position: 'relative',
      width: '100%',
      overflow: 'hidden',
    },
    verticalPickerItem: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    verticalPickerItemSelected: {
      backgroundColor: 'transparent',
    },
    verticalPickerItemText: {
      fontSize: tokens.typography?.body?.fontSize ?? 18,
      color: textTertiary,
      fontWeight: tokens.typography?.body?.fontWeight ?? '400',
    },
    verticalPickerItemTextSelected: {
      fontSize: tokens.typography?.headingM?.fontSize ?? 32,
      color: colors.primary,
      fontWeight: tokens.typography?.headingM?.fontWeight ?? '700',
    },
    // Removed overlay styles - minimalistic design without blue lines
    // Horizontal Scroll Picker Styles
    horizontalPickerContainer: {
      position: 'relative',
      height: 120,
      overflow: 'hidden',
      alignSelf: 'center',
    },
    horizontalPickerItem: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    horizontalPickerItemSelected: {
      backgroundColor: 'transparent',
    },
    horizontalPickerItemText: {
      fontSize: tokens.typography?.body?.fontSize ?? 18,
      color: textTertiary,
      fontWeight: tokens.typography?.body?.fontWeight ?? '400',
    },
    horizontalPickerItemTextSelected: {
      fontSize: tokens.typography?.headingM?.fontSize ?? 32,
      color: colors.primary,
      fontWeight: tokens.typography?.headingM?.fontWeight ?? '700',
    },
    // Removed overlay styles - minimalistic design without blue lines
    // Large Value Display
    largeValueContainer: {
      alignItems: 'center',
      marginBottom: tokens.spacing?.xl ?? 24,
    },
    largeValueText: {
      fontSize: tokens.typography?.display?.fontSize ?? 64,
      fontWeight: tokens.typography?.display?.fontWeight ?? '700',
      color: colors.primary,
    },
    largeValueUnit: {
      fontSize: tokens.typography?.headingM?.fontSize ?? 24,
      fontWeight: tokens.typography?.headingM?.fontWeight ?? '600',
      color: textSecondary,
      marginTop: tokens.spacing?.xs ?? 4,
    },
    // Gender Selection Styles
    genderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: tokens.spacing?.md ?? 16,
      marginTop: tokens.spacing?.xl ?? 24,
    },
    genderOption: {
      flex: 1,
      backgroundColor: surface,
      borderRadius: tokens.radii?.xl ?? 16,
      padding: tokens.spacing?.xl ?? 24,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: borderMuted,
      minHeight: 120,
      justifyContent: 'center',
    },
    genderOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    genderIcon: {
      fontSize: 48,
      marginBottom: tokens.spacing?.sm ?? 8,
    },
    genderLabel: {
      fontSize: tokens.typography?.bodyStrong?.fontSize ?? 18,
      fontWeight: tokens.typography?.bodyStrong?.fontWeight ?? '600',
      color: colors.text, // Better contrast for unselected state
      marginTop: tokens.spacing?.sm ?? 8,
    },
    genderLabelSelected: {
      color: onPrimary,
    },
    summaryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: tokens.spacing?.md ?? 12,
      borderBottomWidth: 1,
      borderBottomColor: borderMuted,
    },
    summaryLabel: {
      fontSize: tokens.typography?.body?.fontSize ?? 16,
      color: textSecondary,
      fontWeight: '500',
    },
    summaryValue: {
      fontSize: tokens.typography?.body?.fontSize ?? 16,
      color: colors.text,
      fontWeight: '600',
    },
    ratingContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: tokens.spacing?.md ?? 16,
      marginTop: tokens.spacing?.xl ?? 24,
    },
    planSummary: {
      marginTop: tokens.spacing?.xl ?? 24,
      padding: tokens.spacing?.lg ?? 20,
      backgroundColor: surface,
      borderRadius: tokens.radii?.lg ?? 16,
      borderWidth: 1,
      borderColor: borderMuted,
    },
    planSummaryTitle: {
      fontSize: tokens.typography?.headingS?.fontSize ?? 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: tokens.spacing?.md ?? 12,
    },
    planSummaryText: {
      fontSize: tokens.typography?.body?.fontSize ?? 16,
      color: textSecondary,
      marginBottom: tokens.spacing?.sm ?? 8,
    },
    // New styles for Input inputs
    otherInput: {
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: colors.borderMuted || '#333',
      borderRadius: tokens.radii?.md ?? 12,
      padding: 16,
      color: colors.text,
      fontSize: 16,
      minHeight: 50,
      width: '100%',
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
    weightChangeRate: 'moderate', // slow, moderate, fast
    obstacles: [], // What prevents you from reaching your goal
    diet: '', // Are you following any diet
    walkingTime: '', // How much time do you spend walking
    shortnessOfBreath: false, // Do you get shortness of breath after stairs
    stepGoal: 10000, // Daily step goal
    healthConditions: [], // Health conditions (gastritis, high cholesterol, diabetes, thyroid, etc.)
    firstMeasurements: 7, // Days until first measurements
    selectedPlan: 'free',
    planBillingCycle: 'lifetime',
    dietOther: '', // Added for diet 'other' input
    healthConditionOther: '', // Added for health 'other' input
  });
  const [unitSystem, setUnitSystem] = useState('metric'); // 'metric' or 'imperial'
  const [loadingProgress, setLoadingProgress] = useState(0); // Loading step progress
  // Calculated plan data
  const [planData, setPlanData] = useState(null);
  const { t } = useI18n(); // Added useI18n hook


  const scrollViewRef = useRef(null);

  // Expanded steps order according to requirements
  // Expanded steps order according to requirements
  const steps = useMemo(() => [
    { id: 'welcome', title: t('onboarding.welcome', 'Welcome to EatSense') },
    { id: 'goals', title: t('onboarding.goals', 'What are your goals?') }, // Goals selection
    { id: 'support', title: t('onboarding.support', 'We care about you') }, // Support message
    { id: 'gender', title: t('onboarding.gender', 'What\'s your gender?') }, // Gender selection
    { id: 'age', title: t('onboarding.age', 'How old are you?') }, // Age with vertical scroll
    { id: 'height', title: t('onboarding.height', 'What\'s your height?') }, // Height with vertical scroll
    { id: 'weight', title: t('onboarding.weight', 'What\'s your weight?') }, // Weight with horizontal scroll
    { id: 'activity', title: t('onboarding.activity', 'How active are you?') }, // Activity level
    { id: 'walking', title: t('onboarding.walking', 'How much do you walk?') }, // Walking time
    { id: 'breath', title: t('onboarding.breath', 'Do you get shortness of breath?') }, // Shortness of breath after stairs
    // { id: 'steps', title: 'Daily step goal' }, // REMOVED
    { id: 'obstacles', title: t('onboarding.obstacles', 'What prevents you from reaching your goal?') }, // Obstacles
    { id: 'diet', title: t('onboarding.diet', 'Are you following any diet?') }, // Diet selection
    { id: 'health', title: t('onboarding.health', 'What should we know about you?') }, // Health conditions
    { id: 'care', title: t('onboarding.care', 'We care about you') }, // Care message with disclaimer
    { id: 'targetWeight', title: t('onboarding.targetWeight', 'What weight do you want?') }, // Target weight
    { id: 'weightRate', title: t('onboarding.weightRate', 'Weight change rate') }, // Rate of weight change
    { id: 'trust', title: t('onboarding.trust', 'Thank you for trusting us') }, // Trust message
    // { id: 'healthKit', title: 'Connect Apple Health' }, // REMOVED
    { id: 'notifications', title: t('onboarding.notifications', 'Enable notifications') }, // Notifications permission
    // { id: 'firstMeasurements', title: 'First measurements' }, // REMOVED
    { id: 'loading', title: t('onboarding.loading', 'Creating your plan') }, // Loading animation with plan
    // { id: 'almostReady', title: 'Almost ready' }, // REMOVED
    { id: 'summary', title: t('onboarding.summary', 'Your choices') }, // Summary of choices
    // { id: 'rating', title: 'Rate us' }, // REMOVED
    { id: 'plan', title: t('onboarding.plan', 'Choose Your Plan') }, // Plan selection
  ], [t]);

  // Removed unused genders array
  // const genders = [
  //   { id: 'male', label: 'Male', icon: 'male' },
  //   { id: 'female', label: 'Female', icon: 'female' },
  //   { id: 'other', label: 'Other', icon: 'person' },
  // ];

  const activityLevels = [
    { id: 'sedentary', label: t('onboarding.activityLevels.sedentary'), description: t('onboarding.activityLevels.sedentaryDesc') },
    { id: 'lightly_active', label: t('onboarding.activityLevels.lightlyActive'), description: t('onboarding.activityLevels.lightlyActiveDesc') },
    { id: 'moderately_active', label: t('onboarding.activityLevels.moderatelyActive'), description: t('onboarding.activityLevels.moderatelyActiveDesc') },
    { id: 'very_active', label: t('onboarding.activityLevels.veryActive'), description: t('onboarding.activityLevels.veryActiveDesc') },
    { id: 'extremely_active', label: t('onboarding.activityLevels.extremelyActive'), description: t('onboarding.activityLevels.extremelyActiveDesc') },
  ];

  const goals = [
    { id: 'lose_weight', label: t('onboarding.goalTypes.loseWeight'), icon: 'trending-down' },
    { id: 'maintain_weight', label: t('onboarding.goalTypes.maintainWeight'), icon: 'remove' },
    { id: 'gain_weight', label: t('onboarding.goalTypes.gainWeight'), icon: 'trending-up' },
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

  const markStepConfirmed = useCallback((stepIndex) => {
    setConfirmedSteps((prev) => {
      // clientLog(`Onboarding:stepConfirmed:${stepIndex}`);
      if (prev.has(stepIndex)) return prev;
      const next = new Set(prev);
      next.add(stepIndex);
      return next;
    });
  }, []);

  const nextStep = useCallback(() => {
    // Get current step ID for validation
    const currentStepId = steps[currentStep]?.id;

    // Validation based on step ID (not hard-coded indices)
    if (currentStepId === 'goals') {
      if (!profileData.goal) {
        Alert.alert('Required Field', 'Please select your goal.');
        return;
      }
    } else if (currentStepId === 'gender') {
      if (!profileData.gender) {
        Alert.alert('Required Field', 'Please select your gender.');
        return;
      }
    } else if (currentStepId === 'activity') {
      if (!profileData.activityLevel) {
        Alert.alert('Required Field', 'Please select your activity level.');
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
  }, [currentStep, steps, profileData, markStepConfirmed]);

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

      // Filter out empty 'other' condition if present and merge 'other' text
      let finalHealthConditions = [...(profileDataWithoutPlan.healthConditions || [])];

      // Remove 'other' keyword for backend if we're replacing it with text, or keep it + text?
      // Usually backend expects a list of strings. If 'other' is selected, we should append the text.
      if (finalHealthConditions.includes('other') && profileData.healthConditionOther) {
        finalHealthConditions = finalHealthConditions.filter(c => c !== 'other');
        finalHealthConditions.push(profileData.healthConditionOther);
      } else if (finalHealthConditions.includes('other') && !profileData.healthConditionOther) {
        // Should not happen with validation, but safe cleanup
        finalHealthConditions = finalHealthConditions.filter(c => c !== 'other');
      }

      // Handle Diet 'Other'
      let finalDiet = profileDataWithoutPlan.diet;
      if (finalDiet === 'other' && profileData.dietOther) {
        finalDiet = profileData.dietOther;
      }

      const finalPayload = {
        ...profileDataWithoutPlan,
        healthConditions: finalHealthConditions,
        diet: finalDiet,
        preferences: mergedPreferences,
      };

      // Logging checks
      clientLog('Onboarding:profileSave:start', { payload: finalPayload });


      // Проверяем, есть ли уже профиль
      try {
        await ApiService.getUserProfile();
        // Если профиль существует, обновляем его
        await ApiService.updateUserProfile(finalPayload);
      } catch {
        // Если профиля нет, создаем новый
        await ApiService.createUserProfile(finalPayload);
      }

      clientLog('Onboarding:profileSave:success');

      const onboardingResult = await ApiService.completeOnboarding();
      console.log('[OnboardingScreen] Onboarding completed, result:', onboardingResult);

      await clientLog('Onboarding:completed').catch(() => { });

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
          refreshUser().catch(() => { });
        }
      }

      // Используем InteractionManager для безопасного вызова navigation после завершения всех анимаций
      InteractionManager.runAfterInteractions(() => {
        // Дополнительная задержка для гарантии готовности navigation
        setTimeout(() => {
          try {
            if (navigation && navigation.isReady && navigation.isReady()) {
              console.log('[OnboardingScreen] Navigation is ready, calling reset');
              clientLog('Onboarding:navigateToMainTabs').catch(() => { });
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                })
              );
            } else if (navigation && typeof navigation.reset === 'function') {
              console.log('[OnboardingScreen] Navigation reset available, calling directly');
              clientLog('Onboarding:navigateToMainTabs').catch(() => { });
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

  // Vertical Scroll Picker Component for Age and Height - Smooth with deceleration
  // Vertical Scroll Picker Component for Age and Height - Smooth with deceleration


  // Horizontal Scroll Picker Component for Weight - Smooth with deceleration
  // Horizontal Scroll Picker Component for Weight - Smooth with deceleration


  // Interactive Slider Component with haptics


  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeContent}>
        <View style={styles.logoContainer}>
          <Ionicons name="camera" size={80} color={colors.primary} />
        </View>
        <Text style={styles.welcomeTitle}>{t('onboarding.welcome')}</Text>
        <Text style={styles.welcomeSubtitle}>
          {t('onboarding.welcomeSubtitle')}
        </Text>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="camera" size={24} color={colors.primary} />
            <Text style={styles.featureText}>{t('onboarding.features.analysis')}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="analytics" size={24} color={colors.primary} />
            <Text style={styles.featureText}>{t('onboarding.features.tracking')}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="heart" size={24} color={colors.primary} />
            <Text style={styles.featureText}>{t('onboarding.features.insights')}</Text>
          </View>
        </View>
      </View>
    </View>
  );



  const renderAgeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('onboarding.age')}</Text>
      <Text style={styles.stepSubtitle}>{t('onboarding.ageSubtitle')}</Text>
      <View style={styles.largeValueContainer}>
        <Text style={styles.largeValueText}>{profileData.age}</Text>
        <Text style={styles.largeValueUnit}>{t('onboarding.units.years')}</Text>
      </View>
      <VerticalScrollPicker
        styles={styles}
        value={profileData.age}
        minimumValue={16}
        maximumValue={100}
        onValueChange={(value) => setProfileData((prev) => ({ ...prev, age: Math.round(value) }))}
        unit={` ${t('onboarding.units.years')}`}
        step={1}
        enableHaptics={true}
      />
    </View>
  );

  const renderGenderStep = () => {
    const genders = [
      { id: 'male', label: t('onboarding.genders.male'), icon: '♂' },
      { id: 'female', label: t('onboarding.genders.female'), icon: '♀' },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{t('onboarding.gender')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.genderSubtitle')}</Text>
        <View style={styles.genderContainer}>
          {genders.map((gender) => (
            <TouchableOpacity
              key={gender.id}
              style={[
                styles.genderOption,
                profileData.gender === gender.id && styles.genderOptionSelected,
              ]}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {
                    // Ignore error
                  }
                }
                setProfileData((prev) => ({ ...prev, gender: gender.id }));
              }}
            >
              <Text style={[styles.genderIcon, { color: profileData.gender === gender.id ? onPrimaryColor : colors.text }]}>{gender.icon}</Text>
              <Text
                style={[
                  styles.genderLabel,
                  profileData.gender === gender.id && styles.genderLabelSelected,
                ]}
              >
                {gender.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderHeightStep = () => {
    const heightValue = unitSystem === 'metric'
      ? profileData.height
      : cmToFeetInches(profileData.height).totalInches;
    const heightMin = unitSystem === 'metric' ? 120 : 47;
    const heightMax = unitSystem === 'metric' ? 220 : 87;
    const heightUnit = unitSystem === 'metric' ? ' cm' : ' in';
    const displayValue = unitSystem === 'metric'
      ? profileData.height
      : `${Math.floor(heightValue / 12)}'${Math.round(heightValue % 12)}"`;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{t('onboarding.height')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.heightSubtitle')}</Text>

        {/* Unit Toggle */}
        <View style={styles.unitToggleContainer}>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              unitSystem === 'metric' && styles.unitToggleButtonActive,
            ]}
            onPress={() => {
              if (unitSystem === 'imperial') {
                const heightIn = profileData.height / 2.54;
                const feet = Math.floor(heightIn / 12);
                const inches = Math.round(heightIn % 12);
                const newHeight = feetInchesToCm(feet, inches);
                clientLog('Onboarding:unitToggle', { from: 'imperial', to: 'metric', target: 'height' });
                setProfileData((prev) => ({ ...prev, height: newHeight }));
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
              CM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              unitSystem === 'imperial' && styles.unitToggleButtonActive,
            ]}
            onPress={() => {
              if (unitSystem === 'metric') {
                const heightIn = cmToFeetInches(profileData.height).totalInches;
                clientLog('Onboarding:unitToggle', { from: 'metric', to: 'imperial', target: 'height' });
                setProfileData((prev) => ({ ...prev, height: heightIn * 2.54 }));
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
              FT
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.largeValueContainer}>
          <Text style={styles.largeValueText}>{displayValue}</Text>
        </View>
        <VerticalScrollPicker
          styles={styles}
          value={heightValue}
          minimumValue={heightMin}
          maximumValue={heightMax}
          onValueChange={(value) => {
            const newHeight = unitSystem === 'metric'
              ? Math.round(value)
              : feetInchesToCm(Math.floor(value / 12), Math.round(value % 12));
            setProfileData((prev) => ({ ...prev, height: newHeight }));
          }}
          unit={heightUnit}
          step={1}
          enableHaptics={true}
        />
      </View>
    );
  };

  const renderWeightStep = () => {
    const weightValue = unitSystem === 'metric'
      ? profileData.weight
      : kgToLbs(profileData.weight);
    const weightMin = unitSystem === 'metric' ? 30 : 66;
    const weightMax = unitSystem === 'metric' ? 200 : 440;
    const weightUnit = unitSystem === 'metric' ? ' kg' : ' lbs';
    const displayValue = unitSystem === 'metric'
      ? profileData.weight.toFixed(1)
      : weightValue.toFixed(0);

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{t('onboarding.weight')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.weightSubtitle')}</Text>

        {/* Unit Toggle */}
        <View style={styles.unitToggleContainer}>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              unitSystem === 'metric' && styles.unitToggleButtonActive,
            ]}
            onPress={() => {
              if (unitSystem === 'imperial') {
                const newWeight = lbsToKg(profileData.weight * 2.20462);
                clientLog('Onboarding:unitToggle', { from: 'imperial', to: 'metric', target: 'weight' });
                setProfileData((prev) => ({ ...prev, weight: newWeight }));
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
              kg
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              unitSystem === 'imperial' && styles.unitToggleButtonActive,
            ]}
            onPress={() => {
              if (unitSystem === 'metric') {
                const weightLbs = kgToLbs(profileData.weight);
                clientLog('Onboarding:unitToggle', { from: 'metric', to: 'imperial', target: 'weight' });
                setProfileData((prev) => ({ ...prev, weight: weightLbs / 2.20462 }));
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
              pounds
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.largeValueContainer}>
          <Text style={styles.largeValueText}>{displayValue}</Text>
          <Text style={styles.largeValueUnit}>{unitSystem === 'metric' ? 'kg' : 'lbs'}</Text>
        </View>
        <HorizontalScrollPicker
          styles={styles}
          value={weightValue}
          minimumValue={weightMin}
          maximumValue={weightMax}
          onValueChange={(value) => {
            const newWeight = unitSystem === 'metric'
              ? parseFloat(value.toFixed(1))
              : lbsToKg(value);
            setProfileData((prev) => ({ ...prev, weight: newWeight }));
          }}
          unit={weightUnit}
          step={unitSystem === 'metric' ? 0.5 : 1}
          enableHaptics={true}
        />
      </View>
    );
  };

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


  // Combined Activity & Goals step
  const renderActivityStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('onboarding.activity')}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('onboarding.activitySubtitle')}</Text>
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

      {/* Removed duplicate Goals section */}
    </View>
  );

  const renderPlanStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { marginTop: 20 }]}>{t('onboarding.plan')}</Text>
      <View style={styles.planToggle}>
        <Text style={styles.planToggleText}>
          {t('onboarding.planSubtitle')}
        </Text>
      </View>
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
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
                  <View style={[styles.planHeaderText, { flex: 1 }]}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planHeadline} numberOfLines={2}>{plan.headline}</Text>
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
                        color={colors.primary}
                      />
                      <Text style={styles.planFeature}>
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
            {t('onboarding.plans.finePrint')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  // New render functions for additional steps
  const renderGoalsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('onboarding.goals')}</Text>
      <Text style={styles.stepSubtitle}>{t('onboarding.goalsSubtitle')}</Text>
      <View style={styles.goalsContainer}>
        {goals.map((goal) => {
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
  );

  const renderSupportStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeContent}>
        <Ionicons name="heart" size={64} color={colors.primary} />
        <Text style={styles.stepTitle}>{t('onboarding.support')}</Text>
        <Text style={styles.stepSubtitle}>
          {t('onboarding.trustSubtitle')}
        </Text>
      </View>
    </View>
  );

  const renderObstaclesStep = () => {
    const obstacles = [
      { id: 'time', label: t('onboarding.obstacleTypes.time') },
      { id: 'motivation', label: t('onboarding.obstacleTypes.motivation') },
      { id: 'knowledge', label: t('onboarding.obstacleTypes.knowledge') },
      { id: 'support', label: t('onboarding.obstacleTypes.budget') },
      { id: 'habits', label: t('onboarding.obstacleTypes.habits') },
      { id: 'stress', label: t('onboarding.obstacleTypes.stress') },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{t('onboarding.obstacles')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.obstaclesSubtitle')}</Text>
        <View style={styles.activityContainer}>
          {obstacles.map((obstacle) => {
            const isSelected = profileData.obstacles?.includes(obstacle.id);
            return (
              <TouchableOpacity
                key={obstacle.id}
                style={[
                  styles.activityButton,
                  isSelected && styles.activityButtonSelected,
                ]}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setProfileData((prev) => {
                    const obstacles = prev.obstacles || [];
                    if (obstacles.includes(obstacle.id)) {
                      return { ...prev, obstacles: obstacles.filter(id => id !== obstacle.id) };
                    }
                    return { ...prev, obstacles: [...obstacles, obstacle.id] };
                  });
                }}
              >
                <Text
                  style={[
                    styles.activityLabel,
                    isSelected && styles.activityLabelSelected,
                  ]}
                >
                  {obstacle.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderDietStep = () => {
    const diets = [
      { id: 'none', label: t('onboarding.dietTypes.balanced') },
      { id: 'keto', label: t('onboarding.dietTypes.keto') },
      { id: 'paleo', label: 'Paleo' },
      { id: 'vegan', label: t('onboarding.dietTypes.vegan') },
      { id: 'vegetarian', label: t('onboarding.dietTypes.vegetarian') },
      { id: 'mediterranean', label: t('onboarding.dietTypes.mediterranean') },
      { id: 'low_carb', label: t('onboarding.dietTypes.lowCarb') },
      { id: 'other', label: t('common.other', 'Other') },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{t('onboarding.diet')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.dietSubtitle')}</Text>
        <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.activityContainer}>
            {diets.map((diet) => {
              const isSelected = profileData.diet === diet.id;
              return (
                <TouchableOpacity
                  key={diet.id}
                  style={[
                    styles.activityButton,
                    isSelected && styles.activityButtonSelected,
                  ]}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setProfileData({ ...profileData, diet: diet.id });
                  }}
                >
                  <Text
                    style={[
                      styles.activityLabel,
                      isSelected && styles.activityLabelSelected,
                    ]}
                  >
                    {diet.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {profileData.diet === 'other' && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ marginTop: 20 }}>
              <TextInput
                style={styles.otherInput}
                placeholder="Please specify your diet"
                placeholderTextColor={colors.textTertiary}
                value={profileData.dietOther}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, dietOther: text }))}
              />
            </KeyboardAvoidingView>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderHealthConditionsStep = () => {
    const conditions = [
      { id: 'gastritis', label: 'Gastritis' },
      { id: 'high_cholesterol', label: 'High Cholesterol' },
      { id: 'diabetes', label: 'Diabetes' },
      { id: 'thyroid', label: 'Thyroid Issues' },
      { id: 'other', label: 'Not in list, I\'ll write' },
      { id: 'none', label: 'No health problems' },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>What should we know about you?</Text>
        <Text style={styles.stepSubtitle}>Select your health conditions</Text>
        <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.activityContainer}>
            {conditions.map((condition) => {
              const isSelected = profileData.healthConditions?.includes(condition.id);
              return (
                <TouchableOpacity
                  key={condition.id}
                  style={[
                    styles.activityButton,
                    isSelected && styles.activityButtonSelected,
                  ]}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    if (condition.id === 'none') {
                      // Exclusive 'none'
                      setProfileData({ ...profileData, healthConditions: ['none'] });
                    } else {
                      setProfileData((prev) => {
                        const conditions = prev.healthConditions || [];
                        // If selecting something else, remove 'none'
                        let newConditions = conditions.filter(c => c !== 'none');

                        if (newConditions.includes(condition.id)) {
                          newConditions = newConditions.filter(id => id !== condition.id);
                        } else {
                          newConditions = [...newConditions, condition.id];
                        }

                        // If list becomes empty, should we auto-select none? No, let user decide.
                        return { ...prev, healthConditions: newConditions };
                      });
                    }
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Text
                      style={[
                        styles.activityLabel,
                        isSelected && styles.activityLabelSelected,
                      ]}
                    >
                      {condition.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={onPrimaryColor} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {profileData.healthConditions?.includes('other') && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ marginTop: 20 }}>
              <TextInput
                style={styles.otherInput}
                placeholder="Please specify condition"
                placeholderTextColor={colors.textTertiary}
                value={profileData.healthConditionOther}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, healthConditionOther: text }))}
              />
            </KeyboardAvoidingView>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderTargetWeightStep = () => {
    const weightValue = unitSystem === 'metric'
      ? profileData.targetWeight
      : kgToLbs(profileData.targetWeight);
    const weightMin = unitSystem === 'metric' ? 30 : 66;
    const weightMax = unitSystem === 'metric' ? 200 : 440;
    const weightUnit = unitSystem === 'metric' ? ' kg' : ' lbs';
    const displayValue = unitSystem === 'metric'
      ? profileData.targetWeight.toFixed(1)
      : weightValue.toFixed(0);

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>What weight do you want?</Text>
        <Text style={styles.stepSubtitle}>Set your target weight</Text>

        <View style={styles.unitToggleContainer}>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              unitSystem === 'metric' && styles.unitToggleButtonActive,
            ]}
            onPress={() => setUnitSystem('metric')}
          >
            <Text
              style={[
                styles.unitToggleText,
                unitSystem === 'metric' && styles.unitToggleTextActive,
              ]}
            >
              kg
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitToggleButton,
              unitSystem === 'imperial' && styles.unitToggleButtonActive,
            ]}
            onPress={() => setUnitSystem('imperial')}
          >
            <Text
              style={[
                styles.unitToggleText,
                unitSystem === 'imperial' && styles.unitToggleTextActive,
              ]}
            >
              pounds
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.largeValueContainer}>
          <Text style={styles.largeValueText}>{displayValue}</Text>
          <Text style={styles.largeValueUnit}>{unitSystem === 'metric' ? 'kg' : 'lbs'}</Text>
        </View>
        <HorizontalScrollPicker
          styles={styles}
          value={weightValue}
          minimumValue={weightMin}
          maximumValue={weightMax}
          onValueChange={(value) => {
            const newWeight = unitSystem === 'metric'
              ? parseFloat(value.toFixed(1))
              : lbsToKg(value);
            setProfileData((prev) => ({ ...prev, targetWeight: newWeight }));
          }}
          unit={weightUnit}
          step={unitSystem === 'metric' ? 0.5 : 1}
          enableHaptics={true}
        />
      </View>
    );
  };

  const renderWeightRateStep = () => {
    const rates = [
      { id: 'slow', label: 'Slow (0.25-0.5 kg/week)', value: 'slow' },
      { id: 'moderate', label: 'Moderate (0.5-1 kg/week)', value: 'moderate' },
      { id: 'fast', label: 'Fast (1-1.5 kg/week)', value: 'fast' },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Weight change rate</Text>
        <Text style={styles.stepSubtitle}>How quickly do you want to change your weight?</Text>
        <View style={styles.activityContainer}>
          {rates.map((rate) => {
            const isSelected = profileData.weightChangeRate === rate.value;
            return (
              <TouchableOpacity
                key={rate.id}
                style={[
                  styles.activityButton,
                  isSelected && styles.activityButtonSelected,
                ]}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setProfileData({ ...profileData, weightChangeRate: rate.value });
                }}
              >
                <Text
                  style={[
                    styles.activityLabel,
                    isSelected && styles.activityLabelSelected,
                  ]}
                >
                  {rate.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderTrustStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeContent}>
        <Ionicons name="heart-outline" size={64} color={colors.primary} />
        <Text style={styles.stepTitle}>Thank you for trusting us</Text>
        <Text style={styles.stepSubtitle}>
          We&apos;re committed to helping you achieve your health and nutrition goals.
        </Text>
      </View>
    </View>
  );

  const renderCareStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeContent}>
        <Ionicons name="shield-checkmark" size={64} color={colors.primary} />
        <Text style={styles.stepTitle}>We care about you</Text>
        <Text style={styles.stepSubtitle}>
          Our personalized recommendations are designed to help you reach your goals.
          {'\n\n'}
          Please note: This app is not a substitute for professional medical consultation.
        </Text>
      </View>
    </View>
  );

  const renderWalkingStep = () => {
    const walkingOptions = [
      { id: 'none', label: 'Less than 30 min/day' },
      { id: 'low', label: '30-60 min/day' },
      { id: 'moderate', label: '1-2 hours/day' },
      { id: 'high', label: 'More than 2 hours/day' },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>How much time do you spend walking?</Text>
        <Text style={styles.stepSubtitle}>Select your daily walking time</Text>
        <View style={styles.activityContainer}>
          {walkingOptions.map((option) => {
            const isSelected = profileData.walkingTime === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.activityButton,
                  isSelected && styles.activityButtonSelected,
                ]}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setProfileData({ ...profileData, walkingTime: option.id });
                }}
              >
                <Text
                  style={[
                    styles.activityLabel,
                    isSelected && styles.activityLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderBreathStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Do you get shortness of breath after climbing stairs?</Text>
      <Text style={styles.stepSubtitle}>This helps us understand your fitness level</Text>
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[
            styles.genderOption,
            profileData.shortnessOfBreath === true && styles.genderOptionSelected,
          ]}
          onPress={() => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            setProfileData((prev) => ({ ...prev, shortnessOfBreath: true }));
          }}
        >
          <Ionicons name="checkmark-circle" size={48} color={profileData.shortnessOfBreath === true ? onPrimaryColor : colors.textSecondary} />
          <Text
            style={[
              styles.genderLabel,
              profileData.shortnessOfBreath === true && styles.genderLabelSelected,
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.genderOption,
            profileData.shortnessOfBreath === false && styles.genderOptionSelected,
          ]}
          onPress={() => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            setProfileData((prev) => ({ ...prev, shortnessOfBreath: false }));
          }}
        >
          <Ionicons name="close-circle" size={48} color={profileData.shortnessOfBreath === false ? onPrimaryColor : colors.textSecondary} />
          <Text
            style={[
              styles.genderLabel,
              profileData.shortnessOfBreath === false && styles.genderLabelSelected,
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );





  const renderNotificationsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeContent}>
        <Ionicons name="notifications" size={64} color={colors.primary} />
        <Text style={styles.stepTitle}>Enable notifications</Text>
        <Text style={styles.stepSubtitle}>
          Get reminders about meals, water intake, and your health goals.
        </Text>
        <TouchableOpacity
          style={[styles.nextButton, { marginTop: 32 }]}
          onPress={async () => {
            try {
              const { status } = await Notifications.requestPermissionsAsync();
              if (status === 'granted') {
                // You might want to get the token here if needed
                // const token = (await Notifications.getExpoPushTokenAsync()).data;
                // But for now just proceed
                Alert.alert('Success', 'Notifications enabled!');
              } else {
                Alert.alert('Notice', 'Notifications were not enabled.');
              }
            } catch (e) {
              console.warn(e);
              Alert.alert('Error', 'Could not enable notifications.');
            }
            nextStep();
          }}
        >
          <Text style={styles.nextButtonText}>Enable</Text>
        </TouchableOpacity>
      </View>
    </View>
  );



  // Effect for loading step - calculate plan when on loading step
  useEffect(() => {
    const currentStepId = steps[currentStep]?.id;
    if (currentStepId === 'loading') {
      setLoadingProgress(0);
      setPlanData(null);
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            // Calculate recommended plan based on user data
            const activityMultiplier = profileData.activityLevel === 'sedentary' ? 1.2 :
              profileData.activityLevel === 'lightly_active' ? 1.375 :
                profileData.activityLevel === 'moderately_active' ? 1.55 :
                  profileData.activityLevel === 'very_active' ? 1.725 : 1.9;
            const recommendedCalories = Math.round(
              (profileData.gender === 'male' ? 88.362 : 447.593) +
              (13.397 * profileData.weight) +
              (4.799 * profileData.height) -
              (5.677 * profileData.age) * activityMultiplier
            );

            setPlanData({
              recommendedWeight: profileData.targetWeight,
              dailyCalories: recommendedCalories,
              dailyProtein: Math.round(recommendedCalories * 0.3 / 4),
              dailyCarbs: Math.round(recommendedCalories * 0.4 / 4),
              dailyFat: Math.round(recommendedCalories * 0.3 / 9),
            });
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      // Reset when leaving loading step
      setLoadingProgress(0);
      setPlanData(null);
    }
  }, [currentStep, profileData, steps]);

  // Auto-advance logic after loading
  useEffect(() => {
    const currentStepId = steps[currentStep]?.id;
    // Only auto-advance if we actully HAVE a plan data and are 100% loaded
    if (currentStepId === 'loading' && loadingProgress >= 100 && planData) {
      // Delay slightly for user to see 100%
      const timer = setTimeout(() => {
        nextStep();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress, currentStep, planData, steps, nextStep]);

  const renderLoadingStep = () => {

    return (
      <View style={styles.stepContainer}>
        <View style={styles.welcomeContent}>
          {loadingProgress < 100 ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.stepTitle}>Creating your plan</Text>
              <Text style={styles.stepSubtitle}>{Math.round(loadingProgress)}%</Text>
            </>
          ) : planData ? (
            <>
              <Ionicons name="checkmark-circle" size={64} color={colors.success} />
              <Text style={styles.stepTitle}>Your personalized plan</Text>
              <View style={styles.planSummary}>
                <Text style={styles.planSummaryTitle}>Recommended daily intake:</Text>
                <Text style={styles.planSummaryText}>Calories: {planData.dailyCalories} kcal</Text>
                <Text style={styles.planSummaryText}>Protein: {planData.dailyProtein} g</Text>
                <Text style={styles.planSummaryText}>Carbs: {planData.dailyCarbs} g</Text>
                <Text style={styles.planSummaryText}>Fat: {planData.dailyFat} g</Text>
                <Text style={[styles.planSummaryText, { marginTop: 16 }]}>
                  Target weight: {planData.recommendedWeight} kg
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
    );
  };



  const renderSummaryStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your choices</Text>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Goal:</Text>
          <Text style={styles.summaryValue}>
            {goals.find(g => g.id === profileData.goal)?.label || 'Not set'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Gender:</Text>
          <Text style={styles.summaryValue}>
            {profileData.gender === 'male' ? 'Male' : profileData.gender === 'female' ? 'Female' : 'Not set'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Age:</Text>
          <Text style={styles.summaryValue}>{profileData.age} years</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Height:</Text>
          <Text style={styles.summaryValue}>{profileData.height} cm</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Weight:</Text>
          <Text style={styles.summaryValue}>{profileData.weight} kg</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Activity Level:</Text>
          <Text style={styles.summaryValue}>
            {activityLevels.find(a => a.id === profileData.activityLevel)?.label || 'Not set'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Target Weight:</Text>
          <Text style={styles.summaryValue}>{profileData.targetWeight} kg</Text>
        </View>
      </ScrollView>
    </View>
  );



  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderWelcomeStep();
      case 1: return renderGoalsStep();
      case 2: return renderSupportStep();
      case 3: return renderGenderStep();
      case 4: return renderAgeStep();
      case 5: return renderHeightStep();
      case 6: return renderWeightStep();
      case 7: return renderActivityStep();
      case 8: return renderWalkingStep();
      case 9: return renderBreathStep();
      case 10: return renderObstaclesStep();
      case 11: return renderDietStep();
      case 12: return renderHealthConditionsStep();
      case 13: return renderCareStep();
      case 14: return renderTargetWeightStep();
      case 15: return renderWeightRateStep();
      case 16: return renderTrustStep();
      case 17: return renderNotificationsStep();
      case 18: return renderLoadingStep();
      case 19: return renderSummaryStep();
      case 20: return renderPlanStep();
      default: return renderWelcomeStep();
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
                  width: `${(Math.max(1, confirmedSteps.size || 1) / steps.length) * 100
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

      {
        steps[currentStep]?.id !== 'loading' && (
          <View style={styles.footer}>
            <View style={styles.buttonContainer}>
              {currentStep > 0 ? (
                <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                  <Ionicons name="chevron-back" size={24} color={colors.primary} />
                  <Text style={styles.backButtonText}>{t('onboarding.buttons.back')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 60 }} /> /* Spacer to keep Next button on the right */
              )}

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  currentStep === steps.length - 1 && styles.completeButton,
                ]}
                onPress={currentStep === steps.length - 1 ? handleComplete : nextStep}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === steps.length - 1 ? t('onboarding.buttons.complete') : t('onboarding.buttons.next')}
                </Text>
                <Ionicons
                  name={currentStep === steps.length - 1 ? 'checkmark' : 'chevron-forward'}
                  size={24}
                  color={onPrimaryColor}
                />
              </TouchableOpacity>
            </View>
          </View>
        )
      }
    </SafeAreaView>
  );
};

export default OnboardingScreen;

// Vertical Scroll Picker Component for Age and Height - Smooth with deceleration
const VerticalScrollPicker = ({
  value,
  minimumValue,
  maximumValue,
  onValueChange,
  unit,
  step = 1,
  enableHaptics = true,
  styles,
}) => {
  const scrollViewRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isProgrammaticScroll = useRef(false);
  const itemHeight = 60;
  const visibleItems = 5;
  const containerHeight = itemHeight * visibleItems;
  const localValueRef = useRef(value); // Tracks the current scroll position value visually

  // Initialize scroll position
  useEffect(() => {
    if (scrollViewRef.current) {
      const initialOffset = ((value - minimumValue) / step) * itemHeight;
      localValueRef.current = value;
      // Initial setup doesn't need animation
      scrollViewRef.current.scrollTo({ y: initialOffset, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync scroll position when value changes externally (e.g. unit toggle)
  useEffect(() => {
    // Only sync if we are NOT currently scrolling manually
    if (!isScrollingRef.current && scrollViewRef.current && Math.abs(localValueRef.current - value) >= step / 2) {
      const newOffset = ((value - minimumValue) / step) * itemHeight;
      isProgrammaticScroll.current = true;
      localValueRef.current = value;

      scrollViewRef.current.scrollTo({ y: newOffset, animated: true });

      // Reset programmatic flag after animation
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 300);
    }
  }, [value, minimumValue, step]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: new Animated.Value(0) } } }], // Dummy mapped value, we use listener
    {
      useNativeDriver: false,
      listener: (event) => {
        if (isProgrammaticScroll.current) return;

        isScrollingRef.current = true;
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / itemHeight);
        const newValue = Math.max(
          minimumValue,
          Math.min(maximumValue, minimumValue + index * step)
        );

        // Update parent state immediately during scroll for real-time feedback
        if (Math.abs(newValue - localValueRef.current) >= step / 2) {
          localValueRef.current = newValue;
          onValueChange(newValue); // Real-time update

          // Haptics on value change
          if (enableHaptics && Platform.OS === 'ios') {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              // ignore
            }
          }
        }
      },
    }
  );

  const handleMomentumScrollEnd = (event) => {
    isScrollingRef.current = false;
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);

    const snappedValue = Math.max(
      minimumValue,
      Math.min(maximumValue, minimumValue + index * step)
    );

    localValueRef.current = snappedValue;

    // Only commit to source of truth when scroll STOPS
    if (Math.abs(snappedValue - value) >= step / 2) {
      // Log for debugging
      if (unit.includes('years')) {
        clientLog('Onboarding:ageCommitted', { age: snappedValue });
      } else {
        clientLog('Onboarding:heightCommitted', { value: snappedValue, unit: unit.trim() });
      }
      onValueChange(snappedValue);
    }
  };

  // Also handle drag end to ensure we catch stops without momentum


  const items = [];
  for (let i = minimumValue; i <= maximumValue; i += step) {
    items.push(i);
  }

  return (
    <View style={[styles.verticalPickerContainer, { height: containerHeight }]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        contentContainerStyle={{
          paddingTop: containerHeight / 2 - itemHeight / 2,
          paddingBottom: containerHeight / 2 - itemHeight / 2,
        }}
      >
        {items.map((item) => {
          const isSelected = Math.abs(item - value) < step / 2;
          return (
            <View
              key={item}
              style={[
                styles.verticalPickerItem,
                { height: itemHeight },
              ]}
            >
              <Text
                style={[
                  styles.verticalPickerItemText,
                  isSelected && styles.verticalPickerItemTextSelected,
                ]}
              >
                {Math.round(item)}{unit}
              </Text>
            </View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
};

// Horizontal Scroll Picker Component for Weight - Smooth with deceleration
const HorizontalScrollPicker = ({
  value,
  minimumValue,
  maximumValue,
  onValueChange,
  unit,
  step = 0.5,
  enableHaptics = true,
  styles,
}) => {
  const scrollViewRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isProgrammaticScroll = useRef(false);
  const itemWidth = 80;
  const visibleItems = 5;
  const containerWidth = itemWidth * visibleItems;
  const localValueRef = useRef(value);

  // Initialize scroll position
  useEffect(() => {
    if (scrollViewRef.current) {
      const initialOffset = ((value - minimumValue) / step) * itemWidth;
      localValueRef.current = value;
      scrollViewRef.current.scrollTo({ x: initialOffset, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync scroll position when value changes externally
  useEffect(() => {
    // Only sync if we are NOT currently scrolling manually
    if (!isScrollingRef.current && scrollViewRef.current && Math.abs(localValueRef.current - value) >= step / 2) {
      const newOffset = ((value - minimumValue) / step) * itemWidth;
      isProgrammaticScroll.current = true;
      localValueRef.current = value;

      scrollViewRef.current.scrollTo({ x: newOffset, animated: true });

      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 300);
    }
  }, [value, minimumValue, step]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: new Animated.Value(0) } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        if (isProgrammaticScroll.current) return;

        isScrollingRef.current = true;
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / itemWidth);
        const newValue = Math.max(
          minimumValue,
          Math.min(maximumValue, minimumValue + index * step)
        );

        // Update parent state immediately during scroll for real-time feedback
        if (Math.abs(newValue - localValueRef.current) >= step / 2) {
          localValueRef.current = newValue;
          onValueChange(newValue); // Real-time update

          // Haptics on value change
          if (enableHaptics && Platform.OS === 'ios') {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              // ignore
            }
          }
        }
      },
    }
  );

  const handleMomentumScrollEnd = (event) => {
    isScrollingRef.current = false;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / itemWidth);

    const snappedValue = Math.max(
      minimumValue,
      Math.min(maximumValue, minimumValue + index * step)
    );

    localValueRef.current = snappedValue;

    if (Math.abs(snappedValue - value) >= step / 2) {
      clientLog('Onboarding:weightCommitted', { value: snappedValue, unit: unit.trim() });
      onValueChange(snappedValue);
    }
  };

  const items = [];
  for (let i = minimumValue; i <= maximumValue; i += step) {
    items.push(parseFloat(i.toFixed(1)));
  }

  return (
    <View style={[styles.horizontalPickerContainer, { width: containerWidth }]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        contentContainerStyle={{
          paddingLeft: containerWidth / 2 - itemWidth / 2,
          paddingRight: containerWidth / 2 - itemWidth / 2,
        }}
      >
        {items.map((item) => {
          const isSelected = Math.abs(item - value) < step / 2;
          return (
            <View
              key={item}
              style={[
                styles.horizontalPickerItem,
                { width: itemWidth },
              ]}
            >
              <Text
                style={[
                  styles.horizontalPickerItemText,
                  isSelected && styles.horizontalPickerItemTextSelected,
                ]}
              >
                {item}{unit}
              </Text>
            </View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
};

