import { describe, it, expect, vi, beforeEach } from 'vitest';

const settings = vi.hoisted(() => ({ values: {} as Record<string, string> }));

vi.mock('../../SettingsManager', () => ({
	SettingsManager: {
		getInstance: vi.fn(() => ({ getSetting: (key: string) => settings.values[key] ?? '' }))
	}
}));
vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: { getInstance: vi.fn(() => ({ logInfo: vi.fn(), logDebug: vi.fn(), logWarning: vi.fn() })) }
}));

import { getActiveProject, getActiveProjects, getConfiguredProjects, getProjectScopeState, initProjectScope, parseProjectList, projectScopeKey, resetProjectScopeForTests, setActiveProject } from './projectScope';

function memento(initial: Record<string, unknown> = {}) {
	const store = { ...initial };
	return {
		store,
		get: <T>(key: string) => store[key] as T | undefined,
		update: vi.fn(async (key: string, value: unknown) => {
			store[key] = value;
		})
	};
}

describe('parseProjectList', () => {
	it('splits, trims and drops empty and duplicate entries', () => {
		expect(parseProjectList(' DSS, ABC ,,DSS, ')).toEqual(['DSS', 'ABC']);
	});

	it('returns an empty list for empty values', () => {
		expect(parseProjectList('')).toEqual([]);
		expect(parseProjectList(undefined)).toEqual([]);
		expect(parseProjectList(' , ')).toEqual([]);
	});

	it('keeps a single project as before', () => {
		expect(parseProjectList('DSS')).toEqual(['DSS']);
	});
});

describe('project scope', () => {
	beforeEach(() => {
		resetProjectScopeForTests();
		settings.values = { provider: 'jira', jiraProjectKey: 'DSS, ABC', rallyProjectName: 'Team A, Team B' };
	});

	it('reads the projects of the active provider', () => {
		expect(getConfiguredProjects()).toEqual(['DSS', 'ABC']);
		settings.values.provider = 'rally';
		expect(getConfiguredProjects()).toEqual(['Team A', 'Team B']);
	});

	it('queries every configured project when none is selected', () => {
		initProjectScope(memento());
		expect(getActiveProject()).toBeNull();
		expect(getActiveProjects()).toEqual(['DSS', 'ABC']);
	});

	it('narrows to the selected project and persists it', async () => {
		const storage = memento();
		initProjectScope(storage);
		const state = await setActiveProject('ABC');
		expect(state).toEqual({ projects: ['DSS', 'ABC'], active: 'ABC' });
		expect(getActiveProjects()).toEqual(['ABC']);
		expect(storage.store['robert.activeProject']).toBe('ABC');
	});

	it('restores the persisted selection', () => {
		initProjectScope(memento({ 'robert.activeProject': 'DSS' }));
		expect(getActiveProjects()).toEqual(['DSS']);
	});

	it('falls back to all projects when the selection is no longer configured', () => {
		initProjectScope(memento({ 'robert.activeProject': 'OLD' }));
		expect(getActiveProject()).toBeNull();
		expect(getActiveProjects()).toEqual(['DSS', 'ABC']);
	});

	it('ignores selecting a project that is not configured', async () => {
		initProjectScope(memento());
		expect((await setActiveProject('OLD')).active).toBeNull();
	});

	it('changes the cache key with the scope', async () => {
		initProjectScope(memento());
		const all = projectScopeKey();
		await setActiveProject('DSS');
		expect(projectScopeKey()).not.toBe(all);
		await setActiveProject(null);
		expect(projectScopeKey()).toBe(all);
	});

	it('reports the state for the webview', () => {
		initProjectScope(memento());
		expect(getProjectScopeState()).toEqual({ projects: ['DSS', 'ABC'], active: null });
	});
});
