import type { RallyDefect, RallyIteration, RallyProject, RallyUser, RallyUserStory, User } from '../../../types/rally';
import type { JiraIssue } from './jiraApi';
import type { JiraSprint } from './jiraMeta';
import { adfToHtml } from './adfToHtml';

// Mirrors the Rally mappers: process in small chunks and yield, so large result sets never
// block the extension host.
const CHUNK_SIZE = 25;

const yieldToEventLoop = (): Promise<void> => new Promise(resolve => setImmediate(resolve));

async function mapChunked<TIn, TOut>(items: TIn[], map: (item: TIn) => TOut): Promise<TOut[]> {
	const out: TOut[] = [];
	for (let i = 0; i < items.length; i += CHUNK_SIZE) {
		out.push(...items.slice(i, i + CHUNK_SIZE).map(map));
		if (i + CHUNK_SIZE < items.length) {
			await yieldToEventLoop();
		}
	}
	return out;
}

/**
 * Jira status categories map onto the Rally ScheduleState vocabulary the UI already speaks.
 * `new` -> Defined, `indeterminate` -> In-Progress, `done` -> Completed.
 */
export function statusToScheduleState(fields: Record<string, any>): string {
	const categoryKey = fields?.status?.statusCategory?.key;
	switch (categoryKey) {
		case 'new':
			return 'Defined';
		case 'indeterminate':
			return 'In-Progress';
		case 'done':
			return 'Completed';
		default:
			return fields?.status?.name ?? 'Defined';
	}
}

function secondsToHours(seconds: unknown): number {
	const value = Number(seconds);
	return Number.isFinite(value) && value > 0 ? Math.round((value / 3600) * 100) / 100 : 0;
}

function displayName(person: any): string {
	return person?.displayName ?? person?.emailAddress ?? '';
}

/**
 * The sprint field is a board-specific custom field. Jira returns it either as an array of
 * sprint objects (newer sites) or as an array of serialised strings (older ones).
 */
function extractSprint(fields: Record<string, any>): { objectId?: string; _refObjectName?: string } | null {
	const raw = fields?.sprint ?? fields?.closedSprints;
	const candidates = Array.isArray(raw) ? raw : raw ? [raw] : [];
	if (!candidates.length) {
		// Fall back to any customfield_* that looks like a sprint array.
		const sprintField = Object.entries(fields ?? {}).find(([key, value]) => key.startsWith('customfield_') && Array.isArray(value) && value.some((v: any) => v?.name && v?.state));
		if (!sprintField) {
			return null;
		}
		candidates.push(...(sprintField[1] as any[]));
	}

	// Prefer the active sprint; otherwise the last one the issue belongs to.
	const active = candidates.find((s: any) => s?.state === 'active');
	const sprint = active ?? candidates[candidates.length - 1];
	if (!sprint) {
		return null;
	}

	if (typeof sprint === 'string') {
		// Legacy serialised form: "...[id=123,...,name=Sprint 5,...]"
		const id = /id=(\d+)/.exec(sprint)?.[1];
		const name = /name=([^,\]]+)/.exec(sprint)?.[1];
		return id || name ? { objectId: id, _refObjectName: name } : null;
	}

	return { objectId: String(sprint.id), _refObjectName: sprint.name };
}

/** Jira marks blockers with the "Flagged" field or an explicit label. */
function isBlocked(fields: Record<string, any>): boolean {
	const flagged = Object.entries(fields ?? {}).find(([key, value]) => key.startsWith('customfield_') && Array.isArray(value) && value.some((v: any) => v?.value === 'Impediment'));
	if (flagged) {
		return true;
	}
	return Array.isArray(fields?.labels) && fields.labels.some((l: string) => l.toLowerCase() === 'blocked');
}

export interface MapIssueContext {
	storyPointsField: string | null;
	projectName?: string | null;
}

export async function formatUserStories(issues: JiraIssue[], ctx: MapIssueContext): Promise<RallyUserStory[]> {
	return mapChunked(issues, issue => {
		const f = issue.fields ?? {};
		const estimate = ctx.storyPointsField ? Number(f[ctx.storyPointsField]) : NaN;

		return {
			objectId: issue.id,
			formattedId: issue.key,
			name: f.summary ?? '',
			description: adfToHtml(f.description),
			state: f.status?.name ?? '',
			scheduleState: statusToScheduleState(f),
			planEstimate: Number.isFinite(estimate) ? estimate : 0,
			toDo: secondsToHours(f.timetracking?.remainingEstimateSeconds ?? f.timeestimate),
			taskEstimateTotal: secondsToHours(f.timetracking?.originalEstimateSeconds ?? f.timeoriginalestimate),
			owner: displayName(f.assignee),
			assignee: displayName(f.assignee),
			project: f.project?.name ?? ctx.projectName ?? null,
			iteration: extractSprint(f),
			blocked: isBlocked(f),
			blockedReason: null,
			tasksCount: Array.isArray(f.subtasks) ? f.subtasks.length : 0,
			testCasesCount: 0,
			defectsCount: Array.isArray(f.issuelinks) ? f.issuelinks.filter((l: any) => (l.inwardIssue ?? l.outwardIssue)?.fields?.issuetype?.name === 'Bug').length : 0,
			discussionCount: f.comment?.total ?? 0,
			revisionsCount: 0,
			// Rally-specific custom field with no Jira counterpart.
			appgar: '',
			creationDate: f.created,
			_ref: issue.self
		} as RallyUserStory;
	});
}

