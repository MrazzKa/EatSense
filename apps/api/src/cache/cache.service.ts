import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';

type CacheNamespace =
  | 'general'
  | 'usda:search'
  | 'usda:detail'
  | 'analysis'
  | 'vision'
  | 'nutrition:lookup'
  | 'articles:list'
  | 'articles:detail'
  | 'stats:monthly'
  | 'stats:daily'
  | 'assistant:session'
  | 'assistant:active'
  | 'health_feedback_ai'
  | 'diets:list'
  | 'diets:featured'
  | 'diets:recommendations'
  | 'diets:detail'
  | 'diets:bundle'
  | 'meals:diary'
  | 'suggestions';

interface CacheEntry<T> {
  value: T;
  ttl: number;
  storedAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly prefix = 'eatsense';

  private readonly defaultTtl = parseInt(process.env.CACHE_DEFAULT_TTL_SEC || '900', 10);
  private readonly usdaTtl = parseInt(process.env.USDA_CACHE_TTL_SEC || '43200', 10); // 12h (was 24h)
  private readonly analysisTtl = parseInt(process.env.ANALYSIS_CACHE_TTL_SEC || '43200', 10); // 12h (was 24h)
  private readonly visionTtl = parseInt(process.env.VISION_CACHE_TTL_SEC || '43200', 10); // 12h (was 24h)
  private readonly nutritionTtl = parseInt(process.env.NUTRITION_CACHE_TTL_SEC || '604800', 10); // 7 days (was 30 days)
  private readonly articlesFeedTtl = parseInt(process.env.ARTICLES_FEED_CACHE_TTL_SEC || '900', 10);
  private readonly articlesDetailTtl = parseInt(process.env.ARTICLES_DETAIL_CACHE_TTL_SEC || '86400', 10);

  constructor(private readonly redis: RedisService) { }

  private resolveTtl(namespace: CacheNamespace, customTtl?: number): number {
    if (customTtl) {
      return customTtl;
    }

    if (namespace.startsWith('usda')) {
      return this.usdaTtl;
    }

    if (namespace.startsWith('analysis')) {
      return this.analysisTtl;
    }

    if (namespace === 'vision') {
      return this.visionTtl;
    }

    if (namespace === 'nutrition:lookup') {
      return this.nutritionTtl;
    }

    if (namespace === 'articles:list') {
      return this.articlesFeedTtl;
    }

    if (namespace === 'articles:detail') {
      return this.articlesDetailTtl;
    }

    return this.defaultTtl;
  }

  private buildKey(key: string, namespace: CacheNamespace = 'general'): string {
    return `${this.prefix}:${namespace}:${key}`;
  }

  async get<T>(key: string, namespace: CacheNamespace = 'general'): Promise<T | null> {
    const redisKey = this.buildKey(key, namespace);
    const raw = await this.redis.get(redisKey);

    if (!raw) {
      this.logger.debug(`cache=miss namespace=${namespace} key=${redisKey}`);
      return null;
    }

    try {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      const expiresAt = entry.storedAt + entry.ttl * 1000;
      if (Date.now() > expiresAt) {
        await this.redis.del(redisKey);
        this.logger.debug(`cache=expired namespace=${namespace} key=${redisKey}`);
        return null;
      }
      this.logger.debug(`cache=hit namespace=${namespace} key=${redisKey}`);
      return entry.value;
    } catch (error: any) {
      this.logger.warn(`Failed to parse cache entry ${redisKey}: ${error.message}`);
      await this.redis.del(redisKey);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    namespace: CacheNamespace = 'general',
    ttl?: number,
  ): Promise<void> {
    const redisKey = this.buildKey(key, namespace);
    const resolvedTtl = this.resolveTtl(namespace, ttl);
    const entry: CacheEntry<T> = {
      value,
      ttl: resolvedTtl,
      storedAt: Date.now(),
    };

    await this.redis.set(redisKey, JSON.stringify(entry), resolvedTtl);
    this.logger.debug(`cache=set namespace=${namespace} key=${redisKey} ttl=${resolvedTtl}`);
  }

  async delete(key: string, namespace: CacheNamespace = 'general'): Promise<void> {
    const redisKey = this.buildKey(key, namespace);
    await this.redis.del(redisKey);
    this.logger.debug(`cache=delete namespace=${namespace} key=${redisKey}`);
  }

  async exists(key: string, namespace: CacheNamespace = 'general'): Promise<boolean> {
    return this.redis.exists(this.buildKey(key, namespace));
  }

  ttlFor(namespace: CacheNamespace): number {
    return this.resolveTtl(namespace);
  }

  /**
   * Get cached value or generate and store it with lock protection.
   * Prevents cache stampede by using a Redis lock so only one request generates the value.
   * @param key Cache key
   * @param namespace Cache namespace
   * @param factory Function to generate the value if cache miss
   * @param ttl Optional TTL override
   */
  async getOrSet<T>(
    key: string,
    namespace: CacheNamespace,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // First try to get from cache
    const cached = await this.get<T>(key, namespace);
    if (cached !== null) {
      return cached;
    }

    // Try to acquire lock for generating this key
    const lockKey = `${this.prefix}:lock:${namespace}:${key}`;
    const lockAcquired = await this.redis.setNx(lockKey, 'generating', 30); // 30 second lock

    if (lockAcquired) {
      try {
        // Double-check cache after acquiring lock (another request might have just finished)
        const cachedAfterLock = await this.get<T>(key, namespace);
        if (cachedAfterLock !== null) {
          await this.redis.del(lockKey);
          return cachedAfterLock;
        }

        // Generate the value
        this.logger.debug(`cache=generating namespace=${namespace} key=${key}`);
        const value = await factory();

        // Store in cache
        await this.set(key, value, namespace, ttl);

        // Release lock
        await this.redis.del(lockKey);

        return value;
      } catch (error) {
        // Release lock on error
        await this.redis.del(lockKey);
        throw error;
      }
    } else {
      // Lock not acquired - wait for the other request to finish
      this.logger.debug(`cache=waiting namespace=${namespace} key=${key}`);

      // Poll for result with exponential backoff
      const maxWait = 10000; // 10 seconds max wait
      const pollInterval = 100; // Start with 100ms
      let waited = 0;

      while (waited < maxWait) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        waited += pollInterval;

        const result = await this.get<T>(key, namespace);
        if (result !== null) {
          return result;
        }

        // Check if lock is still held
        const lockStillHeld = await this.redis.exists(lockKey);
        if (!lockStillHeld) {
          // Lock released but no value - try one more time
          const finalResult = await this.get<T>(key, namespace);
          if (finalResult !== null) {
            return finalResult;
          }
          break;
        }
      }

      // Timeout or lock released without value - generate ourselves as fallback
      this.logger.warn(`cache=timeout namespace=${namespace} key=${key} - generating fallback`);
      const value = await factory();
      await this.set(key, value, namespace, ttl);
      return value;
    }
  }

