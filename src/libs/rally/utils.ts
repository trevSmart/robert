/* eslint-disable no-console */
import rally from 'ibm-rally-node';

import { SettingsManager } from '../../SettingsManager';

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
	console.log('[Robert] 🔧 Starting Rally configuration validation...');

	const settingsManager = SettingsManager.getInstance();
	const errors: string[] = [];

	// Obtenim la configuració
	const rallyInstance = settingsManager.getSetting('rallyInstance');
	const rallyApiKey = settingsManager.getSetting('rallyApiKey');
	const rallyProjectName = settingsManager.getSetting('rallyProjectName');

	// Log current Rally configuration for debugging
	console.log('[Robert] 🔧 Rally Configuration Check:');
	console.log(`[Robert]   Instance URL: ${rallyInstance || '(not set)'}`);
	console.log(`[Robert]   API Key: ${rallyApiKey ? '***' + rallyApiKey.slice(-4) : '(not set)'}`);
	console.log(`[Robert]   Project Name: ${rallyProjectName || '(not set)'}`);
	console.log('[Robert] ---');

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
	console.log('[Robert] 🔧 Testing Rally API connection...');
	try {
		const rallyApi = getRallyApi();
		console.log('[Robert] 🔧 Making test query to Rally API...');
		const result = await rallyApi.query({
			type: 'project',
			fetch: ['ObjectID', 'Name'],
			limit: 1
		});
		console.log(`[Robert] 🔧 Test query successful, found ${result.length || 0} projects`);
	} catch (error: unknown) {
		console.log('[Robert] 🔧 Test query failed with error');
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.log(`[Robert] 🔧 Error details: ${errorMessage}`);
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

	console.log(`[Robert] 🔧 Validation result: isValid=${result.isValid}, errors=[${result.errors.join(', ')}]`);

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
		throw new Error("No s'ha trobat la configuració RALLY_PROJECT_NAME");
	}

	const rallyApi = getRallyApi();

	const result = await rallyApi.query({
		type: 'project',
		fetch: ['ObjectID', 'Name'],
		query: queryUtils.where('Name', '=', rallyProjectName)
	});

	const resultData = result as { Results?: Array<{ ObjectID: string; Name?: string }> };
	if (!resultData.Results || resultData.Results.length === 0) {
		throw new Error(`No s'ha trobat cap projecte amb el nom "${rallyProjectName}"`);
	}

	return resultData.Results[0].ObjectID;
}
