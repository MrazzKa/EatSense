import { useState, useEffect, useCallback, useMemo } from 'react';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem } from '../types/tracker';

const SHOPPING_KEY = 'tracker:shopping';

/**
 * Every mounted copy of this hook shares one list.
 *
 * The list lives in AsyncStorage, so without this each screen would keep its own
 * snapshot and only re-read it on mount — adding items from the Fridge screen
 * ("you'll also need…") would not show up in the Tracker until it remounted.
 */
const listeners = new Set<(items: ShoppingItem[]) => void>();

/**
 * The single source of truth while the app is running. Kept at module level
 * rather than in each hook's ref so that a write from one screen is computed
 * against the latest list, not against whatever that screen last rendered.
 */
let currentItems: ShoppingItem[] = [];
let hydrated = false;

function broadcast(items: ShoppingItem[]) {
  currentItems = items;
  listeners.forEach((fn) => fn(items));
}

export function useShopping() {
  const [items, setItems] = useState<ShoppingItem[]>(currentItems);
  const [loading, setLoading] = useState(!hydrated);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      setItems(currentItems);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SHOPPING_KEY);
        if (raw) broadcast(JSON.parse(raw));
      } catch {
        // ignore
      } finally {
        hydrated = true;
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (updated: ShoppingItem[]) => {
    broadcast(updated);
    await AsyncStorage.setItem(SHOPPING_KEY, JSON.stringify(updated));
  }, []);

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
