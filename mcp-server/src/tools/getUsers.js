
import {getUsers} from '../rallyServices.js';
import {z} from 'zod';

export async function getUsersTool({query = {}}) {
	try {
		const result = await getUsers(query);

		if (!result.users || result.users.length === 0) {
			return {
				content: [{
					type: 'text',
					text: 'No s\'han trobat usuaris a Rally.',
				}]
			};
		}

		return {
			content: [{
				type: 'text',
				text: `Usuaris trobats a Rally (${result.count}):\n\n${JSON.stringify(result.users, null, '\t')}`,
			}]
		};
	} catch (error) {
		console.error(`Error en getUsers: ${error.message}`);
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error en getUsers: ${error.message}`,
			}]
		};
	}
}

export const getUsersToolDefinition = {
	name: 'getUsers',
	title: 'Get Users',
	description: 'This tool retrieves a list of users from Rally.',
	inputSchema: {
		query: z
			.record(z.string())
			.optional()
			.describe('A JSON object for filtering users. Keys are field names and values are the values to match. For example: `{"DisplayName": "Marc Pla"}` to find a specific user by display name.')
	},
	annotations: {
		readOnlyHint: true
	}
};