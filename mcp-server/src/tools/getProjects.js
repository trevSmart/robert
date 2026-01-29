import {mcpServer} from '../../index.js';
import {getProjects} from '../rallyServices.js';
import {z} from 'zod';
import {log} from '../../index.js';

export async function getProjectsTool({query = {}}) {
	try {
		log('getProjectsTool');

		const result = await getProjects(query);
		log(result);
		log(JSON.stringify(result, null, 3));

		// Si la funció retorna resultats, enviem la notificació de canvi
		if (result.projects && result.projects.length > 0) {
			mcpServer.sendResourceListChanged();
		}

		// Construïm el format de resposta de la tool
		if (result.count === 0) {
			return {
				content: [{
					type: 'text',
					text: 'No s\'han trobat projectes actius a Rally.',
				}]
			};
		}

		const sourceText = result.source === 'cache' ? 'cache' : 'API';
		return {
			content: [{
				type: 'text',
				text: `Projectes actius trobats a Rally via ${sourceText} (${result.count}):\n\n${JSON.stringify(result.projects, null, '\t')}`,
			}],
			structuredContent: {
				projects: result.projects
			}
		};

	} catch (error) {
		log(`Error en getProjectsTool: ${error.message}`);
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error en getProjectsTool: ${error.message}`,
			}]
		};
	}
}

export const getProjectsToolDefinition = {
	name: 'getProjects',
	title: 'Get Projects',
	description: 'This tool queries active projects in Broadcom Rally that match the provided filters. If no filters are provided, it will return all projects.',
	inputSchema: {
		query: z
			.object({
				ObjectID: z.string().optional().describe('The ObjectID of the project to get.'),
				Name: z.string().optional().describe('The Name of the project to get. Supports partial matching (like search).')
			})
			.describe('A JSON object for filtering projects. Only ObjectID and Name fields are allowed. For example: `{"Name": "CSBD"}` to get projects with names containing "CSBD".')
	},
	annotations: {
		readOnlyHint: true
	}
};