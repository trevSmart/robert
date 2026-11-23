/**
 * Decides which datasets the active view still needs, independently of how the user got there
 * (tab click, navigation state restored when opening the view in an editor tab, back/forward
 * history). Loading used to hang off the click handlers only, so any path that changed the
 * navigation state directly left the view rendered but empty.
 */

export type ViewDataset = 'iterations' | 'allUserStories' | 'allDefects' | 'teamMembers';

export interface DatasetStatus {
	count: number;
	loading: boolean;
	error: boolean;
}

export interface ViewDataState {
	activeSection: string;
	/** Active Portfolio sub-tab: 'bySprints' | 'allUserStories' | 'allDefects'. */
	portfolioView: string;
	datasets: Record<ViewDataset, DatasetStatus>;
}

/** Datasets each view depends on. Home keeps its own loaders (calendar + preloaded data). */
function datasetsFor(activeSection: string, portfolioView: string): ViewDataset[] {
	switch (activeSection) {
		case 'portfolio':
			if (portfolioView === 'allUserStories') return ['iterations', 'allUserStories'];
			if (portfolioView === 'allDefects') return ['iterations', 'allDefects'];
			return ['iterations'];
		case 'team':
			return ['teamMembers'];
		case 'metrics':
			// Defects and velocity have dedicated loaders in the Metrics section.
			return ['iterations', 'allUserStories'];
		default:
			return [];
	}
}

/** Key of an automatic load attempt, scoped to the section it was made for. */
export function attemptKey(activeSection: string, dataset: ViewDataset): string {
	return `${activeSection}:${dataset}`;
}

/**
 * Datasets the active view needs that are not present, not loading, not failed and not already
 * attempted during this visit. The attempt check stops a legitimately empty result (e.g. a
 * project without defects) from being requested again on every render.
 */
export function missingViewData(state: ViewDataState, attempted: ReadonlySet<string>): ViewDataset[] {
	return datasetsFor(state.activeSection, state.portfolioView).filter(dataset => {
		const status = state.datasets[dataset];
		return status.count === 0 && !status.loading && !status.error && !attempted.has(attemptKey(state.activeSection, dataset));
	});
}

/** Forgets attempts made for other sections, so returning to a section retries missing data once. */
export function pruneAttemptedLoads(attempted: Set<string>, activeSection: string): void {
	for (const key of [...attempted]) {
		if (!key.startsWith(`${activeSection}:`)) {
			attempted.delete(key);
		}
	}
}
