import { describe, it, expect, beforeEach, vi } from 'vitest';

// The Rally backend transitively pulls in ErrorHandler -> OutputChannelManager, so the
// output-channel surface has to exist on the mock even though this suite never logs.
// Defined inside the factory because vi.mock is hoisted above module-level consts.
vi.mock('vscode', () => {
	const outputChannel = { appendLine: vi.fn(), append: vi.fn(), show: vi.fn(), hide: vi.fn(), clear: vi.fn(), dispose: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() };
	return {
		default: {},
		workspace: { getConfiguration: () => ({ get: () => undefined }) },
		window: { createOutputChannel: () => outputChannel, showErrorMessage: vi.fn(), showWarningMessage: vi.fn() },
		commands: {},
		Uri: {}
	};
});

// The factory only needs the `backend` setting; everything else is irrelevant here.
const currentSettings: Record<string, unknown> = { backend: 'rally', rallyInstance: 'https://rally1.rallydev.com', jiraInstance: 'https://site.atlassian.net' };

vi.mock('../../SettingsManager', () => ({
	SettingsManager: {
		getInstance: () => ({ getSetting: (key: string) => currentSettings[key] })
	}
}));

import { getBackend, resetBackend } from './index';

describe('getBackend', () => {
	beforeEach(() => {
		currentSettings.backend = 'rally';
		resetBackend();
	});

	it('returns the Rally backend by default', () => {
		expect(getBackend().kind).toBe('rally');
		expect(getBackend().displayName).toBe('Rally');
	});

	it('returns the Jira backend when configured', () => {
		currentSettings.backend = 'jira';
		resetBackend();

		expect(getBackend().kind).toBe('jira');
		expect(getBackend().displayName).toBe('Jira');
	});

	it('memoizes the instance while the setting is unchanged', () => {
		expect(getBackend()).toBe(getBackend());
	});

	it('swaps implementation when the setting changes, without an explicit reset', () => {
		expect(getBackend().kind).toBe('rally');

		currentSettings.backend = 'jira';
		expect(getBackend().kind).toBe('jira');

		currentSettings.backend = 'rally';
		expect(getBackend().kind).toBe('rally');
	});

	it('builds backend-appropriate deep links for the same artifact', () => {
		const rallyUrl = getBackend().buildOpenInUrl('userstory', '12345');
		expect(rallyUrl).toBe('https://rally1.rallydev.com/#/detail/userstory/12345');

		currentSettings.backend = 'jira';
		const jiraUrl = getBackend().buildOpenInUrl('userstory', 'ROB-1');
		expect(jiraUrl).toBe('https://site.atlassian.net/browse/ROB-1');
	});

	it('returns null for a deep link when the instance is not configured', () => {
		currentSettings.backend = 'jira';
		currentSettings.jiraInstance = '';

		expect(getBackend().buildOpenInUrl('userstory', 'ROB-1')).toBeNull();

		currentSettings.jiraInstance = 'https://site.atlassian.net';
	});

	it('exposes the whole IBackend surface on both implementations', () => {
		const methods = [
			'validateConfiguration',
			'buildOpenInUrl',
			'getProjects',
			'getCurrentUser',
			'getUsers',
			'getIterations',
			'getUserStories',
			'getTasks',
			'getDefects',
			'getUserStoryTests',
			'getUserStoryDefects',
			'getUserStoryDiscussions',
			'getUserStoryByObjectId',
			'getDefectByObjectId',
			'getTaskWithParent',
			'getTestCaseWithParent',
			'getUserStoryRevisionsCount',
			'getUserStoryRevisions',
			'globalSearch',
			'getRecentTeamMembers',
			'getUserSprintProgress',
			'getAllTeamMembersProgress',
			'getMemberHoursHistory',
			'fetchImageAsBase64',
			'clearAllCaches',
			'extractIterationId',
			'checkCacheForFilteredResults'
		] as const;

		for (const kind of ['rally', 'jira'] as const) {
			currentSettings.backend = kind;
			resetBackend();
			const backend = getBackend() as unknown as Record<string, unknown>;

			for (const method of methods) {
				expect(typeof backend[method], `${kind}.${method}`).toBe('function');
			}
		}
	});
});
