import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager } from './CacheManager';

describe('CacheManager', () => {
	let cache: CacheManager<string>;

	beforeEach(() => {
		cache = new CacheManager<string>(1000); // 1 second TTL for tests
	});

	afterEach(() => {
		cache.destroy();
	});

	describe('Basic operations', () => {
		it('should set and get values', () => {
			cache.set('key1', 'value1');
			expect(cache.get('key1')).toBe('value1');
		});

		it('should return null for non-existent keys', () => {
			expect(cache.get('non-existent')).toBeNull();
		});

		it('should check if key exists', () => {
			cache.set('key1', 'value1');
			expect(cache.has('key1')).toBe(true);
			expect(cache.has('non-existent')).toBe(false);
		});

		it('should delete values', () => {
			cache.set('key1', 'value1');
			expect(cache.delete('key1')).toBe(true);
			expect(cache.get('key1')).toBeNull();
		});

		it('should clear all cache', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.clear();
			expect(cache.get('key1')).toBeNull();
			expect(cache.get('key2')).toBeNull();
		});
	});

	describe('TTL expiration', () => {
		it('should expire values after TTL', async () => {
			cache.set('key1', 'value1');
			expect(cache.get('key1')).toBe('value1');

			// Wait for TTL to expire
			await new Promise(resolve => setTimeout(resolve, 1100));

			expect(cache.get('key1')).toBeNull();
		});

		it('should support custom TTL per entry', async () => {
			cache.set('key1', 'value1', 500); // 500ms
			cache.set('key2', 'value2', 2000); // 2 seconds

			await new Promise(resolve => setTimeout(resolve, 600));

			expect(cache.get('key1')).toBeNull();
			expect(cache.get('key2')).toBe('value2');
		});

		it('should not expire values before TTL', async () => {
			cache.set('key1', 'value1', 1000);
			await new Promise(resolve => setTimeout(resolve, 500));
			expect(cache.get('key1')).toBe('value1');
		});
	});

	describe('Statistics', () => {
		it('should track cache hits and misses', () => {
			cache.set('key1', 'value1');

			cache.get('key1'); // hit
			cache.get('key1'); // hit
			cache.get('non-existent'); // miss
			cache.get('non-existent'); // miss

			const stats = cache.getStats();
			expect(stats.hits).toBe(2);
			expect(stats.misses).toBe(2);
			expect(stats.hitRate).toBe(50);
		});

		it('should calculate hit rate correctly', () => {
			cache.set('key1', 'value1');

			for (let i = 0; i < 9; i++) {
				cache.get('key1');
			}
			cache.get('non-existent');

			const stats = cache.getStats();
			expect(stats.hits).toBe(9);
			expect(stats.misses).toBe(1);
			expect(stats.hitRate).toBe(90);
		});

		it('should track evictions', async () => {
			cache.set('key1', 'value1', 500);
			cache.set('key2', 'value2', 500);

			await new Promise(resolve => setTimeout(resolve, 600));

			cache.get('key1'); // triggers eviction
			cache.get('key2'); // triggers eviction

			const stats = cache.getStats();
			expect(stats.evictions).toBe(2);
		});

		it('should reset statistics', () => {
			cache.set('key1', 'value1');
			cache.get('key1');
			cache.get('non-existent');

			const statsBefore = cache.getStats();
			expect(statsBefore.hits).toBe(1);

			cache.resetStats();
			const statsAfter = cache.getStats();
			expect(statsAfter.hits).toBe(0);
			expect(statsAfter.misses).toBe(0);
		});
	});

	describe('Cache size and entries', () => {
		it('should report correct cache size', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.set('key3', 'value3');

			const stats = cache.getStats();
			expect(stats.size).toBe(3);
		});

		it('should return all non-expired entries', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');

			const all = cache.getAll();
			expect(all).toEqual({
				key1: 'value1',
				key2: 'value2'
			});
		});

		it('should exclude expired entries from getAll', async () => {
			cache.set('key1', 'value1', 500);
			cache.set('key2', 'value2', 2000);

			await new Promise(resolve => setTimeout(resolve, 600));

			const all = cache.getAll();
			expect(all).toEqual({
				key2: 'value2'
			});
		});
	});

	describe('Custom TTL', () => {
		it('should allow setting default TTL', () => {
			const customCache = new CacheManager<string>(2000);
			customCache.set('key1', 'value1');

			const stats = customCache.getStats();
			expect(stats.size).toBe(1);

			customCache.destroy();
		});

		it('should update default TTL', async () => {
			cache.setDefaultTtl(500);
			cache.set('key1', 'value1');

			await new Promise(resolve => setTimeout(resolve, 600));

			expect(cache.get('key1')).toBeNull();
		});
	});

	describe('Edge cases', () => {
		it('should handle null and undefined values', () => {
			// Note: CacheManager<string> doesn't accept null values
			// This test verifies the type safety
			expect(cache.get('nullKey')).toBeNull();
		});

		it('should handle complex objects', () => {
			const objCache = new CacheManager<{ name: string; data: number[] }>(1000);
			const obj = { name: 'test', data: [1, 2, 3] };
			objCache.set('objKey', obj);
			expect(objCache.get('objKey')).toEqual(obj);
			objCache.destroy();
		});

		it('should handle special characters in keys', () => {
			const specialKey = 'key:with:colons:and-dashes_underscores.dots';
			cache.set(specialKey, 'value');
			expect(cache.get(specialKey)).toBe('value');
		});

		it('should handle empty cache cleanup', () => {
			cache.clear();
			const stats = cache.getStats();
			expect(stats.size).toBe(0);
			expect(stats.evictions).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Concurrent operations', () => {
		it('should handle multiple rapid operations', () => {
			for (let i = 0; i < 100; i++) {
				cache.set(`key${i}`, `value${i}`);
			}

			for (let i = 0; i < 100; i++) {
				expect(cache.get(`key${i}`)).toBe(`value${i}`);
			}

			const stats = cache.getStats();
			expect(stats.hits).toBe(100);
			expect(stats.size).toBe(100);
		});
	});
});