  private async deleteByPattern(pattern: string): Promise<void> {
    const client = this.redis.getClient();
    const stream = client.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    });

    const keysToDelete: string[] = [];
    for await (const key of stream as AsyncIterable<string>) {
      keysToDelete.push(key);
      if (keysToDelete.length >= 200) {
        const pipeline = client.multi();
        keysToDelete.forEach((k) => pipeline.del(k));
        await pipeline.exec();
        keysToDelete.length = 0;
      }
    }

    if (keysToDelete.length) {
      const pipeline = client.multi();
      keysToDelete.forEach((k) => pipeline.del(k));
      await pipeline.exec();
    }
  }

  async clear(namespace?: CacheNamespace): Promise<void> {
    const pattern = namespace ? `${this.prefix}:${namespace}:*` : `${this.prefix}:*`;
    await this.deleteByPattern(pattern);
  }

  async invalidateNamespace(namespace: CacheNamespace, userId?: string): Promise<void> {
    const pattern = userId
      ? `${this.prefix}:${namespace}:${userId}:*`
      : `${this.prefix}:${namespace}:*`;

    this.logger.debug(`Invalidating namespace=${namespace} userId=${userId || 'all'} pattern=${pattern}`);
    await this.deleteByPattern(pattern);
  }

  /**
   * Cleanup expired cache entries across all namespaces.
   * Uses SCAN to iterate keys without blocking Redis.
   * Runs every 2 hours automatically.
   */
  @Cron('0 */2 * * *')
  async cleanupExpired(): Promise<number> {
    let deletedCount = 0;
    let totalKeys = 0;
    try {
      const client = this.redis.getClient();
      const stream = client.scanIterator({
        MATCH: `${this.prefix}:*`,
        COUNT: 200,
      });

      const keysToDelete: string[] = [];

      for await (const key of stream as AsyncIterable<string>) {
        totalKeys++;
        try {
          const raw = await this.redis.get(key);
          if (!raw) continue;

          const entry = JSON.parse(raw) as CacheEntry<unknown>;
          const expiresAt = entry.storedAt + entry.ttl * 1000;
          if (Date.now() > expiresAt) {
            keysToDelete.push(key);
          }
        } catch {
          // Malformed entry — delete it
          keysToDelete.push(key);
        }

        // Batch delete
        if (keysToDelete.length >= 200) {
          const pipeline = client.multi();
          keysToDelete.forEach((k) => pipeline.del(k));
          await pipeline.exec();
          deletedCount += keysToDelete.length;
          keysToDelete.length = 0;
        }
      }

      // Delete remaining
      if (keysToDelete.length > 0) {
        const pipeline = client.multi();
        keysToDelete.forEach((k) => pipeline.del(k));
        await pipeline.exec();
        deletedCount += keysToDelete.length;
      }

      this.logger.log(`Cleanup: scanned ${totalKeys} keys, deleted ${deletedCount} expired entries`);
    } catch (error) {
      this.logger.warn(`Cleanup failed: ${(error as Error).message}`);
    }
    return deletedCount;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const key = this.buildKey('health', 'general');
      const value = Date.now().toString();
      await this.redis.set(key, value, 60);
      const stored = await this.redis.get(key);
      await this.redis.del(key);
      return stored === value;
    } catch (error) {
      this.logger.warn(`health check failed: ${(error as Error).message}`);
      return false;
    }
  }
}


