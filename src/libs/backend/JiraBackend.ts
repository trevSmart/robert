import { ErrorHandler } from '../../ErrorHandler';
import { SettingsManager } from '../../SettingsManager';
import type { RallyDefect, RallyQuery, RallyQueryParams, RallyUserStory, GlobalSearchResultItem } from '../../types/rally';
import { fetchPolyfill } from '../http/fetchPolyfill';
import { callRallyFetch } from '../rally/rallyCall';
import type {
	IBackend,
	ConfigValidationResult,
	ProjectsResult,
	CurrentUserResult,
	UsersResult,
	IterationsResult,
	UserStoriesResult,
	TasksResult,
	DefectsResult,
	TestCasesResult,
	DiscussionsResult,
	RevisionsResult,
	RevisionsCountResult,
	TeamMembersResult,
	SprintProgressResult,
	AllTeamMembersProgressResult,
	MemberHoursHistoryResult,
	GlobalSearchResult,
	ImageFetchResult
} from './IBackend';
import { getJiraConfig, jiraRequest, jqlEscape, searchJql, searchJqlAll, JiraConfigError, type JiraConfig, type JiraIssue } from './jira/jiraApi';
import { getBoardSprints, resolveStoryPointsField, clearJiraMetaCaches } from './jira/jiraMeta';
import { formatChangelog, formatComments, formatCurrentUser, formatDefects, formatProjects, formatSprints, formatTasks, formatTestCases, formatUserStories, formatUsers, type MapIssueContext } from './jira/jiraMappers';

const errorHandler = ErrorHandler.getInstance();

/** Fields fetched for issues rendered as user stories / defects. */
const ISSUE_FIELDS = ['summary', 'description', 'status', 'assignee', 'reporter', 'project', 'priority', 'labels', 'created', 'updated', 'subtasks', 'issuelinks', 'comment', 'timetracking', 'timeestimate', 'timeoriginalestimate', 'timespent', 'issuetype', 'parent', 'sprint'];

/** Lighter field set for search results and task lists. */
const LIGHT_FIELDS = ['summary', 'status', 'assignee', 'project', 'issuetype', 'parent', 'sprint'];

/** Issue types treated as test cases (Xray / Zephyr conventions). */
const TEST_ISSUE_TYPES = ['Test', 'Test Case', 'Xray Test'];

/**
 * Jira Cloud implementation of {@link IBackend}.
 *
 * Maps the Rally-shaped domain operations onto Jira's REST v3 (issues, comments, changelog)
 * and Agile 1.0 (boards, sprints) APIs, translating results into the canonical internal model.
 */
export class JiraBackend implements IBackend {
	readonly kind = 'jira' as const;
	readonly displayName = 'Jira';

	private storyPointsFieldPromise: Promise<string | null> | null = null;

	// ---------------------------------------------------------------- configuration

