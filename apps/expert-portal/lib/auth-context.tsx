'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch } from './api';

interface User {
  id: string;
  email: string;
  expertsRole?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  expertProfile?: {
    id: string;
    displayName: string;
    isPublished: boolean;
    isVerified: boolean;
    isActive: boolean;
    rating: number;
    reviewCount: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await apiFetch('/users/me/profile');
      setUser({
        id: data.user?.id || data.id,
        email: data.user?.email || data.email,
        expertsRole: data.user?.expertsRole || data.expertsRole,
        profile: data.profile || data.userProfile,
        expertProfile: data.expertProfile,
      });
    } catch {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
