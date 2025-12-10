import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageAdapter {
  get<T>(_key: string): Promise<T | null>;
  set<T>(_key: string, _value: T): Promise<void>;
  remove(_key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export class AsyncStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to storage:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    try {
      return [...(await AsyncStorage.getAllKeys())];
    } catch (error) {
      console.error('Error getting storage keys:', error);
      return [];
    }
  }
}

export const storageAdapter = new AsyncStorageAdapter();
