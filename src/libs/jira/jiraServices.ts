import { jiraData, jiraDataMeta, stampJiraData } from '../../extension.js';
import { ttlFor, isStale, type CacheEntity } from '../cache/ttlConfig';
import type { JiraProject, JiraUser, JiraUserStory, GlobalSearchResultItem } from '../../types/jira';
import { validateJiraConfiguration, clearUtilsCaches } from './utils';
import { getJiraSettings, jiraRequest, searchIssues, projectJql, quoteJql, JIRA_FIELDS, BUG_ISSUE_TYPES, SUBTASK_ISSUE_TYPE } from './jiraClient';
import { setJiraBroadcaster, callJira } from './jiraCall';
import { ErrorHandler } from '../../ErrorHandler';
import { getUserStoriesCacheManager, getProjectsCacheManager, getIterationsCacheManager, clearAllCaches as _clearAllCachesService } from './CacheService';

const errorHandler = ErrorHandler.getInstance();

const PAGE_SIZE = 100;
const CHUNK_SIZE = 25;

const STORY_FIELDS = ['summary', 'description', 'status', 'priority', 'assignee', 'project', 'created', 'subtasks', 'issuetype', 'aggregatetimeoriginalestimate', 'aggregatetimeestimate', 'aggregatetimespent', JIRA_FIELDS.sprint, JIRA_FIELDS.storyPoints, JIRA_FIELDS.flagged];
const DEFECT_FIELDS = ['summary', 'description', 'status', 'priority', 'assignee', 'project', 'created', 'issuetype', JIRA_FIELDS.sprint, JIRA_FIELDS.flagged];
const TASK_FIELDS = ['summary', 'description', 'status', 'assignee', 'parent', 'issuetype', 'project', 'timeoriginalestimate', 'timeestimate', 'timespent', 'created'];

const SCHEDULE_STATE_BY_CATEGORY: Record<string, string> = {
	new: 'Defined',
	indeterminate: 'In-Progress',
	done: 'Completed'
};

const ITERATION_STATE_BY_SPRINT_STATE: Record<string, string> = {
	active: 'Active',
	closed: 'Closed',
	future: 'Future'
};

function formatCacheMs(ms: number): string {
	if (!Number.isFinite(ms)) {
		return '∞';
	}
	if (ms < 60_000) {
		return `${Math.round(ms / 1000)}s`;
	}
	if (ms < 3_600_000) {
		return `${Math.round(ms / 60_000)}m`;
	}
	return `${Math.round((ms / 3_600_000) * 10) / 10}h`;
}

function jiraDataFresh(entity: CacheEntity, maxAge?: number): boolean {
	const fetchedAt = jiraDataMeta[entity] ?? 0;
	const ttl = maxAge ?? ttlFor(entity);
	const fresh = !isStale(fetchedAt, ttl);
	const ageLabel = fetchedAt ? formatCacheMs(Date.now() - fetchedAt) : 'never';
	errorHandler.logDebug(`[cache] ${entity}: ${fresh ? 'FRESH → serve from jiraData' : 'STALE → refetch from API'} (age=${ageLabel}, ttl=${formatCacheMs(ttl)})`, 'jiraServices.cache');
	return fresh;
}

export { setJiraBroadcaster };

