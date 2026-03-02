import { useState, useEffect, useCallback } from 'react';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem } from '../types/tracker';

const SHOPPING_KEY = 'tracker:shopping';

export function useShopping() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SHOPPING_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (updated: ShoppingItem[]) => {
    setItems(updated);
    await AsyncStorage.setItem(SHOPPING_KEY, JSON.stringify(updated));
  }, []);

  const addItem = useCallback(async (item: Omit<ShoppingItem, 'id' | 'bought' | 'createdAt'>) => {
    const newItem: ShoppingItem = {
      ...item,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      bought: false,
      createdAt: new Date().toISOString(),
    };
    await save([...items, newItem]);
    return newItem;
  }, [items, save]);

  const removeItem = useCallback(async (id: string) => {
    await save(items.filter(i => i.id !== id));
  }, [items, save]);

  const toggleItem = useCallback(async (id: string) => {
    await save(items.map(i => i.id === id ? { ...i, bought: !i.bought } : i));
  }, [items, save]);

  const clearBought = useCallback(async () => {
    await save(items.filter(i => !i.bought));
  }, [items, save]);

  const shareList = useCallback(async (title: string) => {
    const active = items.filter(i => !i.bought);
    if (active.length === 0) return;
    const text = `${title}\n\n${active.map(i => `☐ ${i.emoji ? i.emoji + ' ' : ''}${i.name}`).join('\n')}`;
    await Share.share({ message: text });
  }, [items]);

  const activeItems = items.filter(i => !i.bought);
  const boughtItems = items.filter(i => i.bought);

  return {
    items,
    activeItems,
    boughtItems,
    loading,
    addItem,
    removeItem,
    toggleItem,
    clearBought,
    shareList,
  };
}
