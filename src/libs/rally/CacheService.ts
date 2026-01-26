/**
 * CacheService - Centralized cache management for Rally data
 * Manages cache managers globally to ensure cache persists across webview navigation
 *
 * This service creates and manages cache instances with TTL to ensure:
 * 1. Cache persists when navigating away from Portfolio and returning
 * 2. Cache is cleared when explicitly requested (reload, logout, etc.)
 * 3. Cache respects TTL to avoid stale data
 */

import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../../ErrorHandler';
import type { RallyUserStory, RallyProject, RallyIteration } from '../../types/rally';

const errorHandler = ErrorHandler.getInstance();

// Cache managers with 30 minute TTL (increased from 5 minutes to persist across navigation)
let userStoriesCacheManager: CacheManager<RallyUserStory[]> | null = null;
let projectsCacheManager: CacheManager<RallyProject[]> | null = null;
let iterationsCacheManager: CacheManager<RallyIteration[]> | null = null;
let teamMembersCacheManager: CacheManager<string[]> | null = null;

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes - persists through Portfolio navigation

/**
 * Get or initialize the user stories cache manager
 */
export function getUserStoriesCacheManager(): CacheManager<RallyUserStory[]> {
	if (!userStoriesCacheManager) {
		userStoriesCacheManager = new CacheManager<RallyUserStory[]>(CACHE_TTL_MS);
		errorHandler.logDebug('User stories cache manager initialized', 'CacheService.getUserStoriesCacheManager');
	}
	return userStoriesCacheManager;
}

/**
 * Get or initialize the projects cache manager
 */
export function getProjectsCacheManager(): CacheManager<RallyProject[]> {
	if (!projectsCacheManager) {
		projectsCacheManager = new CacheManager<RallyProject[]>(CACHE_TTL_MS);
		errorHandler.logDebug('Projects cache manager initialized', 'CacheService.getProjectsCacheManager');
	}
	return projectsCacheManager;
}

/**
 * Get or initialize the iterations cache manager
 */
export function getIterationsCacheManager(): CacheManager<RallyIteration[]> {
	if (!iterationsCacheManager) {
		iterationsCacheManager = new CacheManager<RallyIteration[]>(CACHE_TTL_MS);
		errorHandler.logDebug('Iterations cache manager initialized', 'CacheService.getIterationsCacheManager');
	}
	return iterationsCacheManager;
}

/**
 * Get or initialize the team members cache manager
 */
export function getTeamMembersCacheManager(): CacheManager<string[]> {
	if (!teamMembersCacheManager) {
		teamMembersCacheManager = new CacheManager<string[]>(CACHE_TTL_MS);
		errorHandler.logDebug('Team members cache manager initialized', 'CacheService.getTeamMembersCacheManager');
	}
	return teamMembersCacheManager;
}

/**
 * Clear all cache managers
 * Used when extension needs to reload/reset all data
 */
export function clearAllCaches(): void {
	try {
		if (userStoriesCacheManager) {
			userStoriesCacheManager.clear();
		}
		if (projectsCacheManager) {
			projectsCacheManager.clear();
		}
		if (iterationsCacheManager) {
			iterationsCacheManager.clear();
		}
		if (teamMembersCacheManager) {
			teamMembersCacheManager.clear();
		}
		errorHandler.logInfo('All cache managers cleared', 'CacheService.clearAllCaches');
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'CacheService.clearAllCaches');
	}
}

/**
 * Destroy all cache managers and release resources
 * Used during extension deactivation
 */
export function destroyAllCaches(): void {
	try {
		if (userStoriesCacheManager) {
			userStoriesCacheManager.destroy();
			userStoriesCacheManager = null;
		}
		if (projectsCacheManager) {
			projectsCacheManager.destroy();
			projectsCacheManager = null;
		}
		if (iterationsCacheManager) {
			iterationsCacheManager.destroy();
			iterationsCacheManager = null;
		}
		if (teamMembersCacheManager) {
			teamMembersCacheManager.destroy();
			teamMembersCacheManager = null;
		}
		errorHandler.logInfo('All cache managers destroyed', 'CacheService.destroyAllCaches');
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'CacheService.destroyAllCaches');
	}
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats() {
	return {
		userStories: userStoriesCacheManager?.getStats() ?? { hits: 0, misses: 0, evictions: 0, size: 0, hitRate: 0 },
		projects: projectsCacheManager?.getStats() ?? { hits: 0, misses: 0, evictions: 0, size: 0, hitRate: 0 },
		iterations: iterationsCacheManager?.getStats() ?? { hits: 0, misses: 0, evictions: 0, size: 0, hitRate: 0 },
		teamMembers: teamMembersCacheManager?.getStats() ?? { hits: 0, misses: 0, evictions: 0, size: 0, hitRate: 0 }
	};
}