function escapeHtml(input: string): string {
	return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function normalizeName(name: string): string {
	if (!name) {
		return '';
	}
	return name.trim().replace(/\s+/g, ' ');
}

async function ensureConfigured(): Promise<void> {
	const validation = await validateJiraConfiguration();
	if (!validation.isValid) {
		throw new Error(`Jira configuration error: ${validation.errors.join(', ')}`);
	}
}

/** Converteix un node ADF (format de descripcions de Jira Cloud) a text pla. */
function adfToText(node: any): string {
	if (node == null) {
		return '';
	}
	if (typeof node === 'string') {
		return node;
	}
	if (node.type === 'text') {
		return node.text ?? '';
	}
	if (node.type === 'hardBreak') {
		return '\n';
	}
	const children = Array.isArray(node.content) ? node.content.map(adfToText).join('') : '';
	const blockTypes = ['paragraph', 'heading', 'listItem', 'codeBlock', 'blockquote'];
	return blockTypes.includes(node.type) ? `${children}\n` : children;
}

/** Descripció en HTML escapat (la webview la sanititza amb DOMPurify). */
function descriptionToHtml(description: unknown): string | null {
	if (description == null) {
		return null;
	}
	const text = typeof description === 'string' ? description : adfToText(description).trim();
	return escapeHtml(text).replace(/\n/g, '<br>');
}

function hours(seconds: number | null | undefined): number {
	return typeof seconds === 'number' ? Math.round((seconds / 3600) * 100) / 100 : 0;
}

function isFlagged(fields: any): boolean {
	const value = fields[JIRA_FIELDS.flagged];
	return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function scheduleStateOf(issue: any): string {
	return SCHEDULE_STATE_BY_CATEGORY[issue.fields.status?.statusCategory?.key] ?? 'Unknown';
}

function sprintsOf(issue: any): any[] {
	const value = issue.fields[JIRA_FIELDS.sprint];
	return Array.isArray(value) ? value : [];
}

function currentSprintOf(issue: any): any | null {
	const sprints = sprintsOf(issue);
	return sprints.find(sprint => sprint.state === 'active') ?? sprints[sprints.length - 1] ?? null;
}

function iterationRefOf(sprint: any | null): { objectId: string; _ref: string; _refObjectName: string } | null {
	if (!sprint) {
		return null;
	}
	return {
		objectId: String(sprint.id),
		_ref: `/iteration/${sprint.id}`,
		_refObjectName: sprint.name
	};
}

/** Extreu l'objectId numèric d'un ref d'iteració (`/iteration/123` o una URL completa). */
export function extractIterationId(ref: string | null | undefined): string | null {
	if (!ref) {
		return null;
	}
	const id = String(ref).split('/').pop();
	return id && id.length ? id : null;
}

function formatStory(issue: any): any {
	const f = issue.fields;
	const assignee = f.assignee?.displayName ?? 'Unassigned';
	return {
		objectId: String(issue.id),
		formattedId: issue.key,
		name: f.summary ?? '',
		description: descriptionToHtml(f.description),
		state: f.status?.name ?? 'Unknown',
		planEstimate: f[JIRA_FIELDS.storyPoints] ?? 0,
		toDo: hours(f.aggregatetimeestimate),
		owner: assignee,
		assignee,
		project: f.project?.key ?? null,
		iteration: iterationRefOf(currentSprintOf(issue)),
		blocked: isFlagged(f),
		blockedReason: null,
		taskEstimateTotal: hours(f.aggregatetimeoriginalestimate ?? f.timeoriginalestimate),
		timeSpent: hours(f.aggregatetimespent ?? f.timespent),
		taskStatus: f.status?.name,
		tasksCount: (f.subtasks ?? []).length,
		defectsCount: 0,
		discussionCount: 0,
		revisionsCount: 0,
		appgar: '',
		scheduleState: scheduleStateOf(issue),
		creationDate: f.created,
		_ref: `/hierarchicalrequirement/${issue.id}`
	};
}

function formatDefect(issue: any): any {
	const f = issue.fields;
	const sprint = currentSprintOf(issue);
	return {
		objectId: String(issue.id),
		formattedId: issue.key,
		name: f.summary ?? '',
		description: descriptionToHtml(f.description),
		state: f.status?.name ?? 'Unknown',
		severity: f.priority?.name ?? 'Unset',
		priority: f.priority?.name ?? 'Unset',
		owner: f.assignee?.displayName ?? 'Sense assignat',
		project: f.project?.key ?? null,
		iteration: sprint?.name ?? null,
		scheduleState: scheduleStateOf(issue),
		blocked: isFlagged(f),
		blockedReason: null,
		discussionCount: 0,
		_ref: `/defect/${issue.id}`
	};
}

function formatTask(issue: any): any {
	const f = issue.fields;
	return {
		objectId: String(issue.id),
		formattedId: issue.key,
		name: f.summary ?? '',
		description: descriptionToHtml(f.description),
		state: scheduleStateOf(issue),
		owner: f.assignee?.displayName ?? 'Sense propietari',
		estimate: hours(f.timeoriginalestimate),
		toDo: hours(f.timeestimate),
		timeSpent: hours(f.timespent),
		workItem: f.parent?.key ?? null,
		project: f.project?.key ?? null,
		iteration: null,
		blocked: false,
		rank: 0,
		_ref: `/task/${issue.id}`
	};
}

function formatProject(project: any): JiraProject {
	return {
		objectId: String(project.id),
		name: project.name,
		state: project.archived ? 'Archived' : 'Open',
		description: project.description ?? '',
		owner: project.lead?.displayName ?? 'Sense propietari',
		parent: null,
		childrenCount: 0,
		_ref: `/project/${project.id}`
	} as JiraProject;
}

function formatUser(user: any): JiraUser {
	return {
		objectId: String(user.accountId),
		displayName: user.displayName,
		userName: user.emailAddress ?? user.displayName,
		emailAddress: user.emailAddress,
		disabled: user.active === false,
		_ref: `/user/${user.accountId}`
	} as JiraUser;
}

function addToCache(newItems: any[], cacheArray: any[], idField: string) {
	for (const newItem of newItems) {
		const existingIndex = cacheArray.findIndex(existing => existing[idField] === newItem[idField]);
		if (existingIndex === -1) {
			cacheArray.push(newItem);
		} else {
			cacheArray[existingIndex] = newItem;
		}
	}
}

/** Tradueix les claus de query de la UI (estil Jira) a clàusules JQL. */
function buildJqlClauses(query: Record<string, unknown>): string[] {
	const clauses: string[] = [];
	for (const [key, raw] of Object.entries(query)) {
		if (raw === undefined || raw === null || raw === '') {
			continue;
		}
		const value = String(raw);
		if (key === 'Iteration') {
			const id = extractIterationId(value);
			if (id && /^\d+$/.test(id)) {
				clauses.push(`sprint = ${id}`);
			}
		} else if (key === 'Project') {
			clauses.push(`project = ${quoteJql(value)}`);
		} else if (key === 'Name') {
			clauses.push(`summary ~ ${quoteJql(value)}`);
		} else if (key === 'Owner') {
			clauses.push(value === 'currentuser' ? 'assignee = currentUser()' : `assignee = ${quoteJql(value)}`);
		}
	}
	return clauses;
}

function storyJql(query: Record<string, unknown> = {}): string {
	const clauses = buildJqlClauses(query)
		.map(clause => ` AND ${clause}`)
		.join('');
	return `${projectJql()} AND issuetype != ${quoteJql(SUBTASK_ISSUE_TYPE)}${clauses} ORDER BY created DESC`;
}

function defectJql(query: Record<string, unknown> = {}): string {
	const types = BUG_ISSUE_TYPES.map(quoteJql).join(', ');
	const clauses = buildJqlClauses(query)
		.map(clause => ` AND ${clause}`)
		.join('');
	return `${projectJql()} AND issuetype in (${types})${clauses} ORDER BY created DESC`;
}

function taskJqlForParents(parentIds: string[]): string {
	return `${projectJql()} AND issuetype = ${quoteJql(SUBTASK_ISSUE_TYPE)} AND parent in (${parentIds.join(', ')})`;
}

/** Comprova la capa de cache en memòria (jiraData) per a les queries filtrades. */
export function checkCacheForFilteredResults(query: Record<string, unknown>, dataArray: any[]) {
	if (Object.keys(query).length && dataArray && dataArray.length) {
		const filteredResults = dataArray.filter(item =>
			Object.keys(query).every(key => {
				if (key === 'Iteration') {
					const queryId = extractIterationId(query[key] as string);
					const itemId = item.iteration?.objectId;
					return queryId != null && itemId != null && String(itemId) === String(queryId);
				}
				if (item[key] === undefined) {
					return false;
				}
				return item[key] === query[key];
			})
		);

		if (filteredResults.length) {
			return {
				results: filteredResults,
				source: 'cache',
				count: filteredResults.length
			};
		}
	}
	return null;
}

export async function getProjects(query: Record<string, unknown> = {}, limit: number | null = null) {
	errorHandler.logDebug(`getProjects called with query: ${JSON.stringify(query)}, limit: ${limit}`, 'jiraServices.getProjects');

	const cacheKey = `projects:${JSON.stringify(query)}:${limit}`;
	const cacheMgr = getProjectsCacheManager();
	const cached = cacheMgr.get(cacheKey);
	if (cached) {
		return { projects: cached, source: 'ttl-cache', count: cached.length };
	}

	await ensureConfigured();
	const response = await callJira(() => jiraRequest<{ values: any[] }>(`/rest/api/3/project/search?maxResults=${limit ?? 100}`), 'Loading projects...');
	const projects = (response.values ?? []).map(formatProject);

	jiraData.projects = projects as any;
	stampJiraData('projects');
	cacheMgr.set(cacheKey, projects, ttlFor('projects'));

	return { projects, source: 'api', count: projects.length };
}

export async function getCurrentUser() {
	if (jiraData.currentUser && jiraDataFresh('currentUser')) {
		return { user: jiraData.currentUser, source: 'cache' };
	}

	await ensureConfigured();
	const response = await callJira(() => jiraRequest<any>('/rest/api/3/myself'), 'Loading current user...');
	const user = formatUser(response);

	jiraData.currentUser = user;
	stampJiraData('currentUser');
	return { user, source: 'api' };
}

export async function getUsers(query: Record<string, unknown> = {}, limit: number | null = null) {
	errorHandler.logDebug(`getUsers called with query: ${JSON.stringify(query)}, limit: ${limit}`, 'jiraServices.getUsers');

	await ensureConfigured();
	const { projectKey } = getJiraSettings();
	const search = String(query.DisplayName ?? query.displayName ?? '');
	const response = await callJira(
		() =>
			jiraRequest<any[]>(
				projectKey
					? `/rest/api/3/user/assignable/search?project=${encodeURIComponent(projectKey)}&query=${encodeURIComponent(search)}&maxResults=${limit ?? 1000}`
					: search
						? `/rest/api/3/user/search?query=${encodeURIComponent(search)}&maxResults=${limit ?? 1000}`
						: `/rest/api/3/users/search?maxResults=${limit ?? 1000}`
			),
		'Loading users...'
	);
	const users = (response ?? []).filter(user => user.accountType === undefined || user.accountType === 'atlassian').map(formatUser);

	jiraData.users = users as any;
	stampJiraData('users');

	return { users, source: 'api', count: users.length };
}

export async function getIterations(query: Record<string, unknown> = {}, limit: number | null = null, opts?: { maxAge?: number }) {
	errorHandler.logDebug(`getIterations called with query: ${JSON.stringify(query)}, limit: ${limit}`, 'jiraServices.getIterations');

	const cacheKey = `iterations:${JSON.stringify(query)}`;
	const iterationsTtl = opts?.maxAge ?? ttlFor('iterations');
	const iterationsCacheMgr = getIterationsCacheManager();
	const cachedHit = iterationsCacheMgr.getWithMeta(cacheKey);
	if (cachedHit && !isStale(cachedHit.timestamp, iterationsTtl)) {
		return {
			iterations: cachedHit.data,
			source: 'ttl-cache',
			count: cachedHit.data.length
		};
	}

	await ensureConfigured();

	// Jira has no iteration entity in the project API: the sprints are the values of
	// customfield_10020 across the project's issues. Their hours are the original estimates
	// of the stories whose current sprint is the sprint.
	const issues = await callJira(() => searchIssues(`${projectJql()} AND sprint is not EMPTY ORDER BY created DESC`, ['issuetype', 'project', JIRA_FIELDS.sprint, 'aggregatetimeoriginalestimate'], 5000), 'Loading sprints...');

	const byId = new Map<string, any>();
	for (const issue of issues) {
		for (const sprint of sprintsOf(issue)) {
			const id = String(sprint.id);
			if (!byId.has(id)) {
				byId.set(id, {
					objectId: id,
					name: sprint.name,
					startDate: sprint.startDate ?? '',
					endDate: sprint.endDate ?? '',
					state: ITERATION_STATE_BY_SPRINT_STATE[sprint.state] ?? sprint.state ?? 'Unknown',
					project: issue.fields.project?.key ?? getJiraSettings().projectKey ?? null,
					projects: [],
					taskEstimateTotal: 0,
					_ref: `/iteration/${id}`
				});
			}
			const projectKey = issue.fields.project?.key;
			const sprintProjects: string[] = byId.get(id).projects;
			if (projectKey && !sprintProjects.includes(projectKey)) {
				sprintProjects.push(projectKey);
			}
		}
		const current = currentSprintOf(issue);
		if (current && issue.fields.issuetype?.name !== SUBTASK_ISSUE_TYPE) {
			byId.get(String(current.id)).taskEstimateTotal += hours(issue.fields.aggregatetimeoriginalestimate);
		}
	}

	let iterations = Array.from(byId.values()).sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
	if (limit) {
		iterations = iterations.slice(0, limit);
	}

	jiraData.iterations = iterations as any;
	stampJiraData('iterations');
	iterationsCacheMgr.set(cacheKey, iterations, ttlFor('iterations'));

	return { iterations, source: 'api', count: iterations.length };
}

/** Busca el sprint objectiu: l'indicat, o el sprint actiu/en curs per dates. */
function findTargetIteration(iterations: any[], iterationId?: string) {
	if (iterationId && iterationId !== 'current') {
		return iterations.find(iteration => String(iteration.objectId) === String(iterationId));
	}
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const activeIterations = iterations.filter(iteration => {
		const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
		const endDate = iteration.endDate ? new Date(iteration.endDate) : null;
		if (startDate) startDate.setHours(0, 0, 0, 0);
		if (endDate) endDate.setHours(0, 0, 0, 0);
		if (startDate && endDate) return today >= startDate && today <= endDate;
		if (startDate) return today >= startDate;
		if (endDate) return today <= endDate;
		return false;
	});
	if (activeIterations.length === 0) {
		return undefined;
	}
	const sprintIterations = activeIterations.filter(iteration => iteration.name.toLowerCase().includes('sprint'));
	return sprintIterations.length > 0 ? sprintIterations[0] : activeIterations[0];
}

export async function getUserStories(query: Record<string, unknown> = {}, offset: number = 0) {
	errorHandler.logDebug(`getUserStories called with query: ${JSON.stringify(query)}, offset: ${offset}`, 'jiraServices.getUserStories');

	await ensureConfigured();
	const jql = storyJql(query);
	const hasFilters = Object.keys(query).length > 0;

	// Filtered queries (sprint, owner) need the complete set for hours and progress views.
	if (hasFilters && offset === 0) {
		const issues = await callJira(() => searchIssues(jql, STORY_FIELDS, 5000), 'Loading user stories...');
		const userStories = issues.map(formatStory);
		addToCache(userStories, jiraData.userStories, 'objectId');
		stampJiraData('userStories');
		return {
			userStories,
			source: 'api',
			count: userStories.length,
			totalCount: userStories.length,
			hasMore: false,
			offset: 0
		};
	}

	const issues = await callJira(() => searchIssues(jql, STORY_FIELDS, offset + PAGE_SIZE + 1), 'Loading user stories...');
	const userStories = issues.slice(offset, offset + PAGE_SIZE).map(formatStory);
	addToCache(userStories, jiraData.userStories, 'objectId');
	stampJiraData('userStories');

	return {
		userStories,
		source: 'api',
		count: userStories.length,
		totalCount: 0,
		hasMore: issues.length > offset + PAGE_SIZE,
		offset
	};
}

export async function getTasks(userStoryId: string, query: Record<string, unknown> = {}, limit: number | null = null) {
	errorHandler.logDebug(`getTasks called for user story: ${userStoryId}, with query: ${JSON.stringify(query)}, limit: ${limit}`, 'jiraServices.getTasks');

	await ensureConfigured();
	const jql = `${projectJql()} AND issuetype = ${quoteJql(SUBTASK_ISSUE_TYPE)} AND parent = ${userStoryId} ORDER BY created ASC`;
	const issues = await callJira(() => searchIssues(jql, TASK_FIELDS, limit ?? 1000), 'Loading tasks...');
	const tasks = issues.map(formatTask);

	addToCache(tasks, jiraData.tasks, 'objectId');
	stampJiraData('tasks');

	return { tasks, source: 'api', count: tasks.length };
}

export async function getDefects(query: Record<string, unknown> = {}, offset: number = 0) {
	errorHandler.logDebug(`getDefects called with query: ${JSON.stringify(query)}, offset: ${offset}`, 'jiraServices.getDefects');

	await ensureConfigured();
	const jql = defectJql(query);
	const isFiltered = Object.keys(query).length > 0;

	if (isFiltered) {
		const issues = await callJira(() => searchIssues(jql, DEFECT_FIELDS, 5000), 'Loading defects...');
		const defects = issues.map(formatDefect);
		addToCache(defects, jiraData.defects, 'objectId');
		stampJiraData('defects');
		return {
			defects,
			source: 'api',
			count: defects.length,
			hasMore: false,
			totalCount: defects.length,
			offset: 0
		};
	}

	const issues = await callJira(() => searchIssues(jql, DEFECT_FIELDS, offset + PAGE_SIZE + 1), 'Loading defects...');
	const defects = issues.slice(offset, offset + PAGE_SIZE).map(formatDefect);
	addToCache(defects, jiraData.defects, 'objectId');
	stampJiraData('defects');

	return {
		defects,
		source: 'api',
		count: defects.length,
		totalCount: 0,
		hasMore: issues.length > offset + PAGE_SIZE,
		offset
	};
}

/** Incidències (bugs) enllaçades a una història. Jira les relaciona amb issue links. */
export async function getUserStoryDefects(userStoryId: string) {
	await ensureConfigured();
	const story = await callJira(() => jiraRequest<any>(`/rest/api/3/issue/${userStoryId}?fields=issuelinks`), 'Loading defects...');
	const bugTypes = new Set<string>(BUG_ISSUE_TYPES);
	const keys: string[] = [];
	for (const link of story.fields?.issuelinks ?? []) {
		const linked = link.outwardIssue ?? link.inwardIssue;
		if (linked && bugTypes.has(linked.fields?.issuetype?.name)) {
			keys.push(linked.key);
		}
	}

	if (keys.length === 0) {
		return { defects: [], source: 'api', count: 0, hasMore: false };
	}

	const issues = await searchIssues(`${projectJql()} AND key in (${keys.map(quoteJql).join(', ')}) ORDER BY created DESC`, DEFECT_FIELDS, 1000);
	const defects = issues.map(formatDefect);
	return { defects, source: 'api', count: defects.length, hasMore: false };
}

/** Comentaris de la incidència, mostrats com a discussions. */
export async function getUserStoryDiscussions(userStoryId: string) {
	await ensureConfigured();
	const response = await callJira(() => jiraRequest<{ comments: any[] }>(`/rest/api/3/issue/${userStoryId}/comment?expand=renderedBody&orderBy=created&maxResults=100`), 'Loading discussions...');
	const discussions = (response.comments ?? []).map(comment => ({
		objectId: String(comment.id),
		text: comment.renderedBody ?? escapeHtml(adfToText(comment.body).trim()),
		author: comment.author?.displayName ?? 'Unknown',
		createdDate: comment.created ?? '',
		userStoryId: String(userStoryId)
	}));
	return {
		discussions,
		source: 'api',
		count: discussions.length,
		hasMore: false
	};
}

/** Tasques (subtasques) de moltes històries en una sola consulta. */
async function getBatchTasks(storyIds: string[]): Promise<Map<string, any[]>> {
	const tasksByStory = new Map<string, any[]>();
	for (let i = 0; i < storyIds.length; i += CHUNK_SIZE * 2) {
		const chunk = storyIds.slice(i, i + CHUNK_SIZE * 2);
		if (chunk.length === 0) {
			continue;
		}
		const issues = await searchIssues(taskJqlForParents(chunk), TASK_FIELDS, 5000);
		for (const issue of issues) {
			const parentId = String(issue.fields.parent?.id ?? '');
			if (!tasksByStory.has(parentId)) {
				tasksByStory.set(parentId, []);
			}
			tasksByStory.get(parentId)!.push(formatTask(issue));
		}
	}
	return tasksByStory;
}

export async function getRecentTeamMembers(numberOfIterations: number = 3) {
	errorHandler.logDebug(`Getting team members from last ${numberOfIterations} iterations`, 'jiraServices.getRecentTeamMembers');

	const { iterations } = await getIterations();
	const today = new Date();
	today.setHours(23, 59, 59, 999);
	const recent = [...iterations]
		.filter(iteration => iteration.endDate && new Date(iteration.endDate) <= today)
		.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
		.slice(0, numberOfIterations);

	const names = new Set<string>();
	for (const iteration of recent) {
		const { userStories } = await getUserStories({
			Iteration: `/iteration/${iteration.objectId}`
		});
		for (const story of userStories) {
			if (story.assignee && story.assignee !== 'Unassigned') {
				names.add(normalizeName(story.assignee));
			}
		}
	}

	const teamMembers = Array.from(names).sort();
	return { teamMembers, source: 'api', count: teamMembers.length };
}

function memberProgress(stories: any[], tasksByStory: Map<string, any[]>) {
	let completedHours = 0;
	let totalHours = 0;
	for (const story of stories) {
		const storyHours = story.taskEstimateTotal || 0;
		totalHours += storyHours;
		if (story.scheduleState === 'Completed' || story.scheduleState === 'Accepted') {
			completedHours += storyHours;
		} else {
			for (const task of tasksByStory.get(story.objectId) || []) {
				if (task.state === 'Completed') {
					completedHours += task.estimate || 0;
				}
			}
		}
	}
	const percentage = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
	return { completedHours, totalHours, percentage };
}

export async function getUserSprintProgress(userName: string, iterationId?: string) {
	try {
		const { iterations } = await getIterations();
		const target = findTargetIteration(iterations, iterationId) ?? (iterationId ? undefined : iterations[0]);
		if (!target) {
			return { completedHours: 0, totalHours: 0, percentage: 0, source: 'api' };
		}

		const { userStories: allStories } = await getUserStories({
			Iteration: `/iteration/${target.objectId}`
		});
		const stories = allStories.filter(story => story.assignee === userName);
		if (stories.length === 0) {
			return { completedHours: 0, totalHours: 0, percentage: 0, source: 'api' };
		}

		const incompleteIds = stories.filter(story => story.scheduleState !== 'Completed').map(story => story.objectId);
		const tasksByStory = await getBatchTasks(incompleteIds);
		return { ...memberProgress(stories, tasksByStory), source: 'api' };
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'jiraServices.getUserSprintProgress');
		return { completedHours: 0, totalHours: 0, percentage: 0, source: 'error' };
	}
}

export async function getAllTeamMembersProgress(
	teamMembers?: string[],
	iterationId?: string
): Promise<{
	progressMap: Map<
		string,
		{
			completedHours: number;
			totalHours: number;
			percentage: number;
			source: string;
			userStoriesCount: number;
		}
	>;
	members: string[];
}> {
	const progressMap = new Map<
		string,
		{
			completedHours: number;
			totalHours: number;
			percentage: number;
			source: string;
			userStoriesCount: number;
		}
	>();

	try {
		const { iterations } = await getIterations();
		const target = findTargetIteration(iterations, iterationId);
		if (!target) {
			for (const member of teamMembers ?? []) {
				progressMap.set(member, {
					completedHours: 0,
					totalHours: 0,
					percentage: 0,
					source: 'no-iteration',
					userStoriesCount: 0
				});
			}
			return { progressMap, members: teamMembers ?? [] };
		}

		const { userStories: allUserStories } = await getUserStories({
			Iteration: `/iteration/${target.objectId}`
		});

		const storiesByUser = new Map<string, any[]>();
		const assigneeNameMap = new Map<string, string>();
		for (const story of allUserStories) {
			if (story.assignee && story.assignee !== 'Unassigned') {
				const normalized = normalizeName(story.assignee);
				if (!assigneeNameMap.has(normalized)) {
					assigneeNameMap.set(normalized, story.assignee);
				}
				if (!storiesByUser.has(normalized)) {
					storiesByUser.set(normalized, []);
				}
				storiesByUser.get(normalized)!.push(story);
			}
		}

		const resolvedMembers = teamMembers && teamMembers.length ? teamMembers : Array.from(assigneeNameMap.values()).sort();

		const incompleteStoryIds = allUserStories
			.filter(story => story.scheduleState !== 'Completed' && story.assignee && story.assignee !== 'Unassigned')
			.filter(story => resolvedMembers.some(member => normalizeName(member) === normalizeName(story.assignee)))
			.map(story => story.objectId);

		const tasksByStory = await getBatchTasks(incompleteStoryIds);

		for (const memberName of resolvedMembers) {
			const stories = storiesByUser.get(normalizeName(memberName)) || [];
			if (stories.length === 0) {
				progressMap.set(memberName, {
					completedHours: 0,
					totalHours: 0,
					percentage: 0,
					source: 'no-stories',
					userStoriesCount: 0
				});
				continue;
			}
			progressMap.set(memberName, {
				...memberProgress(stories, tasksByStory),
				source: 'api',
				userStoriesCount: stories.length
			});
		}

		return { progressMap, members: resolvedMembers };
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'jiraServices.getAllTeamMembersProgress');
		for (const member of teamMembers ?? []) {
			progressMap.set(member, {
				completedHours: 0,
				totalHours: 0,
				percentage: 0,
				source: 'error',
				userStoriesCount: 0
			});
		}
		return { progressMap, members: teamMembers ?? [] };
	}
}