export async function formatDefects(issues: JiraIssue[], ctx: MapIssueContext): Promise<RallyDefect[]> {
	return mapChunked(issues, issue => {
		const f = issue.fields ?? {};
		const sprint = extractSprint(f);

		return {
			objectId: issue.id,
			formattedId: issue.key,
			name: f.summary ?? '',
			description: adfToHtml(f.description),
			state: f.status?.name ?? '',
			scheduleState: statusToScheduleState(f),
			severity: f.priority?.name ?? '',
			priority: f.priority?.name ?? '',
			owner: displayName(f.assignee),
			project: f.project?.name ?? ctx.projectName ?? null,
			iteration: sprint?._refObjectName ?? null,
			blocked: isBlocked(f),
			blockedReason: null,
			discussionCount: f.comment?.total ?? 0,
			_ref: issue.self
		} as RallyDefect;
	});
}

export async function formatTasks(issues: JiraIssue[], ctx: MapIssueContext): Promise<any[]> {
	return mapChunked(issues, issue => {
		const f = issue.fields ?? {};
		const sprint = extractSprint(f);

		return {
			objectId: issue.id,
			formattedId: issue.key,
			name: f.summary ?? '',
			description: adfToHtml(f.description),
			state: f.status?.name ?? '',
			estimate: secondsToHours(f.timetracking?.originalEstimateSeconds ?? f.timeoriginalestimate),
			toDo: secondsToHours(f.timetracking?.remainingEstimateSeconds ?? f.timeestimate),
			timeSpent: secondsToHours(f.timetracking?.timeSpentSeconds ?? f.timespent),
			blocked: isBlocked(f),
			owner: displayName(f.assignee),
			project: f.project?.name ?? ctx.projectName ?? null,
			iteration: sprint?._refObjectName ?? null,
			workProduct: f.parent?.key ?? null,
			workItem: f.parent?.key ?? null,
			_ref: issue.self
		};
	});
}

/** Test cases come from Xray/Zephyr issue types; the shape mirrors Rally's test case mapper. */
export async function formatTestCases(issues: JiraIssue[], ctx: MapIssueContext): Promise<any[]> {
	return mapChunked(issues, issue => {
		const f = issue.fields ?? {};
		return {
			objectId: issue.id,
			formattedId: issue.key,
			name: f.summary ?? '',
			description: adfToHtml(f.description),
			state: f.status?.name ?? '',
			owner: displayName(f.assignee),
			project: f.project?.name ?? ctx.projectName ?? null,
			type: f.issuetype?.name ?? 'Test',
			priority: f.priority?.name ?? '',
			testFolder: null,
			_ref: issue.self
		};
	});
}

export async function formatComments(comments: any[], userStoryId?: string): Promise<any[]> {
	return mapChunked(comments, comment => ({
		objectId: String(comment.id),
		text: adfToHtml(comment.body) ?? '',
		author: displayName(comment.author),
		createdDate: comment.created,
		userStoryId,
		_ref: comment.self
	}));
}

/**
 * Jira changelog entries map onto Rally revisions. Each history entry becomes one revision
 * whose description summarises the fields that changed.
 */
export async function formatChangelog(histories: any[]): Promise<any[]> {
	const ordered = [...histories].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

	return mapChunked(ordered, history => {
		const items = Array.isArray(history.items) ? history.items : [];
		const description = items.map((item: any) => `${item.field} changed from "${item.fromString ?? ''}" to "${item.toString ?? ''}"`).join('; ');

		return {
			// Jira has no revision numbers; the changelog ID keeps entries stable and sortable.
			revisionNumber: Number(history.id) || 0,
			description: description || 'Issue updated',
			author: displayName(history.author),
			createdDate: history.created
		};
	});
}

export async function formatSprints(sprints: JiraSprint[], projectName: string | null): Promise<RallyIteration[]> {
	return mapChunked(sprints, sprint => ({
		objectId: String(sprint.id),
		name: sprint.name,
		startDate: sprint.startDate ?? '',
		endDate: sprint.endDate ?? sprint.completeDate ?? '',
		// Rally iteration states are Planning/Committed/Accepted; Jira uses future/active/closed.
		state: sprint.state === 'active' ? 'Committed' : sprint.state === 'closed' ? 'Accepted' : 'Planning',
		project: projectName,
		taskEstimateTotal: 0
	}));
}

export async function formatProjects(projects: any[]): Promise<RallyProject[]> {
	return mapChunked(projects, project => ({
		objectId: String(project.id),
		name: project.name,
		state: 'Open',
		description: project.description ?? '',
		owner: displayName(project.lead),
		parent: null,
		_ref: project.self
	}));
}

export async function formatUsers(users: any[]): Promise<RallyUser[]> {
	return mapChunked(users, user => ({
		objectId: user.accountId,
		name: user.displayName,
		displayName: user.displayName,
		userName: user.emailAddress ?? user.accountId,
		email: user.emailAddress ?? '',
		emailAddress: user.emailAddress ?? '',
		disabled: user.active === false,
		_ref: user.self
	}));
}

export function formatCurrentUser(user: any): User {
	return {
		objectId: user.accountId,
		name: user.displayName,
		displayName: user.displayName,
		userName: user.emailAddress ?? user.accountId,
		email: user.emailAddress ?? '',
		emailAddress: user.emailAddress ?? '',
		disabled: user.active === false,
		_ref: user.self
	};
}
