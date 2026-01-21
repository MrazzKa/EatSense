import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';

// Google Sign-In - conditional import for Expo Go compatibility
let GoogleSignin = null;
let isErrorWithCode = null;
let statusCodes = null;
let isGoogleSignInAvailable = false;

try {
  const googleModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleModule.GoogleSignin;
  isErrorWithCode = googleModule.isErrorWithCode;
  statusCodes = googleModule.statusCodes;
  isGoogleSignInAvailable = true;
} catch {
  console.log('[AuthScreen] Google Sign-In not available (Expo Go mode)');
  isGoogleSignInAvailable = false;
}
import ApiService from '../services/apiService';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { clientLog } from '../utils/clientLog';

function maskEmail(email) {
  if (!email) {
    return '';
  }
  const [local, domain] = email.split('@');
  if (!domain) {
    return email;
  }
  const maskedLocal = local.length <= 2 ? `${local[0] || ''}***` : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

const OTP_LENGTH = 6;

export default function AuthScreen({ onAuthSuccess }) {
  const { t } = useI18n();
  const { tokens, colors, isDark } = useTheme();
  const { setUser } = useAuth();
  const styles = useMemo(() => createStyles(tokens, colors, isDark), [tokens, colors, isDark]);

  const [step, setStep] = useState('welcome'); // 'welcome' | 'email' | 'verify'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeExpiresIn, setCodeExpiresIn] = useState(0);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  const codeInputRef = useRef(null);

  // Check Apple Sign In availability
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
  }, []);

  useEffect(() => {
    if (step !== 'verify' || resendCooldown <= 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  useEffect(() => {
    if (step !== 'verify' || codeExpiresIn <= 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setCodeExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, codeExpiresIn]);

  const resetFeedback = () => {
    setErrorMessage('');
    setStatusMessage('');
  };

  const getErrorMessage = useCallback((error, fallbackKey) => {
    if (!error) {
      return t(fallbackKey);
    }

    const codeName = error?.payload?.code;
    const retryAfter = error?.payload?.retryAfter;

    if (codeName === 'OTP_INVALID') {
      return t('auth.errors.invalidCode');
    }

    if (codeName === 'OTP_EXPIRED') {
      return t('auth.errors.expiredCode');
    }

    if (codeName === 'OTP_RATE_LIMIT' || error?.status === 429) {
      return t('auth.errors.rateLimited', { seconds: retryAfter ?? resendCooldown ?? 60 });
    }

    if (error?.message) {
      return error.message;
    }

    return t(fallbackKey);
  }, [t, resendCooldown]);

  const handleAppleSignIn = async () => {
    try {
      setIsSubmitting(true);
      resetFeedback();

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        // Filter fullName to only include givenName and familyName
        // Apple may return additional fields (namePrefix, middleName, nickname, nameSuffix)
        // that are not expected by the backend DTO
        const filteredFullName = credential.fullName ? {
          givenName: credential.fullName.givenName,
          familyName: credential.fullName.familyName,
        } : undefined;

        // Send identity token to backend for verification
        // Only include email if it's not empty
        const applePayload = {
          identityToken: credential.identityToken,
          user: credential.user,
          ...(credential.email && credential.email.trim() ? { email: credential.email.trim().toLowerCase() } : {}),
          ...(filteredFullName && (filteredFullName.givenName || filteredFullName.familyName) ? { fullName: filteredFullName } : {}),
        };

        const response = await ApiService.request('/auth/apple', {
          method: 'POST',
          body: JSON.stringify(applePayload),
        });

        if (response?.accessToken) {
          await ApiService.setToken(response.accessToken, response.refreshToken);
          setStatusMessage(t('auth.messages.signedIn'));

          // Update AuthContext - load user profile (same as Google/OTP flow)
          let profile = response.profile; // Optimization: Use profile from response
          try {
            if (!profile) {
              await clientLog('Auth:appleSignInRefreshUser').catch(() => { });
              profile = await ApiService.getUserProfile();
            }
            if (profile) {
              setUser(profile);
              await clientLog('Auth:appleSignInUserSet', {
                userId: profile?.id || 'unknown',
                hasOnboardingCompleted: !!profile?.isOnboardingCompleted,
              }).catch(() => { });
            } else {
              // Profile doesn't exist yet - create a minimal user object to trigger onboarding
              // This ensures user is considered authenticated even without profile
              setUser({ id: response.user?.id, email: response.user?.email, isOnboardingCompleted: false });
              await clientLog('Auth:appleSignInNoProfile', {
                userId: response.user?.id || 'unknown',
              }).catch(() => { });
            }
          } catch (profileError) {
            console.warn('[AuthScreen] Error loading user profile after Apple Sign In:', profileError);
            // User is authenticated but profile fetch failed - create minimal user object
            // This ensures onboarding is shown instead of login screen
            if (response.user?.id) {
              setUser({ id: response.user.id, email: response.user.email, isOnboardingCompleted: false });
            }
          }

          // Call onAuthSuccess if provided (for backward compatibility)
          if (onAuthSuccess && typeof onAuthSuccess === 'function') {
            console.log('[AuthScreen] Calling onAuthSuccess for Apple Sign In');
            await onAuthSuccess();
            console.log('[AuthScreen] onAuthSuccess completed for Apple Sign In');
          }

          // DO NOT navigate here - let RootNavigator handle navigation based on isAuthenticated state
          await clientLog('Auth:appleSignInSuccessComplete', {
            hasProfile: !!profile,
            needsOnboarding: !profile?.isOnboardingCompleted,
          }).catch(() => { });
        } else {
          throw new Error('No access token received from server');
        }
      }
    } catch (error) {
      if (error.code === 'ERR_CANCELED') {
        // User canceled, do nothing
        return;
      }
      setErrorMessage(getErrorMessage(error, 'auth.errors.verifyFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Configure Google Sign-In on mount
  const googleConfiguredRef = useRef(false);
  useEffect(() => {
    if (googleConfiguredRef.current) return;
    if (!isGoogleSignInAvailable || !GoogleSignin) return;
    googleConfiguredRef.current = true;

    const iosClientId = Constants.expoConfig?.extra?.googleIosClientId || '';
    const webClientId = Constants.expoConfig?.extra?.googleWebClientId || '';

    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        iosClientId: iosClientId || undefined,
        webClientId: webClientId || undefined, // Required for idToken
        offlineAccess: true,
      });
      console.log('[AuthScreen] Google Sign-In configured:', { iosClientId: !!iosClientId, webClientId: !!webClientId });
    }
  }, []);

  // Check if Google Sign-In is configured and available
  const isGoogleConfigured = isGoogleSignInAvailable && (Platform.OS === 'ios'
    ? !!Constants.expoConfig?.extra?.googleIosClientId
    : Platform.OS === 'android'
      ? !!Constants.expoConfig?.extra?.googleAndroidClientId
      : !!Constants.expoConfig?.extra?.googleWebClientId);

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      resetFeedback();

      // Check if Google Sign-In native module is available
      if (!GoogleSignin) {
        Alert.alert(
          t('auth.errors.googleNotConfigured') || 'Google Sign-In Not Available',
          t('auth.errors.googleNotAvailableExpoGo') || 'Google Sign-In requires a development build. Please use email sign-in in Expo Go.',
          [{ text: t('common.ok') || 'OK' }]
        );
        setIsSubmitting(false);
        return;
      }

      // Check if Google auth is properly configured for current platform
      if (!isGoogleConfigured) {
        const platformMessage = Platform.OS === 'ios'
          ? t('auth.errors.googleIosClientIdMissing') ||
          'Google Sign-In is not configured for iOS. Please contact support.'
          : Platform.OS === 'android'
            ? t('auth.errors.googleAndroidClientIdMissing') ||
            'Google Sign-In is not configured for Android. Please contact support.'
            : t('auth.errors.googleNotConfiguredMessage') ||
            'Google Sign-In is not properly configured.';

        Alert.alert(
          t('auth.errors.googleNotConfigured') || 'Google Sign-In Not Available',
          platformMessage,
          [{ text: t('common.ok') || 'OK' }]
        );
        setIsSubmitting(false);
        return;
      }

      console.log('[AuthScreen] Starting native Google Sign-In...');

      // Check if Google Play Services are available (Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Perform native Google Sign-In
      const signInResult = await GoogleSignin.signIn();
      console.log('[AuthScreen] Google Sign-In result:', {
        hasIdToken: !!signInResult.data?.idToken,
        email: signInResult.data?.user?.email
      });

      if (!signInResult.data?.idToken) {
        throw new Error('No ID token received from Google');
      }

      const { idToken, user: googleUser } = signInResult.data;

      // Send idToken to backend for verification
      const response = await ApiService.signInWithGoogle({
        idToken,
        email: googleUser.email,
        name: googleUser.name || undefined,
        picture: googleUser.photo || undefined,
      });

      if (response?.accessToken) {
        await ApiService.setToken(response.accessToken, response.refreshToken);
        setStatusMessage(t('auth.messages.signedIn'));

        // Update AuthContext - load user profile
        let profile = response.profile; // Optimization: Use profile from response
        try {
          if (!profile) {
            await clientLog('Auth:googleSignInRefreshUser').catch(() => { });
            profile = await ApiService.getUserProfile();
          }
          if (profile) {
            setUser(profile);
            await clientLog('Auth:googleSignInUserSet', {
              userId: profile?.id || 'unknown',
              hasOnboardingCompleted: !!profile?.isOnboardingCompleted,
            }).catch(() => { });
          } else {
            setUser({ id: response.user?.id, email: response.user?.email, isOnboardingCompleted: false });
            await clientLog('Auth:googleSignInNoProfile', {
              userId: response.user?.id || 'unknown',
            }).catch(() => { });
          }
        } catch (profileError) {
          console.warn('[AuthScreen] Error loading user profile after Google Sign In:', profileError);
          if (response.user?.id) {
            setUser({ id: response.user.id, email: response.user.email, isOnboardingCompleted: false });
          }
        }

        // Call onAuthSuccess if provided
        if (onAuthSuccess && typeof onAuthSuccess === 'function') {
          console.log('[AuthScreen] Calling onAuthSuccess for Google Sign In');
          await onAuthSuccess();
        }

        await clientLog('Auth:googleSignInSuccessComplete', {
          hasProfile: !!profile,
          needsOnboarding: !profile?.isOnboardingCompleted,
        }).catch(() => { });
      } else {
        throw new Error('No access token received from server');
      }
    } catch (error) {
      console.error('[AuthScreen] Google Sign-In error:', error);

      // Handle specific Google Sign-In errors
      if (isErrorWithCode && statusCodes && isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          // User cancelled - don't show error
          setIsSubmitting(false);
          return;
        } else if (error.code === statusCodes.IN_PROGRESS) {
          setErrorMessage('Sign in is already in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setErrorMessage('Google Play Services not available');
        } else {
          setErrorMessage(getErrorMessage(error, 'auth.errors.verifyFailed'));
        }
      } else {
        setErrorMessage(getErrorMessage(error, 'auth.errors.verifyFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestCode = async ({ isResend = false } = {}) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage(t('auth.errors.invalidEmail'));
      return;
    }

    setIsSubmitting(true);
    resetFeedback();

    try {
      console.log('[AuthScreen] Requesting OTP for email:', trimmedEmail);
      const response = await ApiService.requestOtp(trimmedEmail);
      console.log('[AuthScreen] OTP request successful:', response);
      setStatusMessage(
        t(isResend ? 'auth.messages.codeResent' : 'auth.messages.codeSent', {
          email: maskEmail(trimmedEmail),
        }),
      );
      setResendCooldown(response?.retryAfter ?? 60);
      setCodeExpiresIn(response?.expiresIn ?? 600);

      if (!isResend) {
        setStep('verify');
        setCode('');
        setTimeout(() => {
          codeInputRef.current?.focus();
        }, 200);
      } else {
        setCode('');
        setTimeout(() => {
          codeInputRef.current?.focus();
        }, 50);
      }
    } catch (error) {
      console.error('[AuthScreen] OTP request error:', error);
      console.error('[AuthScreen] Error message:', error.message);
      console.error('[AuthScreen] Error status:', error.status);
      console.error('[AuthScreen] Error payload:', error.payload);

      if (error?.payload?.retryAfter) {
        setResendCooldown(error.payload.retryAfter);
      }
      // Better error handling for network errors
      if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        const networkErrorMsg = t('auth.errors.networkError') || 'Network error. Please check your internet connection and try again.';
        console.error('[AuthScreen] Network error detected, showing message:', networkErrorMsg);
        setErrorMessage(networkErrorMsg);
      } else {
        setErrorMessage(getErrorMessage(error, isResend ? 'auth.errors.resendFailed' : 'auth.errors.sendFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    const sanitizedCode = code.replace(/[^0-9]/g, '');
    if (sanitizedCode.length !== OTP_LENGTH) {
      setErrorMessage(t('auth.errors.codeLength'));
      return;
    }

    await clientLog('Auth:otpVerifyPressed', {
      email: email ? email.substring(0, 10) + '***' : 'unknown',
    }).catch(() => { });

    setIsSubmitting(true);
    resetFeedback();

    try {
      console.log('[AuthScreen] Verifying OTP code...');
      const response = await ApiService.verifyOtp(email.trim().toLowerCase(), sanitizedCode);
      console.log('[AuthScreen] OTP verification response:', {
        hasToken: !!response?.accessToken,
        hasRefreshToken: !!response?.refreshToken,
        responseKeys: response ? Object.keys(response) : [],
        fullResponse: response,
      });

      if (response?.accessToken) {
        await clientLog('Auth:otpVerifySuccess', {
          hasTokens: true,
          hasAccessToken: !!response.accessToken,
        }).catch(() => { });

        console.log('[AuthScreen] Access token found, saving tokens...');
        await ApiService.setToken(response.accessToken, response.refreshToken);
        console.log('[AuthScreen] Token saved');

        // Update AuthContext - load user profile
        let profile = response.profile; // Optimization: Use profile from response
        try {
          if (!profile) {
            await clientLog('Auth:authContextRefreshUser').catch(() => { });
            profile = await ApiService.getUserProfile();
          }
          if (profile) {
            setUser(profile);
            await clientLog('Auth:authContextUserSet', {
              userId: profile?.id || 'unknown',
            }).catch(() => { });
          }
        } catch (profileError) {
          console.warn('[AuthScreen] Error loading user profile:', profileError);
          // Continue anyway - user is authenticated, will try again later
        }

        setStatusMessage(t('auth.messages.signedIn'));

        // Call onAuthSuccess if provided (for backward compatibility)
        if (onAuthSuccess && typeof onAuthSuccess === 'function') {
          console.log('[AuthScreen] Calling onAuthSuccess for Email OTP');
          await onAuthSuccess();
          console.log('[AuthScreen] onAuthSuccess completed for Email OTP');
        }

        // DO NOT navigate here - let RootNavigator handle navigation based on isAuthenticated state
        // RootNavigator will automatically switch to MainTabs/Onboarding when user state changes
        await clientLog('Auth:otpSuccessComplete', {
          hasProfile: !!profile,
          needsOnboarding: !profile?.isOnboardingCompleted,
        }).catch(() => { });
      } else {
        console.error('[AuthScreen] No access token in response:', response);
        throw new Error('No access token received from server');
      }
    } catch (error) {
      await clientLog('Auth:otpVerifyError', {
        message: error?.message || String(error),
        code: error?.payload?.code || 'unknown',
        stack: String(error?.stack || '').substring(0, 500),
      }).catch(() => { });

      setErrorMessage(getErrorMessage(error, 'auth.errors.verifyFailed'));
      if (error?.payload?.code === 'OTP_EXPIRED') {
        setStep('email');
        setResendCooldown(0);
        setCodeExpiresIn(0);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (isSubmitting || resendCooldown > 0) {
      return;
    }
    handleRequestCode({ isResend: true });
  };

  const handleChangeEmail = () => {
    setStep('email');
    setCode('');
    setResendCooldown(0);
    setCodeExpiresIn(0);
    resetFeedback();
  };

  const handleEmailSignIn = () => {
    setStep('email');
  };

  // Welcome screen with OAuth options (YAZIO-style)
  const welcomeStep = (
    <View style={styles.welcomeContainer}>
      <View style={styles.logoContainer}>
        {/* Logo will be loaded from assets/logo/Logo.svg or Logo.png */}
        <View style={styles.logoPlaceholder}>
          <Ionicons name="restaurant" size={64} color={colors.primary} />
        </View>
      </View>

      <Text style={styles.welcomeTitle}>{t('auth.welcomeTitle')}</Text>
      <Text style={styles.welcomeSubtitle}>{t('auth.welcomeSubtitle')}</Text>

      <View style={styles.authButtonsContainer}>
        {Platform.OS === 'ios' && isAppleAvailable && (
          <TouchableOpacity
            style={[styles.oauthButton, styles.appleButton, isSubmitting && styles.disabledButton]}
            onPress={handleAppleSignIn}
            disabled={isSubmitting}
          >
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            <Text style={styles.oauthButtonText}>{t('auth.signInWithApple')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.oauthButton,
            styles.googleButton,
            (isSubmitting || !isGoogleConfigured) && styles.disabledButton
          ]}
          onPress={handleGoogleSignIn}
          disabled={!isGoogleConfigured || isSubmitting}
        >
          <View style={styles.googleIconContainer}>
            <View style={styles.googleIcon}>
              <Text style={styles.googleG}>G</Text>
            </View>
          </View>
          <Text style={styles.googleButtonText}>{t('auth.continueWithGoogle')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.oauthButton, styles.emailButton, isSubmitting && styles.disabledButton]}
          onPress={handleEmailSignIn}
          disabled={isSubmitting}
        >
          <Ionicons name="mail-outline" size={20} color={colors.textPrimary} />
          <Text style={[styles.oauthButtonText, styles.emailButtonText]}>{t('auth.signUpWithEmail')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.termsText}>{t('auth.termsAcceptance')}</Text>
    </View>
  );

  const emailStep = (
    <View style={styles.card}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('welcome')}>
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.iconWrap}>
        <Ionicons name="mail" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('auth.emailLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.emailPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={(value) => setEmail(value.trim())}
          editable={!isSubmitting}
        />
      </View>

      {Boolean(errorMessage) && <Text style={styles.errorText}>{errorMessage}</Text>}

      {Boolean(statusMessage) && !errorMessage && <Text style={styles.successText}>{statusMessage}</Text>}

      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
        onPress={() => handleRequestCode({ isResend: false })}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <>
            <Ionicons name="paper-plane" size={18} color={colors.onPrimary} style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>{t('auth.sendCode')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const verifyStep = (
    <View style={styles.card}>
      <TouchableOpacity style={styles.backButton} onPress={handleChangeEmail}>
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
        <Text style={styles.backButtonText}>{t('auth.changeEmail')}</Text>
      </TouchableOpacity>

      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
      </View>

      <Text style={styles.title}>{t('auth.otpScreenTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.otpScreenSubtitle', { email: maskEmail(email) })}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('auth.otpCode')}</Text>
        <TextInput
          ref={codeInputRef}
          style={styles.otpInput}
          value={code}
          editable={!isSubmitting}
          onChangeText={(value) => {
            setCode(value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH));
            if (errorMessage) {
              setErrorMessage('');
            }
          }}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={OTP_LENGTH}
          autoFocus
          onSubmitEditing={handleVerifyCode}
        />
      </View>

      {codeExpiresIn > 0 && <Text style={styles.helperText}>{t('auth.codeExpiresIn', { seconds: codeExpiresIn })}</Text>}

      {Boolean(errorMessage) && <Text style={styles.errorText}>{errorMessage}</Text>}

      {Boolean(statusMessage) && !errorMessage && <Text style={styles.successText}>{statusMessage}</Text>}

      <TouchableOpacity
        style={[styles.primaryButton, (isSubmitting || code.length !== OTP_LENGTH) && styles.disabledButton]}
        onPress={handleVerifyCode}
        disabled={isSubmitting || code.length !== OTP_LENGTH}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <>
            <Ionicons name="lock-open" size={18} color={colors.onPrimary} style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>{t('auth.verifyCode')}</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, (isSubmitting || resendCooldown > 0) && styles.disabledButton]}
        onPress={handleResend}
        disabled={isSubmitting || resendCooldown > 0}
      >
        <Ionicons name="refresh" size={18} color={colors.primary} style={styles.buttonIcon} />
        <Text style={styles.secondaryButtonText}>
          {resendCooldown > 0 ? t('auth.resendIn', { seconds: resendCooldown }) : t('auth.resendCode')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {step === 'welcome' ? welcomeStep : step === 'email' ? emailStep : verifyStep}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(tokens, colors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5',
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.xxxl,
      justifyContent: 'center',
    },
    welcomeContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: tokens.spacing.xxxl,
    },
    logoContainer: {
      marginBottom: tokens.spacing.xxl,
      alignItems: 'center',
    },
    logoPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primaryTint,
      justifyContent: 'center',
      alignItems: 'center',
    },
    welcomeTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: tokens.spacing.xxxl,
      paddingHorizontal: tokens.spacing.xl,
      lineHeight: 22,
    },
    authButtonsContainer: {
      width: '100%',
      gap: tokens.spacing.md,
      marginBottom: tokens.spacing.xxl,
    },
    oauthButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radii.lg,
      borderWidth: 1,
      gap: tokens.spacing.sm,
      minHeight: 52,
    },
    appleButton: {
      backgroundColor: '#000000',
      borderColor: '#333333',
    },
    googleButton: {
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
      borderColor: isDark ? colors.borderMuted : '#E0E0E0',
    },
    emailButton: {
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
      borderColor: isDark ? colors.borderMuted : '#E0E0E0',
    },
    oauthButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    googleButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? colors.textPrimary : '#1F2937', // Dark text on white background
    },
    emailButtonText: {
      color: colors.textPrimary,
    },
    googleIconContainer: {
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    googleIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#4285F4',
      justifyContent: 'center',
      alignItems: 'center',
    },
    googleG: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    termsText: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: 'center',
      paddingHorizontal: tokens.spacing.xl,
      marginTop: tokens.spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radii.xl,
      padding: tokens.spacing.xxl,
      gap: tokens.spacing.lg,
      ...tokens.elevations.md,
    },
    iconWrap: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? colors.surfaceMuted : colors.primaryTint,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: tokens.spacing.md,
    },
    title: {
      fontSize: tokens.typography.headingM.fontSize,
      lineHeight: tokens.typography.headingM.lineHeight,
      fontWeight: tokens.typography.headingM.fontWeight,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: tokens.typography.body.fontSize,
      lineHeight: tokens.typography.body.lineHeight,
      color: colors.textSecondary,
      textAlign: 'center',
      marginHorizontal: tokens.spacing.md,
    },
    fieldGroup: {
      marginTop: tokens.spacing.lg,
    },
    label: {
      fontSize: tokens.typography.caption.fontSize,
      color: colors.textSecondary,
      marginBottom: tokens.spacing.xs,
      fontWeight: tokens.typography.caption.fontWeight,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    input: {
      backgroundColor: isDark ? colors.surfaceMuted : colors.inputBackground,
      borderRadius: tokens.radii.lg,
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      fontSize: tokens.typography.body.fontSize,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: isDark ? colors.borderMuted : colors.border,
    },
    otpInput: {
      backgroundColor: isDark ? colors.surfaceMuted : colors.inputBackground,
      borderRadius: tokens.radii.lg,
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      fontSize: 28,
      fontWeight: tokens.fontWeights.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
      letterSpacing: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.borderMuted : colors.border,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: tokens.radii.lg,
      paddingVertical: tokens.spacing.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: tokens.spacing.sm,
      marginTop: tokens.spacing.xl,
    },
    secondaryButton: {
      backgroundColor: isDark ? colors.surfaceMuted : colors.surface,
      borderRadius: tokens.radii.lg,
      paddingVertical: tokens.spacing.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: tokens.typography.body.fontSize,
      fontWeight: tokens.typography.body.fontWeight,
    },
    disabledButton: {
      opacity: 0.6,
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
      fontSize: tokens.typography.body.fontSize,
    },
    successText: {
      color: colors.success,
      textAlign: 'center',
      fontSize: tokens.typography.body.fontSize,
    },
    helperText: {
      textAlign: 'center',
      color: colors.textTertiary,
      fontSize: tokens.typography.caption.fontSize,
    },
    buttonIcon: {
      marginRight: tokens.spacing.xs,
    },
    backButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
      marginBottom: tokens.spacing.md,
    },
    backButtonText: {
      color: colors.primary,
      fontSize: tokens.typography.body.fontSize,
      fontWeight: tokens.fontWeights.medium,
    },
  });
}
