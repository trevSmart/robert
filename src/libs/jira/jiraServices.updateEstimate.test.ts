/**
 * Editing a story's estimated hours (Jira original estimate).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { jiraData, jiraDataMeta, iterationsCache, jiraRequest, validateJiraConfiguration } = vi.hoisted(() => ({
	jiraData: { projects: [], users: [], iterations: [], userStories: [] as any[], tasks: [], defects: [], currentUser: undefined },
	jiraDataMeta: {} as Record<string, number>,
	iterationsCache: { clear: vi.fn() },
	jiraRequest: vi.fn(),
	validateJiraConfiguration: vi.fn()
}));

vi.mock('../../extension.js', () => ({ jiraData, jiraDataMeta, stampJiraData: vi.fn() }));
vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: { getInstance: vi.fn(() => ({ logInfo: vi.fn(), logWarning: vi.fn(), logDebug: vi.fn(), handleError: vi.fn() })) }
}));
vi.mock('./utils', () => ({ validateJiraConfiguration, clearUtilsCaches: vi.fn() }));
vi.mock('./jiraClient', () => ({ getJiraSettings: vi.fn(), jiraRequest, searchIssues: vi.fn(), projectJql: vi.fn(), quoteJql: vi.fn() }));
vi.mock('./jiraCall', () => ({ setJiraBroadcaster: vi.fn(), callJira: (fn: () => Promise<unknown>) => fn() }));
vi.mock('./CacheService', () => ({
	getIterationsCacheManager: () => iterationsCache,
	getUserStoriesCacheManager: () => ({ clear: vi.fn() }),
	getProjectsCacheManager: () => ({ clear: vi.fn() }),
	clearAllCaches: vi.fn()
}));
vi.mock('./jiraMetadata', () => ({
	JIRA_FIELDS: { sprint: 'customfield_10020', storyPoints: ['customfield_10016'], flagged: 'customfield_10021' },
	bugTypesJqlList: vi.fn(),
	isBugIssueType: vi.fn(),
	isSubtaskIssueType: vi.fn(),
	resetJiraMetadata: vi.fn(),
	storyPointsOf: vi.fn(() => 0),
	subtaskJql: vi.fn(),
	onJiraMetadataChanged: vi.fn()
}));

import { hoursToJiraDuration, updateUserStoryEstimatedHours } from './jiraServices';

function issue(timeoriginalestimate: number | null, aggregatetimeoriginalestimate: number | null) {
	return {
		id: '10042',
		key: 'DSS-42',
		fields: {
			summary: 'Story',
			status: { name: 'To Do', statusCategory: { key: 'new' } },
			project: { key: 'DSS' },
			subtasks: [],
			timeoriginalestimate,
			aggregatetimeoriginalestimate
		}
	};
}

describe('hoursToJiraDuration', () => {
	it.each([
		[8, '480m'],
		[1.5, '90m'],
		[0.25, '15m'],
		[0, '0m'],
		[1.333, '80m']
	])('converts %d h to %s', (value, expected) => {
		expect(hoursToJiraDuration(value)).toBe(expected);
	});

	it.each([-1, Number.NaN, 5000])('rejects %d', value => {
		expect(() => hoursToJiraDuration(value)).toThrow();
	});
});

describe('updateUserStoryEstimatedHours', () => {
	beforeEach(() => {
		jiraRequest.mockReset();
		iterationsCache.clear.mockReset();
		validateJiraConfiguration.mockResolvedValue({ isValid: true, errors: [] });
		jiraData.userStories = [{ objectId: '10042', estimatedHours: 2 }];
		jiraDataMeta.iterations = Date.now();
	});

	it('edits only the original estimate and returns the reloaded story', async () => {
		jiraRequest.mockResolvedValueOnce(undefined).mockResolvedValueOnce(issue(5 * 3600, 8 * 3600));

		const { userStory } = await updateUserStoryEstimatedHours('10042', 5);

		expect(jiraRequest).toHaveBeenNthCalledWith(1, '/rest/api/3/issue/10042', {
			method: 'PUT',
			body: { update: { timetracking: [{ edit: { originalEstimate: '300m' } }] } }
		});
		expect(jiraRequest.mock.calls[1][0]).toMatch(/^\/rest\/api\/3\/issue\/10042\?fields=.*\btimeoriginalestimate\b/);
		expect(userStory).toMatchObject({ objectId: '10042', formattedId: 'DSS-42', estimatedHours: 5, taskEstimateTotal: 8 });
	});

	it('refreshes the cached story and drops the sprint totals', async () => {
		jiraRequest.mockResolvedValueOnce(undefined).mockResolvedValueOnce(issue(5 * 3600, 5 * 3600));

		await updateUserStoryEstimatedHours('10042', 5);

		expect(jiraData.userStories).toHaveLength(1);
		expect(jiraData.userStories[0].estimatedHours).toBe(5);
		expect(iterationsCache.clear).toHaveBeenCalled();
		expect(jiraDataMeta.iterations).toBeUndefined();
	});

	it('maps a story without an original estimate to null', async () => {
		jiraRequest.mockResolvedValueOnce(undefined).mockResolvedValueOnce(issue(null, null));

		const { userStory } = await updateUserStoryEstimatedHours('10042', 0);

		expect(userStory?.estimatedHours).toBeNull();
	});

	it('does not call Jira with an invalid value', async () => {
		await expect(updateUserStoryEstimatedHours('10042', -3)).rejects.toThrow('cannot be negative');
		expect(jiraRequest).not.toHaveBeenCalled();
	});

	it('propagates Jira errors (e.g. time tracking disabled or no permission)', async () => {
		jiraRequest.mockRejectedValueOnce(new Error('Jira API returned 400: Bad Request {"errors":{"timetracking":"Field \'timetracking\' cannot be set."}}'));

		await expect(updateUserStoryEstimatedHours('10042', 4)).rejects.toThrow('timetracking');
		expect(iterationsCache.clear).not.toHaveBeenCalled();
	});
});
