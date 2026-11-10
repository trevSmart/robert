import { beforeEach, describe, expect, it, vi } from 'vitest';

const { jiraRequest, bugSetting } = vi.hoisted(() => ({
	jiraRequest: vi.fn(),
	bugSetting: { value: '' }
}));

vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: {
		getInstance: vi.fn(() => ({ logInfo: vi.fn(), logWarning: vi.fn(), logDebug: vi.fn(), handleError: vi.fn() }))
	}
}));
vi.mock('../../SettingsManager', () => ({
	SettingsManager: { getInstance: vi.fn(() => ({ getSetting: vi.fn(() => bugSetting.value) })) }
}));
vi.mock('./jiraClient', () => ({
	jiraRequest,
	getJiraSettings: vi.fn(() => ({ baseUrl: 'https://tenant.atlassian.net', email: 'a@b.c', apiToken: 't', projectKey: '' })),
	validateJiraSettings: vi.fn(() => ({ isValid: true, errors: [] })),
	quoteJql: (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}));

import { JIRA_FIELDS, JIRA_ISSUE_TYPES, bugTypesJqlList, ensureJiraMetadata, isBugIssueType, isSubtaskIssueType, parseIssueTypeNames, resetJiraMetadata, resolveFieldIds, resolveIssueTypes, storyPointsOf, subtaskJql } from './jiraMetadata';
import { getJiraSettings } from './jiraClient';

const SITE_FIELDS = [
	{ id: 'summary', name: 'Summary', custom: false, schema: { type: 'string' } },
	{ id: 'customfield_20001', name: 'Sprint', custom: true, schema: { type: 'array', custom: 'com.pyxis.greenhopper.jira:gh-sprint' } },
	{ id: 'customfield_20002', name: 'Story point estimate', custom: true, schema: { type: 'number', custom: 'com.pyxis.greenhopper.jira:jsw-story-points' } },
	{ id: 'customfield_20003', name: 'Story Points', custom: true, schema: { type: 'number', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:float' } },
	{ id: 'customfield_20004', name: 'Flagged', custom: true, schema: { type: 'array', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes' } },
	{ id: 'customfield_20005', name: 'Team', custom: true, schema: { type: 'team', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:atlassian-team' } }
];

const SITE_TYPES = [
	{ id: '10001', name: 'Story', subtask: false },
	{ id: '10002', name: 'Sub-task', subtask: true },
	{ id: '10003', name: 'Bug', subtask: false },
	{ id: '10004', name: 'Incidencias', untranslatedName: 'Incidencias', subtask: false },
	{ id: '10005', name: 'Error de producción', untranslatedName: 'Production bug', subtask: false }
];

beforeEach(() => {
	resetJiraMetadata();
	jiraRequest.mockReset();
	bugSetting.value = '';
});

describe('resolveFieldIds', () => {
	it('discovers custom fields by schema type and name', () => {
		expect(resolveFieldIds(SITE_FIELDS)).toEqual({
			sprint: 'customfield_20001',
			storyPoints: ['customfield_20002', 'customfield_20003'],
			epicLink: 'customfield_10014',
			flagged: 'customfield_20004',
			team: 'customfield_20005'
		});
	});

	it('keeps the defaults for fields the site does not have', () => {
		expect(resolveFieldIds([])).toEqual({
			sprint: 'customfield_10020',
			storyPoints: ['customfield_10016'],
			epicLink: 'customfield_10014',
			flagged: 'customfield_10021',
			team: 'customfield_10001'
		});
	});
});

describe('resolveIssueTypes', () => {
	it('uses the subtask flag and well-known bug names (localized or untranslated)', () => {
		const types = resolveIssueTypes(SITE_TYPES);
		expect(types.subtaskIds).toEqual(['10002']);
		expect(types.bugIds).toEqual(['10003', '10004']);
		expect(types.discovered).toBe(true);
	});

	it('uses the configured bug type names instead of the built-in list', () => {
		const types = resolveIssueTypes(SITE_TYPES, parseIssueTypeNames(' Production bug , Error de producción '));
		expect(types.bugIds).toEqual(['10005']);
	});
});

describe('JQL and matching helpers', () => {
	it('matches sub-tasks with the locale-independent built-in JQL function', () => {
		expect(subtaskJql(true)).toBe('issuetype in subTaskIssueTypes()');
		expect(subtaskJql(false)).toBe('issuetype not in subTaskIssueTypes()');
	});

	it('lists bug types by id once discovered, by name before, and null when there are none', () => {
		expect(bugTypesJqlList()).toBe('("Incidencias")');
		expect(bugTypesJqlList(resolveIssueTypes(SITE_TYPES))).toBe('(10003, 10004)');
		expect(bugTypesJqlList(resolveIssueTypes([{ id: '1', name: 'Story' }]))).toBeNull();
	});

	it('classifies issue types', () => {
		const types = resolveIssueTypes(SITE_TYPES);
		expect(isSubtaskIssueType({ id: '10002', name: 'Sub-task', subtask: true }, types)).toBe(true);
		expect(isSubtaskIssueType({ id: '10001', name: 'Story' }, types)).toBe(false);
		expect(isBugIssueType({ id: '10003', name: 'Bug' }, types)).toBe(true);
		expect(isBugIssueType({ id: '10001', name: 'Story' }, types)).toBe(false);
		// Before discovery: fall back to the original names.
		expect(isSubtaskIssueType({ name: 'Subtarea' })).toBe(true);
		expect(isBugIssueType({ name: 'Incidencias' })).toBe(true);
	});

	it('reads story points from the first candidate field with a value', () => {
		const ids = resolveFieldIds(SITE_FIELDS);
		expect(storyPointsOf({ customfield_20003: 5 }, ids)).toBe(5);
		expect(storyPointsOf({ customfield_20002: 3, customfield_20003: 5 }, ids)).toBe(3);
		expect(storyPointsOf({}, ids)).toBe(0);
	});
});

describe('ensureJiraMetadata', () => {
	const answer = (path: string) => (path === '/rest/api/3/field' ? SITE_FIELDS : SITE_TYPES);

	it('loads the metadata once per site and updates the live mappings', async () => {
		jiraRequest.mockImplementation(async (path: string) => answer(path));
		await ensureJiraMetadata();
		await ensureJiraMetadata();

		expect(jiraRequest).toHaveBeenCalledTimes(2);
		expect(JIRA_FIELDS.sprint).toBe('customfield_20001');
		expect(JIRA_FIELDS.storyPoints).toEqual(['customfield_20002', 'customfield_20003']);
		expect(JIRA_ISSUE_TYPES.bugIds).toEqual(['10003', '10004']);
	});

	it('reloads when the bug-type setting changes', async () => {
		jiraRequest.mockImplementation(async (path: string) => answer(path));
		await ensureJiraMetadata();
		bugSetting.value = 'Production bug';
		await ensureJiraMetadata();

		expect(jiraRequest).toHaveBeenCalledTimes(4);
		expect(JIRA_ISSUE_TYPES.bugIds).toEqual(['10005']);
	});

	it('keeps the defaults when loading fails, and retries on the next call', async () => {
		jiraRequest.mockRejectedValueOnce(new Error('403'));
		await expect(ensureJiraMetadata()).resolves.toBeUndefined();
		expect(JIRA_FIELDS.sprint).toBe('customfield_10020');

		jiraRequest.mockImplementation(async (path: string) => answer(path));
		await ensureJiraMetadata();
		expect(JIRA_FIELDS.sprint).toBe('customfield_20001');
	});
});

describe('ensureJiraMetadata with overlapping loads', () => {
	type Deferred = { resolve: (value: unknown) => void };
	const pendingBySite = new Map<string, Deferred[]>();

	/** Requests for each site stay pending until the test resolves them. */
	function deferRequestsPerSite(site: { current: string }) {
		jiraRequest.mockImplementation(
			(path: string) =>
				new Promise(resolve => {
					// Capture the site at request time: each load answers with its own site's fields.
					const requestedFor = site.current;
					const list = pendingBySite.get(requestedFor) ?? [];
					list.push({ resolve: () => resolve(path === '/rest/api/3/field' ? fieldsFor(requestedFor) : SITE_TYPES) });
					pendingBySite.set(requestedFor, list);
				})
		);
	}
	const fieldsFor = (siteName: string) => [{ id: `customfield_sprint_${siteName}`, name: 'Sprint', custom: true, schema: { type: 'array', custom: 'com.pyxis.greenhopper.jira:gh-sprint' } }];
	const settle = (siteName: string) => pendingBySite.get(siteName)?.forEach(request => request.resolve(undefined));

	beforeEach(() => pendingBySite.clear());

	it('does not let an older load for another site overwrite the newer one', async () => {
		const site = { current: 'a' };
		vi.mocked(getJiraSettings).mockImplementation(() => ({ baseUrl: `https://${site.current}.atlassian.net`, email: 'a@b.c', apiToken: 't', projectKey: '' }));
		deferRequestsPerSite(site);

		const loadA = ensureJiraMetadata();
		site.current = 'b';
		const loadB = ensureJiraMetadata();

		settle('b');
		await loadB;
		settle('a');
		await loadA;

		expect(JIRA_FIELDS.sprint).toBe('customfield_sprint_b');
		// Site B stays cached: no new requests.
		jiraRequest.mockClear();
		await ensureJiraMetadata();
		expect(jiraRequest).not.toHaveBeenCalled();
	});

	it('does not publish a load that finishes after a reset', async () => {
		const site = { current: 'a' };
		vi.mocked(getJiraSettings).mockImplementation(() => ({ baseUrl: `https://${site.current}.atlassian.net`, email: 'a@b.c', apiToken: 't', projectKey: '' }));
		deferRequestsPerSite(site);

		const load = ensureJiraMetadata();
		resetJiraMetadata();
		settle('a');
		await load;

		expect(JIRA_FIELDS.sprint).toBe('customfield_10020');
	});
});
