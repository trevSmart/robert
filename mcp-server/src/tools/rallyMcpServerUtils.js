import {rallyData} from '../../index.js';
import {z} from 'zod';
import {log} from '../../index.js';

export async function rallyMcpServerUtilsTool({action}) {
	try {
		log('rallyMcpServerUtilsTool');

		if (action === 'getState') {
			const serverState = {
				defaultProject: rallyData.defaultProject,
				dataCounts: {
					projects: rallyData.projects?.length || 0,
					iterations: rallyData.iterations?.length || 0,
					userStories: rallyData.userStories?.length || 0,
					tasks: rallyData.tasks?.length || 0,
					testCases: rallyData.testCases?.length || 0,
					users: rallyData.users?.length || 0,
					testFolders: rallyData.testFolders?.length || 0
				},
				currentUser: rallyData.currentUser || null,
				timestamp: new Date().toISOString()
			};

			log('Server state retrieved:', serverState);

			return {
				content: [{
					type: 'text',
					text: `Estat del servidor MCP Rally:\n\n${JSON.stringify(serverState, null, '\t')}`,
				}],
				structuredContent: {
					serverState: serverState
				}
			};
		} 
			return {
				isError: true,
				content: [{
					type: 'text',
					text: `Acció no suportada: ${action}. Accions disponibles: getState`,
				}]
			};
		

	} catch (error) {
		log(`Error en rallyMcpServerUtilsTool: ${error.message}`);
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error en rallyMcpServerUtilsTool: ${error.message}`,
			}]
		};
	}
}

export const rallyMcpServerUtilsToolDefinition = {
	name: 'rallyMcpServerUtils',
	title: 'Rally MCP Server Utils',
	description: 'This tool provides utility functions for the Rally MCP server, including getting server state information.',
	inputSchema: {
		action: z
			.enum(['getState'])
			.describe('The action to perform. Currently only "getState" is supported.')
	},
	annotations: {
		readOnlyHint: true
	}
};
