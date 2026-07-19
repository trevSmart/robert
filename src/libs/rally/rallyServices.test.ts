import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rallyData, queryBuilder } = vi.hoisted(() => {
	const queryBuilder = {
		and: vi.fn(function (this: unknown) {
			return this;
		})
	};
	const rallyData = {
		userStories: [] as any[],
		projects: [] as any[],
		iterations: [] as any[],
		tasks: [] as any[],
		defects: [] as any[],
		users: [] as any[],
		currentUser: null as any
	};
	return { rallyData, queryBuilder };
});

// Mock vscode i extension per evitar efectes secundaris en importar rallyServices
vi.mock('vscode', () => ({ default: {}, workspace: {}, window: {}, commands: {}, Uri: {} }));
vi.mock('../../extension.js', () => ({ rallyData, rallyDataMeta: {}, stampRallyData: vi.fn() }));
vi.mock('./utils', () => ({
	getRallyApi: vi.fn(() => ({})),
	queryUtils: {
		where: vi.fn(() => queryBuilder)
	},
	validateRallyConfiguration: vi.fn(async () => ({ isValid: true, errors: [] })),
	getProjectId: vi.fn(async () => '74278607305'),
	clearUtilsCaches: vi.fn()
}));
vi.mock('./rallyCall', () => ({
	callRally: vi.fn(),
	callRallyFetch: vi.fn(),
	setRallyBroadcaster: vi.fn()
}));
vi.mock('../../ErrorHandler', () => ({
	ErrorHandler: {
		getInstance: vi.fn(() => ({
			handleError: vi.fn(),
			logError: vi.fn(),
			logInfo: vi.fn(),
			logDebug: vi.fn(),
			logWarning: vi.fn()
		}))
	},
	handleErrors: vi.fn(() => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor),
	handleErrorsSync: vi.fn(() => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor)
}));
vi.mock('../../SettingsManager', () => ({ SettingsManager: { getInstance: vi.fn(() => ({ getSettings: vi.fn(() => ({})) })) } }));
vi.mock('./CacheService', () => ({
	getUserStoriesCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn(), getWithMeta: vi.fn(() => null) })),
	getProjectsCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn(), getWithMeta: vi.fn(() => null) })),
	getIterationsCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn(), getWithMeta: vi.fn(() => null) })),
	getTeamMembersCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn(), getWithMeta: vi.fn(() => null) })),
	getUsersCacheManager: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), has: vi.fn(), getWithMeta: vi.fn(() => null) })),
	clearAllCaches: vi.fn()
}));

import { extractIterationId, checkCacheForFilteredResults, getUserStories } from './rallyServices';
import { callRally } from './rallyCall';

function rawStory(overrides: Record<string, unknown>) {
	return {
		ObjectID: overrides.objectId ?? '1',
		FormattedID: overrides.formattedId ?? 'US1',
		Name: overrides.name ?? 'Story',
		Owner: { _refObjectName: 'Owner' },
		Description: '',
		State: null,
		PlanEstimate: 1,
		ToDo: 0,
		c_Assignee: { _refObjectName: overrides.assignee ?? 'Unassigned' },
		Project: { _refObjectName: 'Team.CC IBM_CC' },
		Iteration: {
			ObjectID: overrides.iterationId ?? '83178439645',
			_ref: `/iteration/${overrides.iterationId ?? '83178439645'}`,
			_refObjectName: 'Sprint 92'
		},
		Blocked: false,
		TaskEstimateTotal: overrides.taskEstimateTotal ?? 0,
		TaskStatus: 'DEFINED',
		Tasks: { Count: 0 },
		TestCases: { Count: 0 },
		Defects: { Count: 0 },
		Discussion: { Count: 0 },
		ScheduleState: overrides.scheduleState ?? 'In-Progress',
		c_Appgar: null,
		RevisionHistory: null
	};
}

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

describe('getUserStories (Iteration filter completeness)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		rallyData.userStories.length = 0;
	});

	it('does not return an incomplete progressive cache for Iteration filters; fetches from API instead', async () => {
		// Progressive cache only has one story for Sprint 92 (e.g. from "All User Stories" first page),
		// missing Rubén's US with 210h that also belongs to the same sprint.
		rallyData.userStories.push({
			objectId: '91229071621',
			formattedId: 'US1705726',
			name: 'Gestión de comentarios apps en TrustPilot',
			assignee: 'Rubén Moreno Leiva',
			taskEstimateTotal: 0,
			iteration: { objectId: '83178439645', _ref: '/iteration/83178439645', _refObjectName: 'Sprint 92' }
		});

		vi.mocked(callRally).mockResolvedValueOnce({
			Results: [
				rawStory({
					objectId: '91229071621',
					formattedId: 'US1705726',
					name: 'Gestión de comentarios apps en TrustPilot',
					assignee: 'Rubén Moreno Leiva',
					taskEstimateTotal: 0,
					iterationId: '83178439645'
				}),
				rawStory({
					objectId: '81597964629',
					formattedId: 'US1313591',
					name: 'Gestión de comentarios apps en iOS (App Store)',
					assignee: 'Rubén Moreno Leiva',
					taskEstimateTotal: 210,
					iterationId: '83178439645'
				})
			]
		});

		const result = await getUserStories({ Iteration: '/iteration/83178439645' });

		expect(callRally).toHaveBeenCalled();
		expect(result.source).toBe('api');
		expect(result.userStories.map((s: any) => s.formattedId).sort()).toEqual(['US1313591', 'US1705726']);
		const rubenHours = result.userStories.filter((s: any) => s.assignee === 'Rubén Moreno Leiva').reduce((sum: number, s: any) => sum + (s.taskEstimateTotal || 0), 0);
		expect(rubenHours).toBe(210);
	});

	it('fetches all pages when an Iteration filter returns more than one page', async () => {
		const page1 = Array.from({ length: 100 }, (_, i) =>
			rawStory({
				objectId: String(1000 + i),
				formattedId: `US${2000000 - i}`,
				taskEstimateTotal: 1,
				iterationId: '83178439645',
				assignee: 'Someone'
			})
		);
		const page2 = [
			rawStory({
				objectId: '81597964629',
				formattedId: 'US1313591',
				assignee: 'Rubén Moreno Leiva',
				taskEstimateTotal: 210,
				iterationId: '83178439645'
			})
		];

		vi.mocked(callRally).mockResolvedValueOnce({ Results: page1 }).mockResolvedValueOnce({ Results: page2 });

		const result = await getUserStories({ Iteration: '/iteration/83178439645' });

		expect(callRally).toHaveBeenCalledTimes(2);
		expect(result.userStories).toHaveLength(101);
		expect(result.hasMore).toBe(false);
		expect(result.userStories.some((s: any) => s.formattedId === 'US1313591' && s.taskEstimateTotal === 210)).toBe(true);
	});
});
