import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EatSenseSDK, createSDK } from '../../../core/sdk';

// Mock fetch
global.fetch = jest.fn();

describe('EatSenseSDK', () => {
  let sdk: EatSenseSDK;

  beforeEach(() => {
    sdk = new EatSenseSDK({
      baseURL: 'http://localhost:3000',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
    });
    jest.clearAllMocks();
  });

  it('should create SDK with config', () => {
    const sdk = createSDK({
      baseURL: 'http://localhost:3000',
      timeout: 5000,
      retryAttempts: 2,
      retryDelay: 500,
    });
    expect(sdk).toBeInstanceOf(EatSenseSDK);
  });

  it('should analyze image', async () => {
    const mockResponse = { items: [{ label: 'Test Food', kcal: 100 }] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await sdk.analyzeImage('test-image.jpg');
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });

  it('should get health status', async () => {
    const mockResponse = { status: 'ok' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await sdk.getHealth();
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });

  it('should get user profile', async () => {
    const mockResponse = { id: '1', email: 'test@example.com' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await sdk.getUserProfile('1');
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });

  it('should update user profile', async () => {
    const mockResponse = { id: '1', email: 'test@example.com' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await sdk.updateUserProfile('1', { name: 'Test User' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });

  it('should get analysis history', async () => {
    const mockResponse = { analyses: [] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await sdk.getAnalysisHistory('1', 10);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });

  it('should delete analysis', async () => {
    const mockResponse = { success: true };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await sdk.deleteAnalysis('1');
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });

  it('should handle errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await sdk.getHealth();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should handle HTTP errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await sdk.getHealth();
    expect(result.success).toBe(false);
    expect(result.error).toBe('HTTP 404');
  });
});