	async validateConfiguration(): Promise<ConfigValidationResult> {
		let config: JiraConfig;
		try {
			config = getJiraConfig();
		} catch (error) {
			return { isValid: false, errors: [error instanceof Error ? error.message : String(error)] };
		}

		if (!config.instance.startsWith('https://')) {
			return { isValid: false, errors: ['Jira instance must be a valid HTTPS URL'] };
		}

		try {
			// Cheapest authenticated probe that also proves the project key resolves.
			await jiraRequest(`/rest/api/3/project/${encodeURIComponent(config.projectKey)}`, { label: 'Validating Jira configuration...' }, config);
			return { isValid: true, errors: [] };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes('401')) {
				return { isValid: false, errors: ['Invalid Jira email or API token'] };
			}
			if (message.includes('403')) {
				return { isValid: false, errors: ['Jira credentials lack permission for this project'] };
			}
			if (message.includes('404')) {
				return { isValid: false, errors: [`Jira project "${config.projectKey}" not found on ${config.instance}`] };
			}
			return { isValid: false, errors: [`Jira API connection failed: ${message}`] };
		}
	}

	buildOpenInUrl(_artifactType: string, objectId: string): string | null {
		const instance = SettingsManager.getInstance().getSetting('jiraInstance');
		if (!instance || !objectId) {
			return null;
		}
		// The webview passes the internal objectId; Jira browse links work with issue keys too,
		// and `/browse/<id>` resolves server-side, so either form is valid here.
		return `${instance.replace(/\/$/, '')}/browse/${encodeURIComponent(objectId)}`;
	}

	// ---------------------------------------------------------------- helpers

	private async context(): Promise<MapIssueContext> {
		const config = getJiraConfig();
		if (!this.storyPointsFieldPromise) {
			this.storyPointsFieldPromise = resolveStoryPointsField(config);
		}
		return { storyPointsField: await this.storyPointsFieldPromise, projectName: config.projectKey };
	}

	/** Base JQL clause scoping every query to the configured project. */
	private projectClause(config: JiraConfig = getJiraConfig()): string {
		return `project = "${jqlEscape(config.projectKey)}"`;
	}

	/**
	 * Translate the Rally-flavoured query params the webview sends into extra JQL clauses.
	 * Only the filters the UI actually issues are supported; anything else is ignored.
	 */
	private extraClauses(query: RallyQueryParams = {}): string[] {
		const clauses: string[] = [];

		const iteration = query.iteration ?? query.Iteration;
		if (typeof iteration === 'string' && iteration.trim()) {
			clauses.push(`sprint = ${/^\d+$/.test(iteration.trim()) ? iteration.trim() : `"${jqlEscape(iteration.trim())}"`}`);
		}

		const owner = query.owner ?? query.Owner;
		if (typeof owner === 'string' && owner.trim()) {
			clauses.push(`assignee = "${jqlEscape(owner.trim())}"`);
		}

		const state = query.scheduleState ?? query.ScheduleState;
		if (typeof state === 'string' && state.trim()) {
			clauses.push(`status = "${jqlEscape(state.trim())}"`);
		}

		return clauses;
	}

	private buildJql(base: string[], query: RallyQueryParams = {}, order = 'ORDER BY created DESC'): string {
		return [...base, ...this.extraClauses(query)].filter(Boolean).join(' AND ') + ` ${order}`;
	}

	// ---------------------------------------------------------------- projects & users

	async getProjects(): Promise<ProjectsResult> {
		const response = await jiraRequest<{ values?: any[] }>('/rest/api/3/project/search', { label: 'Loading Jira projects...', query: { maxResults: 50 } });
		const projects = await formatProjects(response.values ?? []);
		return { projects, source: 'api', count: projects.length };
	}

	async getCurrentUser(): Promise<CurrentUserResult> {
		try {
			const user = await jiraRequest<any>('/rest/api/3/myself', { label: 'Loading Jira user...' });
			return { user: formatCurrentUser(user), source: 'api' };
		} catch (error) {
			errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'JiraBackend.getCurrentUser');
			return { user: null, source: 'api' };
		}
	}

	async getUsers(query: RallyQueryParams = {}, limit: number | null = null): Promise<UsersResult> {
		const config = getJiraConfig();
		const search = typeof query.DisplayName === 'string' ? query.DisplayName : typeof query.displayName === 'string' ? query.displayName : '';

		const response = await jiraRequest<any[]>('/rest/api/3/user/assignable/search', {
			label: 'Loading Jira users...',
			query: { project: config.projectKey, query: search || undefined, maxResults: limit ?? 50 }
		});

		const users = await formatUsers(response ?? []);
		return { users, source: 'api', count: users.length };
	}

	// ---------------------------------------------------------------- sprints

	async getIterations(): Promise<IterationsResult> {
		const config = getJiraConfig();
		const sprints = await getBoardSprints(config);
		const iterations = await formatSprints(sprints, config.projectKey);
		return { iterations, source: 'api', count: iterations.length };
	}

	// ---------------------------------------------------------------- issues

	async getUserStories(query: RallyQueryParams = {}, offset = 0): Promise<UserStoriesResult> {
		const config = getJiraConfig();
		const jql = this.buildJql([this.projectClause(config), 'issuetype in (Story, Task)', 'issuetype not in subTaskIssueTypes()'], query);

		const { issues, hasMore } = await searchJql(jql, ISSUE_FIELDS, { offset, label: 'Loading Jira issues...' }, config);
		const userStories = await formatUserStories(issues, await this.context());

		return { userStories, source: 'api', count: userStories.length, hasMore, offset };
	}

	async getDefects(query: RallyQueryParams = {}, offset = 0): Promise<DefectsResult> {
		const config = getJiraConfig();
		const jql = this.buildJql([this.projectClause(config), 'issuetype = Bug'], query);

		const { issues, hasMore } = await searchJql(jql, ISSUE_FIELDS, { offset, label: 'Loading Jira bugs...' }, config);
		const defects = await formatDefects(issues, await this.context());

		return { defects, source: 'api', count: defects.length, hasMore, offset };
	}

	async getTasks(userStoryId: string, _query: RallyQueryParams = {}, limit: number | null = null): Promise<TasksResult> {
		const config = getJiraConfig();
		const jql = `${this.projectClause(config)} AND parent = "${jqlEscape(userStoryId)}" ORDER BY created ASC`;

		const issues = await searchJqlAll(jql, ISSUE_FIELDS, { label: 'Loading Jira subtasks...', maxIssues: limit ?? 500 }, config);
		const tasks = await formatTasks(issues, await this.context());

		return { tasks, source: 'api', count: tasks.length };
	}

	async getUserStoryDefects(userStoryId: string): Promise<DefectsResult> {
		const config = getJiraConfig();
		// Bugs either hang off the story as subtasks or are linked to it.
		const jql = `${this.projectClause(config)} AND issuetype = Bug AND (parent = "${jqlEscape(userStoryId)}" OR issue in linkedIssues("${jqlEscape(userStoryId)}")) ORDER BY created DESC`;

		try {
			const issues = await searchJqlAll(jql, ISSUE_FIELDS, { label: 'Loading linked bugs...' }, config);
			const defects = await formatDefects(issues, await this.context());
			return { defects, source: 'api', count: defects.length, hasMore: false };
		} catch (error) {
			errorHandler.logWarning(`Could not load linked bugs for ${userStoryId}: ${error instanceof Error ? error.message : String(error)}`, 'JiraBackend.getUserStoryDefects');
			return { defects: [], source: 'api', count: 0, hasMore: false };
		}
	}

	async getUserStoryTests(userStoryId: string): Promise<TestCasesResult> {
		const config = getJiraConfig();
		const types = TEST_ISSUE_TYPES.map(t => `"${jqlEscape(t)}"`).join(', ');
		const jql = `${this.projectClause(config)} AND issuetype in (${types}) AND issue in linkedIssues("${jqlEscape(userStoryId)}") ORDER BY created ASC`;

		try {
			const issues = await searchJqlAll(jql, ISSUE_FIELDS, { label: 'Loading Jira tests...' }, config);
			const testCases = await formatTestCases(issues, await this.context());
			return { testCases, source: 'api', count: testCases.length, hasMore: false };
		} catch (error) {
			// Sites without Xray/Zephyr have no Test issue type, so the JQL itself is invalid.
			// That is an expected configuration, not a failure — degrade to an empty tab.
			errorHandler.logDebug(`No test issue types available on this Jira site: ${error instanceof Error ? error.message : String(error)}`, 'JiraBackend.getUserStoryTests');
			return { testCases: [], source: 'api', count: 0, hasMore: false };
		}
	}

	async getUserStoryDiscussions(userStoryId: string): Promise<DiscussionsResult> {
		try {
			const response = await jiraRequest<{ comments?: any[]; total?: number }>(`/rest/api/3/issue/${encodeURIComponent(userStoryId)}/comment`, {
				label: 'Loading Jira comments...',
				query: { maxResults: 100, orderBy: '-created' }
			});
			const discussions = await formatComments(response.comments ?? [], userStoryId);
			return { discussions, source: 'api', count: discussions.length, hasMore: false };
		} catch (error) {
			errorHandler.logWarning(`Could not load comments for ${userStoryId}: ${error instanceof Error ? error.message : String(error)}`, 'JiraBackend.getUserStoryDiscussions');
			return { discussions: [], source: 'api', count: 0, hasMore: false };
		}
	}

	// ---------------------------------------------------------------- single-item lookups

	private async fetchIssue(objectId: string, expand?: string): Promise<JiraIssue | null> {
		try {
			return await jiraRequest<JiraIssue>(`/rest/api/3/issue/${encodeURIComponent(objectId)}`, {
				label: 'Loading Jira issue...',
				query: { fields: ISSUE_FIELDS.join(','), expand }
			});
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	async getUserStoryByObjectId(objectId: string): Promise<{ userStory: RallyUserStory | null }> {
		const issue = await this.fetchIssue(objectId);
		if (!issue) {
			return { userStory: null };
		}
		const [userStory] = await formatUserStories([issue], await this.context());
		return { userStory: userStory ?? null };
	}

	async getDefectByObjectId(objectId: string): Promise<{ defect: RallyDefect | null }> {
		const issue = await this.fetchIssue(objectId);
		if (!issue) {
			return { defect: null };
		}
		const [defect] = await formatDefects([issue], await this.context());
		return { defect: defect ?? null };
	}

	async getTaskWithParent(objectId: string): Promise<{ task: any; userStoryObjectId: string | null }> {
		const issue = await this.fetchIssue(objectId);
		if (!issue) {
			return { task: null, userStoryObjectId: null };
		}
		const [task] = await formatTasks([issue], await this.context());
		return { task: task ?? null, userStoryObjectId: issue.fields?.parent?.id ?? null };
	}

	async getTestCaseWithParent(objectId: string): Promise<{ testCase: any; userStoryObjectId: string | null }> {
		const issue = await this.fetchIssue(objectId);
		if (!issue) {
			return { testCase: null, userStoryObjectId: null };
		}
		const [testCase] = await formatTestCases([issue], await this.context());

		// Tests link to their story rather than nesting under it.
		const linked = Array.isArray(issue.fields?.issuelinks) ? issue.fields.issuelinks.map((l: any) => l.inwardIssue ?? l.outwardIssue).find((i: any) => i?.fields?.issuetype?.name !== 'Bug') : null;

		return { testCase: testCase ?? null, userStoryObjectId: issue.fields?.parent?.id ?? linked?.id ?? null };
	}

	// ---------------------------------------------------------------- changelog (revisions)

	async getUserStoryRevisionsCount(objectId: string): Promise<RevisionsCountResult> {
		try {
			const response = await jiraRequest<{ total?: number }>(`/rest/api/3/issue/${encodeURIComponent(objectId)}/changelog`, {
				label: 'Loading Jira history...',
				query: { maxResults: 1 }
			});
			return { count: response.total ?? 0, source: 'api' };
		} catch (error) {
			errorHandler.logWarning(`Could not load changelog count for ${objectId}: ${error instanceof Error ? error.message : String(error)}`, 'JiraBackend.getUserStoryRevisionsCount');
			return { count: 0, source: 'api' };
		}
	}

	async getUserStoryRevisions(objectId: string): Promise<RevisionsResult> {
		try {
			const response = await jiraRequest<{ values?: any[]; total?: number }>(`/rest/api/3/issue/${encodeURIComponent(objectId)}/changelog`, {
				label: 'Loading Jira history...',
				query: { maxResults: 100 }
			});
			const revisions = await formatChangelog(response.values ?? []);
			return { revisions, source: 'api', count: response.total ?? revisions.length };
		} catch (error) {
			errorHandler.logWarning(`Could not load changelog for ${objectId}: ${error instanceof Error ? error.message : String(error)}`, 'JiraBackend.getUserStoryRevisions');
			return { revisions: [], source: 'api', count: 0 };
		}
	}

	// ---------------------------------------------------------------- search

	async globalSearch(term: string, options: { limitPerType?: number; searchType?: string; offset?: number } = {}): Promise<GlobalSearchResult> {
		const trimmed = (term ?? '').trim();
		if (!trimmed) {
			return { results: [], hasMore: false, source: 'api' };
		}

		const config = getJiraConfig();
		const escaped = jqlEscape(trimmed);
		// Unlike Rally, one JQL query covers every artifact type at once.
		const jql = `${this.projectClause(config)} AND (key = "${escaped}" OR summary ~ "${escaped}*" OR text ~ "${escaped}") ORDER BY updated DESC`;

		const limit = options.limitPerType ?? 50;
		const { issues, hasMore } = await searchJql(jql, LIGHT_FIELDS, { offset: options.offset ?? 0, limit, label: `Searching Jira for "${trimmed}"...` }, config);

		const results: GlobalSearchResultItem[] = issues.map(issue => {
			const f = issue.fields ?? {};
			const typeName = (f.issuetype?.name ?? '').toLowerCase();

			const entityType: GlobalSearchResultItem['entityType'] = typeName === 'bug' ? 'defect' : f.issuetype?.subtask ? 'task' : TEST_ISSUE_TYPES.some(t => t.toLowerCase() === typeName) ? 'testcase' : 'userstory';

			return {
				entityType,
				formattedId: issue.key,
				name: f.summary ?? '',
				objectId: issue.id,
				project: f.project?.name ?? null,
				iteration: null,
				_ref: issue.self
			};
		});

		return { results, hasMore, source: 'api' };
	}

	// ---------------------------------------------------------------- team analytics

	async getRecentTeamMembers(numberOfIterations = 3): Promise<TeamMembersResult> {
		const config = getJiraConfig();
		const sprints = await getBoardSprints(config);
		const recent = sprints
			.filter(s => s.state !== 'future')
			.slice(-numberOfIterations)
			.map(s => s.id);

		if (!recent.length) {
			return { teamMembers: [], source: 'api', count: 0 };
		}

		const jql = `${this.projectClause(config)} AND sprint in (${recent.join(', ')}) AND assignee is not EMPTY ORDER BY updated DESC`;
		const issues = await searchJqlAll(jql, ['assignee'], { label: 'Loading team members...' }, config);

		const names = [...new Set(issues.map(i => i.fields?.assignee?.displayName).filter(Boolean))] as string[];
		return { teamMembers: names, source: 'api', count: names.length };
	}

	/**
	 * Hours are derived from Jira time tracking: total = original estimate, completed = time spent.
	 */
	private async sprintIssuesFor(assignee: string | null, sprintId: string | undefined, config: JiraConfig): Promise<JiraIssue[]> {
		const clauses = [this.projectClause(config)];
		if (sprintId) {
			clauses.push(`sprint = ${/^\d+$/.test(sprintId) ? sprintId : `"${jqlEscape(sprintId)}"`}`);
		} else {
			clauses.push('sprint in openSprints()');
		}
		if (assignee) {
			clauses.push(`assignee = "${jqlEscape(assignee)}"`);
		}

		return searchJqlAll(clauses.join(' AND '), ['assignee', 'timetracking', 'timeoriginalestimate', 'timespent', 'status'], { label: 'Loading sprint progress...' }, config);
	}

	private static hoursOf(issue: JiraIssue): { total: number; done: number } {
		const f = issue.fields ?? {};
		const toHours = (s: unknown) => (Number.isFinite(Number(s)) && Number(s) > 0 ? Number(s) / 3600 : 0);
		const total = toHours(f.timetracking?.originalEstimateSeconds ?? f.timeoriginalestimate);
		const spent = toHours(f.timetracking?.timeSpentSeconds ?? f.timespent);
		const isDone = f.status?.statusCategory?.key === 'done';
		return { total, done: isDone ? total || spent : spent };
	}

	async getUserSprintProgress(userName: string, iterationId?: string): Promise<SprintProgressResult> {
		const config = getJiraConfig();
		const issues = await this.sprintIssuesFor(userName, iterationId, config);

		let totalHours = 0;
		let completedHours = 0;
		for (const issue of issues) {
			const { total, done } = JiraBackend.hoursOf(issue);
			totalHours += total;
			completedHours += done;
		}

		return {
			completedHours: Math.round(completedHours * 100) / 100,
			totalHours: Math.round(totalHours * 100) / 100,
			percentage: totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0,
			source: 'api',
			userStoriesCount: issues.length
		};
	}

	async getAllTeamMembersProgress(teamMembers?: string[], iterationId?: string): Promise<AllTeamMembersProgressResult> {
		const config = getJiraConfig();
		// One query for the whole sprint, then group by assignee — avoids N round-trips.
		const issues = await this.sprintIssuesFor(null, iterationId, config);

		const progressMap = new Map<string, { completedHours: number; totalHours: number; percentage: number; source: string; userStoriesCount: number }>();

		for (const issue of issues) {
			const name = issue.fields?.assignee?.displayName;
			if (!name) {
				continue;
			}
			const entry = progressMap.get(name) ?? { completedHours: 0, totalHours: 0, percentage: 0, source: 'api', userStoriesCount: 0 };
			const { total, done } = JiraBackend.hoursOf(issue);
			entry.totalHours += total;
			entry.completedHours += done;
			entry.userStoriesCount += 1;
			progressMap.set(name, entry);
		}

		for (const entry of progressMap.values()) {
			entry.totalHours = Math.round(entry.totalHours * 100) / 100;
			entry.completedHours = Math.round(entry.completedHours * 100) / 100;
			entry.percentage = entry.totalHours > 0 ? Math.round((entry.completedHours / entry.totalHours) * 100) : 0;
		}

		const members = teamMembers?.length ? teamMembers : [...progressMap.keys()];
		return { progressMap, members };
	}

	async getMemberHoursHistory(memberName: string, numberOfSprints = 6): Promise<MemberHoursHistoryResult> {
		const config = getJiraConfig();
		const sprints = (await getBoardSprints(config)).filter(s => s.state !== 'future').slice(-numberOfSprints);

		const history = [];
		for (const sprint of sprints) {
			const issues = await this.sprintIssuesFor(memberName, String(sprint.id), config);
			const all = await this.sprintIssuesFor(null, String(sprint.id), config);

			let totalHours = 0;
			let completedHours = 0;
			for (const issue of issues) {
				const { total, done } = JiraBackend.hoursOf(issue);
				totalHours += total;
				completedHours += done;
			}

			history.push({
				iterationName: sprint.name,
				totalHours: Math.round(totalHours * 100) / 100,
				completedHours: Math.round(completedHours * 100) / 100,
				sprintTotalHours: Math.round(all.reduce((sum, i) => sum + JiraBackend.hoursOf(i).total, 0) * 100) / 100,
				userStoriesCount: issues.length
			});
		}

		return { history };
	}

	// ---------------------------------------------------------------- misc

	async fetchImageAsBase64(imageUrl: string): Promise<ImageFetchResult> {
		let config: JiraConfig;
		try {
			config = getJiraConfig();
		} catch (error) {
			return { error: error instanceof Error ? error.message : String(error) };
		}

		// Only proxy images hosted on the configured Jira site.
		let parsed: URL;
		try {
			parsed = new URL(imageUrl, config.instance);
		} catch {
			return { error: 'Invalid image URL' };
		}
		if (parsed.origin !== new URL(config.instance).origin) {
			return { error: 'Refused to fetch image from a host other than the configured Jira instance' };
		}

		try {
			return await callRallyFetch(async () => {
				const response = await fetchPolyfill(parsed.toString(), {
					headers: { Authorization: `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}` }
				} as RequestInit);

				if (!response.ok) {
					return { error: `Jira image request failed with status ${response.status}` };
				}

				const contentType = response.headers.get('content-type') ?? 'image/png';
				const buffer = Buffer.from(await response.arrayBuffer());
				return { dataUrl: `data:${contentType};base64,${buffer.toString('base64')}` };
			}, 'Loading Jira image...');
		} catch (error) {
			return { error: error instanceof Error ? error.message : String(error) };
		}
	}

	clearAllCaches(): void {
		clearJiraMetaCaches();
		this.storyPointsFieldPromise = null;
	}

	/** Jira sprint references are plain IDs, so there is nothing to parse out. */
	extractIterationId(ref: string | null | undefined): string | null {
		if (!ref) {
			return null;
		}
		const match = /(\d+)\s*$/.exec(String(ref));
		return match ? match[1] : String(ref);
	}

	/** Jira queries always hit the API; there is no client-side filtered cache to consult. */
	checkCacheForFilteredResults(_query: RallyQuery, _dataArray: RallyUserStory[]): unknown {
		return null;
	}
}

export { JiraConfigError };
