// eslint-disable-next-line @typescript-eslint/no-var-requires
import rally from 'rally';

import * as vscode from 'vscode';
import { SettingsManager } from '../../SettingsManager';

export const {
	util: { query: queryUtils }
} = rally;

// Centralized output channel instance
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Get or create the centralized output channel
 */
function getOutputChannel(): vscode.OutputChannel {
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('Robert');
	}
	return outputChannel;
}

/**
 * Funció per logging de crides a Rally
 * @param method - Mètode HTTP
 * @param url - URL de la crida
 * @param headers - Headers de la request
 * @param body - Body de la request (si n'hi ha)
 * @param params - Paràmetres de la query (si n'hi ha)
 */
export function logRallyRequest(method: string, url: string, headers: Record<string, string>, body?: unknown, params?: unknown) {
	const output = getOutputChannel();

	output.appendLine('=== RALLY API REQUEST ===');
	output.appendLine(`Method: ${method}`);
	output.appendLine(`URL: ${url}`);
	output.appendLine('Headers:');
	for (const [key, value] of Object.entries(headers)) {
		output.appendLine(`  ${key}: ${value}`);
	}

	if (params) {
		output.appendLine('Query Parameters:');
		output.appendLine(`  ${JSON.stringify(params, null, 2)}`);
	}

	if (body) {
		output.appendLine('Request Body:');
		output.appendLine(`  ${JSON.stringify(body, null, 2)}`);
	}

	output.appendLine('========================');
}

export const getRallyApi = () => {
	const settingsManager = SettingsManager.getInstance();
	const rallyInstance = settingsManager.getSetting('rallyInstance');
	const rallyApiKey = settingsManager.getSetting('rallyApiKey');

	const output = getOutputChannel();
	output.appendLine(`Rally instance: ${rallyInstance}`);
	output.appendLine(`Rally API key: ${rallyApiKey}`);
	output.appendLine(`Rally project name: ${settingsManager.getSetting('rallyProjectName')}`);
	output.appendLine('========================');

	const rallyApi = rally({
		apiKey: rallyApiKey,
		server: rallyInstance,
		requestOptions: {
			headers: {
				'X-RallyIntegrationName': 'MCP Rally Server',
				'X-RallyIntegrationVendor': 'My company',
				'X-RallyIntegrationVersion': '1.0.0'
			}
		}
	});

	// Interceptem les crides query per afegir logging
	const originalQuery = rallyApi.query;
	rallyApi.query = async function (queryOptions: unknown) {
		// Logging abans de la crida
		const output = getOutputChannel();
		output.appendLine('=== RALLY API CALL ===');

		// Type assertion per accedir a les propietats
		const options = queryOptions as Record<string, unknown>;
		output.appendLine(`Type: ${options.type}`);
		output.appendLine(`Fetch: ${JSON.stringify(options.fetch)}`);
		if (options.query) {
			output.appendLine(`Query: ${JSON.stringify(options.query)}`);
		}
		if (options.limit) {
			output.appendLine(`Limit: ${options.limit}`);
		}
		if (options.order) {
			output.appendLine(`Order: ${JSON.stringify(options.order)}`);
		}
		output.appendLine('=====================');

		try {
			// Fem la crida original
			const result = await originalQuery.call(this, queryOptions);

			// Logging de la resposta
			output.appendLine('=== RALLY API RESPONSE ===');
			const resultData = result as { results?: unknown[] };
			output.appendLine(`Results count: ${resultData.results?.length || 0}`);
			if (resultData.results && resultData.results.length > 0) {
				output.appendLine('First result sample:');
				output.appendLine(`  ${JSON.stringify(resultData.results[0], null, 2)}`);
			}
			output.appendLine('==========================');

			return result;
		} catch (error) {
			// Logging d'errors
			output.appendLine('=== RALLY API ERROR ===');
			output.appendLine(`Error: ${error instanceof Error ? error.message : String(error)}`);
			output.appendLine('======================');
			throw error;
		}
	};

	return rallyApi;
};

/**
 * Valida la configuració de Rally abans de fer crides a l'API
 * @returns {Promise<{isValid: boolean, errors: string[]}>} - Resultat de la validació
 */
export async function validateRallyConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
	const settingsManager = SettingsManager.getInstance();
	const errors: string[] = [];

	// Obtenim la configuració
	const rallyInstance = settingsManager.getSetting('rallyInstance');
	const rallyApiKey = settingsManager.getSetting('rallyApiKey');
	const rallyProjectName = settingsManager.getSetting('rallyProjectName');

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
	try {
		const rallyApi = getRallyApi();
		await rallyApi.query({
			type: 'project',
			fetch: ['ObjectID', 'Name'],
			limit: 1
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (errorMessage?.includes('401')) {
			errors.push('Invalid Rally API key or insufficient permissions');
		} else if (errorMessage?.includes('404')) {
			errors.push('Rally instance URL not found or invalid');
		} else {
			errors.push(`Rally API connection failed: ${errorMessage || 'Unknown error'}`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Obté l'ID del projecte especificat a la configuració de l'extensió
 * @returns {Promise<string>} - L'ID del projecte
 */
export async function getProjectId(): Promise<string> {
	const settingsManager = SettingsManager.getInstance();
	const rallyProjectName = settingsManager.getSetting('rallyProjectName');

	if (!rallyProjectName) {
		throw new Error("No s'ha trobat la configuració RALLY_PROJECT_NAME");
	}

	const rallyApi = getRallyApi();

	const result = await rallyApi.query({
		type: 'project',
		fetch: ['ObjectID', 'Name'],
		query: queryUtils.where('Name', '=', rallyProjectName)
	});

	const resultData = result as { results?: Array<{ objectId: string }> };
	if (!resultData.results || resultData.results.length === 0) {
		throw new Error(`No s'ha trobat cap projecte amb el nom "${rallyProjectName}"`);
	}

	return resultData.results[0].objectId;
}
