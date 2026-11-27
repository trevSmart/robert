import { describe, it, expect, vi } from 'vitest';

vi.mock('../../SettingsManager', () => ({
	SettingsManager: { getInstance: vi.fn(() => ({ getSetting: vi.fn(() => '') })) }
}));
vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: { getInstance: vi.fn(() => ({ logInfo: vi.fn(), logDebug: vi.fn(), logWarning: vi.fn() })) }
}));
vi.mock('../provider/projectScope', () => ({
	getActiveProjects: vi.fn(() => []),
	parseProjectList: vi.fn(() => [])
}));

import { projectJql } from './jiraClient';

describe('projectJql', () => {
	it('spans all projects when none is configured', () => {
		expect(projectJql([])).toBe('project is not EMPTY');
	});

	it('filters by one project', () => {
		expect(projectJql(['DSS'])).toBe('project = "DSS"');
	});

	it('filters by several projects', () => {
		expect(projectJql(['DSS', 'ABC'])).toBe('project in ("DSS", "ABC")');
	});
});
