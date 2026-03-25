// @ts-nocheck
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import ApiService from '../services/apiService';
import { useAuth } from './AuthContext';
import { LevelUpModal } from '../components/LevelUpModal';
import localNotificationService from '../services/localNotificationService';
import { clientLog } from '../utils/clientLog';

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
  updateMascot: (data: { mascotType?: MascotType; name?: string }) => Promise<Mascot | null>;
  deleteMascot: () => Promise<boolean>;
  addXp: (amount: number, reason?: string) => Promise<{ leveledUp: boolean } | null>;
  refreshMascot: () => Promise<void>;
}

const MascotContext = createContext<MascotContextType>({
  mascot: null,
  loading: true,
  createMascot: async () => null,
  updateMascot: async () => null,
  deleteMascot: async () => false,
  addXp: async () => null,
  refreshMascot: async () => {},
});

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mascot, setMascot] = useState<Mascot | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(1);

  const refreshMascot = useCallback(async () => {
    try {
      clientLog('MascotContext:fetchStart').catch(() => {});
      const result = await ApiService.getMascot();
      clientLog('MascotContext:fetchDone', { hasMascot: !!result }).catch(() => {});
      setMascot(result || null);
      // Schedule mascot notifications when mascot exists
      if (result?.name) {
        try {
          clientLog('MascotContext:scheduleNotifStart').catch(() => {});
          await localNotificationService.scheduleMascotNotifications(result.name);
          clientLog('MascotContext:scheduleNotifDone').catch(() => {});
        } catch (notifErr) {
          console.warn('[MascotContext] scheduleMascotNotifications failed:', notifErr);
          clientLog('MascotContext:scheduleNotifError', { message: String(notifErr?.message || notifErr) }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[MascotContext] Failed to load mascot:', err);
      clientLog('MascotContext:fetchError', { message: String(err?.message || err) }).catch(() => {});
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
      if (result) {
        setMascot(result);
        localNotificationService.scheduleMascotNotifications(name).catch(() => {});
      }
      return result;
    } catch (err) {
      console.error('[MascotContext] Failed to create mascot:', err);
      return null;
    }
  }, []);

  const updateMascot = useCallback(async (data: { mascotType?: MascotType; name?: string }) => {
    try {
      const result = await ApiService.updateMascot(data);
      if (result) {
        setMascot(result);
        // Reschedule mascot notifications if name changed (notifications include mascot name)
        if (data.name) {
          localNotificationService.scheduleMascotNotifications(result.name).catch(() => {});
        }
      }
      return result;
    } catch (err) {
      console.error('[MascotContext] Failed to update mascot:', err);
      return null;
    }
  }, []);

  const deleteMascot = useCallback(async () => {
    try {
      await ApiService.deleteMascot();
      setMascot(null);
      localNotificationService.cancelMascotNotifications().catch(() => {});
      return true;
    } catch (err) {
      console.error('[MascotContext] Failed to delete mascot:', err);
      return false;
    }
  }, []);

  const addXp = useCallback(async (amount: number, reason?: string) => {
    try {
      const result = await ApiService.addMascotXp(amount, reason);
      if (result) {
        const didLevelUp = result.leveledUp || false;
        setMascot(result);
        if (didLevelUp) {
          setLevelUpLevel(result.level);
          setLevelUpVisible(true);
        }
        return { leveledUp: didLevelUp };
      }
      return null;
    } catch (err) {
      console.warn('[MascotContext] Failed to add XP:', err);
      return null;
    }
  }, []);

  return (
    <MascotContext.Provider value={{ mascot, loading, createMascot, updateMascot, deleteMascot, addXp, refreshMascot }}>
      {children}
      <LevelUpModal
        visible={levelUpVisible}
        newLevel={levelUpLevel}
        onClose={() => setLevelUpVisible(false)}
        mascotType={mascot?.mascotType}
        mascotName={mascot?.name}
      />
    </MascotContext.Provider>
  );
}

export const useMascot = () => useContext(MascotContext);
