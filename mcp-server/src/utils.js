// Removed redundant globals directive to satisfy no-redeclare for process
import rally from 'ibm-rally-node';
import https from 'node:https';
import {log} from '../index.js';

export const {util: {query: queryUtils}} = rally;

export const getRallyApi = () => {
	const requestOptions = {
		headers: {
			'X-RallyIntegrationName': 'MCP Rally Server',
			'X-RallyIntegrationVendor': 'My company',
			'X-RallyIntegrationVersion': '1.0.0'
		}
	};

	// SSL/TLS certificate handling
	// Check if SSL verification should be disabled (for development environments only)
	// This is intentionally configurable to support corporate proxies and self-signed certificates
	// Security: SSL verification is enabled by default and only disabled when explicitly set to 'false'
	const sslVerify = process.env.RALLY_SSL_VERIFY !== 'false';
	
	if (!sslVerify) {
		// Disable SSL certificate verification (ONLY for development/testing)
		// This addresses the SELF_SIGNED_CERT_IN_CHAIN error in development environments
		// See README.md troubleshooting section for proper usage guidelines
		requestOptions.httpsAgent = new https.Agent({
			rejectUnauthorized: false // lgtm[js/disabling-certificate-validation]
		});
	}

	return rally({
		apiKey: process.env.RALLY_APIKEY,
		server: process.env.RALLY_INSTANCE,
		requestOptions
	});
};

/**
 * Obté l'ID del projecte especificat a la variable d'entorn RALLY_PROJECT
 * @returns {Promise<string>} - L'ID del projecte
 */
export async function getProjectId() {
	if (!process.env.RALLY_PROJECT_NAME) {
		throw new Error('No s\'ha trobat la variable d\'entorn RALLY_PROJECT_NAME');
	}

	const rallyApi = getRallyApi();

	const result = await rallyApi.query({
		type: 'project',
		fetch: ['ObjectID', 'Name'],
		query: queryUtils.where('Name', '=', process.env.RALLY_PROJECT_NAME)
	});

	if (!result.Results || result.Results.length === 0) {
		throw new Error(`No s'ha trobat cap projecte amb el nom "${process.env.RALLY_PROJECT_NAME}"`);
	}

	log(`Projecte trobat: ${JSON.stringify(result.Results[0], null, '\t')}`);
	return result.Results[0].ObjectID;
}