import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
	type Q = { expr: string; or: (other: Q) => Q; and: (other: Q) => Q };
	const make = (expr: string): Q => ({
		expr,
		or: (other: Q) => make(`(${expr}) OR (${other.expr})`),
		and: (other: Q) => make(`(${expr}) AND (${other.expr})`)
	});
	return {
		make,
		settings: { rallyInstance: 'https://rally.example', rallyApiKey: 'key', rallyProjectName: 'Team A, Team B' } as Record<string, string>,
		activeProjects: ['Team A', 'Team B'],
		callRally: vi.fn()
	};
});

vi.mock('ibm-rally-node', () => ({
	default: Object.assign(
		vi.fn(() => ({})),
		{ util: { query: { where: (field: string, op: string, value: unknown) => h.make(`${field} ${op} ${value}`) } } }
	)
}));
vi.mock('../../SettingsManager', () => ({
	SettingsManager: { getInstance: vi.fn(() => ({ getSetting: (key: string) => h.settings[key] ?? '' })) }
}));
vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: { getInstance: vi.fn(() => ({ logInfo: vi.fn(), logDebug: vi.fn(), logWarning: vi.fn() })) }
}));
vi.mock('./rallyCall', () => ({ callRally: h.callRally }));
vi.mock('../provider/projectScope', async () => {
	const actual = await vi.importActual<typeof import('../provider/projectScope')>('../provider/projectScope');
	return { parseProjectList: actual.parseProjectList, getActiveProjects: () => h.activeProjects };
});

import { clearUtilsCaches, getProjectIds, getProjectScopeQuery, projectScopeQuery, RallyProjectNotFoundError } from './utils';

describe('Rally project scope', () => {
	beforeEach(() => {
		clearUtilsCaches();
		h.callRally.mockReset();
		h.activeProjects = ['Team A', 'Team B'];
		h.callRally.mockResolvedValue({
			Results: [
				{ ObjectID: 2, Name: 'Team B' },
				{ ObjectID: 1, Name: 'Team A' }
			]
		});
	});

	it('resolves every name in one query, keeping the configured order', async () => {
		expect(await getProjectIds()).toEqual(['1', '2']);
		expect(h.callRally).toHaveBeenCalledTimes(1);
		expect(h.callRally.mock.calls[0][1].query.expr).toBe('(Name = Team A) OR (Name = Team B)');
	});

	it('caches resolved ids', async () => {
		await getProjectIds();
		h.activeProjects = ['Team B'];
		expect(await getProjectIds()).toEqual(['2']);
		expect(h.callRally).toHaveBeenCalledTimes(1);
	});

	it('uses every configured project for the configured scope', async () => {
		h.activeProjects = ['Team A'];
		expect(await getProjectIds('configured')).toEqual(['1', '2']);
	});

	it('names the projects that do not exist', async () => {
		h.callRally.mockResolvedValue({ Results: [{ ObjectID: 1, Name: 'Team A' }] });
		await expect(getProjectIds()).rejects.toThrow(RallyProjectNotFoundError);
		await expect(getProjectIds()).rejects.toThrow('"Team B"');
	});

	it('builds an OR of project references', async () => {
		expect((projectScopeQuery(['1']) as any).expr).toBe('Project = /project/1');
		expect((projectScopeQuery(['1', '2']) as any).expr).toBe('(Project = /project/1) OR (Project = /project/2)');
		expect(((await getProjectScopeQuery()) as any).expr).toBe('(Project = /project/1) OR (Project = /project/2)');
	});
});
