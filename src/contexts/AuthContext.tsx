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
      // Check if error is 404 (profile not found) vs 401 (unauthorized)
      const isUnauthorized = error?.status === 401 || error?.response?.status === 401;
      if (isUnauthorized) {
        // Token expired or invalid - clear user
        console.log('[AuthContext] Unauthorized - clearing user:', error?.message || 'Unknown error');
        setUser(null);
        await ApiService.setToken(null, null);
      } else {
        // Profile doesn't exist (404) or other error - if we have a token, user is authenticated
        // This ensures new users (no profile yet) see onboarding instead of login screen
        if (ApiService.token) {
          console.log('[AuthContext] Profile not found but token exists - showing onboarding');
          setUser({ isOnboardingCompleted: false });
        } else {
          console.log('[AuthContext] Error refreshing user (no token):', (error as any)?.message || 'Unknown error');
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
            const refreshSuccess = await ApiService.refreshToken();
            if (refreshSuccess) {
              // refreshToken() already sets the token internally, just load user profile
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
