
import {getUserStories} from '../rallyServices.js';
import {z} from 'zod';

export async function getUserStoriesTool({query}) {
	try {
		if (!query || !query.Project) {
			return {
				isError: true,
				content: [{
					type: 'text',
					text: 'The `query` object must include a `Project` field with the project ObjectID.'
				}]
			};
		}

		const result = await getUserStories(query);

		if (!result.userStories || result.userStories.length === 0) {
			return {
				content: [{
					type: 'text',
					text: 'No s\'han trobat user stories a Rally.',
				}]
			};
		}

		return {
			content: [{
				type: 'text',
				text: `${result.userStories.length} user stories (${result.source}): ${JSON.stringify(result.userStories, null, '\t')}`,
			}]
		};

	} catch (error) {
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error en getUserStories: ${error.message}`
			}]
		};
	}
}

export const getUserStoriesToolDefinition = {
	name: 'getUserStories',
	title: 'Get User Stories',
	description: 'This tool retrieves details about the user stories. Always include all filters you know the value of in the `Query` input parameter to narrow down the results and to optimize performance. If no filters are provided, it will return all user stories for the default project.',
	inputSchema: {
		query: z
			.object({Project: z.string().describe('Project ObjectID (for example: /project/12345)')})
			.catchall(z.string())
			.describe('A JSON object for filtering user stories. Must include `Project` with the project ObjectID. Other fields may be included with string values. Example: {"Project": "/project/12345", "State": "Accepted", "Iteration.ObjectID": "12345"}.')
	},
	annotations: {
		readOnlyHint: true
	}
};