/**
 * Cache Service Unit Tests
 * Tests for caching functionality
 */

import { CacheService } from '../../src/services/cache.service';
import { CacheConfig } from '../../src/types/config.types';
import { createMockCoin } from '../helpers/test-utils';
import { wait } from '../helpers/test-utils';

describe('CacheService', () => {
  let cacheService: CacheService;
  const testConfig: CacheConfig = {
    ttl: 2, // 2 seconds for fast tests
  };

  beforeEach(() => {
    cacheService = new CacheService(testConfig);
  });

  afterEach(() => {
    cacheService.clear();
  });

  describe('set and get', () => {
    it('should set and get a value', () => {
      const value = { data: 'test' };
      cacheService.set('testKey', value);

      const retrieved = cacheService.get('testKey');

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent key', () => {
      const result = cacheService.get('nonExistent');

      expect(result).toBeUndefined();
    });

    it('should handle different data types', () => {
      cacheService.set('string', 'hello');
      cacheService.set('number', 42);
      cacheService.set('boolean', true);
      cacheService.set('array', [1, 2, 3]);
      cacheService.set('object', { foo: 'bar' });

      expect(cacheService.get('string')).toBe('hello');
      expect(cacheService.get('number')).toBe(42);
      expect(cacheService.get('boolean')).toBe(true);
      expect(cacheService.get('array')).toEqual([1, 2, 3]);
      expect(cacheService.get('object')).toEqual({ foo: 'bar' });
    });

    it('should handle complex objects', () => {
      const coin = createMockCoin();
      cacheService.set('coin', coin);

      const retrieved = cacheService.get('coin');

      expect(retrieved).toEqual(coin);
    });

    it('should overwrite existing value', () => {
      cacheService.set('key', 'value1');
      cacheService.set('key', 'value2');

      const result = cacheService.get('key');

      expect(result).toBe('value2');
    });
  });

  describe('TTL expiration', () => {
    it('should expire value after TTL', async () => {
      cacheService.set('expireKey', 'value');

      // Wait for TTL to expire (2 seconds + buffer)
      await wait(2500);

      const result = cacheService.get('expireKey');

      expect(result).toBeUndefined();
    });

    it('should allow custom TTL per key', async () => {
      cacheService.set('shortTTL', 'value', 1); // 1 second

      await wait(1500);

      const result = cacheService.get('shortTTL');

      expect(result).toBeUndefined();
    });

    it('should not expire before TTL', async () => {
      cacheService.set('key', 'value');

      await wait(1000); // Wait 1 second (TTL is 2 seconds)

      const result = cacheService.get('key');

      expect(result).toBe('value');
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cacheService.set('key', 'value');

      expect(cacheService.has('key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cacheService.has('nonExistent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      cacheService.set('key', 'value', 1);

      await wait(1500);

      expect(cacheService.has('key')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', () => {
      cacheService.set('key', 'value');

      const count = cacheService.delete('key');

      expect(count).toBe(1);
      expect(cacheService.has('key')).toBe(false);
    });

    it('should return 0 for non-existent key', () => {
      const count = cacheService.delete('nonExistent');

      expect(count).toBe(0);
    });

    it('should not affect other keys', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');

      cacheService.delete('key1');

      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all cache', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');

      cacheService.clear();

      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(false);
      expect(cacheService.has('key3')).toBe(false);
    });

    it('should reset cache stats', () => {
      cacheService.set('key', 'value');
      cacheService.clear();

      const stats = cacheService.getStats();

      expect(stats.keys).toBe(0);
    });

    it('should invalidate in-flight entries so concurrent callers do not join stale promise', async () => {
      let resolveFactory!: (value: string) => void;
      const factory = jest.fn().mockImplementation(() => {
        return new Promise<string>((resolve) => {
          resolveFactory = resolve;
        });
      });

      // Start a getOrSet that hasn't resolved yet
      const promise1 = cacheService.getOrSet('inflight-key', factory);

      // Clear while the factory is still in progress — this drops the
      // in-flight entry so new callers won't join the stale promise.
      cacheService.clear();

      // A second caller after clear() should start its own factory
      // (not join the old in-flight promise that was cleared).
      const factory2 = jest.fn().mockResolvedValue('fresh-value');
      const promise2 = cacheService.getOrSet('inflight-key', factory2);

      // factory2 should have been invoked because in-flight was cleared
      expect(factory2).toHaveBeenCalledTimes(1);

      // Resolve the original factory
      resolveFactory('stale-value');
      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBe('stale-value');
      expect(result2).toBe('fresh-value');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.get('key1'); // hit
      cacheService.get('nonExistent'); // miss

      const stats = cacheService.getStats();

      expect(stats.keys).toBe(2);
      expect(stats.hits).toBeGreaterThanOrEqual(1);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
    });

    it('should track hits correctly', () => {
      cacheService.set('key', 'value');
      cacheService.get('key');
      cacheService.get('key');

      const stats = cacheService.getStats();

      expect(stats.hits).toBeGreaterThanOrEqual(2);
    });

    it('should track misses correctly', () => {
      cacheService.get('nonExistent1');
      cacheService.get('nonExistent2');

      const stats = cacheService.getStats();

      expect(stats.misses).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      cacheService.set('key', 'cachedValue');
      const factory = jest.fn().mockResolvedValue('newValue');

      const result = await cacheService.getOrSet('key', factory);

      expect(result).toBe('cachedValue');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should compute and cache value if not exists', async () => {
      const factory = jest.fn().mockResolvedValue('computedValue');

      const result = await cacheService.getOrSet('key', factory);

      expect(result).toBe('computedValue');
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cacheService.get('key')).toBe('computedValue');
    });

    it('should handle async factory functions', async () => {
      const factory = async () => {
        await wait(100);
        return 'asyncValue';
      };

      const result = await cacheService.getOrSet('key', factory);

      expect(result).toBe('asyncValue');
    });

    it('should use custom TTL', async () => {
      const factory = jest.fn().mockResolvedValue('value');

      await cacheService.getOrSet('key', factory, 1);

      await wait(1500);

      expect(cacheService.get('key')).toBeUndefined();
    });

    it('should coalesce concurrent misses for the same key', async () => {
      let callCount = 0;
      const factory = jest.fn().mockImplementation(async () => {
        callCount++;
        await wait(100);
        return `value-${callCount}`;
      });

      // Fire two concurrent getOrSet calls for the same key
      const [result1, result2] = await Promise.all([
        cacheService.getOrSet('dup', factory),
        cacheService.getOrSet('dup', factory),
      ]);

      // Factory should only be invoked once
      expect(factory).toHaveBeenCalledTimes(1);
      // Both callers receive the same value
      expect(result1).toBe(result2);
      expect(result1).toBe('value-1');
    });

    it('should clean up in-flight entry on factory error', async () => {
      const failFactory = jest.fn().mockRejectedValue(new Error('fail'));
      const successFactory = jest.fn().mockResolvedValue('recovered');

      // First call fails
      await expect(cacheService.getOrSet('err', failFactory)).rejects.toThrow('fail');

      // Second call should invoke its own factory (not reuse the failed promise)
      const result = await cacheService.getOrSet('err', successFactory);
      expect(result).toBe('recovered');
      expect(successFactory).toHaveBeenCalledTimes(1);
    });
  });

  describe('mget', () => {
    it('should get multiple values', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');

      const result = cacheService.mget<string>(['key1', 'key2', 'key3']);

      expect(result.size).toBe(3);
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
      expect(result.get('key3')).toBe('value3');
    });

    it('should skip non-existent keys', () => {
      cacheService.set('key1', 'value1');

      const result = cacheService.mget<string>(['key1', 'nonExistent', 'key3']);

      expect(result.size).toBe(1);
      expect(result.has('nonExistent')).toBe(false);
    });

    it('should return empty map for empty array', () => {
      const result = cacheService.mget<string>([]);

      expect(result.size).toBe(0);
    });
  });

  describe('mset', () => {
    it('should set multiple values', () => {
      const entries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ];

      const success = cacheService.mset(entries);

      expect(success).toBe(true);
      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.get('key2')).toBe('value2');
      expect(cacheService.get('key3')).toBe('value3');
    });

    it('should handle custom TTL per entry', async () => {
      const entries = [
        { key: 'key1', value: 'value1', ttl: 1 },
        { key: 'key2', value: 'value2', ttl: 3 },
      ];

      cacheService.mset(entries);

      await wait(1500);

      expect(cacheService.get('key1')).toBeUndefined();
      expect(cacheService.get('key2')).toBe('value2');
    });

    it('should handle empty array', () => {
      const success = cacheService.mset([]);

      expect(success).toBe(true);
    });
  });

  describe('getTtl', () => {
    it('should return TTL for existing key', () => {
      cacheService.set('key', 'value', 10);

      const ttl = cacheService.getTtl('key');

      expect(ttl).toBeDefined();
      expect(typeof ttl).toBe('number');
    });

    it('should return undefined for non-existent key', () => {
      const ttl = cacheService.getTtl('nonExistent');

      expect(ttl).toBeUndefined();
    });
  });

  describe('keys', () => {
    it('should return all keys', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');

      const keys = cacheService.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array when cache is empty', () => {
      const keys = cacheService.keys();

      expect(keys).toHaveLength(0);
    });
  });

  describe('isActive', () => {
    it('should return true when cache is active', () => {
      expect(cacheService.isActive()).toBe(true);
    });

    it('should return true even with empty cache', () => {
      cacheService.clear();

      expect(cacheService.isActive()).toBe(true);
    });
  });
});
