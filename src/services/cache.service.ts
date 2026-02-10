/**
 * Cache Service
 * In-memory caching using node-cache
 */

import NodeCache from 'node-cache';
import { logger } from '../logger/logger';
import { CacheConfig } from '../types/config.types';

export class CacheService {
  private cache: NodeCache;
  private ttl: number;

  constructor(config: CacheConfig) {
    this.ttl = config.ttl;
    this.cache = new NodeCache({
      stdTTL: this.ttl,
      checkperiod: this.ttl * 0.2,
      useClones: false,
    });

    // Log cache events
    this.cache.on('set', (key) => {
      logger.debug(`Cache SET: ${key}`);
    });

    this.cache.on('expired', (key) => {
      logger.debug(`Cache EXPIRED: ${key}`);
    });

    this.cache.on('del', (key) => {
      logger.debug(`Cache DEL: ${key}`);
    });
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      logger.debug(`Cache HIT: ${key}`);
    } else {
      logger.debug(`Cache MISS: ${key}`);
    }
    return value;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const success = this.cache.set(key, value, ttl || this.ttl);
    if (success) {
      logger.debug(`Cache SET: ${key} (TTL: ${ttl || this.ttl}s)`);
    } else {
      logger.warn(`Cache SET FAILED: ${key}`);
    }
    return success;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete value from cache
   */
  delete(key: string): number {
    const count = this.cache.del(key);
    if (count > 0) {
      logger.debug(`Cache DELETE: ${key}`);
    }
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): NodeCache.Stats {
    return this.cache.getStats();
  }

  /**
   * Get or set pattern - get from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    logger.debug(`Cache MISS: ${key}, computing value`);
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get multiple values from cache
   */
  mget<T>(keys: string[]): Map<string, T> {
    const result = new Map<string, T>();
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }
    return result;
  }

  /**
   * Set multiple values in cache
   */
  mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): boolean {
    let allSuccess = true;
    for (const { key, value, ttl } of entries) {
      const success = this.set(key, value, ttl);
      if (!success) {
        allSuccess = false;
      }
    }
    return allSuccess;
  }

  /**
   * Get TTL for a key
   */
  getTtl(key: string): number | undefined {
    return this.cache.getTtl(key);
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return this.cache.keys();
  }

  /**
   * Check if cache is active
   */
  isActive(): boolean {
    const stats = this.getStats();
    return stats.keys >= 0;
  }
}
