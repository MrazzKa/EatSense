import AsyncStorage from '@react-native-async-storage/async-storage';

export const storeData = async (key: string, value: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error('Error storing data:', error);
  }
};

export const getData = async (key: string): Promise<any> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error getting data:', error);
    return null;
  }
};

export const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing data:', error);
  }
};

export const clearAll = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing all data:', error);
  }
};

export const getAllKeys = async (): Promise<string[]> => {
  try {
    return [...(await AsyncStorage.getAllKeys())];
  } catch (error) {
    console.error('Error getting all keys:', error);
    return [];
  }
};

export const multiGet = async (keys: string[]): Promise<[string, string | null][]> => {
  try {
    return [...(await AsyncStorage.multiGet(keys))];
  } catch (error) {
    console.error('Error getting multiple data:', error);
    return [];
  }
};

export const multiSet = async (keyValuePairs: [string, string][]): Promise<void> => {
  try {
    await AsyncStorage.multiSet(keyValuePairs);
  } catch (error) {
    console.error('Error setting multiple data:', error);
  }
};

export const multiRemove = async (keys: string[]): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Error removing multiple data:', error);
  }
};