// Read-only Jira Cloud client. Mirrors src/libs/jira (jiraClient.ts / jiraServices.ts)
// without any dependency on VS Code. Configuration comes from ROBERT_JIRA_* env vars.

export const JIRA_FIELDS = {
	sprint: 'customfield_10020',
	storyPoints: 'customfield_10016',
	flagged: 'customfield_10021'
};

export const STORY_ISSUE_TYPES = ['Historia', 'Cambios Evolutivos', 'Entrega', 'Epic'];
export const BUG_ISSUE_TYPES = ['Incidencias'];
export const SUBTASK_ISSUE_TYPE = 'Subtarea';

const STORY_FIELDS = ['summary', 'description', 'status', 'priority', 'assignee', 'project', 'created', 'subtasks', 'issuetype', 'aggregatetimeoriginalestimate', 'aggregatetimeestimate', JIRA_FIELDS.sprint, JIRA_FIELDS.storyPoints, JIRA_FIELDS.flagged];
const DEFECT_FIELDS = ['summary', 'description', 'status', 'priority', 'assignee', 'project', 'created', 'issuetype', JIRA_FIELDS.sprint, JIRA_FIELDS.flagged];
const TASK_FIELDS = ['summary', 'description', 'status', 'assignee', 'parent', 'issuetype', 'project', 'timeoriginalestimate', 'timeestimate', 'timespent', 'created'];

const SCHEDULE_STATE_BY_CATEGORY = {
	new: 'Defined',
	indeterminate: 'In-Progress',
	done: 'Completed'
};
const ITERATION_STATE_BY_SPRINT_STATE = {
	active: 'Active',
	closed: 'Closed',
	future: 'Future'
};

export function getSettings() {
	return {
		baseUrl: (process.env.ROBERT_JIRA_BASE_URL || '').replace(/\/$/, ''),
		email: process.env.ROBERT_JIRA_EMAIL || '',
		apiToken: process.env.ROBERT_JIRA_API_TOKEN || '',
		projectKey: (process.env.ROBERT_JIRA_PROJECT_KEY || '').trim()
	};
}

export function validateSettings() {
	const { baseUrl, email, apiToken, projectKey } = getSettings();
	const errors = [];
	if (!baseUrl) {
		errors.push('ROBERT_JIRA_BASE_URL is not set');
	} else if (!baseUrl.startsWith('https://')) {
		errors.push('ROBERT_JIRA_BASE_URL must be an HTTPS URL');
	}
	if (!email.trim()) errors.push('ROBERT_JIRA_EMAIL is not set');
	if (!apiToken.trim()) errors.push('ROBERT_JIRA_API_TOKEN is not set');
	if (!projectKey) errors.push('ROBERT_JIRA_PROJECT_KEY is not set');
	return errors;
}

function ensureConfigured() {
	const errors = validateSettings();
	if (errors.length) {
		throw new Error(`Jira configuration error: ${errors.join(', ')}`);
	}
}

export async function jiraRequest(path) {
	const { baseUrl, email, apiToken } = getSettings();
	const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
	const response = await fetch(`${baseUrl}${path}`, {
		headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }
	});
	if (!response.ok) {
		const text = await response.text().catch(() => '');
		throw new Error(`Jira API returned ${response.status}: ${response.statusText} ${text.slice(0, 200)}`.trim());
	}
	return response.status === 204 ? undefined : response.json();
}

// JQL search is a POST in Jira's API but it is a read; GET /search/jql is not used
// because long JQL would overflow the URL.
async function jiraSearchPage(body) {
	const { baseUrl, email, apiToken } = getSettings();
	const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
	const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		const text = await response.text().catch(() => '');
		throw new Error(`Jira API returned ${response.status}: ${response.statusText} ${text.slice(0, 200)}`.trim());
	}
	return response.json();
}

async function searchIssues(jql, fields, max = 1000) {
	const issues = [];
	let nextPageToken;
	do {
		const page = await jiraSearchPage({
			jql,
			fields,
			maxResults: Math.min(100, max),
			...(nextPageToken ? { nextPageToken } : {})
		});
		issues.push(...(page.issues ?? []));
		nextPageToken = page.isLast ? undefined : page.nextPageToken;
	} while (nextPageToken && issues.length < max);
	return issues.slice(0, max);
}

