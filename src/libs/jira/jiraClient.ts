import { SettingsManager } from '../../SettingsManager';
import { ErrorHandler } from '../../ErrorHandler';
import { getActiveProjects, parseProjectList } from '../provider/projectScope';

const errorHandler = ErrorHandler.getInstance();

export interface JiraSettings {
	baseUrl: string;
	email: string;
	apiToken: string;
	/** Configured project keys (comma-separated setting). Empty means "all projects". */
	projectKeys: string[];
}

export function getJiraSettings(): JiraSettings {
	const settings = SettingsManager.getInstance();
	return {
		baseUrl: (settings.getSetting('jiraBaseUrl') || '').replace(/\/$/, ''),
		email: settings.getSetting('jiraEmail') || '',
		apiToken: settings.getSetting('jiraApiToken') || '',
		projectKeys: parseProjectList(settings.getSetting('jiraProjectKey'))
	};
}

export function validateJiraSettings(): { isValid: boolean; errors: string[] } {
	const { baseUrl, email, apiToken } = getJiraSettings();
	const errors: string[] = [];
	if (!baseUrl) {
		errors.push('Jira base URL is not configured');
	} else if (!baseUrl.startsWith('https://')) {
		errors.push('Jira base URL must be a valid HTTPS URL');
	}
	if (!email.trim()) {
		errors.push('Jira email is not configured');
	}
	if (!apiToken.trim()) {
		errors.push('Jira API token is not configured');
	}
	return { isValid: errors.length === 0, errors };
}

/**
 * Llamada HTTP autenticada contra la API de Jira Cloud (Basic: email + API token).
 */
export async function jiraRequest<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
	const { baseUrl, email, apiToken } = getJiraSettings();
	const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
	const response = await fetch(`${baseUrl}${path}`, {
		method: init.method ?? 'GET',
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: init.body === undefined ? undefined : JSON.stringify(init.body)
	});

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		throw new Error(`Jira API returned ${response.status}: ${response.statusText} ${text.slice(0, 200)}`.trim());
	}
	if (response.status === 204) {
		return undefined as T;
	}
	return (await response.json()) as T;
}

/**
 * Ejecuta una JQL paginando con nextPageToken hasta agotar resultados o alcanzar `max`.
 */
export async function searchIssues(jql: string, fields: string[], max = 1000): Promise<any[]> {
	const issues: any[] = [];
	let nextPageToken: string | undefined;
	do {
		const page: { issues?: any[]; nextPageToken?: string; isLast?: boolean } = await jiraRequest('/rest/api/3/search/jql', {
			method: 'POST',
			body: {
				jql,
				fields,
				maxResults: 100,
				...(nextPageToken ? { nextPageToken } : {})
			}
		});
		issues.push(...(page.issues ?? []));
		nextPageToken = page.isLast ? undefined : page.nextPageToken;
	} while (nextPageToken && issues.length < max);
	errorHandler.logDebug(`Jira JQL returned ${issues.length} issues: ${jql}`, 'jiraClient.searchIssues');
	return issues.slice(0, max);
}

/**
 * Project filter for every query: the projects in the current scope (the one selected in the
 * project selector, or every configured key). With no project key configured it spans all projects.
 */
export function projectJql(projects: string[] = getActiveProjects()): string {
	if (!projects.length) {
		return 'project is not EMPTY';
	}
	if (projects.length === 1) {
		return `project = ${quoteJql(projects[0])}`;
	}
	return `project in (${projects.map(quoteJql).join(', ')})`;
}

export function quoteJql(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
