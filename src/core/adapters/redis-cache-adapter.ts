export interface CacheAdapter {
  get(_key: string): Promise<any>;
  set(_key: string, _value: any, _ttl?: number): Promise<void>;
  delete(_key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface RedisCacheConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

export class RedisCacheAdapter implements CacheAdapter {
  private config: RedisCacheConfig;
  private defaultTTL: number;

  constructor(config: RedisCacheConfig, defaultTTL: number = 5 * 60 * 1000) {
    this.config = {
      timeout: 5000,
      retries: 3,
      ...config,
    };
    this.defaultTTL = defaultTTL;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await this.makeRequest('GET', `/cache/${encodeURIComponent(key)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Cache get failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.value || null;
    } catch (error) {
      console.warn('Redis cache get failed, falling back to null:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const actualTTL = ttl || this.defaultTTL;
      
      const response = await this.makeRequest('PUT', `/cache/${encodeURIComponent(key)}`, {
        value,
        ttl: Math.floor(actualTTL / 1000), // Convert to seconds
      });
      
      if (!response.ok) {
        throw new Error(`Cache set failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Redis cache set failed:', error);
      // Don't throw - cache failures should not break the app
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const response = await this.makeRequest('DELETE', `/cache/${encodeURIComponent(key)}`);
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Cache delete failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Redis cache delete failed:', error);
      // Don't throw - cache failures should not break the app
    }
  }

  async clear(): Promise<void> {
    try {
      const response = await this.makeRequest('DELETE', '/cache');
      
      if (!response.ok) {
        throw new Error(`Cache clear failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Redis cache clear failed:', error);
      // Don't throw - cache failures should not break the app
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('HEAD', `/cache/${encodeURIComponent(key)}`);
      return response.ok;
    } catch (error) {
      console.warn('Redis cache has failed:', error);
      return false;
    }
  }

  private async makeRequest(method: string, path: string, body?: any): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'test';
      
      await this.set(testKey, testValue, 60000); // 60 seconds
      const result = await this.get<string>(testKey);
      await this.delete(testKey);
      
      return result === testValue;
    } catch (error) {
      console.error('Redis cache health check failed:', error);
      return false;
    }
  }
}

// Factory function to create Redis cache adapter with environment config
export const createRedisCacheAdapter = (): RedisCacheAdapter => {
  // Use safeEnv helper for normalized env values
  const safeEnv = require('../../utils/env').default;
  const baseUrl = safeEnv.apiBaseUrl || 'http://172.20.10.2:3000';
  
  return new RedisCacheAdapter({
    baseUrl,
    timeout: 5000,
    retries: 3,
  });
};
