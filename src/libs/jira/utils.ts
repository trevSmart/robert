import { ErrorHandler } from '../../ErrorHandler';
import { callJira } from './jiraCall';
import { getJiraSettings, jiraRequest, validateJiraSettings } from './jiraClient';

const errorHandler = ErrorHandler.getInstance();

// Cache del darrer resultat de validació correcte. TTL: 5 minuts.
const VALIDATION_CACHE_TTL_MS = 5 * 60 * 1000;
let _validationCache: {
	result: { isValid: boolean; errors: string[] };
	timestamp: number;
	settingsKey: string;
} | null = null;
let _projectIdCache: { projectId: string; settingsKey: string } | null = null;

function settingsFingerprint(): string {
	const { baseUrl, email, apiToken, projectKey } = getJiraSettings();
	return `${baseUrl}|${email}|${apiToken}|${projectKey}`;
}

/**
 * Buida les caches de mòdul (validació i id de projecte).
 */
export function clearUtilsCaches(): void {
	_validationCache = null;
	_projectIdCache = null;
	errorHandler.logDebug('Utils caches cleared (validation, projectId)', 'jiraUtils.clearUtilsCaches');
}

/**
 * Valida la configuració de Jira i comprova l'autenticació i l'accés al projecte.
 */
export async function validateJiraConfiguration(): Promise<{
	isValid: boolean;
	errors: string[];
}> {
	const settingsKey = settingsFingerprint();
	const now = Date.now();
	if (_validationCache && _validationCache.settingsKey === settingsKey && now - _validationCache.timestamp < VALIDATION_CACHE_TTL_MS) {
		return _validationCache.result;
	}

	const { baseUrl, email, apiToken, projectKey } = getJiraSettings();
	errorHandler.logDebug(`Jira configuration check: baseUrl=${baseUrl || '(not set)'}, email=${email || '(not set)'}, token=${apiToken ? '***' : '(not set)'}, project=${projectKey || '(all)'}`, 'jiraUtils.validateJiraConfiguration');

	const basic = validateJiraSettings();
	if (!basic.isValid) {
		return basic;
	}

	const errors: string[] = [];
	try {
		await callJira(() => jiraRequest(projectKey ? `/rest/api/3/project/${encodeURIComponent(projectKey)}` : '/rest/api/3/myself'), 'Validating Jira configuration...');
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		errorHandler.logDebug(`Jira validation request failed: ${errorMessage}`, 'jiraUtils.validateJiraConfiguration');
		if (errorMessage.includes('401') || errorMessage.includes('403')) {
			errors.push('Invalid Jira email/API token or insufficient permissions');
		} else if (projectKey && errorMessage.includes('404')) {
			errors.push(`Jira project "${projectKey}" not found or not accessible`);
		} else {
			errors.push(`Jira API connection failed: ${errorMessage || 'Unknown error'}`);
		}
	}

	const result = { isValid: errors.length === 0, errors };
	if (result.isValid) {
		_validationCache = { result, timestamp: Date.now(), settingsKey };
	}
	return result;
}

/**
 * Obté l'id numèric del projecte configurat (cachejat per configuració).
 */
export async function getProjectId(): Promise<string> {
	const settingsKey = settingsFingerprint();
	if (_projectIdCache && _projectIdCache.settingsKey === settingsKey) {
		return _projectIdCache.projectId;
	}
	const { projectKey } = getJiraSettings();
	if (!projectKey) {
		throw new Error('Jira project key configuration not found');
	}
	const project = await callJira(() => jiraRequest<{ id: string }>(`/rest/api/3/project/${encodeURIComponent(projectKey)}`), 'Resolving Jira project...');
	_projectIdCache = { projectId: String(project.id), settingsKey };
	return _projectIdCache.projectId;
}
