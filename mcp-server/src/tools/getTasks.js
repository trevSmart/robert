import {getRallyApi, queryUtils} from '../utils.js';
import {z} from 'zod';

export async function getTasks({query}) {
	const rallyApi = getRallyApi();

	try {

		const queryOptions = {
			type: 'task',
			fetch: ['FormattedID', 'Name', 'State', 'Estimate', 'ToDo', 'Owner', 'WorkProduct'],
		};

		if (query) {
			const rallyQueries = Object.keys(query).map(key => queryUtils.where(key, '=', query[key]));

			if (rallyQueries.length) {
				queryOptions.query = rallyQueries.reduce((a, b) => a.and(b));
			}
		}

		const result = await rallyApi.query(queryOptions);

		if (!result.Results || result.Results.length === 0) {
			return {
				content: [{
					type: 'text',
					text: 'No s\'han trobat tasques a Rally.',
				}]
			};
		}

		const tasks = result.Results.map(task => ({
			ObjectID: task.ObjectID,
			FormattedID: task.FormattedID,
			Name: task.Name,
			State: task.State,
			Estimate: task.Estimate,
			ToDo: task.ToDo,
			Owner: task.Owner ? task.Owner._refObjectName : 'No Owner',
			WorkProduct: task.WorkProduct._refObjectName
		}));
		return {
			content: [{
				type: 'text',
				text: `Tasques: ${JSON.stringify(tasks, null, '\t')}`,
			}]
		};

	} catch (error) {
		//console.error(`Error in getTasks: ${error.message}`);
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error in getTasks: ${error.message}`
			}]
		};
	}
}

export const getTasksTool = {
	name: 'getTasks',
	title: 'Get Tasks',
	description: 'This tool retrieves a list of all tasks for a given user story.',
	inputSchema: {
		query: z
			.record(z.string())
			.optional()
			.describe('A JSON object for filtering tasks. Keys are field names and values are the values to match. For example: `{"WorkProduct.ObjectID": "12345"}` to get tasks for a specific user story. When filtering by a related entity, always use the ObjectID of the entity instead of the name.')
	},
	annotations: {
		readOnlyHint: true
	}
};