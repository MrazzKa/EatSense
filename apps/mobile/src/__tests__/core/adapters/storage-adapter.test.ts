import { describe, it, expect, beforeEach } from '@jest/globals';
import { AsyncStorageAdapter } from '../../../core/adapters/storage-adapter';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

describe('AsyncStorageAdapter', () => {
  let storageAdapter: AsyncStorageAdapter;
  const mockAsyncStorage = require('@react-native-async-storage/async-storage');

  beforeEach(() => {
    storageAdapter = new AsyncStorageAdapter();
    jest.clearAllMocks();
  });

  it('should get item from storage', async () => {
    const mockData = { test: 'data' };
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockData));

    const result = await storageAdapter.get('test-key');
    expect(result).toEqual(mockData);
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('test-key');
  });

  it('should return null when item does not exist', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);

    const result = await storageAdapter.get('non-existent-key');
    expect(result).toBeNull();
  });

  it('should set item in storage', async () => {
    const testData = { test: 'data' };
    mockAsyncStorage.setItem.mockResolvedValueOnce(undefined);

    await storageAdapter.set('test-key', testData);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
  });

  it('should remove item from storage', async () => {
    mockAsyncStorage.removeItem.mockResolvedValueOnce(undefined);

    await storageAdapter.remove('test-key');
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
  });

  it('should clear storage', async () => {
    mockAsyncStorage.clear.mockResolvedValueOnce(undefined);

    await storageAdapter.clear();
    expect(mockAsyncStorage.clear).toHaveBeenCalled();
  });

  it('should get all keys', async () => {
    const mockKeys = ['key1', 'key2', 'key3'];
    mockAsyncStorage.getAllKeys.mockResolvedValueOnce(mockKeys);

    const result = await storageAdapter.keys();
    expect(result).toEqual(mockKeys);
    expect(mockAsyncStorage.getAllKeys).toHaveBeenCalled();
  });
});
