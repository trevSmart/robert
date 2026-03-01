import rally from 'ibm-rally-node';
import type { RallyApi } from 'ibm-rally-node';

import { SettingsManager } from '../../SettingsManager';
import { ErrorHandler } from '../../ErrorHandler';
import { callRally } from './rallyCall';

const errorHandler = ErrorHandler.getInstance();

export const {
	util: { query: queryUtils }
} = rally;

// Memoized Rally API instance – reused as long as instance URL and API key don't change
let _rallyApiCache: { api: RallyApi; instance: string; apiKey: string } | null = null;

export const getRallyApi = () => {
	const settingsManager = SettingsManager.getInstance();
	const rallyInstance = settingsManager.getSetting('rallyInstance');
	const rallyApiKey = settingsManager.getSetting('rallyApiKey');

	// Return cached instance when settings have not changed
	if (_rallyApiCache && _rallyApiCache.instance === rallyInstance && _rallyApiCache.apiKey === rallyApiKey) {
		return _rallyApiCache.api;
	}

	const rallyApi = rally({
		apiKey: rallyApiKey,
		server: rallyInstance,
		requestOptions: {
			headers: {
				'X-RallyIntegrationName': 'IBM Robert Extension',
				'X-RallyIntegrationVendor': 'IBM',
				'X-RallyIntegrationVersion': '0.0.9'
			}
		}
	});

	_rallyApiCache = { api: rallyApi, instance: rallyInstance, apiKey: rallyApiKey };
	return rallyApi;
};

// Cache for the last successful validation result.  TTL: 5 minutes.
const VALIDATION_CACHE_TTL_MS = 5 * 60 * 1000;
let _validationCache: { result: { isValid: boolean; errors: string[] }; timestamp: number; settingsKey: string } | null = null;

// Cache for the resolved project ObjectID.
// Keyed on a settings fingerprint (instance + apiKey + projectName) so that a change to
// any of those values invalidates the cached ID automatically.
let _projectIdCache: { projectId: string; settingsKey: string } | null = null;

/**
 * Clear all module-level caches in utils (Rally API instance, validation result, project ID).
 * Should be called whenever Rally settings change or the extension reloads.
 */
export function clearUtilsCaches(): void {
	_rallyApiCache = null;
	_validationCache = null;
	_projectIdCache = null;
	errorHandler.logDebug('Utils caches cleared (rallyApi, validation, projectId)', 'rallyUtils.clearUtilsCaches');
}

/**
 * Valida la configuració de Rally abans de fer crides a l'API
 * @returns {Promise<{isValid: boolean, errors: string[]}>} - Resultat de la validació
 */
