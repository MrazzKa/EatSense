import { describe, it, expect, jest } from '@jest/globals';
import { ApiAdapter } from '../../../core/adapters/api-adapter';

// Mock fetch
global.fetch = jest.fn();

describe('ApiAdapter', () => {
  let apiAdapter: ApiAdapter;

  beforeEach(() => {
    apiAdapter = new ApiAdapter('http://localhost:3000');
    jest.clearAllMocks();
  });

  it('should make GET request', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiAdapter.get('/test');
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });

  it('should make POST request', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiAdapter.post('/test', { test: 'data' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });

  it('should handle errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await apiAdapter.get('/test');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should handle HTTP errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await apiAdapter.get('/test');
    expect(result.success).toBe(false);
    expect(result.error).toBe('HTTP 404');
  });
});
