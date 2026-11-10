/**
 * Data derived from Jira custom-field / issue-type mappings must not outlive a
 * mapping change (e.g. sprints cached while metadata discovery had failed).
 */
import { describe, expect, it, vi } from 'vitest';

const { jiraData, jiraDataMeta, iterationsCache, userStoriesCache, listeners } = vi.hoisted(() => ({
	jiraData: { projects: [{ id: 'p' }], users: [], iterations: [{ id: 'i' }], userStories: [{ id: 's' }], tasks: [{ id: 't' }], defects: [{ id: 'd' }], currentUser: undefined },
	jiraDataMeta: { iterations: 1, userStories: 1, defects: 1, tasks: 1, projects: 1 } as Record<string, number>,
	iterationsCache: { clear: vi.fn() },
	userStoriesCache: { clear: vi.fn() },
	listeners: [] as Array<() => void>
}));

vi.mock('../../extension.js', () => ({ jiraData, jiraDataMeta, stampJiraData: vi.fn() }));
vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: { getInstance: vi.fn(() => ({ logInfo: vi.fn(), logWarning: vi.fn(), logDebug: vi.fn(), handleError: vi.fn() })) }
}));
vi.mock('./utils', () => ({ validateJiraConfiguration: vi.fn(), clearUtilsCaches: vi.fn() }));
vi.mock('./jiraClient', () => ({ getJiraSettings: vi.fn(), jiraRequest: vi.fn(), searchIssues: vi.fn(), projectJql: vi.fn(), quoteJql: vi.fn() }));
vi.mock('./jiraCall', () => ({ setJiraBroadcaster: vi.fn(), callJira: vi.fn() }));
vi.mock('./CacheService', () => ({
	getIterationsCacheManager: () => iterationsCache,
	getUserStoriesCacheManager: () => userStoriesCache,
	getProjectsCacheManager: () => ({ clear: vi.fn() }),
	clearAllCaches: vi.fn()
}));
vi.mock('./jiraMetadata', () => ({
	JIRA_FIELDS: {},
	bugTypesJqlList: vi.fn(),
	isBugIssueType: vi.fn(),
	isSubtaskIssueType: vi.fn(),
	resetJiraMetadata: vi.fn(),
	storyPointsOf: vi.fn(),
	subtaskJql: vi.fn(),
	onJiraMetadataChanged: (listener: () => void) => {
		listeners.push(listener);
		return () => undefined;
	}
}));

describe('jiraServices and metadata changes', () => {
	it('clears sprint and work-item caches when the mappings change', async () => {
		await import('./jiraServices.js');
		expect(listeners).toHaveLength(1);

		listeners[0]();

		expect(iterationsCache.clear).toHaveBeenCalled();
		expect(userStoriesCache.clear).toHaveBeenCalled();
		expect(jiraData.iterations).toEqual([]);
		expect(jiraData.userStories).toEqual([]);
		expect(jiraData.defects).toEqual([]);
		expect(jiraData.tasks).toEqual([]);
		expect(jiraDataMeta.iterations).toBeUndefined();
		// Data that does not depend on the mappings is kept.
		expect(jiraData.projects).toEqual([{ id: 'p' }]);
		expect(jiraDataMeta.projects).toBe(1);
	});
});
