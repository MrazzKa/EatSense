// @ts-nocheck
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ApiService from '../services/apiService';
import { useAuth } from './AuthContext';

export type MascotType = 'CAT' | 'DOG' | 'PANDA' | 'FOX' | 'ROBOT';
export type MascotSize = 'small' | 'medium' | 'large';

export interface Mascot {
  id: string;
  mascotType: MascotType;
  name: string;
  xp: number;
  level: number;
  size: MascotSize;
  nextLevelXp: number | null;
}

interface MascotContextType {
  mascot: Mascot | null;
  loading: boolean;
  createMascot: (type: MascotType, name: string) => Promise<Mascot | null>;
  addXp: (amount: number, reason?: string) => Promise<{ leveledUp: boolean } | null>;
  refreshMascot: () => Promise<void>;
}

const MascotContext = createContext<MascotContextType>({
  mascot: null,
  loading: true,
  createMascot: async () => null,
  addXp: async () => null,
  refreshMascot: async () => {},
});

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mascot, setMascot] = useState<Mascot | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMascot = useCallback(async () => {
    try {
      const result = await ApiService.getMascot();
      setMascot(result || null);
    } catch (err) {
      console.warn('[MascotContext] Failed to load mascot:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshMascot();
    } else {
      setMascot(null);
      setLoading(false);
    }
  }, [user, refreshMascot]);

  const createMascot = useCallback(async (type: MascotType, name: string) => {
    try {
      const result = await ApiService.createMascot(type, name);
      if (result) setMascot(result);
      return result;
    } catch (err) {
      console.error('[MascotContext] Failed to create mascot:', err);
      return null;
    }
  }, []);

  const addXp = useCallback(async (amount: number, reason?: string) => {
    try {
      const result = await ApiService.addMascotXp(amount, reason);
      if (result) {
        setMascot(result);
        return { leveledUp: result.leveledUp || false };
      }
      return null;
    } catch (err) {
      console.warn('[MascotContext] Failed to add XP:', err);
      return null;
    }
  }, []);

  return (
    <MascotContext.Provider value={{ mascot, loading, createMascot, addXp, refreshMascot }}>
      {children}
    </MascotContext.Provider>
  );
}

export const useMascot = () => useContext(MascotContext);
