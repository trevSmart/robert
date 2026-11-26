/**
 * Fields card (Rally): every field of the artifact the workspace does not hide, in «Custom» and
 * «Standard» tabs, with the display names from the TypeDefinition.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callRally, logWarning } = vi.hoisted(() => ({ callRally: vi.fn(), logWarning: vi.fn() }));

vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: { getInstance: vi.fn(() => ({ logInfo: vi.fn(), logWarning, logDebug: vi.fn(), handleError: vi.fn() })) }
}));
vi.mock('./utils', () => ({
	validateRallyConfiguration: vi.fn(async () => ({ isValid: true, errors: [] })),
	getRallyApi: vi.fn(() => ({})),
	queryUtils: { where: (field: string, operator: string, value: unknown) => `(${field} ${operator} ${value})` }
}));
vi.mock('./rallyCall', () => ({ callRally }));

import { buildRallyIssueFields, clearRallyIssueFieldsCache, formatRallyFieldValue, getIssueFields, type RallyAttribute } from './rallyIssueFields';

const story = {
	_ref: 'https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/123',
	_type: 'HierarchicalRequirement',
	ObjectID: 123,
	FormattedID: 'US123',
	Name: 'Billing',
	Description: '<p>Shown elsewhere</p>',
	Workspace: { _ref: '/workspace/9', _refObjectName: 'Acme' },
	ScheduleState: 'Defined',
	c_Talla: 'XL',
	c_Notes: '<p>Check <b>this</b></p>',
	c_Secret: 'hidden by the workspace',
	c_Empty: '',
	Release: { _ref: '/release/5', _refObjectName: 'R1' },
	Ready: false,
	CreationDate: '2026-11-20T09:30:00.000Z',
	Tags: { _ref: '/tags', Count: 2, _tagsNameArray: [{ Name: 'billing' }, { Name: 'q4' }] },
	Milestones: { _ref: '/milestones', Count: 0 },
	Children: { _ref: '/children', Count: 3 },
	Photo: 'binary'
};

const attributes: RallyAttribute[] = [
	{ elementName: 'c_Talla', name: 'Talla', attributeType: 'STRING', custom: true, hidden: false },
	{ elementName: 'c_Notes', name: 'Release notes', attributeType: 'TEXT', custom: true, hidden: false },
	{ elementName: 'c_Secret', name: 'Secret', attributeType: 'STRING', custom: true, hidden: true },
	{ elementName: 'c_Empty', name: 'Empty', attributeType: 'STRING', custom: true, hidden: false },
	{ elementName: 'Release', name: 'Release', attributeType: 'OBJECT', custom: false, hidden: false },
	{ elementName: 'Ready', name: 'Ready', attributeType: 'BOOLEAN', custom: false, hidden: false },
	{ elementName: 'CreationDate', name: 'Creation Date', attributeType: 'DATE', custom: false, hidden: false },
	{ elementName: 'Tags', name: 'Tags', attributeType: 'COLLECTION', custom: false, hidden: false },
	{ elementName: 'Milestones', name: 'Milestones', attributeType: 'COLLECTION', custom: false, hidden: false },
	{ elementName: 'Children', name: 'Children', attributeType: 'COLLECTION', custom: false, hidden: false },
	{ elementName: 'Photo', name: 'Photo', attributeType: 'BINARY_DATA', custom: false, hidden: false },
	{ elementName: 'ScheduleState', name: 'Schedule State', attributeType: 'STATE', custom: false, hidden: false }
];

describe('formatRallyFieldValue', () => {
	it('formats each attribute type', () => {
		expect(formatRallyFieldValue('XL', 'STRING')).toEqual({ text: 'XL' });
		expect(formatRallyFieldValue(4.5, 'QUANTITY')).toEqual({ text: '4.5' });
		expect(formatRallyFieldValue(true, 'BOOLEAN')).toEqual({ text: 'Yes' });
		expect(formatRallyFieldValue('<p>x</p>', 'TEXT')).toEqual({ text: '', html: '<p>x</p>' });
		expect(formatRallyFieldValue({ _refObjectName: 'R1' }, 'OBJECT')).toEqual({ text: 'R1' });
		expect(formatRallyFieldValue({ LinkID: '42', DisplayString: 'Ticket 42' }, 'WEB_LINK')).toEqual({ text: 'Ticket 42' });
		expect(formatRallyFieldValue({ Count: 1 }, 'COLLECTION')).toEqual({ text: '1 item' });
		expect(formatRallyFieldValue('2026-11-20T09:30:00.000Z', 'DATE')?.text).toMatch(/20 Nov 2026/);
	});

	it('returns null for empty or unsupported values', () => {
		expect(formatRallyFieldValue('', 'STRING')).toBeNull();
		expect(formatRallyFieldValue(null, 'OBJECT')).toBeNull();
		expect(formatRallyFieldValue('   ', 'TEXT')).toBeNull();
		expect(formatRallyFieldValue({ Count: 0 }, 'COLLECTION')).toBeNull();
		expect(formatRallyFieldValue('abc', 'BINARY_DATA')).toBeNull();
	});
});

describe('buildRallyIssueFields', () => {
	it('groups visible fields in Custom and Standard tabs, sorted by display name', () => {
		const result = buildRallyIssueFields(story, attributes);
		expect(result.groupedByScreen).toBe(false);
		expect(result.tabs.map(tab => tab.name)).toEqual(['Custom', 'Standard']);
		expect(result.tabs[0].fields).toEqual([
			{ id: 'c_Notes', name: 'Release notes', text: '', html: '<p>Check <b>this</b></p>' },
			{ id: 'c_Talla', name: 'Talla', text: 'XL' }
		]);
		expect(result.tabs[1].fields.map(field => [field.id, field.text])).toEqual([
			['Children', '3 items'],
			['CreationDate', expect.stringMatching(/2026/)],
			['Ready', 'No'],
			['Release', 'R1'],
			['Tags', 'billing, q4']
		]);
	});

	it('falls back to API names when the TypeDefinition is not available', () => {
		const result = buildRallyIssueFields({ _ref: 'x', ObjectID: 1, c_Talla: 'M', Release: { _refObjectName: 'R1' }, CreationDate: '2026-11-20T09:30:00.000Z' }, null);
		expect(result.tabs[0]).toEqual({ name: 'Custom', fields: [{ id: 'c_Talla', name: 'Talla', text: 'M' }] });
		expect(result.tabs[1].fields.map(field => field.name)).toEqual(['CreationDate', 'Release']);
	});

	it('returns a single empty group when nothing has a value', () => {
		expect(buildRallyIssueFields({ Name: 'x' }, attributes)).toEqual({ tabs: [{ name: null, fields: [] }], groupedByScreen: false });
	});
});

describe('getIssueFields (Rally)', () => {
	beforeEach(() => {
		clearRallyIssueFieldsCache();
		callRally.mockReset();
		logWarning.mockReset();
	});

	const attributeRows = attributes.map(attribute => ({ ElementName: attribute.elementName, Name: attribute.name, AttributeType: attribute.attributeType, Custom: attribute.custom, Hidden: attribute.hidden }));

	function mockRally() {
		callRally.mockImplementation(async (_api: unknown, options: any) => {
			if (options.type === 'hierarchicalrequirement' || options.type === 'defect') {
				return { Results: [story] };
			}
			if (options.type === 'typedefinition') {
				return { Results: [{ ElementName: 'HierarchicalRequirement', Attributes: { _ref: '/typedefinition/1/Attributes', Count: attributeRows.length } }] };
			}
			if (options.ref === '/typedefinition/1/Attributes') {
				return { Results: attributeRows };
			}
			throw new Error(`Unexpected call ${JSON.stringify(options)}`);
		});
	}

	it('reads the object with fetch=true and the attributes of its workspace, cached', async () => {
		mockRally();
		const first = await getIssueFields('123', 'userstory');
		expect(first.tabs.map(tab => tab.name)).toEqual(['Custom', 'Standard']);
		expect(callRally).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'hierarchicalrequirement', fetch: ['true'] }), 'Loading fields...');
		expect(callRally).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'typedefinition', scope: { workspace: '/workspace/9' } }), expect.any(String));

		callRally.mockClear();
		await getIssueFields('123', 'userstory');
		expect(callRally).toHaveBeenCalledTimes(1);
	});

	it('queries the defect type for defects', async () => {
		mockRally();
		await getIssueFields('123', 'defect');
		expect(callRally).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'defect' }), 'Loading fields...');
		expect(callRally).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'typedefinition', query: '(ElementName = Defect)' }), expect.any(String));
	});

	it('shows the fields with API names when the TypeDefinition cannot be read', async () => {
		callRally.mockImplementation(async (_api: unknown, options: any) => {
			if (options.type === 'hierarchicalrequirement') {
				return { Results: [story] };
			}
			throw new Error('Rally API returned 403');
		});
		const result = await getIssueFields('123', 'userstory');
		expect(logWarning).toHaveBeenCalledTimes(1);
		expect(result.tabs[0].fields.map(field => field.name)).toContain('Talla');
	});

	it('fails when the object does not exist', async () => {
		callRally.mockResolvedValue({ Results: [] });
		await expect(getIssueFields('999', 'defect')).rejects.toThrow('Defect 999 not found in Rally');
	});
});