export async function getMemberHoursHistory(
	memberName: string,
	numberOfSprints: number = 6
): Promise<{
	history: Array<{
		iterationName: string;
		totalHours: number;
		completedHours: number;
		sprintTotalHours: number;
		userStoriesCount: number;
	}>;
}> {
	try {
		const { iterations } = await getIterations();
		const today = new Date();
		today.setHours(23, 59, 59, 999);

		const recentIterations = [...iterations]
			.filter(iteration => iteration.endDate && new Date(iteration.endDate) <= today)
			.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
			.slice(0, numberOfSprints)
			.reverse();

		const normalizedMember = normalizeName(memberName);
		const history = await Promise.all(
			recentIterations.map(async iteration => {
				const { userStories: allStories } = await getUserStories({
					Iteration: `/iteration/${iteration.objectId}`
				});
				const memberStories = allStories.filter(story => story.assignee && story.assignee !== 'Unassigned' && normalizeName(story.assignee) === normalizedMember);
				const sprintTotalHours = allStories.reduce((sum, story) => sum + (story.taskEstimateTotal || 0), 0);
				const totalHours = memberStories.reduce((sum, story) => sum + (story.taskEstimateTotal || 0), 0);
				const completedHours = memberStories.filter(story => story.scheduleState === 'Completed' || story.scheduleState === 'Accepted').reduce((sum, story) => sum + (story.taskEstimateTotal || 0), 0);
				return {
					iterationName: iteration.name,
					totalHours,
					completedHours,
					sprintTotalHours,
					userStoriesCount: memberStories.length
				};
			})
		);

		return { history };
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'jiraServices.getMemberHoursHistory');
		return { history: [] };
	}
}

