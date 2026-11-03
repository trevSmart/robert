import { SettingsManager } from '../../../SettingsManager';
import { ErrorHandler } from '../../../ErrorHandler';
import { fetchPolyfill } from '../../http/fetchPolyfill';
import { callRallyFetch } from '../../rally/rallyCall';

const errorHandler = ErrorHandler.getInstance();

/** Default page size for JQL searches. Jira Cloud caps this well above our needs. */
export const JIRA_PAGE_SIZE = 100;

export interface JiraConfig {
	instance: string;
	email: string;
	apiToken: string;
	projectKey: string;
	boardId: string;
	storyPointsField: string;
}

export class JiraConfigError extends Error {}

/** Read and normalise the Jira settings. Throws {@link JiraConfigError} when incomplete. */
export function getJiraConfig(): JiraConfig {
	const settings = SettingsManager.getInstance();
	const instance = (settings.getSetting('jiraInstance') || '').trim().replace(/\/$/, '');
	const email = (settings.getSetting('jiraEmail') || '').trim();
	const apiToken = (settings.getSetting('jiraApiToken') || '').trim();
	const projectKey = (settings.getSetting('jiraProjectKey') || '').trim();

	const missing: string[] = [];
	if (!instance) {
		missing.push('jiraInstance');
	}
	if (!email) {
		missing.push('jiraEmail');
	}
	if (!apiToken) {
		missing.push('jiraApiToken');
	}
	if (!projectKey) {
		missing.push('jiraProjectKey');
	}

	if (missing.length) {
		throw new JiraConfigError(`Jira configuration incomplete. Missing: ${missing.join(', ')}`);
	}

	return {
		instance,
		email,
		apiToken,
		projectKey,
		boardId: (settings.getSetting('jiraBoardId') || '').trim(),
		storyPointsField: (settings.getSetting('jiraStoryPointsField') || '').trim()
	};
}

/** Basic auth header for Jira Cloud: base64(email:apiToken). */
function authHeader(config: JiraConfig): string {
	return `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`;
}

export class JiraHttpError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

interface RequestOptions {
	method?: 'GET' | 'POST';
	body?: unknown;
	/** Label shown in the UI loading indicator. */
	label?: string;
	query?: Record<string, string | number | boolean | undefined>;
}

/**
 * Perform an authenticated request against the Jira Cloud REST API.
 * `path` is relative to the site root, e.g. `/rest/api/3/search/jql`.
 */
export async function jiraRequest<T>(path: string, options: RequestOptions = {}, config: JiraConfig = getJiraConfig()): Promise<T> {
	const url = new URL(`${config.instance}${path}`);
	for (const [key, value] of Object.entries(options.query ?? {})) {
		if (value !== undefined) {
			url.searchParams.set(key, String(value));
		}
	}

	const method = options.method ?? 'GET';
	const label = options.label ?? `Jira ${method} ${path}`;

	return callRallyFetch(async () => {
		const response = await fetchPolyfill(url.toString(), {
			method,
			headers: {
				Authorization: authHeader(config),
				Accept: 'application/json',
				...(options.body ? { 'Content-Type': 'application/json' } : {})
			},
			...(options.body ? { body: JSON.stringify(options.body) } : {})
		} as RequestInit);

		if (!response.ok) {
			const detail = await response.text().catch(() => '');
			errorHandler.logDebug(`Jira request failed: ${method} ${path} -> ${response.status} ${detail.slice(0, 500)}`, 'jiraApi.jiraRequest');
			throw new JiraHttpError(`Jira API error ${response.status} on ${path}${detail ? `: ${detail.slice(0, 200)}` : ''}`, response.status);
		}

		return (await response.json()) as T;
	}, label);
}

export interface JiraIssue {
	id: string;
	key: string;
	self?: string;
	fields: Record<string, any>;
	changelog?: { histories: any[]; total?: number };
}

interface JqlSearchResponse {
	issues?: JiraIssue[];
	nextPageToken?: string;
	isLast?: boolean;
}

/**
 * Run a JQL search. Jira Cloud's enhanced search is token-paginated, so `offset` (which the
 * webview speaks in) is emulated by walking pages until the requested window is reached.
 *
 * Returns the requested window plus whether more results exist beyond it.
 */
export async function searchJql(
	jql: string,
	fields: string[],
	opts: { offset?: number; limit?: number; expand?: string; label?: string } = {},
	config: JiraConfig = getJiraConfig()
): Promise<{ issues: JiraIssue[]; hasMore: boolean }> {
	const offset = Math.max(0, opts.offset ?? 0);
	const limit = opts.limit ?? JIRA_PAGE_SIZE;
	const needed = offset + limit;

	const collected: JiraIssue[] = [];
	let nextPageToken: string | undefined;
	let hasMore = false;

	// Walk pages until we have enough issues to satisfy the offset+limit window, or run out.
	do {
		const page = await jiraRequest<JqlSearchResponse>(
			'/rest/api/3/search/jql',
			{
				method: 'POST',
				label: opts.label ?? 'Searching Jira issues...',
				body: {
					jql,
					fields,
					maxResults: Math.min(JIRA_PAGE_SIZE, needed - collected.length || JIRA_PAGE_SIZE),
					...(opts.expand ? { expand: opts.expand } : {}),
					...(nextPageToken ? { nextPageToken } : {})
				}
			},
			config
		);

		collected.push(...(page.issues ?? []));
		nextPageToken = page.nextPageToken;

		if (collected.length >= needed) {
			// Either there is a further page, or we overshot within the current one.
			hasMore = Boolean(nextPageToken) || collected.length > needed;
			break;
		}
	} while (nextPageToken);

	return { issues: collected.slice(offset, needed), hasMore };
}

/** Fetch every issue matching a JQL query, walking all pages. Use for bounded result sets. */
export async function searchJqlAll(jql: string, fields: string[], opts: { expand?: string; label?: string; maxIssues?: number } = {}, config: JiraConfig = getJiraConfig()): Promise<JiraIssue[]> {
	const maxIssues = opts.maxIssues ?? 5000;
	const collected: JiraIssue[] = [];
	let nextPageToken: string | undefined;

	do {
		const page = await jiraRequest<JqlSearchResponse>(
			'/rest/api/3/search/jql',
			{
				method: 'POST',
				label: opts.label ?? 'Loading Jira issues...',
				body: {
					jql,
					fields,
					maxResults: JIRA_PAGE_SIZE,
					...(opts.expand ? { expand: opts.expand } : {}),
					...(nextPageToken ? { nextPageToken } : {})
				}
			},
			config
		);

		collected.push(...(page.issues ?? []));
		nextPageToken = page.nextPageToken;
	} while (nextPageToken && collected.length < maxIssues);

	return collected;
}

/** Escape a value for safe interpolation into a JQL string literal. */
export function jqlEscape(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
