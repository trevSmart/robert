/**
 * Fields card (Jira): values of the issue's other fields, grouped by the view
 * screen's tabs when the account can read them, flat otherwise.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { jiraRequest, logInfo } = vi.hoisted(() => ({ jiraRequest: vi.fn(), logInfo: vi.fn() }));

vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: { getInstance: vi.fn(() => ({ logInfo, logWarning: vi.fn(), logDebug: vi.fn(), handleError: vi.fn() })) }
}));
vi.mock('./utils', () => ({ validateJiraConfiguration: vi.fn(async () => ({ isValid: true, errors: [] })) }));
vi.mock('./jiraClient', () => ({ getJiraSettings: vi.fn(() => ({ baseUrl: 'https://acme.atlassian.net' })), jiraRequest }));
vi.mock('./jiraCall', () => ({ callJira: (fn: () => Promise<unknown>) => fn() }));
vi.mock('./jiraMetadata', () => ({ JIRA_FIELDS: { sprint: 'customfield_10020', storyPoints: ['customfield_10016'], flagged: 'customfield_10021' } }));

import { clearIssueFieldsCache, formatIssueFieldValue, getIssueFields } from './jiraIssueFields';

const issue = {
	key: 'CCC-1289',
	fields: {
		summary: 'Automatització facturació',
		status: { name: 'To Do' },
		project: { id: '10000', key: 'CCC' },
		issuetype: { id: '10001', name: 'Story' },
		labels: ['billing', 'konecta'],
		customfield_10016: 8,
		customfield_10100: { value: '3XL (entre 161 y 480h)', id: '1' },
		customfield_10101: null,
		customfield_10102: { type: 'doc', version: 1, content: [] },
		customfield_10103: '2026-11-25',
		customfield_10104: { value: 'Cataluña', child: { value: 'Barcelona' } },
		customfield_10105: [{ displayName: 'Ada' }, { displayName: 'Grace' }],
		customfield_10106: 1200
	},
	renderedFields: { customfield_10102: '<p>Notes <b>here</b></p>', customfield_10103: '25/Nov/26' },
	names: {
		labels: 'Labels',
		customfield_10100: 'Talla',
		customfield_10101: 'Tipo de Inversion',
		customfield_10102: 'Comentarios',
		customfield_10103: 'Fecha compromiso',
		customfield_10104: 'Ubicación',
		customfield_10105: 'Responsables',
		customfield_10106: 'Valoración Económica €'
	},
	schema: { customfield_10103: { type: 'date' } },
	// Edit screen order; customfield_10106 is read-only (not on the edit screen).
	editmeta: { fields: { summary: {}, customfield_10104: {}, customfield_10100: {}, labels: {}, customfield_10101: {}, customfield_10102: {}, customfield_10103: {}, customfield_10105: {} } }
};

function routeRequests(screenConfig: 'admin' | 'denied'): void {
	jiraRequest.mockImplementation(async (path: string) => {
		if (path.startsWith('/rest/api/3/issue/')) {
			return issue;
		}
		if (screenConfig === 'denied') {
			throw new Error('Jira API returned 403: Forbidden');
		}
		if (path.startsWith('/rest/api/3/issuetypescreenscheme/project')) {
			return { isLast: true, values: [{ issueTypeScreenScheme: { id: '500' }, projectIds: ['10000'] }] };
		}
		if (path.startsWith('/rest/api/3/issuetypescreenscheme/mapping')) {
			return {
				isLast: true,
				values: [
					{ issueTypeId: 'default', screenSchemeId: '1' },
					{ issueTypeId: '10001', screenSchemeId: '2' }
				]
			};
		}
		if (path.startsWith('/rest/api/3/screenscheme')) {
			expect(path).toContain('id=2');
			return { isLast: true, values: [{ id: 2, screens: { default: 30, view: 31 } }] };
		}
		if (path.startsWith('/rest/api/3/screens/31/tabs/')) {
			return path.includes('/tabs/1/') ? [{ id: 'summary' }, { id: 'labels' }, { id: 'customfield_10104' }] : [{ id: 'customfield_10106' }, { id: 'customfield_10101' }, { id: 'customfield_10100' }];
		}
		if (path.startsWith('/rest/api/3/screens/31/tabs')) {
			return [
				{ id: 1, name: 'Principal' },
				{ id: 2, name: 'Esfuerzo Desarrollo' }
			];
		}
		throw new Error(`Unexpected request ${path}`);
	});
}

beforeEach(() => {
	jiraRequest.mockReset();
	logInfo.mockReset();
	clearIssueFieldsCache();
});

describe('getIssueFields (Jira)', () => {
	it('lists non-empty fields in edit screen order, then read-only custom fields, when screen tabs are not readable', async () => {
		routeRequests('denied');
		const result = await getIssueFields('10500');

		expect(result.groupedByScreen).toBe(false);
		expect(result.tabs).toHaveLength(1);
		expect(result.tabs[0].name).toBeNull();
		expect(result.tabs[0].fields.map(field => [field.name, field.text])).toEqual([
			['Ubicación', 'Cataluña / Barcelona'],
			['Talla', '3XL (entre 161 y 480h)'],
			['Labels', 'billing, konecta'],
			['Comentarios', ''],
			['Fecha compromiso', '25/Nov/26'],
			['Responsables', 'Ada, Grace'],
			['Valoración Económica €', '1200']
		]);
		expect(result.tabs[0].fields.find(field => field.name === 'Comentarios')?.html).toBe('<p>Notes <b>here</b></p>');
		expect(jiraRequest.mock.calls[0][0]).toBe('/rest/api/3/issue/10500?fields=*all&expand=names,schema,editmeta,renderedFields');
	});

	it('does not ask for the screen configuration again after a 403 on the same site', async () => {
		routeRequests('denied');
		await getIssueFields('10500');
		jiraRequest.mockClear();
		await getIssueFields('10500');

		expect(jiraRequest).toHaveBeenCalledTimes(1);
	});

	it("groups fields by the issue type's view screen tabs, with the rest under Other", async () => {
		routeRequests('admin');
		const result = await getIssueFields('10500');

		expect(result.groupedByScreen).toBe(true);
		expect(result.tabs.map(tab => [tab.name, tab.fields.map(field => field.name)])).toEqual([
			['Principal', ['Labels', 'Ubicación']],
			['Esfuerzo Desarrollo', ['Valoración Económica €', 'Talla']],
			['Other', ['Comentarios', 'Fecha compromiso', 'Responsables']]
		]);
	});

	it('reuses the screen layout of the same project and issue type', async () => {
		routeRequests('admin');
		await getIssueFields('10500');
		jiraRequest.mockClear();
		await getIssueFields('10501');

		expect(jiraRequest).toHaveBeenCalledTimes(1);
	});
});

describe('formatIssueFieldValue', () => {
	it('skips empty and unrepresentable values', () => {
		expect(formatIssueFieldValue(null, null)).toBeNull();
		expect(formatIssueFieldValue([], null)).toBeNull();
		expect(formatIssueFieldValue({ self: 'https://x' }, null)).toBeNull();
		expect(formatIssueFieldValue({ type: 'doc', content: [] }, null)).toBeNull();
	});

	it('formats booleans and time tracking', () => {
		expect(formatIssueFieldValue(true, null)).toEqual({ text: 'Yes' });
		expect(formatIssueFieldValue({ originalEstimate: '2d', remainingEstimate: '1d' }, null)).toEqual({ text: 'Original 2d · Remaining 1d' });
	});
});
