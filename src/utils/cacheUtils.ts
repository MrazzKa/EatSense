interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) { // 5 minutes
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  values(): T[] {
    return Array.from(this.cache.values()).map(item => item.value);
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const createCache = <T = any>(maxSize?: number, defaultTTL?: number): MemoryCache<T> => {
  return new MemoryCache<T>(maxSize, defaultTTL);
};

export const memoize = <T extends (..._args: any[]) => any>(
  fn: T,
  keyGenerator?: (..._args: Parameters<T>) => string,
  ttl?: number
): T => {
  const cache = new MemoryCache<ReturnType<T>>(1000, ttl);
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

export const withCache = <T extends (..._args: any[]) => any>(
  fn: T,
  keyGenerator?: (..._args: Parameters<T>) => string,
  ttl?: number
): T => {
  const cache = new MemoryCache<ReturnType<T>>(1000, ttl);
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    const cached = cache.get(key);
    if (cached !== null) {
      return Promise.resolve(cached);
    }
    
    return Promise.resolve(fn(...args)).then(result => {
      cache.set(key, result);
      return result;
    });
  }) as T;
};