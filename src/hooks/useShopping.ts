import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem } from '../types/tracker';

const SHOPPING_KEY = 'tracker:shopping';

export function useShopping() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsRef = useRef<ShoppingItem[]>(items);
  itemsRef.current = items;

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
    await save([...itemsRef.current, newItem]);
    return newItem;
  }, [save]);

  const addItems = useCallback(async (newItems: Omit<ShoppingItem, 'id' | 'bought' | 'createdAt'>[]) => {
    const created: ShoppingItem[] = newItems.map((item, i) => ({
      ...item,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + i,
      bought: false,
      createdAt: new Date().toISOString(),
    }));
    await save([...itemsRef.current, ...created]);
    return created;
  }, [save]);

  const removeItem = useCallback(async (id: string) => {
    await save(itemsRef.current.filter(i => i.id !== id));
  }, [save]);

  const toggleItem = useCallback(async (id: string) => {
    await save(itemsRef.current.map(i => i.id === id ? { ...i, bought: !i.bought } : i));
  }, [save]);

  const clearBought = useCallback(async () => {
    await save(itemsRef.current.filter(i => !i.bought));
  }, [save]);

  const shareList = useCallback(async (title: string) => {
    const active = itemsRef.current.filter(i => !i.bought);
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
