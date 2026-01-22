/**
 * CacheManager - Manages cached data with TTL (Time To Live) and automatic invalidation
 */

import { OutputChannelManager } from '../../utils/OutputChannelManager';

const outputManager = OutputChannelManager.getInstance();

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number; // in milliseconds
}

export interface CacheStats {
	hits: number;
	misses: number;
	evictions: number;
}

export class CacheManager<T> {
	private cache: Map<string, CacheEntry<T>> = new Map();
	private stats: CacheStats = {
		hits: 0,
		misses: 0,
		evictions: 0
	};
	private defaultTtl: number;
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor(defaultTtlMs: number = 5 * 60 * 1000) {
		// Default 5 minutes
		this.defaultTtl = defaultTtlMs;
		this.startCleanupInterval();
	}

	/**
	 * Get value from cache if it exists and hasn't expired
	 */
	get(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			this.stats.misses++;
			return null;
		}

		const now = Date.now();
		const age = now - entry.timestamp;

		// Check if entry has expired
		if (age > entry.ttl) {
			this.cache.delete(key);
			this.stats.evictions++;
			this.stats.misses++;
			return null;
		}

		this.stats.hits++;
		return entry.data;
	}

	/**
	 * Set value in cache with optional custom TTL
	 */
	set(key: string, value: T, ttlMs?: number): void {
		this.cache.set(key, {
			data: value,
			timestamp: Date.now(),
			ttl: ttlMs ?? this.defaultTtl
		});
	}

	/**
	 * Check if key exists and hasn't expired
	 */
	has(key: string): boolean {
		const entry = this.cache.get(key);

		if (!entry) {
			return false;
		}

		const now = Date.now();
		const age = now - entry.timestamp;

		if (age > entry.ttl) {
			this.cache.delete(key);
			this.stats.evictions++;
			return false;
		}

		return true;
	}

	/**
	 * Delete a specific cache entry
	 */
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		const size = this.cache.size;
		this.cache.clear();
		this.stats.evictions += size;
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats & { size: number; hitRate: number } {
		const total = this.stats.hits + this.stats.misses;
		const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

		return {
			...this.stats,
			size: this.cache.size,
			hitRate: Number(hitRate.toFixed(2))
		};
	}

	/**
	 * Reset statistics
	 */
	resetStats(): void {
		this.stats = {
			hits: 0,
			misses: 0,
			evictions: 0
		};
	}

	/**
	 * Get all cache entries (for debugging)
	 */
	getAll(): Record<string, T> {
		const result: Record<string, T> = {};

		this.cache.forEach((entry, key) => {
			const now = Date.now();
			const age = now - entry.timestamp;

			// Only include non-expired entries
			if (age <= entry.ttl) {
				result[key] = entry.data;
			}
		});

		return result;
	}

	/**
	 * Start periodic cleanup of expired entries
	 */
	private startCleanupInterval(): void {
		// Run cleanup every 1 minute
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 60 * 1000);

		// Prevent process from exiting due to this interval
		if (this.cleanupInterval.unref) {
			this.cleanupInterval.unref();
		}
	}

	/**
	 * Clean up expired entries from cache
	 */
	private cleanup(): void {
		const now = Date.now();
		let evicted = 0;

		this.cache.forEach((entry, key) => {
			const age = now - entry.timestamp;
			if (age > entry.ttl) {
				this.cache.delete(key);
				evicted++;
			}
		});

		if (evicted > 0) {
			this.stats.evictions += evicted;
		}
	}

	/**
	 * Destroy the cache manager and stop cleanup interval
	 */
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.clear();
	}

	/**
	 * Set custom TTL for this cache manager
	 */
	setDefaultTtl(ttlMs: number): void {
		this.defaultTtl = ttlMs;
	}
}
