import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import ApiService from '../services/apiService';
import { applyLocalOnboardingCompletion, markOnboardingCompletedLocally } from '../utils/onboardingCompletion';

const SUBSCRIPTION_CACHE_KEY = 'eatsense_subscription_cache';

// Pre-fetch subscription as soon as user profile loads, so paid users don't see
// premium-locks flash on a cold-start when DietsScreen loads before its own
// subscription fetch completes. Fire-and-forget — failures are non-blocking.
async function prefetchSubscription(): Promise<void> {
  try {
    const sub = await ApiService.getCurrentSubscription();
    if (sub) {
      await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(sub));
    }
  } catch {
    // Network/auth error — let DietsScreen handle its own retry path.
  }
}

interface AuthContextValue {
  user: any;
  loading: boolean;
  refreshUser: () => Promise<void>;
  setUser: (_value: any) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start with true for initial load
  const appStateRef = useRef(AppState.currentState);
  const userRef = useRef<any>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshUser = useCallback(async () => {
    const shouldShowGlobalLoading = !userRef.current;
    try {
      if (shouldShowGlobalLoading) {
        setLoading(true);
      }
      const result = await ApiService.getUserProfile();
      // Backend returns { profile: null } if profile doesn't exist, or the profile object if it exists
      const profile = await applyLocalOnboardingCompletion(result?.profile !== undefined ? result.profile : result);

      if (profile && profile.id) {
        const shouldPreserveCompleted = !!userRef.current?.isOnboardingCompleted || !!profile.isOnboardingCompleted;
        const nextProfile = shouldPreserveCompleted
          ? { ...profile, isOnboardingCompleted: true }
          : profile;
        if (shouldPreserveCompleted) {
          markOnboardingCompletedLocally(nextProfile).catch(() => {});
        }
        // Self-heal "double onboarding" bug: if local state / AsyncStorage marker
        // says the user finished onboarding but the backend disagrees (e.g. the
        // original complete-onboarding call timed out and we fell into the
        // fail-open branch), retry the call now so the server catches up. Without
        // this the user stays in onboarding-limbo on any device that doesn't
        // have the local marker (new install, cleared storage, signed out & in).
        if (shouldPreserveCompleted && !profile.isOnboardingCompleted) {
          ApiService.completeOnboarding().catch((err: any) => {
            console.warn('[AuthContext] Self-heal complete-onboarding failed:', err?.message || err);
          });
        }
        // Profile exists - use it directly
        setUser(nextProfile);
        // Fire-and-forget subscription pre-fetch so DietsScreen / LifestyleDetailScreen /
        // DietProgramDetailScreen find a fresh cache instead of locking premium content
        // on cold-start.
        prefetchSubscription();
      } else if (profile === null || (result && result.profile === null)) {
        // Profile doesn't exist yet - user is authenticated but needs onboarding
        // Create minimal user object to trigger onboarding flow
        // Check if we have a valid token to confirm authentication
        if (ApiService.token) {
          if (userRef.current?.isOnboardingCompleted) {
            setUser((prev: any) => ({ ...(prev || {}), isOnboardingCompleted: true }));
          } else {
            setUser({ isOnboardingCompleted: false });
          }
        } else {
          setUser(null);
        }
      } else {
        // Unexpected response format - try to use result as-is
        setUser(result || null);
      }
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const isUnauthorized = status === 401;
      const isNotFound = status === 404;
      const isServerError = status >= 500;

      if (isUnauthorized) {
        // Token expired or invalid - clear user
        console.log('[AuthContext] Unauthorized - clearing user:', error?.message || 'Unknown error');
        setUser(null);
        await ApiService.setToken(null, null);
      } else if (isServerError) {
        // Server error (500, 502, etc.) - don't show onboarding, log error
        // This could be a database schema issue or other server problem
        console.error('[AuthContext] Server error fetching profile:', status, error?.message || 'Unknown error');
        // Keep current user state, don't change it
        // The app should handle this gracefully (maybe show error message)
        if (!ApiService.token) {
          setUser(null);
        }
      } else if (isNotFound) {
        // Profile doesn't exist (404) - if we have a token, user is authenticated but needs onboarding
        if (ApiService.token) {
          console.log('[AuthContext] Profile not found but token exists - showing onboarding');
          if (userRef.current?.isOnboardingCompleted) {
            setUser((prev: any) => ({ ...(prev || {}), isOnboardingCompleted: true }));
          } else {
            setUser({ isOnboardingCompleted: false });
          }
        } else {
          console.log('[AuthContext] Profile not found and no token - clearing user');
          setUser(null);
        }
      } else {
        // Other error (network, etc.) - if we have a token, assume user is authenticated
        // but don't force onboarding, keep current state
        console.warn('[AuthContext] Error refreshing user:', status, error?.message || 'Unknown error');
        if (!ApiService.token) {
          setUser(null);
        }
      }
    } finally {
      if (shouldShowGlobalLoading) {
        setLoading(false);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (typeof ApiService.logout === 'function') {
        await ApiService.logout();
      }
      // Clear tokens from storage
      await ApiService.setToken(null, null);
    } catch (error) {
      // ignore logout errors – we just want to clear local state
      console.warn('[AuthContext] Logout error (ignored):', error);
    } finally {
      setUser(null);
    }
  }, []);

  // Auto-login on mount if refresh token exists
  React.useEffect(() => {
    const attemptAutoLogin = async () => {
      try {
        setLoading(true);
        // Load tokens from SecureStore — wait up to 5s for cold start
        await Promise.race([
          ApiService.loadTokens(),
          new Promise(resolve => setTimeout(resolve, 5000)),
        ]);

        // Try to refresh token if we have one
        if (ApiService.refreshTokenValue) {
          try {
            const refreshResult = await ApiService.refreshToken();
            if (refreshResult) {
              // refreshToken() already sets the token internally

              // Optimization: Use profile from refresh response if available
              if (refreshResult.profile) {
                if (__DEV__) console.log('[AuthContext] Using profile from refresh token response');
                const merged = await applyLocalOnboardingCompletion(refreshResult.profile);
                // Self-heal: backend lost the completed flag but local marker
                // says we already finished — re-fire complete-onboarding so the
                // server catches up (otherwise next sign-in on another device
                // would loop into onboarding again).
                if (merged?.isOnboardingCompleted && !refreshResult.profile.isOnboardingCompleted) {
                  ApiService.completeOnboarding().catch(() => {});
                }
                setUser(merged);
                setLoading(false);
                return;
              }

              await refreshUser();
              return;
            }
          } catch (refreshError) {
            console.log('[AuthContext] Auto-login failed (refresh token invalid/expired):', (refreshError as any)?.message || 'Unknown error');
            // Clear invalid tokens
            await ApiService.setToken(null, null);
          }
        }

        // If no refresh token or refresh failed, try to load user with existing token
        if (ApiService.token) {
          await refreshUser();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.log('[AuthContext] Auto-login error:', (error as any)?.message || 'Unknown error');
        setUser(null);
        setLoading(false);
      }
    };

    attemptAutoLogin();
  }, [refreshUser]);

  // Refresh user when expert status changes via push, so useIsExpert() and
  // gated screens (Profile, Become Expert, Marketplace banner) react instantly
  // without a relaunch.
  useEffect(() => {
    const maybeRefreshForExpertStatus = (data: Record<string, any>) => {
      const type = data.type;
      if (type === 'expert_approved' || type === 'expert_rejected' || type === 'expert_status_changed') {
        refreshUser().catch(() => {});
      }
    };

    const receivedSub = Notifications.addNotificationReceivedListener((event) => {
      maybeRefreshForExpertStatus((event.request?.content?.data || {}) as Record<string, any>);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      maybeRefreshForExpertStatus((response.notification.request?.content?.data || {}) as Record<string, any>);
    });
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      const wasInactive = /inactive|background/.test(appStateRef.current);
      appStateRef.current = nextState;
      if (wasInactive && nextState === 'active' && ApiService.token) {
        refreshUser().catch(() => {});
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
      appStateSub.remove();
    };
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, refreshUser, setUser, signOut }),
    [user, loading, refreshUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
