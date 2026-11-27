import rally from 'ibm-rally-node';
import type { RallyApi } from 'ibm-rally-node';

import { SettingsManager } from '../../SettingsManager';
import { ErrorHandler } from '../../ErrorHandler';
import { callRally } from './rallyCall';
import { getActiveProjects, parseProjectList } from '../provider/projectScope';

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
				'X-RallyIntegrationName': 'Robert Extension',
				'X-RallyIntegrationVendor': 'Robert',
				'X-RallyIntegrationVersion': '0.0.9'
			}
		}
	});

	_rallyApiCache = {
		api: rallyApi,
		instance: rallyInstance,
		apiKey: rallyApiKey
	};
	return rallyApi;
};

// Cache for the last successful validation result.  TTL: 5 minutes.
const VALIDATION_CACHE_TTL_MS = 5 * 60 * 1000;
let _validationCache: {
	result: { isValid: boolean; errors: string[] };
	timestamp: number;
	settingsKey: string;
} | null = null;

type QueryBuilder = ReturnType<typeof queryUtils.where>;

/** `a OR b` (the Rally query builder has `or`, but its type declarations omit it). */
function orQuery(a: QueryBuilder, b: QueryBuilder): QueryBuilder {
	return (a as unknown as { or(query: QueryBuilder): QueryBuilder }).or(b);
}

// Cache of resolved project ObjectIDs by project name.
// Keyed on a settings fingerprint (instance + apiKey) so that a change to either value
// invalidates the cached IDs automatically.
let _projectIdCache: { ids: Map<string, string>; settingsKey: string } | null = null;

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
export async function validateRallyConfiguration(): Promise<{
	isValid: boolean;
	errors: string[];
}> {
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

	// Validem el nom del projecte (un o més, separats per comes)
	const projectNames = parseProjectList(rallyProjectName);
	if (!projectNames.length) {
		errors.push('Rally project name is not configured');
	}

	// Si hi ha errors bàsics, no continuem
	if (errors.length > 0) {
		return { isValid: false, errors };
	}

	// Resolem tots els projectes configurats: comprova l'autenticació i que cada projecte existeix.
	errorHandler.logDebug('Testing Rally API connection...', 'rallyUtils.validateRallyConfiguration');
	try {
		const ids = await resolveProjectIds(projectNames);
		errorHandler.logDebug(`Test query successful, resolved ${ids.length} project(s)`, 'rallyUtils.validateRallyConfiguration');
	} catch (error: unknown) {
		errorHandler.logDebug('Test query failed with error', 'rallyUtils.validateRallyConfiguration');
		const errorMessage = error instanceof Error ? error.message : String(error);
		errorHandler.logDebug(`Error details: ${errorMessage}`, 'rallyUtils.validateRallyConfiguration');
		if (error instanceof RallyProjectNotFoundError) {
			errors.push(errorMessage);
		} else if (errorMessage?.includes('401')) {
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

/** Raised when one or more configured Rally project names do not exist. */
export class RallyProjectNotFoundError extends Error {
	constructor(readonly names: string[]) {
		super(names.length === 1 ? `No Rally project found with name "${names[0]}"` : `No Rally projects found with names ${names.map(n => `"${n}"`).join(', ')}`);
		this.name = 'RallyProjectNotFoundError';
	}
}

/**
 * Resolves Rally project names to ObjectIDs, in the given order, with one query for the names
 * not cached yet. The cache is keyed on (instance, apiKey) and cleared by clearUtilsCaches().
 */
async function resolveProjectIds(names: string[]): Promise<string[]> {
	if (!names.length) {
		throw new Error('Rally project name configuration not found');
	}

	const settingsManager = SettingsManager.getInstance();
	const settingsKey = `${settingsManager.getSetting('rallyInstance')}|${settingsManager.getSetting('rallyApiKey')}`;
	if (!_projectIdCache || _projectIdCache.settingsKey !== settingsKey) {
		_projectIdCache = { ids: new Map(), settingsKey };
	}
	const cache = _projectIdCache.ids;

	const pending = names.filter(name => !cache.has(name));
	if (pending.length) {
		const nameQuery = pending.map(name => queryUtils.where('Name', '=', name)).reduce(orQuery);
		const result = await callRally(
			getRallyApi(),
			{
				type: 'project',
				fetch: ['ObjectID', 'Name'],
				query: nameQuery
			},
			'Resolving Rally projects...'
		);
		const resultData = result as {
			Results?: Array<{ ObjectID: string | number; Name?: string }>;
		};
		for (const project of resultData.Results ?? []) {
			// Several projects can share a name in different workspaces; keep the first one, as before.
			if (project.Name && pending.includes(project.Name) && !cache.has(project.Name)) {
				cache.set(project.Name, String(project.ObjectID));
			}
		}
		const missing = pending.filter(name => !cache.has(name));
		if (missing.length) {
			throw new RallyProjectNotFoundError(missing);
		}
		errorHandler.logDebug(`Resolved Rally project IDs: ${pending.map(name => `${name}=${cache.get(name)}`).join(', ')}`, 'rallyUtils.resolveProjectIds');
	}

	return names.map(name => cache.get(name) as string);
}

/**
 * ObjectIDs of the Rally projects to query.
 * - `active`: the project selected in the project selector, or every configured project.
 * - `configured`: every configured project (used for lookups by id, which must work whatever is selected).
 */
export async function getProjectIds(scope: 'active' | 'configured' = 'active'): Promise<string[]> {
	const names = scope === 'active' ? getActiveProjects() : parseProjectList(SettingsManager.getInstance().getSetting('rallyProjectName'));
	return resolveProjectIds(names);
}

/** Rally query matching any of the given projects (`(Project = /project/A) OR (Project = /project/B)`). */
export function projectScopeQuery(projectIds: string[]) {
	if (!projectIds.length) {
		throw new Error('Rally project name configuration not found');
	}
	return projectIds.map(id => queryUtils.where('Project', '=', `/project/${id}`)).reduce(orQuery);
}

/** Rally query for the projects currently in scope. */
export async function getProjectScopeQuery(scope: 'active' | 'configured' = 'active') {
	return projectScopeQuery(await getProjectIds(scope));
}