/**
 * Neteja les caches del servei (cache managers i validació).
 */
export function clearAllJiraCaches(): void {
	try {
		getUserStoriesCacheManager().clear();
		getProjectsCacheManager().clear();
		getIterationsCacheManager().clear();
		_clearAllCachesService();
		clearUtilsCaches();
		errorHandler.logInfo('All Jira caches cleared', 'jiraServices.clearAllJiraCaches');
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'jiraServices.clearAllJiraCaches');
	}
}

const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9_]+-\d+$/i;

export async function globalSearch(
	term: string,
	options?: { limitPerType?: number; searchType?: string; offset?: number }
): Promise<{
	results: GlobalSearchResultItem[];
	hasMore: boolean;
	source: string;
}> {
	const trimmed = (term || '').trim();
	if (!trimmed) {
		return { results: [], hasMore: false, source: 'api' };
	}

	await ensureConfigured();

	const limitPerType = options?.limitPerType ?? 15;
	const offset = options?.offset ?? 0;
	const searchType = options?.searchType ?? 'all';

	const textClause = ISSUE_KEY_PATTERN.test(trimmed) ? `(key = ${quoteJql(trimmed.toUpperCase())} OR text ~ ${quoteJql(trimmed)})` : `text ~ ${quoteJql(trimmed)}`;
	const scopes: Array<{
		entityType: GlobalSearchResultItem['entityType'];
		types: string[];
		/** Si es true, `types` se excluye en vez de incluirse. */
		exclude?: boolean;
		kind: string;
	}> = [
		{
			entityType: 'userstory',
			// Sin filtro por tipo: todo salvo subtareas y defectos, que tienen su propio ámbito.
			types: [SUBTASK_ISSUE_TYPE, ...BUG_ISSUE_TYPES],
			exclude: true,
			kind: 'user-stories'
		},
		{
			entityType: 'defect',
			types: BUG_ISSUE_TYPES as unknown as string[],
			kind: 'defects'
		},
		{ entityType: 'task', types: [SUBTASK_ISSUE_TYPE], kind: 'tasks' }
	];
	const selected = searchType === 'all' ? scopes : scopes.filter(scope => scope.kind === searchType);

	const runOne = async (scope: (typeof scopes)[0]): Promise<{ items: GlobalSearchResultItem[]; hasMore: boolean }> => {
		try {
			const jql = `${projectJql()} AND issuetype ${scope.exclude ? 'not in' : 'in'} (${scope.types.map(quoteJql).join(', ')}) AND ${textClause} ORDER BY created DESC`;
			const fields = scope.entityType === 'userstory' ? STORY_FIELDS : scope.entityType === 'defect' ? DEFECT_FIELDS : TASK_FIELDS;
			const issues = await searchIssues(jql, fields, offset + limitPerType + 1);
			const page = issues.slice(offset, offset + limitPerType);
			const items = page.map(issue => ({
				entityType: scope.entityType,
				formattedId: issue.key,
				name: issue.fields.summary ?? '',
				objectId: String(issue.id),
				project: issue.fields.project?.key ?? null,
				iteration: currentSprintOf(issue)?.name ?? null,
				_ref: `/${scope.entityType}/${issue.id}`
			}));
			return { items, hasMore: issues.length > offset + limitPerType };
		} catch (error) {
			errorHandler.logWarning(`Global search failed for ${scope.kind}: ${error instanceof Error ? error.message : String(error)}`, 'jiraServices.globalSearch');
			return { items: [], hasMore: false };
		}
	};

	const arrays = await Promise.all(selected.map(runOne));
	return {
		results: arrays.flatMap(a => a.items),
		hasMore: arrays.some(a => a.hasMore),
		source: 'api'
	};
}

