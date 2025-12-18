import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClientType;
  private isConnected = false;

  async onModuleInit() {
    // Priority: REDIS_URL > REDIS_HOST/PORT/PASSWORD
    // This ensures Railway (REDIS_URL) works correctly
    let redisUrl: string;
    
    if (process.env.REDIS_URL) {
      redisUrl = process.env.REDIS_URL;
    } else {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379');
      const redisPassword = process.env.REDIS_PASSWORD;
      redisUrl = redisPassword 
        ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
        : `redis://${redisHost}:${redisPort}`;
    }
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10),
        keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE_MS || '5000', 10),
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.warn('[Redis] Max reconnection attempts reached. Redis features will be disabled.');
            return false;
          }
          const backoff = Math.min(500, 100 * Math.pow(2, retries));
          return backoff;
        },
      },
    });

    this.client.on('error', (err) => {
      console.error('[Redis] Client Error:', err.message);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('[Redis] Connecting...');
    });

    this.client.on('ready', () => {
      console.log('[Redis] Connected successfully');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      console.warn('[Redis] Connection closed');
      this.isConnected = false;
    });

    try {
      await this.client.connect();
    } catch (error) {
      console.error('[Redis] Failed to connect:', error.message);
      console.warn('[Redis] Some features may not work (rate limiting, caching, etc.)');
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client && this.isConnected && this.client.isOpen) {
        await this.client.disconnect();
      }
    } catch (error) {
      console.warn('[Redis] Error during disconnect:', error.message);
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.isConnected) {
      try {
        if (!this.client.isOpen) {
          await this.client.connect();
        }
        this.isConnected = true;
      } catch (error) {
        return false;
      }
    }
    return this.isConnected;
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!(await this.ensureConnected())) {
      return null;
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      console.warn('[Redis] get error:', error.message);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!(await this.ensureConnected())) {
      return;
    }
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.warn('[Redis] set error:', error.message);
    }
  }

  async del(key: string): Promise<void> {
    if (!(await this.ensureConnected())) {
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      console.warn('[Redis] del error:', error.message);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!(await this.ensureConnected())) {
      return false;
    }
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.warn('[Redis] exists error:', error.message);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!(await this.ensureConnected())) {
      return;
    }
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      console.warn('[Redis] expire error:', error.message);
    }
  }

  async ttl(key: string): Promise<number> {
    if (!(await this.ensureConnected())) {
      return -1;
    }
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.warn('[Redis] ttl error:', error.message);
      return -1;
    }
  }

  async incr(key: string): Promise<number> {
    if (!(await this.ensureConnected())) {
      return 0;
    }
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.warn('[Redis] incr error:', error.message);
      return 0;
    }
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!(await this.ensureConnected())) {
      return false;
    }
    try {
      const result = await this.client.set(key, value, {
        NX: true,
        EX: ttlSeconds,
      });
      return result === 'OK';
    } catch (error) {
      console.warn('[Redis] setNx error:', error.message);
      return false;
    }
  }
}
