import type { RallyProject, RallyQuery, RallyQueryParams, RallyUser, RallyUserStory, RallyIteration, RallyDefect, User, GlobalSearchResultItem } from '../../types/rally';

/**
 * Contract every agile backend (Rally, Jira Cloud) must satisfy.
 *
 * The shapes below are the canonical internal model the webview already consumes — they are
 * what the Rally `format*Async` mappers produce today. A backend is responsible for translating
 * its own API into these shapes, so the UI stays backend-agnostic.
 *
 * `source` is a provenance tag used for debugging/telemetry ('api', 'cache', 'ttl-cache', ...).
 */

export interface ProjectsResult {
	projects: RallyProject[];
	source: string;
	count: number;
}

export interface CurrentUserResult {
	user: User | null;
	source: string;
}

export interface UsersResult {
	users: RallyUser[];
	source: string;
	count: number;
}

export interface IterationsResult {
	iterations: RallyIteration[];
	source: string;
	count: number;
}

export interface UserStoriesResult {
	userStories: RallyUserStory[];
	source: string;
	count: number;
	totalCount?: number;
	hasMore?: boolean;
	offset?: number;
}

export interface TasksResult {
	tasks: any[];
	source: string;
	count: number;
}

export interface DefectsResult {
	defects: RallyDefect[];
	source: string;
	count: number;
	hasMore?: boolean;
	totalCount?: number;
	offset?: number;
}

export interface TestCasesResult {
	testCases: any[];
	source: string;
	count: number;
	hasMore?: boolean;
}

export interface DiscussionsResult {
	discussions: any[];
	source: string;
	count: number;
	hasMore?: boolean;
}

export interface RevisionsResult {
	revisions: any[];
	source: string;
	count: number;
}

export interface RevisionsCountResult {
	count: number;
	source: string;
}

export interface TeamMembersResult {
	teamMembers: any[];
	source: string;
	count: number;
}

export interface SprintProgressResult {
	completedHours: number;
	totalHours: number;
	percentage: number;
	source: string;
	userStoriesCount?: number;
}

export interface AllTeamMembersProgressResult {
	progressMap: Map<string, { completedHours: number; totalHours: number; percentage: number; source: string; userStoriesCount: number }>;
	members: string[];
}

export interface MemberHoursHistoryResult {
	history: Array<{ iterationName: string; totalHours: number; completedHours: number; sprintTotalHours: number; userStoriesCount: number }>;
}

export interface GlobalSearchResult {
	results: GlobalSearchResultItem[];
	hasMore: boolean;
	source: string;
}

export interface ConfigValidationResult {
	isValid: boolean;
	errors: string[];
}

export type ImageFetchResult = { dataUrl: string } | { error: string };

export interface IBackend {
	/** Stable identifier of the backend, used for logging and UI labels. */
	readonly kind: 'rally' | 'jira';

	/** Human-facing product name, e.g. "Rally" or "Jira". Used for button labels and error copy. */
	readonly displayName: string;

	/** Validate credentials/config, including a live probe against the remote API. */
	validateConfiguration(): Promise<ConfigValidationResult>;

	/** Deep link to an artifact in the backend's own web UI. Returns null when not derivable. */
	buildOpenInUrl(artifactType: string, objectId: string): string | null;

	getProjects(query?: Record<string, unknown>, limit?: number | null): Promise<ProjectsResult>;
	getCurrentUser(): Promise<CurrentUserResult>;
	getUsers(query?: RallyQueryParams, limit?: number | null): Promise<UsersResult>;
	getIterations(query?: RallyQueryParams, limit?: number | null, opts?: { maxAge?: number }): Promise<IterationsResult>;
	getUserStories(query?: RallyQueryParams, offset?: number): Promise<UserStoriesResult>;
	getTasks(userStoryId: string, query?: RallyQueryParams, limit?: number | null): Promise<TasksResult>;
	getDefects(query?: RallyQueryParams, offset?: number): Promise<DefectsResult>;

	getUserStoryTests(userStoryId: string): Promise<TestCasesResult>;
	getUserStoryDefects(userStoryId: string): Promise<DefectsResult>;
	getUserStoryDiscussions(userStoryId: string): Promise<DiscussionsResult>;

	getUserStoryByObjectId(objectId: string): Promise<{ userStory: RallyUserStory | null }>;
	getDefectByObjectId(objectId: string): Promise<{ defect: RallyDefect | null }>;
	getTaskWithParent(objectId: string): Promise<{ task: any; userStoryObjectId: string | null }>;
	getTestCaseWithParent(objectId: string): Promise<{ testCase: any; userStoryObjectId: string | null }>;

	getUserStoryRevisionsCount(objectId: string): Promise<RevisionsCountResult>;
	getUserStoryRevisions(objectId: string): Promise<RevisionsResult>;

	globalSearch(term: string, options?: { limitPerType?: number; searchType?: string; offset?: number }): Promise<GlobalSearchResult>;

	getRecentTeamMembers(numberOfIterations?: number): Promise<TeamMembersResult>;
	getUserSprintProgress(userName: string, iterationId?: string): Promise<SprintProgressResult>;
	getAllTeamMembersProgress(teamMembers?: string[], iterationId?: string): Promise<AllTeamMembersProgressResult>;
	getMemberHoursHistory(memberName: string, numberOfSprints?: number): Promise<MemberHoursHistoryResult>;

	/** Fetch an authenticated image from the backend and return it as a data URL. */
	fetchImageAsBase64(imageUrl: string): Promise<ImageFetchResult>;

	/** Drop every cached response held by this backend. */
	clearAllCaches(): void;

	/** Helpers that operate on already-fetched data (no I/O). */
	extractIterationId(ref: string | null | undefined): string | null;
	checkCacheForFilteredResults(query: RallyQuery, dataArray: RallyUserStory[]): unknown;
}