const quoteJql = value => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const projectJql = () => `project = ${quoteJql(getSettings().projectKey)}`;

function adfToText(node) {
	if (node == null) return '';
	if (typeof node === 'string') return node;
	if (node.type === 'text') return node.text ?? '';
	if (node.type === 'hardBreak') return '\n';
	const children = Array.isArray(node.content) ? node.content.map(adfToText).join('') : '';
	const blocks = ['paragraph', 'heading', 'listItem', 'codeBlock', 'blockquote'];
	return blocks.includes(node.type) ? `${children}\n` : children;
}

const descriptionToText = description => (description == null ? null : adfToText(description).trim());

const hours = seconds => (typeof seconds === 'number' ? Math.round((seconds / 3600) * 100) / 100 : 0);

const isFlagged = fields => {
	const value = fields[JIRA_FIELDS.flagged];
	return Array.isArray(value) ? value.length > 0 : Boolean(value);
};

const scheduleStateOf = issue => SCHEDULE_STATE_BY_CATEGORY[issue.fields.status?.statusCategory?.key] ?? 'Unknown';

const sprintsOf = issue => {
	const value = issue.fields[JIRA_FIELDS.sprint];
	return Array.isArray(value) ? value : [];
};

const currentSprintOf = issue => {
	const sprints = sprintsOf(issue);
	return sprints.find(s => s.state === 'active') ?? sprints[sprints.length - 1] ?? null;
};

function formatStory(issue) {
	const f = issue.fields;
	const sprint = currentSprintOf(issue);
	return {
		id: String(issue.id),
		key: issue.key,
		type: f.issuetype?.name ?? null,
		summary: f.summary ?? '',
		description: descriptionToText(f.description),
		status: f.status?.name ?? 'Unknown',
		scheduleState: scheduleStateOf(issue),
		assignee: f.assignee?.displayName ?? 'Unassigned',
		priority: f.priority?.name ?? null,
		storyPoints: f[JIRA_FIELDS.storyPoints] ?? 0,
		originalEstimateHours: hours(f.aggregatetimeoriginalestimate),
		remainingHours: hours(f.aggregatetimeestimate),
		sprint: sprint ? { id: String(sprint.id), name: sprint.name, state: sprint.state } : null,
		blocked: isFlagged(f),
		subtasksCount: (f.subtasks ?? []).length,
		created: f.created
	};
}

function formatDefect(issue) {
	const f = issue.fields;
	const sprint = currentSprintOf(issue);
	return {
		id: String(issue.id),
		key: issue.key,
		summary: f.summary ?? '',
		description: descriptionToText(f.description),
		status: f.status?.name ?? 'Unknown',
		scheduleState: scheduleStateOf(issue),
		priority: f.priority?.name ?? 'Unset',
		assignee: f.assignee?.displayName ?? 'Unassigned',
		sprint: sprint?.name ?? null,
		blocked: isFlagged(f),
		created: f.created
	};
}

function formatTask(issue) {
	const f = issue.fields;
	return {
		id: String(issue.id),
		key: issue.key,
		summary: f.summary ?? '',
		description: descriptionToText(f.description),
		status: f.status?.name ?? 'Unknown',
		scheduleState: scheduleStateOf(issue),
		assignee: f.assignee?.displayName ?? 'Unassigned',
		estimateHours: hours(f.timeoriginalestimate),
		remainingHours: hours(f.timeestimate),
		spentHours: hours(f.timespent),
		parentKey: f.parent?.key ?? null
	};
}

const formatProject = p => ({
	id: String(p.id),
	key: p.key,
	name: p.name,
	archived: Boolean(p.archived),
	lead: p.lead?.displayName ?? null
});

const formatUser = u => ({
	accountId: u.accountId,
	displayName: u.displayName,
	email: u.emailAddress ?? null,
	active: u.active !== false
});

