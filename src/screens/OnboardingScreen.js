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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import { useNavigation, CommonActions } from '@react-navigation/native';

// import Slider from '@react-native-community/slider'; // Unused
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/apiService';
import IAPService from '../services/iapService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { clientLog } from '../utils/clientLog';
import { useI18n } from '../../app/i18n/hooks';
// import { legalDocuments } from '../legal/legalContent';
import { openLegalLink } from '../utils/legal';
import HealthDisclaimer from '../components/HealthDisclaimer';
import LegalDocumentView from '../components/LegalDocumentView';

const { width } = Dimensions.get('window');

const createStyles = (tokens, colors, _isDark = false) => {
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
      flexDirection: 'column',
      justifyContent: 'flex-start',
      gap: tokens.spacing?.md ?? 12,
    },
    goalButton: {
      width: '100%',
      backgroundColor: surface,
      borderRadius: tokens.radii?.lg ?? 12,
      padding: tokens.spacing?.lg ?? 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: borderMuted,
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    goalButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    goalText: {
      flex: 1,
      fontSize: tokens.typography?.bodyStrong?.fontSize ?? 16,
      fontWeight: tokens.typography?.bodyStrong?.fontWeight ?? '600',
      color: colors.primary,
      marginLeft: 16,
      marginTop: 0,
      textAlign: 'left',
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
      backgroundColor: Platform.OS === 'ios' ? 'rgba(124, 58, 237, 0.05)' : surface,
    },
    // Compact plan styles for 4 plans on screen
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
    planButtonStudent: {
      borderColor: '#7C3AED',
    },
    popularBadgeCompact: {
      position: 'absolute',
      top: -10,
      right: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
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
      borderColor: colors.primary,
    },
    radioCircleInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    planCompactInfo: {
      flex: 1,
    },
    planNameCompact: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    planNameSelected: {
      color: colors.primary,
    },
    planHeadlineCompact: {
      fontSize: 12,
      color: textSecondary,
      marginTop: 2,
    },
    planPriceCompact: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginLeft: 8,
    },
    planPriceSelected: {
      color: colors.primary,
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
      flexDirection: 'column',
      justifyContent: 'flex-start',
      gap: tokens.spacing?.md ?? 16,
      marginTop: tokens.spacing?.xl ?? 24,
    },
    genderOption: {
      width: '100%',
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
  const { colors, tokens, isDark } = useTheme();
  const { setUser, refreshUser } = useAuth();
  const styles = useMemo(() => createStyles(tokens, colors, isDark), [tokens, colors, isDark]);
  const onPrimaryColor = colors.onPrimary ?? tokens.colors?.onPrimary ?? '#FFFFFF';
  const [currentStep, setCurrentStep] = useState(0);
  const [, setConfirmedSteps] = useState(new Set());
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
    termsAccepted: false, // Terms and Privacy acceptance
    privacyAccepted: false,
  });
  const [unitSystem, setUnitSystem] = useState('metric'); // 'metric' or 'imperial'
  const [loadingProgress, setLoadingProgress] = useState(0); // Loading step progress
  const [notificationsEnabled, setNotificationsEnabled] = useState(false); // Notifications permission state
  // Calculated plan data
  const [planData, setPlanData] = useState(null);
  const { t, language } = useI18n(); // Added useI18n hook

  // Terms step state
  const [hasOpenedTerms, setHasOpenedTerms] = useState(false);
  const [hasOpenedPrivacy, setHasOpenedPrivacy] = useState(false);
  const [showStudentPlan, setShowStudentPlan] = useState(false); // Collapsible student plan toggle


  const scrollViewRef = useRef(null);

  // Simplified onboarding - only essential data collection slides
  const steps = useMemo(() => [
    { id: 'welcome', title: t('onboarding.welcome', 'Welcome to EatSense') },
    { id: 'goals', title: t('onboarding.goals', 'What are your goals?') },
    { id: 'gender', title: t('onboarding.gender', 'What\'s your gender?') },
    { id: 'age', title: t('onboarding.age', 'How old are you?') },
    { id: 'height', title: t('onboarding.height', 'What\'s your height?') },
    { id: 'weight', title: t('onboarding.weight', 'What\'s your weight?') },
    { id: 'targetWeight', title: t('onboarding.targetWeight', 'What weight do you want?') },
    { id: 'activity', title: t('onboarding.activity', 'How active are you?') },
    { id: 'diet', title: t('onboarding.diet', 'Are you following any diet?') },
    { id: 'health', title: t('onboarding.health', 'What should we know about you?') },
    { id: 'notifications', title: t('onboarding.notifications', 'Enable notifications') },
    { id: 'terms', title: t('onboarding.terms', 'Terms & Privacy') },
    { id: 'loading', title: t('onboarding.loading', 'Creating your plan') },
    { id: 'plan', title: t('onboarding.plan', 'Choose Your Plan') },
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

  // FIX 2026-01-19: Currency from IAP (Apple/Google) with region fallback
  // This ensures we show the exact price the user will pay
  const [currency, setCurrency] = useState({
    symbol: '$',
    code: 'USD',
    freePrice: '$0',
    monthlyPrice: '$9.99',
    yearlyPrice: '$79.99',
    studentPrice: '$49.99',
    founderPrice: '$199.99',
  });

  // Load currency from IAP on mount
  useEffect(() => {
    let isMounted = true;

    const loadCurrency = async () => {
      // STEP 1: Try IAP (Apple/Google real prices)
      try {
        const initResult = await IAPService.init();
        if (initResult) {
          const result = await IAPService.getAvailableProducts();
          const allProducts = [...(result?.subscriptions || []), ...(result?.products || [])];

          if (allProducts.length > 0 && allProducts[0]?.currency) {
            const currencyCode = allProducts[0].currency;
            const monthly = allProducts.find(p => p.productId?.includes('monthly'));
            const yearly = allProducts.find(p => p.productId?.includes('yearly') && !p.productId?.includes('student'));
            const student = allProducts.find(p => p.productId?.includes('student'));

            if (isMounted && (monthly || yearly)) {
              const symbols = { USD: '$', EUR: '€', GBP: '£', CHF: 'CHF', RUB: '₽', KZT: '₸', UAH: '₴', PLN: 'zł' };
              const symbol = symbols[currencyCode] || currencyCode;
              const isAfter = ['EUR', 'RUB', 'KZT', 'UAH', 'PLN', 'CZK'].includes(currencyCode);

              setCurrency({
                symbol,
                code: currencyCode,
                freePrice: isAfter ? `0 ${symbol}` : `${symbol}0`,
                monthlyPrice: monthly?.localizedPrice || `${symbol}9.99`,
                yearlyPrice: yearly?.localizedPrice || `${symbol}79.99`,
                studentPrice: student?.localizedPrice || `${symbol}49.99`,
                founderPrice: allProducts.find(p => p.productId === 'eatsense.founder.pass')?.localizedPrice || `${symbol}199.99`,
              });
              console.log('[Onboarding] Currency from IAP:', currencyCode);
              return;
            }
          }
        }
      } catch (e) {
        console.log('[Onboarding] IAP unavailable:', e?.message);
      }

      // STEP 2: Fallback to device region
      if (!isMounted) return;
      const deviceLocale = Localization.getLocales()?.[0];
      const region = deviceLocale?.regionCode?.toUpperCase();

      const regionMap = {
        'CH': { symbol: 'CHF', code: 'CHF', freePrice: 'CHF 0', monthlyPrice: 'CHF 9.90', yearlyPrice: 'CHF 79.00', studentPrice: 'CHF 49.00' },
        'RU': { symbol: '₽', code: 'RUB', freePrice: '0 ₽', monthlyPrice: '799 ₽', yearlyPrice: '5 990 ₽', studentPrice: '3 990 ₽' },
        'KZ': { symbol: '₸', code: 'KZT', freePrice: '0 ₸', monthlyPrice: '3 990 ₸', yearlyPrice: '29 990 ₸', studentPrice: '19 990 ₸' },
        'DE': { symbol: '€', code: 'EUR', freePrice: '0 €', monthlyPrice: '8,99 €', yearlyPrice: '69,99 €', studentPrice: '44,99 €' },
        'FR': { symbol: '€', code: 'EUR', freePrice: '0 €', monthlyPrice: '8,99 €', yearlyPrice: '69,99 €', studentPrice: '44,99 €' },
        'GB': { symbol: '£', code: 'GBP', freePrice: '£0', monthlyPrice: '£7.99', yearlyPrice: '£59.99', studentPrice: '£39.99' },
        'US': { symbol: '$', code: 'USD', freePrice: '$0', monthlyPrice: '$9.99', yearlyPrice: '$79.99', studentPrice: '$49.99' },
        'UA': { symbol: '₴', code: 'UAH', freePrice: '0 ₴', monthlyPrice: '399 ₴', yearlyPrice: '2 999 ₴', studentPrice: '1 999 ₴' },
        'PL': { symbol: 'zł', code: 'PLN', freePrice: '0 zł', monthlyPrice: '39,99 zł', yearlyPrice: '299,99 zł', studentPrice: '199,99 zł' },
        'AU': { symbol: 'A$', code: 'AUD', freePrice: 'A$0', monthlyPrice: 'A$14.99', yearlyPrice: 'A$119.99', studentPrice: 'A$74.99' },
        'CA': { symbol: 'C$', code: 'CAD', freePrice: 'C$0', monthlyPrice: 'C$12.99', yearlyPrice: 'C$99.99', studentPrice: 'C$64.99' },
      };

      if (region && regionMap[region]) {
        setCurrency(regionMap[region]);
        console.log('[Onboarding] Currency from region:', region);
      }
    };

    loadCurrency();
    return () => { isMounted = false; };
  }, []);

  const plans = [
    {
      id: 'free',
      name: t('onboarding.plans.free.name', 'EatSense Free'),
      price: t('onboarding.plans.free.price', 'Free Forever'), // Updated to use translation directly
      billingCycle: 'lifetime',
      headline: t('onboarding.plans.freeHeadline', 'Get started with the essentials'),
      features: [
        t('onboarding.plans.features.analysis3', 'AI food analysis (3/day)'),
        t('onboarding.plans.features.tracking', 'Daily calorie tracking'),
        t('onboarding.plans.features.basicStats', 'Basic statistics'),
      ],
      badge: t('onboarding.plans.included', 'Included'),
      popular: false,
    },
    {
      id: 'pro_monthly',
      name: t('onboarding.plans.monthly', 'Monthly'),
      price: currency.monthlyPrice + ' / ' + t('onboarding.plans.month', 'mo'),
      billingCycle: 'monthly',
      headline: t('onboarding.plans.monthlyHeadline', 'Flexible billing'),
      features: [
        t('onboarding.plans.features.unlimited', 'Unlimited AI analysis'),
        t('onboarding.plans.features.insights', 'Advanced nutrition insights'),
        t('onboarding.plans.features.coaching', 'Personalized coaching'),
        t('onboarding.plans.features.support', 'Priority support'),
      ],
      badge: t('onboarding.plans.proMonthly.badge', 'Popular'), // Added badge
      popular: false,
    },
    {
      id: 'pro_annual',
      name: t('onboarding.plans.yearly', 'Yearly'),
      price: currency.yearlyPrice + ' / ' + t('onboarding.plans.year', 'yr'),
      billingCycle: 'annual',
      headline: t('onboarding.plans.yearlyHeadline', 'Best value — save 33%'),
      features: [
        t('onboarding.plans.features.everything', 'Everything in Monthly'),
        t('onboarding.plans.features.webinars', 'Exclusive webinars'),
        t('onboarding.plans.features.earlyAccess', 'Early access to features'),
      ],
      badge: t('onboarding.plans.bestValue', 'Best Value'),
      popular: true,
    },
    {
      id: 'student',
      name: t('onboarding.plans.student.name', 'Student'),
      price: currency.studentPrice + ' / ' + t('onboarding.plans.year', 'yr'),
      billingCycle: 'annual',
      headline: t('onboarding.plans.studentHeadline', 'Special student pricing'),
      features: [
        t('onboarding.plans.features.unlimited', 'Unlimited AI analysis'),
        t('onboarding.plans.features.insights', 'Advanced nutrition insights'),
        t('onboarding.plans.features.verification', 'Student ID required'),
      ],
      badge: t('onboarding.plans.studentBadge', 'Student'),
      popular: false,
      isStudent: true,
    },
    {
      id: 'founders',
      name: t('onboarding.plans.founder.name', 'Founder'),
      price: currency.founderPrice,
      billingCycle: 'lifetime',
      headline: t('onboarding.plans.founderHeadline', 'Lifetime access + Exclusive badge'),
      features: [
        t('onboarding.plans.features.lifetime', 'One-time payment, forever access'),
        t('onboarding.plans.features.badge', 'Exclusive Founder Badge'),
        t('onboarding.plans.features.priority', 'Direct developer access'),
      ],
      badge: t('onboarding.plans.founderBadge', 'Limited'),
      popular: false,
      isFounder: true,
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

      // FIX 2026-01-19: If plan is NOT free, navigate to SubscriptionScreen for payment
      if (selectedPlan && selectedPlan !== 'free') {
        console.log('[OnboardingScreen] Paid plan selected, navigating to SubscriptionScreen');
        navigation.navigate('Subscription', { selectedPlanId: selectedPlan });
        return;
      }

      const onboardingResult = await ApiService.completeOnboarding();
      console.log('[OnboardingScreen] Onboarding completed, result:', onboardingResult);

      await clientLog('Onboarding:completed').catch(() => { });

      // Update user context with isOnboardingCompleted (no need to refetch profile)
      if (setUser) {
        setUser((prev) => ({ ...prev, isOnboardingCompleted: true }));
        console.log('[OnboardingScreen] User context updated with isOnboardingCompleted: true');
      }

      // Navigate immediately without extra delays
      // FIX 2026-01-19: Reduced delay from 100ms to 50ms and removed redundant getUserProfile call
      InteractionManager.runAfterInteractions(() => {
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
        }, 50); // Reduced from 100ms to 50ms
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
      <Text style={[styles.stepTitle, { marginTop: 8, marginBottom: 4 }]}>{t('onboarding.plan')}</Text>
      <Text style={[styles.planToggleText, { marginBottom: 12 }]}>
        {t('onboarding.planSubtitle', 'Choose the plan that works best for you')}
      </Text>
      <View style={[styles.plansContainer, { flex: 1 }]}>
        {/* Main plans (excluding student) */}
        {(plans || []).filter(plan => !plan.isStudent).map((plan) => {
          const isSelected =
            profileData.selectedPlan === plan.id ||
            (plan.id === 'free' &&
              profileData.selectedPlan === 'free' &&
              profileData.planBillingCycle === 'lifetime');

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planButtonCompact,
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
              {plan.badge && (
                <View style={styles.popularBadgeCompact}>
                  <Text style={styles.popularTextCompact}>{plan.badge}</Text>
                </View>
              )}
              <View style={styles.planCompactContent}>
                <View style={styles.planCompactLeft}>
                  <View style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}>
                    {isSelected && <View style={styles.radioCircleInner} />}
                  </View>
                  <View style={styles.planCompactInfo}>
                    <Text style={[styles.planNameCompact, isSelected && styles.planNameSelected]}>
                      {plan.name}
                    </Text>
                    <Text style={styles.planHeadlineCompact} numberOfLines={1}>
                      {plan.headline}
                    </Text>
                    {/* Features Preview */}
                    <View style={{ marginTop: 6 }}>
                      {plan.features.slice(0, 2).map((feature, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Ionicons name="checkmark" size={12} color={colors.success || '#34C759'} />
                          <Text style={[styles.planFeatureCompact, { marginLeft: 4 }]} numberOfLines={1}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={[styles.planPriceCompact, isSelected && styles.planPriceSelected]}>
                  {plan.price}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Collapsible Student Plan Section */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            marginTop: 8,
          }}
          onPress={() => setShowStudentPlan(!showStudentPlan)}
        >
          <Ionicons
            name={showStudentPlan ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary || '#666'}
          />
          <Text style={{
            marginLeft: 6,
            color: colors.textSecondary || '#666',
            fontSize: 14,
          }}>
            {t('onboarding.additionalPlans', 'Дополнительно')}
          </Text>
        </TouchableOpacity>

        {/* Student & Founder Plans (shown when expanded) */}
        {showStudentPlan && (plans || []).filter(plan => plan.isStudent || plan.isFounder).map((plan) => {
          const isSelected = profileData.selectedPlan === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planButtonCompact,
                styles.planButtonStudent,
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
              {plan.badge && (
                <View style={[styles.popularBadgeCompact, styles.studentBadge]}>
                  <Text style={styles.popularTextCompact}>{plan.badge}</Text>
                </View>
              )}
              <View style={styles.planCompactContent}>
                <View style={styles.planCompactLeft}>
                  <View style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}>
                    {isSelected && <View style={styles.radioCircleInner} />}
                  </View>
                  <View style={styles.planCompactInfo}>
                    <Text style={[styles.planNameCompact, isSelected && styles.planNameSelected]}>
                      {plan.name}
                    </Text>
                    <Text style={styles.planHeadlineCompact} numberOfLines={1}>
                      {plan.headline}
                    </Text>
                    <View style={{ marginTop: 6 }}>
                      {plan.features.slice(0, 2).map((feature, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Ionicons name="checkmark" size={12} color={colors.success || '#34C759'} />
                          <Text style={[styles.planFeatureCompact, { marginLeft: 4 }]} numberOfLines={1}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={[styles.planPriceCompact, isSelected && styles.planPriceSelected]}>
                  {plan.price}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.planFinePrint}>
        <Ionicons name="information-circle" size={14} color={colors.textTertiary || '#999'} />
        <Text style={styles.planFinePrintText}>
          {t('onboarding.plans.finePrint', 'Cancel anytime. Terms apply.')}
        </Text>
      </View>
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

  const renderDietStep = () => {
    const diets = [
      { id: 'none', label: t('onboarding.dietTypes.none', 'No diet'), icon: 'remove-circle-outline' },
      { id: 'balanced', label: t('onboarding.dietTypes.balanced', 'Balanced'), icon: 'nutrition-outline' },
      { id: 'keto', label: t('onboarding.dietTypes.keto', 'Keto'), icon: 'flame-outline' },
      { id: 'paleo', label: t('onboarding.dietTypes.paleo', 'Paleo'), icon: 'leaf-outline' },
      { id: 'vegan', label: t('onboarding.dietTypes.vegan', 'Vegan'), icon: 'flower-outline' },
      { id: 'vegetarian', label: t('onboarding.dietTypes.vegetarian', 'Vegetarian'), icon: 'leaf-outline' },
      { id: 'mediterranean', label: t('onboarding.dietTypes.mediterranean', 'Mediterranean'), icon: 'fish-outline' },
      { id: 'low_carb', label: t('onboarding.dietTypes.lowCarb', 'Low Carb'), icon: 'barbell-outline' },
      { id: 'other', label: t('common.other', 'Other'), icon: 'ellipsis-horizontal-outline' },
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
                placeholder={t('onboarding.specifyDiet', 'Please specify your diet')}
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
      { id: 'gastritis', label: t('onboarding.healthConditions.gastritis', 'Gastritis') },
      { id: 'high_cholesterol', label: t('onboarding.healthConditions.highCholesterol', 'High Cholesterol') },
      { id: 'diabetes', label: t('onboarding.healthConditions.diabetes', 'Diabetes') },
      { id: 'thyroid', label: t('onboarding.healthConditions.thyroid', 'Thyroid Issues') },
      { id: 'other', label: t('onboarding.healthConditions.other', 'Not in list, I\'ll write') },
      { id: 'none', label: t('onboarding.healthConditions.none', 'No health problems') },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{t('onboarding.health', 'What should we know about you?')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.healthSubtitle', 'Select your health conditions')}</Text>
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
                placeholder={t('onboarding.specifyCondition', 'Please specify condition')}
                placeholderTextColor={colors.textTertiary}
                value={profileData.healthConditionOther}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, healthConditionOther: text }))}
              />
            </KeyboardAvoidingView>
          )}
          <HealthDisclaimer style={{ marginTop: 20, marginBottom: 40 }} />
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
        <Text style={styles.stepTitle}>{t('onboarding.targetWeight', 'What weight do you want?')}</Text>
        <Text style={styles.stepSubtitle}>{t('onboarding.targetWeightSubtitle', 'Set your target weight')}</Text>

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
              {t('onboarding.units.kg', 'kg')}
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
              {t('onboarding.units.pounds', 'pounds')}
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



  const renderNotificationsStep = () => {
    const handleEnableNotifications = async () => {
      try {
        // Android: Create notification channel first
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4CAF50',
          });
        }

        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          // FIX 2026-01-19: Prevent re-triggering if already enabled
          if (notificationsEnabled) return;
          setNotificationsEnabled(true);

          // Get push token for remote notifications
          let pushToken = null;
          try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-expo-project-id',
            });
            pushToken = tokenData.data;
            console.log('[Onboarding] Push token:', pushToken);
          } catch (tokenError) {
            console.warn('[Onboarding] Failed to get push token:', tokenError);
          }

          // Update profile data with notification preference
          setProfileData(prev => ({
            ...prev,
            preferences: {
              ...prev.preferences,
              dailyPushEnabled: true,
              dailyPushHour: 9,
              dailyPushMinute: 0,
              timezone: Localization.getCalendars()[0]?.timeZone || Localization.timezone || 'UTC',
            },
          }));

          // Save push token to server
          if (pushToken) {
            try {
              await ApiService.put('/user-profiles', { pushToken });
              console.log('[Onboarding] Push token saved to server');
            } catch (saveError) {
              console.warn('[Onboarding] Failed to save push token:', saveError);
            }
          }

          // Schedule automatic meal reminders (2-3 times a day)
          try {
            const { localNotificationService } = require('../services/localNotificationService');
            await localNotificationService.scheduleMealReminders(3); // 3 times: breakfast, lunch, dinner
            console.log('[Onboarding] Scheduled 3 daily meal reminders');
          } catch (scheduleError) {
            console.warn('[Onboarding] Failed to schedule meal reminders:', scheduleError);
          }

          clientLog('Onboarding:notificationsEnabled', { hasPushToken: !!pushToken });
        } else {
          setNotificationsEnabled(false);
          setProfileData(prev => ({
            ...prev,
            preferences: {
              ...prev.preferences,
              dailyPushEnabled: false,
            },
          }));
          clientLog('Onboarding:notificationsDenied');
        }
      } catch (e) {
        console.warn('Notifications permission error:', e);
        clientLog('Onboarding:notificationsError', { error: e.message });
      }
    };

    return (
      <View style={styles.stepContainer}>
        <View style={styles.welcomeContent}>
          <Ionicons name="notifications" size={64} color={colors.primary} />
          <Text style={styles.stepTitle}>{t('onboarding.notifications', 'Enable notifications')}</Text>
          <Text style={styles.stepSubtitle}>
            {t('onboarding.notificationsDescription', 'Get reminders about meals, water intake, and your health goals.')}
          </Text>
          <TouchableOpacity
            style={[
              styles.nextButton,
              { marginTop: 32 },
              notificationsEnabled && { backgroundColor: colors.success || '#34C759', opacity: 0.8 }
            ]}
            disabled={notificationsEnabled}
            onPress={handleEnableNotifications}
          >
            <Ionicons
              name={notificationsEnabled ? 'checkmark-circle' : 'notifications'}
              size={20}
              color={onPrimaryColor}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.nextButtonText}>
              {notificationsEnabled
                ? t('onboarding.notificationsEnabled', 'Enabled!')
                : t('onboarding.enableNotifications', 'Enable')}
            </Text>
          </TouchableOpacity>
          {notificationsEnabled && (
            <Text style={[styles.stepSubtitle, { marginTop: 16, fontSize: 14, color: colors.success || '#34C759' }]}>
              {t('onboarding.notificationsSuccess', 'Great! You\'ll receive helpful reminders.')}
            </Text>
          )}
        </View>
      </View>
    );
  };



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

  // Terms and Privacy Policy acceptance step
  const renderTermsStep = () => {
    // Hooks moved to top level

    // const locale = language?.split('-')[0] || 'en';
    // const validLocale = ['en', 'ru', 'kk'].includes(locale) ? locale : 'en';

    const canProceed = profileData.termsAccepted && profileData.privacyAccepted;

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { marginBottom: 4 }]}>
          {t('onboarding.terms', 'Terms & Privacy')}
        </Text>
        <Text style={[styles.stepSubtitle, { marginBottom: 12 }]}>
          {t('onboarding.termsSubtitle', 'Please read and accept to continue')}
        </Text>

        {/* Inline Legal Documents - Scrollable */}
        <ScrollView
          style={{ flex: 1, marginBottom: 12 }}
          contentContainerStyle={{ gap: 16 }}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          {/* Terms of Service */}
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              {t('onboarding.termsOfService', 'Terms of Service')}
            </Text>
            <LegalDocumentView type="terms" maxHeight={200} />
          </View>

          {/* Privacy Policy */}
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              {t('onboarding.privacyPolicy', 'Privacy Policy')}
            </Text>
            <LegalDocumentView type="privacy" maxHeight={200} />
          </View>
        </ScrollView>

        {/* Acceptance checkboxes */}
        <View style={{ gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => setProfileData(prev => ({ ...prev, termsAccepted: !prev.termsAccepted }))}
            activeOpacity={0.7}
          >
            <View style={[
              { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
              profileData.termsAccepted
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { borderColor: colors.border || '#C8C8C8' }
            ]}>
              {profileData.termsAccepted && <Ionicons name="checkmark" size={16} color={onPrimaryColor} />}
            </View>
            <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>
              {t('onboarding.acceptTerms', 'I accept the Terms of Service')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => setProfileData(prev => ({ ...prev, privacyAccepted: !prev.privacyAccepted }))}
            activeOpacity={0.7}
          >
            <View style={[
              { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
              profileData.privacyAccepted
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { borderColor: colors.border || '#C8C8C8' }
            ]}>
              {profileData.privacyAccepted && <Ionicons name="checkmark" size={16} color={onPrimaryColor} />}
            </View>
            <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>
              {t('onboarding.acceptPrivacy', 'I accept the Privacy Policy')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            { width: '100%', justifyContent: 'center', opacity: canProceed ? 1 : 0.5 }
          ]}
          disabled={!canProceed}
          onPress={() => {
            clientLog('Onboarding:termsAccepted');
            nextStep();
          }}
        >
          <Text style={styles.nextButtonText}>{t('onboarding.continueButton', 'Continue')}</Text>
          <Ionicons name="chevron-forward" size={20} color={onPrimaryColor} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    );
  };

  // Remove auto-advance - user will click Continue button explicitly
  // This ensures they can review their personalized plan

  const renderLoadingStep = () => {
    const isLoading = loadingProgress < 100;
    const isReady = loadingProgress >= 100 && planData;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.welcomeContent}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.stepTitle}>{t('onboarding.loading', 'Creating your plan')}</Text>
              <Text style={styles.stepSubtitle}>{Math.round(loadingProgress)}%</Text>
            </>
          ) : isReady ? (
            <>
              <Ionicons name="checkmark-circle" size={64} color={colors.success || '#34C759'} />
              <Text style={styles.stepTitle}>{t('onboarding.planReady', 'Your personalized plan')}</Text>
              <View style={styles.planSummary}>
                <Text style={styles.planSummaryTitle}>{t('onboarding.recommendedIntake', 'Recommended daily intake:')}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.planSummaryText}>{t('onboarding.caloriesLabel', 'Calories')}:</Text>
                  <Text style={[styles.planSummaryText, { fontWeight: '600', color: colors.primary }]}>{planData.dailyCalories} kcal</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.planSummaryText}>{t('onboarding.proteinLabel', 'Protein')}:</Text>
                  <Text style={[styles.planSummaryText, { fontWeight: '600' }]}>{planData.dailyProtein} g</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.planSummaryText}>{t('onboarding.carbsLabel', 'Carbs')}:</Text>
                  <Text style={[styles.planSummaryText, { fontWeight: '600' }]}>{planData.dailyCarbs} g</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.planSummaryText}>{t('onboarding.fatLabel', 'Fat')}:</Text>
                  <Text style={[styles.planSummaryText, { fontWeight: '600' }]}>{planData.dailyFat} g</Text>
                </View>
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border || '#E5E5E5', marginTop: 12, paddingTop: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.planSummaryText}>{t('onboarding.targetWeightLabel', 'Target weight')}:</Text>
                    <Text style={[styles.planSummaryText, { fontWeight: '600', color: colors.primary }]}>
                      {planData.recommendedWeight} {unitSystem === 'metric' ? 'kg' : 'lbs'}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.nextButton, { marginTop: 24, width: '100%', justifyContent: 'center' }]}
                onPress={nextStep}
              >
                <Text style={styles.nextButtonText}>{t('onboarding.continueButton', 'Continue')}</Text>
                <Ionicons name="chevron-forward" size={20} color={onPrimaryColor} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    );
  };


  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderWelcomeStep();
      case 1: return renderGoalsStep();
      case 2: return renderGenderStep();
      case 3: return renderAgeStep();
      case 4: return renderHeightStep();
      case 5: return renderWeightStep();
      case 6: return renderTargetWeightStep();
      case 7: return renderActivityStep();
      case 8: return renderDietStep();
      case 9: return renderHealthConditionsStep();
      case 10: return renderNotificationsStep();
      case 11: return renderTermsStep();
      case 12: return renderLoadingStep();
      case 13: return renderPlanStep();
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
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} {t('common.of', 'of')} {steps.length}
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
        !['loading', 'terms'].includes(steps[currentStep]?.id) && (
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

