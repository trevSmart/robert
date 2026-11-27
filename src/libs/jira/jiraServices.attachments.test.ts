/**
 * Issue attachments (fields.attachment) mapped to the shared Attachment shape.
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
vi.mock('../provider/projectScope', () => ({ getActiveProjects: vi.fn(() => []), projectScopeKey: vi.fn(() => 'scope[]') }));
vi.mock('./jiraClient', () => ({ getJiraSettings: vi.fn(() => ({ baseUrl: 'https://acme.atlassian.net', email: 'a@b.c', apiToken: 't', projectKeys: [] })), jiraRequest, searchIssues: vi.fn(), projectJql: vi.fn(), quoteJql: vi.fn() }));
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

import { getAttachments } from './jiraServices';

describe('getAttachments (Jira)', () => {
	beforeEach(() => {
		jiraRequest.mockReset();
		validateJiraConfiguration.mockResolvedValue({ isValid: true, errors: [] });
	});

	it('requests only the attachment field and maps each file, newest first', async () => {
		jiraRequest.mockResolvedValue({
			fields: {
				attachment: [
					{ id: 1, filename: 'old log.txt', size: 120, mimeType: 'text/plain', author: { displayName: 'Ada' }, created: '2026-01-01T10:00:00.000+0000', content: 'https://acme.atlassian.net/rest/api/3/attachment/content/1' },
					{ id: 2, filename: 'screen.png', size: 2048, mimeType: 'image/png', author: { displayName: 'Bob' }, created: '2026-02-01T10:00:00.000+0000', content: 'https://acme.atlassian.net/rest/api/3/attachment/content/2', thumbnail: 'https://acme.atlassian.net/rest/api/3/attachment/thumbnail/2' }
				]
			}
		});

		const result = await getAttachments('10042');

		expect(jiraRequest).toHaveBeenCalledWith('/rest/api/3/issue/10042?fields=attachment');
		expect(result.count).toBe(2);
		expect(result.attachments.map(a => a.fileName)).toEqual(['screen.png', 'old log.txt']);
		expect(result.attachments[0]).toEqual({
			objectId: '2',
			fileName: 'screen.png',
			size: 2048,
			mimeType: 'image/png',
			author: 'Bob',
			createdDate: '2026-02-01T10:00:00.000+0000',
			url: 'https://acme.atlassian.net/secure/attachment/2/screen.png',
			thumbnailUrl: 'https://acme.atlassian.net/rest/api/3/attachment/thumbnail/2'
		});
		expect(result.attachments[1].url).toBe('https://acme.atlassian.net/secure/attachment/1/old%20log.txt');
		expect(result.attachments[1].thumbnailUrl).toBeNull();
	});

	it('returns an empty list when the issue has no attachments', async () => {
		jiraRequest.mockResolvedValue({ fields: {} });
		await expect(getAttachments('10042')).resolves.toEqual({ attachments: [], count: 0 });
	});
});