function filterClauses({ sprintId, assignee, text }) {
	const clauses = [];
	if (sprintId !== undefined && sprintId !== '') {
		if (!/^\d+$/.test(String(sprintId))) {
			throw new Error('sprintId must be a numeric sprint id (see jira_list_sprints)');
		}
		clauses.push(`sprint = ${sprintId}`);
	}
	if (assignee) {
		clauses.push(assignee === 'currentuser' ? 'assignee = currentUser()' : `assignee = ${quoteJql(assignee)}`);
	}
	if (text) clauses.push(`summary ~ ${quoteJql(text)}`);
	return clauses.map(c => ` AND ${c}`).join('');
}

export async function getCurrentUser() {
	ensureConfigured();
	return formatUser(await jiraRequest('/rest/api/3/myself'));
}

export async function listProjects(limit = 100) {
	ensureConfigured();
	const r = await jiraRequest(`/rest/api/3/project/search?maxResults=${limit}`);
	return (r.values ?? []).map(formatProject);
}

export async function listUsers({ query = '', limit = 100 } = {}) {
	ensureConfigured();
	const { projectKey } = getSettings();
	const r = await jiraRequest(`/rest/api/3/user/assignable/search?project=${encodeURIComponent(projectKey)}&query=${encodeURIComponent(query)}&maxResults=${limit}`);
	return (r ?? []).filter(u => u.accountType === undefined || u.accountType === 'atlassian').map(formatUser);
}

// Jira has no sprint entity in the project API: sprints are the values of
// customfield_10020 across the project's issues.
export async function listSprints({ state, limit } = {}) {
	ensureConfigured();
	const issues = await searchIssues(`${projectJql()} AND sprint is not EMPTY ORDER BY created DESC`, ['issuetype', JIRA_FIELDS.sprint, 'aggregatetimeoriginalestimate'], 5000);
	const byId = new Map();
	const storyTypes = new Set(STORY_ISSUE_TYPES);
	for (const issue of issues) {
		for (const sprint of sprintsOf(issue)) {
			const id = String(sprint.id);
			if (!byId.has(id)) {
				byId.set(id, {
					id,
					name: sprint.name,
					startDate: sprint.startDate ?? '',
					endDate: sprint.endDate ?? '',
					state: ITERATION_STATE_BY_SPRINT_STATE[sprint.state] ?? sprint.state ?? 'Unknown',
					storyEstimateHours: 0
				});
			}
		}
		const current = currentSprintOf(issue);
		if (current && storyTypes.has(issue.fields.issuetype?.name)) {
			byId.get(String(current.id)).storyEstimateHours += hours(issue.fields.aggregatetimeoriginalestimate);
		}
	}
	let sprints = [...byId.values()].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
	if (state) {
		sprints = sprints.filter(s => s.state.toLowerCase() === state.toLowerCase());
	}
	return limit ? sprints.slice(0, limit) : sprints;
}

export async function listUserStories({ limit = 50, ...filters } = {}) {
	ensureConfigured();
	const types = STORY_ISSUE_TYPES.map(quoteJql).join(', ');
	const jql = `${projectJql()} AND issuetype in (${types})${filterClauses(filters)} ORDER BY created DESC`;
	return (await searchIssues(jql, STORY_FIELDS, limit)).map(formatStory);
}

export async function listDefects({ limit = 50, ...filters } = {}) {
	ensureConfigured();
	const types = BUG_ISSUE_TYPES.map(quoteJql).join(', ');
	const jql = `${projectJql()} AND issuetype in (${types})${filterClauses(filters)} ORDER BY created DESC`;
	return (await searchIssues(jql, DEFECT_FIELDS, limit)).map(formatDefect);
}

export async function listTasks(parentKey, limit = 200) {
	ensureConfigured();
	const jql = `${projectJql()} AND issuetype = ${quoteJql(SUBTASK_ISSUE_TYPE)} AND parent = ${quoteJql(parentKey)} ORDER BY created ASC`;
	return (await searchIssues(jql, TASK_FIELDS, limit)).map(formatTask);
}