export async function getUserStoryByObjectId(objectId: string): Promise<{ userStory: JiraUserStory | null }> {
	await ensureConfigured();
	const issue = await fetchIssueOrNull(objectId, STORY_FIELDS);
	return { userStory: issue ? (formatStory(issue) as JiraUserStory) : null };
}

export async function getDefectByObjectId(objectId: string): Promise<{ defect: any | null }> {
	await ensureConfigured();
	const issue = await fetchIssueOrNull(objectId, DEFECT_FIELDS);
	return { defect: issue ? formatDefect(issue) : null };
}

export async function getTaskWithParent(objectId: string): Promise<{ task: any; userStoryObjectId: string | null }> {
	await ensureConfigured();
	const issue = await fetchIssueOrNull(objectId, TASK_FIELDS);
	if (!issue) {
		return { task: null, userStoryObjectId: null };
	}
	const parentId = issue.fields.parent?.id;
	return {
		task: formatTask(issue),
		userStoryObjectId: parentId ? String(parentId) : null
	};
}

/** Resol la clau (p. ex. DSS-273) d'una incidència a partir del seu id numèric. */
export async function resolveIssueKey(objectId: string): Promise<string | null> {
	await ensureConfigured();
	const issue = await fetchIssueOrNull(objectId, ['summary']);
	return issue?.key ?? null;
}

