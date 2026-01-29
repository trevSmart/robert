import {getRallyApi, queryUtils} from '../utils.js';
import {z} from 'zod';

export async function getTypeDefinition({query}) {
	const rallyApi = getRallyApi();

	try {

		const queryOptions = {
			type: 'typedefinition',
			fetch: ['Name', 'DisplayName', 'ElementName', 'Abstract', 'Creatable', 'Deletable', 'Queryable', 'ReadOnly', 'Updatable'],
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
					text: 'No s\'han trobat type definitions a Rally.',
				}]
			};
		}

		const typeDefs = result.Results.map(td => ({
			ObjectID: td.ObjectID,
			Name: td.Name,
			DisplayName: td.DisplayName,
			ElementName: td.ElementName,
			Abstract: td.Abstract,
		}));

		return {
			content: [{
				type: 'text',
				text: `Type Definitions: ${JSON.stringify(typeDefs, null, '\t')}`,
			}]
		};

	} catch (error) {
		//console.error(`Error in getTypeDefinition: ${error.message}`);
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error in getTypeDefinition: ${error.message}`
			}]
		};
	}
}

export const getTypeDefinitionTool = {
	name: 'getTypeDefinition',
	title: 'Get Type Definition',
	description: 'This tool retrieves object model metadata from Rally.',
	inputSchema: {
		query: z
			.record(z.string())
			.optional()
			.describe('A JSON object for filtering type definitions. Keys are field names and values are the values to match. For example: `{"Name": "Defect"}`.')
	},
	annotations: {
		readOnlyHint: true
	}
};