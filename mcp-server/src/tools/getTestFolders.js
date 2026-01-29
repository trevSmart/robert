import {getRallyApi, queryUtils} from '../utils.js';
import {z} from 'zod';

export async function getTestFolders({query}) {
	const rallyApi = getRallyApi();

	try {
		function resolveRefName(value) {
			if (!value) {
				return null;
			}
			if (typeof value === 'string') {
				return value;
			}
			if (typeof value._refObjectName === 'string') {
				return value._refObjectName;
			}
			return null;
		}
		const queryOptions = {
			type: 'testfolder',
			fetch: ['FormattedID', 'Name', 'Description', 'Iteration', 'State', 'Parent', 'Owner', 'Project', 'TestCases'],
		};

		// Project is mandatory - add it to the query
		if (!query || !query.Project) {
			return {
				isError: true,
				content: [{
					type: 'text',
					text: 'Error: Project is mandatory. Please provide a Project ObjectID in the query.'
				}]
			};
		}

		const rallyQueries = Object.keys(query).map(key => queryUtils.where(key, '=', query[key]));

		if (rallyQueries.length) {
			queryOptions.query = rallyQueries.reduce((a, b) => a.and(b));
		}

		const result = await rallyApi.query(queryOptions);

		if (!result.Results || result.Results.length === 0) {
			return {
				content: [{
					type: 'text',
					text: 'No s\'han trobat test folders a Rally.',
				}]
			};
		}

		//console.error('result.Results');
		//console.error(JSON.stringify(result.Results, null, '\t'));

		const testFolders = result.Results.map(tf => ({
			ObjectID: tf.ObjectID,
			FormattedID: tf.FormattedID,
			Name: tf.Name,
			State: tf.State,
			Description: tf.Description,
			Owner: resolveRefName(tf.Owner),
			Project: resolveRefName(tf.Project),
			Iteration: resolveRefName(tf.Iteration),
			Parent: resolveRefName(tf.Parent),
			TestCases: tf.TestCases
		}));

		return {
			content: [{
				type: 'text',
				text: `Test Folders: ${JSON.stringify(testFolders, null, '\t')}`,
			}]
		};

	} catch (error) {
		//console.error(`Error in getTestFolders: ${error.message}`);
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error in getTestFolders: ${error.message}`
			}]
		};
	}
}

export const getTestFoldersTool = {
	name: 'getTestFolders',
	title: 'Get Test Folders',
	description: 'This tool retrieves a list of test folders from Rally for a specific project.',
	inputSchema: {
		query: z
			.record(z.string())
			.describe('A JSON object for filtering test folders. Keys are field names and values are the values to match. Must include Project field with the project ObjectID. For example: `{"Project": "/project/12345"}` to get test folders for a specific project. When filtering by a related entity, always use the ObjectID of the entity instead of the name.')
	},
	annotations: {
		readOnlyHint: true
	}
};