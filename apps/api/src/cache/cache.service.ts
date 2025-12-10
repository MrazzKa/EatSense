import { Injectable, Logger } from '@nestjs/common';
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
  | 'assistant:session'
  | 'assistant:active';

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
  private readonly usdaTtl = parseInt(process.env.USDA_CACHE_TTL_SEC || '259200', 10);
  private readonly analysisTtl = parseInt(process.env.ANALYSIS_CACHE_TTL_SEC || '86400', 10);
  private readonly visionTtl = parseInt(process.env.VISION_CACHE_TTL_SEC || '604800', 10); // 7 days default
  private readonly nutritionTtl = parseInt(process.env.NUTRITION_CACHE_TTL_SEC || '2592000', 10); // 30 days default
  private readonly articlesFeedTtl = parseInt(process.env.ARTICLES_FEED_CACHE_TTL_SEC || '900', 10);
  private readonly articlesDetailTtl = parseInt(process.env.ARTICLES_DETAIL_CACHE_TTL_SEC || '86400', 10);

  constructor(private readonly redis: RedisService) {}

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

  async clear(namespace?: CacheNamespace): Promise<void> {
    const client = this.redis.getClient();
    const pattern = namespace ? `${this.prefix}:${namespace}:*` : `${this.prefix}:*`;

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

  async invalidateNamespace(namespace: CacheNamespace, userId?: string): Promise<void> {
    await this.clear(namespace);
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