async function fetchIssueOrNull(objectId: string, fields: string[]): Promise<any | null> {
	try {
		return await callJira(() => jiraRequest<any>(`/rest/api/3/issue/${encodeURIComponent(objectId)}?fields=${fields.join(',')}&expand=renderedFields`), 'Loading item...');
	} catch (error) {
		if (error instanceof Error && error.message.includes('404')) {
			return null;
		}
		throw error;
	}
}

/** Changelog complet de la incidència (ordenat cronològicament). */
async function fetchChangelog(objectId: string, maxResults: number = 100): Promise<any[]> {
	const values: any[] = [];
	let startAt = 0;
	let isLast = false;
	while (!isLast && values.length < 1000) {
		const page = await jiraRequest<any>(`/rest/api/3/issue/${encodeURIComponent(objectId)}/changelog?startAt=${startAt}&maxResults=${maxResults}`);
		values.push(...(page.values ?? []));
		startAt += (page.values ?? []).length;
		isLast = page.isLast ?? true;
		if (!page.values?.length) {
			break;
		}
	}
	return values;
}

export async function getUserStoryRevisionsCount(objectId: string): Promise<{ count: number; source: string }> {
	await ensureConfigured();
	const page = await callJira(() => jiraRequest<any>(`/rest/api/3/issue/${encodeURIComponent(objectId)}/changelog?maxResults=1`), 'Loading revision count...');
	return { count: page.total ?? 0, source: 'api' };
}