export async function validateRallyConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
	errorHandler.logDebug('Starting Rally configuration validation...', 'rallyUtils.validateRallyConfiguration');

	const settingsManager = SettingsManager.getInstance();
	const errors: string[] = [];

	// Obtenim la configuració
	const rallyInstance = settingsManager.getSetting('rallyInstance');
	const rallyApiKey = settingsManager.getSetting('rallyApiKey');
	const rallyProjectName = settingsManager.getSetting('rallyProjectName');

	// Build a lightweight key that uniquely identifies the current settings
	const settingsKey = `${rallyInstance}|${rallyApiKey}|${rallyProjectName}`;

	// Return cached result if settings haven't changed and the entry is still fresh
	const now = Date.now();
	if (_validationCache && _validationCache.settingsKey === settingsKey && now - _validationCache.timestamp < VALIDATION_CACHE_TTL_MS) {
		errorHandler.logDebug('Returning cached validation result', 'rallyUtils.validateRallyConfiguration');
		return _validationCache.result;
	}

	// Log current Rally configuration for debugging
	errorHandler.logDebug('Rally Configuration Check:', 'rallyUtils.validateRallyConfiguration');
	errorHandler.logDebug(`  Instance URL: ${rallyInstance || '(not set)'}`, 'rallyUtils.validateRallyConfiguration');
	errorHandler.logDebug(`  API Key: ${rallyApiKey ? '***' + rallyApiKey.slice(-4) : '(not set)'}`, 'rallyUtils.validateRallyConfiguration');
	errorHandler.logDebug(`  Project Name: ${rallyProjectName || '(not set)'}`, 'rallyUtils.validateRallyConfiguration');
	errorHandler.logDebug('---', 'rallyUtils.validateRallyConfiguration');

	// Validem la instància de Rally
	if (!rallyInstance || rallyInstance.trim() === '') {
		errors.push('Rally instance URL is not configured');
	} else if (!rallyInstance.startsWith('https://')) {
		errors.push('Rally instance must be a valid HTTPS URL');
	}

	// Validem la clau API
	if (!rallyApiKey || rallyApiKey.trim() === '') {
		errors.push('Rally API key is not configured');
	}

	// Validem el nom del projecte
	if (!rallyProjectName || rallyProjectName.trim() === '') {
		errors.push('Rally project name is not configured');
	}

	// Si hi ha errors bàsics, no continuem
	if (errors.length > 0) {
		return { isValid: false, errors };
	}

	// Intentem fer una crida de prova a l'API per verificar l'autenticació
	errorHandler.logDebug('Testing Rally API connection...', 'rallyUtils.validateRallyConfiguration');
	try {
		const rallyApi = getRallyApi();
		errorHandler.logDebug('Making test query to Rally API...', 'rallyUtils.validateRallyConfiguration');
		const result = await callRally(
			rallyApi,
			{
				type: 'project',
				fetch: ['ObjectID', 'Name'],
				limit: 1
			},
			'Validating Rally configuration...'
		);
		const resultData = result as { Results?: unknown[]; QueryResult?: { Results?: unknown[] } };
		const results = resultData.Results || resultData.QueryResult?.Results || [];
		errorHandler.logDebug(`Test query successful, found ${results.length} projects`, 'rallyUtils.validateRallyConfiguration');
	} catch (error: unknown) {
		errorHandler.logDebug('Test query failed with error', 'rallyUtils.validateRallyConfiguration');
		const errorMessage = error instanceof Error ? error.message : String(error);
		errorHandler.logDebug(`Error details: ${errorMessage}`, 'rallyUtils.validateRallyConfiguration');
		if (errorMessage?.includes('401')) {
			errors.push('Invalid Rally API key or insufficient permissions');
		} else if (errorMessage?.includes('404')) {
			errors.push('Rally instance URL not found or invalid');
		} else {
			errors.push(`Rally API connection failed: ${errorMessage || 'Unknown error'}`);
		}
	}

	const result = {
		isValid: errors.length === 0,
		errors
	};

	errorHandler.logDebug(`Validation result: isValid=${result.isValid}, errors=[${result.errors.join(', ')}]`, 'rallyUtils.validateRallyConfiguration');

	// Cache the result only when configuration is valid (avoid caching transient network errors)
	if (result.isValid) {
		_validationCache = { result, timestamp: Date.now(), settingsKey };
	}

	return result;
}

/**
 * Obté l'ID del projecte especificat a la configuració de l'extensió
 * The result is cached keyed on (instance, apiKey, projectName) and cleared by clearUtilsCaches().
 * @returns {Promise<string>} - L'ID del projecte
 */
export async function getProjectId(): Promise<string> {
	const settingsManager = SettingsManager.getInstance();
	const rallyProjectName = settingsManager.getSetting('rallyProjectName')?.trim();

	if (!rallyProjectName) {
		throw new Error('Rally project name configuration not found');
	}

	const rallyInstance = settingsManager.getSetting('rallyInstance');
	const rallyApiKey = settingsManager.getSetting('rallyApiKey');
	const settingsKey = `${rallyInstance}|${rallyApiKey}|${rallyProjectName}`;

	// Return cached project ID if all relevant settings are unchanged
	if (_projectIdCache && _projectIdCache.settingsKey === settingsKey) {
		errorHandler.logDebug(`Returning cached project ID for "${rallyProjectName}"`, 'rallyUtils.getProjectId');
		return _projectIdCache.projectId;
	}

	const rallyApi = getRallyApi();

	const result = await callRally(
		rallyApi,
		{
			type: 'project',
			fetch: ['ObjectID', 'Name'],
			query: queryUtils.where('Name', '=', rallyProjectName)
		},
		'Resolving Rally project...'
	);

	const resultData = result as { Results?: Array<{ ObjectID: string; Name?: string }> };
	if (!resultData.Results || resultData.Results.length === 0) {
		throw new Error(`No project found with name "${rallyProjectName}"`);
	}

	const projectId = resultData.Results[0].ObjectID;
	_projectIdCache = { projectId, settingsKey };
	return projectId;
}
