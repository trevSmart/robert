import rally from 'ibm-rally-node';

import { SettingsManager } from '../../SettingsManager';
import { ErrorHandler } from '../../ErrorHandler';

const errorHandler = ErrorHandler.getInstance();

export const {
	util: { query: queryUtils }
} = rally;

export const getRallyApi = () => {
	const settingsManager = SettingsManager.getInstance();
	const rallyInstance = settingsManager.getSetting('rallyInstance');
	const rallyApiKey = settingsManager.getSetting('rallyApiKey');

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

	return rallyApi;
};

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
		const result = await rallyApi.query({
			type: 'project',
			fetch: ['ObjectID', 'Name'],
			limit: 1
		});
		errorHandler.logDebug(`Test query successful, found ${result.length || 0} projects`, 'rallyUtils.validateRallyConfiguration');
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

	return result;
}

/**
 * Obté l'ID del projecte especificat a la configuració de l'extensió
 * @returns {Promise<string>} - L'ID del projecte
 */
export async function getProjectId(): Promise<string> {
	const settingsManager = SettingsManager.getInstance();
	const rallyProjectName = settingsManager.getSetting('rallyProjectName')?.trim();

	if (!rallyProjectName) {
		throw new Error('Rally project name configuration not found');
	}

	const rallyApi = getRallyApi();

	const result = await rallyApi.query({
		type: 'project',
		fetch: ['ObjectID', 'Name'],
		query: queryUtils.where('Name', '=', rallyProjectName)
	});

	const resultData = result as { Results?: Array<{ ObjectID: string; Name?: string }> };
	if (!resultData.Results || resultData.Results.length === 0) {
		throw new Error(`No project found with name "${rallyProjectName}"`);
	}

	return resultData.Results[0].ObjectID;
}
