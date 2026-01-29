import {getRallyApi, queryUtils} from '../utils.js';
import {z} from 'zod';

export async function getDefects({query, project}) {
	try {
		const rallyApi = getRallyApi();

		// Build the query parameters
		const queryParams = {
			type: 'defect',
			fetch: ['ObjectID', 'FormattedID', 'Name', 'State', 'Severity', 'Priority', 'Description', 'Owner', 'Project', 'Iteration', 'CreationDate', 'LastUpdateDate'],
			limit: 200
		};

		// Build query filters using queryUtils.where() for proper filtering
		const rallyQueries = [];
		
		// Always include project filter
		rallyQueries.push(queryUtils.where('Project', '=', project));

		// Add additional query filters if provided
		if (query && Object.keys(query).length > 0) {
			Object.keys(query).forEach(key => {
				// ObjectID is a numeric field in Rally API, convert string to number
				if (key === 'ObjectID') {
					// Strict validation: ensure the entire string is a valid integer
					const stringValue = String(query[key]).trim();
					if (!/^\d+$/.test(stringValue)) {
						throw new Error(`Invalid ObjectID value: ${query[key]}. ObjectID must be a valid positive integer.`);
					}
					const objectIdValue = Number(stringValue);
					// Check for safe integer range to avoid precision loss
					if (!Number.isSafeInteger(objectIdValue)) {
						throw new Error(`Invalid ObjectID value: ${query[key]}. ObjectID is outside the safe integer range.`);
					}
					rallyQueries.push(queryUtils.where(key, '=', objectIdValue));
				} else {
					rallyQueries.push(queryUtils.where(key, '=', query[key]));
				}
			});
		}

		// Combine all queries with AND
		if (rallyQueries.length > 0) {
			queryParams.query = rallyQueries.reduce((a, b) => a.and(b));
		}

		const result = await rallyApi.query(queryParams);

		if (!result.Results || result.Results.length === 0) {
			return {
				content: [{
					type: 'text',
					text: 'No s\'han trobat defects a Rally.'
				}]
			};
		}

		// Format the results
		const defects = result.Results.map(defect => ({
			ObjectID: defect.ObjectID,
			FormattedID: defect.FormattedID,
			Name: defect.Name,
			State: defect.State,
			Severity: defect.Severity,
			Priority: defect.Priority,
			Description: defect.Description,
			Owner: defect.Owner ? defect.Owner._refObjectName : null,
			Project: defect.Project ? defect.Project._refObjectName : null,
			Iteration: defect.Iteration ? defect.Iteration._refObjectName : null,
			CreationDate: defect.CreationDate,
			LastUpdateDate: defect.LastUpdateDate,
			_ref: defect._ref
		}));

		return {
			content: [{
				type: 'text',
				text: `${defects.length} defects trobats: ${JSON.stringify(defects, null, '\t')}`
			}]
		};

	} catch (error) {
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error en getDefects: ${error.message}`
			}]
		};
	}
}

export const getDefectsToolDefinition = {
	name: 'getDefects',
	title: 'Get Defects',
	description: 'This tool retrieves a list of defects from Rally.',
	inputSchema: {
		project: z
			.string()
			.describe('The project ObjectID to get defects for. Example: /project/12345'),
		query: z
			.record(z.string())
			.optional()
			.describe('A JSON object for filtering defects. Keys are field names and values are the values to match. For example: `{"State": "Open", "Severity": "High"}`. When filtering by a related entity, always use the ObjectID of the entity instead of the name.')
	},
	annotations: {
		readOnlyHint: true
	}
};