const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9_]+-\d+$/i;

export async function searchWorkItems(term, { type = 'all', limit = 15 } = {}) {
	ensureConfigured();
	const trimmed = term.trim();
	if (!trimmed) return [];
	const textClause = ISSUE_KEY_PATTERN.test(trimmed) ? `(key = ${quoteJql(trimmed.toUpperCase())} OR text ~ ${quoteJql(trimmed)})` : `text ~ ${quoteJql(trimmed)}`;
	const scopes = [
		{ kind: 'user-stories', types: STORY_ISSUE_TYPES, fields: STORY_FIELDS },
		{ kind: 'defects', types: BUG_ISSUE_TYPES, fields: DEFECT_FIELDS },
		{ kind: 'tasks', types: [SUBTASK_ISSUE_TYPE], fields: TASK_FIELDS }
	].filter(s => type === 'all' || s.kind === type);

	const groups = await Promise.all(
		scopes.map(async scope => {
			const jql = `${projectJql()} AND issuetype in (${scope.types.map(quoteJql).join(', ')}) AND ${textClause} ORDER BY created DESC`;
			const issues = await searchIssues(jql, scope.fields, limit);
			return issues.map(issue => ({
				kind: scope.kind,
				id: String(issue.id),
				key: issue.key,
				summary: issue.fields.summary ?? '',
				status: issue.fields.status?.name ?? 'Unknown',
				sprint: currentSprintOf(issue)?.name ?? null
			}));
		})
	);
	return groups.flat();
}

export async function getIssue(keyOrId) {
	ensureConfigured();
	const fields = [...new Set([...STORY_FIELDS, ...TASK_FIELDS])];
	let issue;
	try {
		issue = await jiraRequest(`/rest/api/3/issue/${encodeURIComponent(keyOrId)}?fields=${fields.join(',')}`);
	} catch (error) {
		if (error instanceof Error && error.message.includes('404')) return null;
		throw error;
	}
	const type = issue.fields.issuetype?.name;
	if (type === SUBTASK_ISSUE_TYPE) return { kind: 'task', ...formatTask(issue) };
	if (BUG_ISSUE_TYPES.includes(type)) return { kind: 'defect', ...formatDefect(issue) };
	return { kind: 'story', ...formatStory(issue) };
}

export async function getComments(keyOrId) {
	ensureConfigured();
	const r = await jiraRequest(`/rest/api/3/issue/${encodeURIComponent(keyOrId)}/comment?orderBy=created&maxResults=100`);
	return (r.comments ?? []).map(c => ({
		id: String(c.id),
		author: c.author?.displayName ?? 'Unknown',
		created: c.created ?? '',
		text: adfToText(c.body).trim()
	}));
}

export async function getLinkedDefects(keyOrId) {
	ensureConfigured();
	const story = await jiraRequest(`/rest/api/3/issue/${encodeURIComponent(keyOrId)}?fields=issuelinks`);
	const bugTypes = new Set(BUG_ISSUE_TYPES);
	const keys = [];
	for (const link of story.fields?.issuelinks ?? []) {
		const linked = link.outwardIssue ?? link.inwardIssue;
		if (linked && bugTypes.has(linked.fields?.issuetype?.name)) keys.push(linked.key);
	}
	if (!keys.length) return [];
	const jql = `key in (${keys.map(quoteJql).join(', ')}) ORDER BY created DESC`;
	return (await searchIssues(jql, DEFECT_FIELDS, 100)).map(formatDefect);
}

export async function getChangelog(keyOrId, limit = 100) {
	ensureConfigured();
	const r = await jiraRequest(`/rest/api/3/issue/${encodeURIComponent(keyOrId)}/changelog?maxResults=${limit}`);
	return (r.values ?? []).map(entry => ({
		id: String(entry.id),
		author: entry.author?.displayName ?? 'Unknown',
		created: entry.created,
		changes: (entry.items ?? []).map(i => ({
			field: i.field,
			from: i.fromString ?? null,
			to: i.toString ?? null
		}))
	}));
}
