import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { HttpClient } from '../../../core/http';

// Mock fetch
global.fetch = jest.fn();

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient('http://localhost:3000');
    jest.clearAllMocks();
  });

  it('should make GET request', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
      headers: new Map(),
    });

    const response = await httpClient.get('/test');
    expect(response.data).toEqual(mockResponse);
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
  });

  it('should make POST request', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      statusText: 'Created',
      json: () => Promise.resolve(mockResponse),
      headers: new Map(),
    });

    const response = await httpClient.post('/test', { test: 'data' });
    expect(response.data).toEqual(mockResponse);
    expect(response.status).toBe(201);
  });

  it('should make PUT request', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
      headers: new Map(),
    });

    const response = await httpClient.put('/test', { test: 'data' });
    expect(response.data).toEqual(mockResponse);
  });

  it('should make DELETE request', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
      headers: new Map(),
    });

    const response = await httpClient.delete('/test');
    expect(response.data).toEqual(mockResponse);
  });

  it('should make PATCH request', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(mockResponse),
      headers: new Map(),
    });

    const response = await httpClient.patch('/test', { test: 'data' });
    expect(response.data).toEqual(mockResponse);
  });

  it('should handle errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(httpClient.get('/test')).rejects.toThrow('Network error');
  });

  it('should handle HTTP errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Not found' }),
      headers: new Map(),
    });

    await expect(httpClient.get('/test')).rejects.toThrow('HTTP 404: Not Found');
  });

  it('should handle timeout', async () => {
    const httpClientWithTimeout = new HttpClient('http://localhost:3000', 1000);
    
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise((resolve) => setTimeout(resolve, 2000))
    );

    await expect(httpClientWithTimeout.get('/test')).rejects.toThrow();
  });
});
