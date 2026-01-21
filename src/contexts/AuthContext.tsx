import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import ApiService from '../services/apiService';

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

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ApiService.getUserProfile();
      // Backend returns { profile: null } if profile doesn't exist, or the profile object if it exists
      const profile = result?.profile !== undefined ? result.profile : result;

      if (profile && profile.id) {
        // Profile exists - use it directly
        setUser(profile);
      } else if (profile === null || (result && result.profile === null)) {
        // Profile doesn't exist yet - user is authenticated but needs onboarding
        // Create minimal user object to trigger onboarding flow
        // Check if we have a valid token to confirm authentication
        if (ApiService.token) {
          setUser({ isOnboardingCompleted: false });
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
          setUser({ isOnboardingCompleted: false });
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
      setLoading(false);
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
        // Load tokens from storage
        await ApiService.loadTokens();

        // Try to refresh token if we have one
        if (ApiService.refreshTokenValue) {
          try {
            const refreshResult = await ApiService.refreshToken();
            if (refreshResult) {
              // refreshToken() already sets the token internally

              // Optimization: Use profile from refresh response if available
              if (refreshResult.profile) {
                if (__DEV__) console.log('[AuthContext] Using profile from refresh token response');
                setUser(refreshResult.profile);
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
