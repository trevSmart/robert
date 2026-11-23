import { describe, it, expect } from 'vitest';
import { missingViewData, pruneAttemptedLoads, type DatasetStatus, type ViewDataState } from './viewDataNeeds';

const empty: DatasetStatus = { count: 0, loading: false, error: false };
const loaded: DatasetStatus = { count: 3, loading: false, error: false };

function state(overrides: Partial<ViewDataState>): ViewDataState {
	return {
		activeSection: 'home',
		portfolioView: 'bySprints',
		datasets: { iterations: loaded, allUserStories: empty, allDefects: empty, teamMembers: empty },
		...overrides
	};
}

describe('missingViewData', () => {
	it('loads the user story list when Portfolio › User Stories is restored without data', () => {
		expect(missingViewData(state({ activeSection: 'portfolio', portfolioView: 'allUserStories' }), new Set())).toEqual(['allUserStories']);
	});

	it('loads the defect list when Portfolio › Defects is restored without data', () => {
		expect(missingViewData(state({ activeSection: 'portfolio', portfolioView: 'allDefects' }), new Set())).toEqual(['allDefects']);
	});

	it('loads sprints for Portfolio when they are missing', () => {
		const s = state({ activeSection: 'portfolio', datasets: { iterations: empty, allUserStories: empty, allDefects: empty, teamMembers: empty } });
		expect(missingViewData(s, new Set())).toEqual(['iterations']);
	});

	it('loads team members for Team', () => {
		expect(missingViewData(state({ activeSection: 'team' }), new Set())).toEqual(['teamMembers']);
	});

	it('loads sprints and all user stories for Metrics', () => {
		const s = state({ activeSection: 'metrics', datasets: { iterations: empty, allUserStories: empty, allDefects: empty, teamMembers: empty } });
		expect(missingViewData(s, new Set())).toEqual(['iterations', 'allUserStories']);
	});

	it('leaves Home to its own loaders', () => {
		const s = state({ activeSection: 'home', datasets: { iterations: empty, allUserStories: empty, allDefects: empty, teamMembers: empty } });
		expect(missingViewData(s, new Set())).toEqual([]);
	});

	it('skips datasets that are present, loading or failed', () => {
		const s = state({
			activeSection: 'metrics',
			datasets: { iterations: { count: 0, loading: true, error: false }, allUserStories: { count: 0, loading: false, error: true }, allDefects: empty, teamMembers: empty }
		});
		expect(missingViewData(s, new Set())).toEqual([]);
		expect(missingViewData(state({ activeSection: 'portfolio', portfolioView: 'allUserStories', datasets: { iterations: loaded, allUserStories: loaded, allDefects: empty, teamMembers: empty } }), new Set())).toEqual([]);
	});

	it('does not retry a dataset already attempted in this visit, so an empty result cannot loop', () => {
		const s = state({ activeSection: 'portfolio', portfolioView: 'allDefects' });
		expect(missingViewData(s, new Set(['portfolio:allDefects']))).toEqual([]);
	});
});

describe('pruneAttemptedLoads', () => {
	it('forgets attempts of other sections, so returning to a section retries missing data once', () => {
		const attempted = new Set(['portfolio:allDefects', 'metrics:iterations', 'team:teamMembers']);
		pruneAttemptedLoads(attempted, 'metrics');
		expect([...attempted]).toEqual(['metrics:iterations']);
	});
});