/** Converteix el changelog de Jira al text de revisió que entenen els parsers de la UI. */
export async function getUserStoryRevisions(objectId: string): Promise<{ revisions: any[]; source: string; count: number }> {
	await ensureConfigured();
	const entries = await callJira(() => fetchChangelog(objectId), 'Loading revision history...');
	const categoryByStatus = await getStatusCategoryByName();

	const revisions = entries.map((entry, index) => {
		const changes: string[] = [];
		for (const item of entry.items ?? []) {
			const from = item.fromString ?? '';
			const to = item.toString ?? '';
			if (item.field === 'status') {
				const fromState = SCHEDULE_STATE_BY_CATEGORY[categoryByStatus.get(from) ?? ''];
				const toState = SCHEDULE_STATE_BY_CATEGORY[categoryByStatus.get(to) ?? ''];
				if (fromState !== toState && fromState && toState) {
					changes.push(`SCHEDULE STATE changed from [${fromState}] to [${toState}]`);
				} else {
					changes.push(`STATUS changed from [${from}] to [${to}]`);
				}
			} else if (item.field === 'Sprint') {
				changes.push(`ITERATION changed from [${from}] to [${to}]`);
			} else if (item.field === 'Flagged') {
				changes.push(`BLOCKED changed from [${from ? 'true' : 'false'}] to [${to ? 'true' : 'false'}]`);
			} else {
				changes.push(`${String(item.field).toUpperCase()} changed from [${from}] to [${to}]`);
			}
		}
		return {
			revisionNumber: index + 1,
			description: changes.length ? changes.join(', ') : 'No description',
			author: entry.author?.displayName ?? 'Unknown',
			createdDate: entry.created,
			_ref: `/changelog/${entry.id}`
		};
	});

	const sorted = revisions.sort((a, b) => b.revisionNumber - a.revisionNumber);
	return { revisions: sorted, source: 'api', count: sorted.length };
}

