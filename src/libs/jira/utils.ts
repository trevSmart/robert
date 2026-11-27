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

function settingsFingerprint(): string {
	const { baseUrl, email, apiToken, projectKeys } = getJiraSettings();
	return `${baseUrl}|${email}|${apiToken}|${projectKeys.join(',')}`;
}

/**
 * Buida les caches de mòdul (validació).
 */
export function clearUtilsCaches(): void {
	_validationCache = null;
	errorHandler.logDebug('Utils caches cleared (validation)', 'jiraUtils.clearUtilsCaches');
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

	const { baseUrl, email, apiToken, projectKeys } = getJiraSettings();
	errorHandler.logDebug(`Jira configuration check: baseUrl=${baseUrl || '(not set)'}, email=${email || '(not set)'}, token=${apiToken ? '***' : '(not set)'}, projects=${projectKeys.join(', ') || '(all)'}`, 'jiraUtils.validateJiraConfiguration');

	const basic = validateJiraSettings();
	if (!basic.isValid) {
		return basic;
	}

	const errors: string[] = [];
	const describeFailure = (error: unknown): string => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		errorHandler.logDebug(`Jira validation request failed: ${errorMessage}`, 'jiraUtils.validateJiraConfiguration');
		if (errorMessage.includes('401') || errorMessage.includes('403')) {
			return 'Invalid Jira email/API token or insufficient permissions';
		}
		return errorMessage.includes('404') ? '404' : `Jira API connection failed: ${errorMessage || 'Unknown error'}`;
	};

	if (!projectKeys.length) {
		try {
			await callJira(() => jiraRequest('/rest/api/3/myself'), 'Validating Jira configuration...');
		} catch (error: unknown) {
			const failure = describeFailure(error);
			errors.push(failure === '404' ? 'Jira API connection failed: 404' : failure);
		}
	} else {
		// Every configured project must exist and be visible to the account.
		const missing: string[] = [];
		for (const key of projectKeys) {
			try {
				await callJira(() => jiraRequest(`/rest/api/3/project/${encodeURIComponent(key)}`), 'Validating Jira configuration...');
			} catch (error: unknown) {
				const failure = describeFailure(error);
				if (failure === '404') {
					missing.push(key);
				} else {
					errors.push(failure);
					break;
				}
			}
		}
		if (missing.length) {
			errors.push(missing.length === 1 ? `Jira project "${missing[0]}" not found or not accessible` : `Jira projects ${missing.map(k => `"${k}"`).join(', ')} not found or not accessible`);
		}
	}

	const result = { isValid: errors.length === 0, errors };
	if (result.isValid) {
		_validationCache = { result, timestamp: Date.now(), settingsKey };
	}
	return result;
}
