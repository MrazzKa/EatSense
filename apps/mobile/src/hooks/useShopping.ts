import { useState, useEffect, useCallback, useMemo } from 'react';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ShoppingItem } from '../types/tracker';
import { useAuth } from '../contexts/AuthContext';

/**
 * The list used to live under one global key, and signing out only clears auth
 * tokens — so on a shared device the next person to sign in inherited the
 * previous person's shopping list. The key is now scoped to the account.
 */
const LEGACY_SHOPPING_KEY = 'tracker:shopping';
const keyForUser = (userId: string | null) =>
  userId ? `${LEGACY_SHOPPING_KEY}:${userId}` : LEGACY_SHOPPING_KEY;

/**
 * Every mounted copy of this hook shares one list.
 *
 * The list lives in AsyncStorage, so without this each screen would keep its own
 * snapshot and only re-read it on mount — adding items from the Fridge screen
 * ("you'll also need…") would not show up in the Tracker until it remounted.
 */
const listeners = new Set<(_items: ShoppingItem[]) => void>();

/**
 * The single source of truth while the app is running. Kept at module level
 * rather than in each hook's ref so that a write from one screen is computed
 * against the latest list, not against whatever that screen last rendered.
 *
 * `hydratedFor` records WHICH account the cache belongs to. Without it the cache
 * would outlive a sign-out and hand the next account the previous one's items.
 */
let currentItems: ShoppingItem[] = [];
let hydratedFor: string | null | undefined;

function broadcast(items: ShoppingItem[]) {
  currentItems = items;
  listeners.forEach((fn) => fn(items));
}

/**
 * Move a pre-existing list onto the signed-in account's key, once.
 *
 * Users who already had a list before it was scoped would otherwise open the app
 * to an empty screen. The legacy key is removed after the copy so it cannot be
 * picked up a second time by a different account.
 */
async function migrateLegacyList(userKey: string): Promise<ShoppingItem[] | null> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_SHOPPING_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      await AsyncStorage.removeItem(LEGACY_SHOPPING_KEY);
      return null;
    }
    await AsyncStorage.setItem(userKey, legacy);
    await AsyncStorage.removeItem(LEGACY_SHOPPING_KEY);
    return parsed as ShoppingItem[];
  } catch {
    return null;
  }
}

export function useShopping() {
  const { user } = useAuth();
  const userId: string | null = user?.id ? String(user.id) : null;
  const storageKey = keyForUser(userId);

  const [items, setItems] = useState<ShoppingItem[]>(hydratedFor === userId ? currentItems : []);
  const [loading, setLoading] = useState(hydratedFor !== userId);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  useEffect(() => {
    if (hydratedFor === userId) {
      setItems(currentItems);
      setLoading(false);
      return;
    }

    // The account changed (or this is the first load). Blank the shared cache
    // immediately so no screen can render the previous account's list while the
    // read is in flight.
    broadcast([]);
    setLoading(true);

    let cancelled = false;
    (async () => {
      let next: ShoppingItem[] = [];
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) next = parsed;
        } else if (userId) {
          next = (await migrateLegacyList(storageKey)) || [];
        }
      } catch {
        // Unreadable storage is the same as an empty list — never block the UI.
      } finally {
        if (!cancelled) {
          hydratedFor = userId;
          broadcast(next);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, storageKey]);

  const save = useCallback(async (updated: ShoppingItem[]) => {
    broadcast(updated);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  }, [storageKey]);

  const addItem = useCallback(async (item: Omit<ShoppingItem, 'id' | 'bought' | 'createdAt'>) => {
    const newItem: ShoppingItem = {
      ...item,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      bought: false,
      createdAt: new Date().toISOString(),
    };
    await save([...currentItems, newItem]);
    return newItem;
  }, [save]);

  const addItems = useCallback(async (newItems: Omit<ShoppingItem, 'id' | 'bought' | 'createdAt'>[]) => {
    const created: ShoppingItem[] = newItems.map((item, i) => ({
      ...item,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + i,
      bought: false,
      createdAt: new Date().toISOString(),
    }));
    await save([...currentItems, ...created]);
    return created;
  }, [save]);

  const removeItem = useCallback(async (id: string) => {
    await save(currentItems.filter(i => i.id !== id));
  }, [save]);

  const toggleItem = useCallback(async (id: string) => {
    await save(currentItems.map(i => i.id === id ? { ...i, bought: !i.bought } : i));
  }, [save]);

  const clearBought = useCallback(async () => {
    await save(currentItems.filter(i => !i.bought));
  }, [save]);

  const shareList = useCallback(async (title: string) => {
    const active = currentItems.filter(i => !i.bought);
    if (active.length === 0) return;
    const text = `${title}\n\n${active.map(i => `☐ ${i.emoji ? i.emoji + ' ' : ''}${i.name}`).join('\n')}`;
    await Share.share({ message: text });
  }, []);

  // Memoize derived arrays
  const activeItems = useMemo(() => items.filter(i => !i.bought), [items]);
  const boughtItems = useMemo(() => items.filter(i => i.bought), [items]);

  return {
    items,
    activeItems,
    boughtItems,
    loading,
    addItem,
    addItems,
    removeItem,
    toggleItem,
    clearBought,
    shareList,
  };
}