async function getStatusCategoryByName(): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	try {
		const statuses = await jiraRequest<any[]>('/rest/api/3/status');
		for (const status of statuses ?? []) {
			map.set(status.name, status.statusCategory?.key ?? '');
		}
	} catch (error) {
		errorHandler.logWarning(`Could not load Jira statuses: ${error instanceof Error ? error.message : String(error)}`, 'jiraServices.getStatusCategoryByName');
	}
	return map;
}

/**
 * Descarrega una imatge de Jira (autenticada) i la retorna com a data URL.
 * Les webviews no poden afegir capçaleres d'autenticació a les peticions d'<img>.
 */
export async function fetchJiraImageAsBase64(imageUrl: string): Promise<{ dataUrl: string } | { error: string }> {
	const { baseUrl, email, apiToken } = getJiraSettings();
	if (!email || !apiToken) {
		return { error: 'No Jira API token configured' };
	}
	if (!baseUrl) {
		return { error: 'Blocked image URL (no Jira instance configured)' };
	}

	try {
		const base = new URL(baseUrl);
		const parsedUrl = new URL(imageUrl, base);
		if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname.toLowerCase() !== base.hostname.toLowerCase()) {
			return { error: 'Blocked image URL (host not allowed)' };
		}

		const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
		const response = await fetch(parsedUrl.toString(), {
			headers: { Authorization: `Basic ${auth}` }
		});
		if (!response.ok) {
			return { error: `Image request failed with status ${response.status}` };
		}
		const contentType = response.headers.get('content-type') || 'image/png';
		const buffer = Buffer.from(await response.arrayBuffer());
		return {
			dataUrl: `data:${contentType};base64,${buffer.toString('base64')}`
		};
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
}
