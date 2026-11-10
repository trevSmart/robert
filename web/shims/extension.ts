// Replacement for src/extension.ts: only the shared in-memory cache the data layer needs.
import type { JiraData } from '../../src/types/jira';
import type { CacheEntity } from '../../src/libs/cache/ttlConfig';

export const jiraData: JiraData = {
	projects: [],
	users: [],
	iterations: [],
	userStories: [],
	tasks: [],
	defects: [],
	currentUser: undefined
};

export const jiraDataMeta: Partial<Record<CacheEntity, number>> = {};

export function stampJiraData(entity: CacheEntity, when: number = Date.now()): void {
	jiraDataMeta[entity] = when;
}

export function clearJiraDataMeta(): void {
	for (const key of Object.keys(jiraDataMeta) as CacheEntity[]) {
		delete jiraDataMeta[key];
	}
}

export const rallyData: any = {};
export const rallyDataMeta: Partial<Record<CacheEntity, number>> = {};
export function stampRallyData(entity: CacheEntity, when: number = Date.now()): void {
	rallyDataMeta[entity] = when;
}
