import { describe, it, expect, vi } from 'vitest';

// Mock vscode i extension per evitar efectes secundaris en importar rallyServices
vi.mock('vscode', () => ({ default: {}, workspace: {}, window: {}, commands: {}, Uri: {} }));
vi.mock('../../extension.js', () => ({ rallyData: {} }));
vi.mock('./utils', () => ({
	getRallyApi: vi.fn(),
	queryUtils: {},
	validateRallyConfiguration: vi.fn(),
	getProjectId: vi.fn(),
	clearUtilsCaches: vi.fn()
}));
vi.mock('./rallyCall', () => ({
	callRally: vi.fn(),
	callRallyFetch: vi.fn(),
	setRallyBroadcaster: vi.fn()
}));
vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: {
		getInstance: vi.fn(() => ({ handleError: vi.fn(), logError: vi.fn() }))
	},
	handleErrors: vi.fn(() => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor),
	handleErrorsSync: vi.fn(() => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor)
}));
vi.mock('../../SettingsManager', () => ({ SettingsManager: { getInstance: vi.fn(() => ({ getSettings: vi.fn(() => ({})) })) } }));
vi.mock('./CacheService', () => ({
	getUserStoriesCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn() })),
	getProjectsCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn() })),
	getIterationsCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn() })),
	getTeamMembersCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn() })),
	getUsersCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn() })),
	clearAllCaches: vi.fn()
}));

import { extractIterationId, checkCacheForFilteredResults } from './rallyServices';

describe('extractIterationId', () => {
	it("extreu objectId d'un ref curt", () => {
		expect(extractIterationId('/iteration/12345')).toBe('12345');
	});

	it("extreu objectId d'un ref complet de Rally", () => {
		expect(extractIterationId('https://rally1.rallydev.com/slm/webservice/v2.0/iteration/67890')).toBe('67890');
	});

	it('retorna null per entrada buida', () => {
		expect(extractIterationId(undefined)).toBeNull();
		expect(extractIterationId(null)).toBeNull();
		expect(extractIterationId('')).toBeNull();
	});
});

describe('checkCacheForFilteredResults (Iteration matching)', () => {
	const stories = [
		{ objectId: 'a', iteration: { objectId: '12345', _ref: '/iteration/12345', _refObjectName: 'Sprint 1' } },
		{ objectId: 'b', iteration: { objectId: '99999', _ref: '/iteration/99999', _refObjectName: 'Sprint 2' } }
	] as any[];

	it('encerta per ref curt comparant objectId', () => {
		const r = checkCacheForFilteredResults({ Iteration: '/iteration/12345' } as any, stories);
		expect(r?.results.map((s: any) => s.objectId)).toEqual(['a']);
		expect(r?.source).toBe('cache');
	});

	it('encerta per ref complet de Rally', () => {
		const r = checkCacheForFilteredResults({ Iteration: 'https://rally1.rallydev.com/slm/webservice/v2.0/iteration/99999' } as any, stories);
		expect(r?.results.map((s: any) => s.objectId)).toEqual(['b']);
	});

	it('retorna null si cap story coincideix amb la iteració', () => {
		const r = checkCacheForFilteredResults({ Iteration: '/iteration/00000' } as any, stories);
		expect(r).toBeNull();
	});
});
