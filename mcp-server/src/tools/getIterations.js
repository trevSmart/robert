import {mcpServer, rallyData} from '../../index.js';
import {getRallyApi, queryUtils} from '../utils.js';
import {icons} from '../mcpUtils.js';

import {z} from 'zod';

export async function getIterations({query = {}}) {
	const rallyApi = getRallyApi();

	// If no Project provided, default to rallyData.defaultProject if available
	if (!query.Project && rallyData && rallyData.defaultProject) {
		query.Project = String(rallyData.defaultProject.ObjectID);
	}

	try {
		//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
		if (Object.keys(query).length && rallyData.iterations.length) {
			const filteredIterations = rallyData.iterations.filter(iteration => Object.keys(query).every(key => {
				if (iteration[key] === undefined) { return false; }
				return iteration[key] === query[key];
			}));

			//Si tenim resultats que coincideixen amb els filtres, els retornem
			if (filteredIterations.length) {
				console.log('Iteracions trobades a la cache:', filteredIterations);
				return {
					content: [{
						type: 'text',
						text: `Iteracions trobades a la cache (${filteredIterations.length}):\n\n${JSON.stringify(filteredIterations, null, '\t')}`,
					}],
					structuredContent: {iterations: filteredIterations}
				};
			}
		}

		//Si no hi ha filtres (demandem totes les iteracions) o no tenim dades suficients,
		//hem d'anar a l'API per obtenir la llista completa

		const queryOptions = {
			type: 'iteration',
			fetch: ['ObjectID', 'Name', 'StartDate', 'EndDate', 'State', 'Project'],
		};

		if (Object.keys(query).length) {
			const rallyQueries = Object.keys(query).map(key => {
				//Per al camp Name, utilitzem 'contains' per fer cerca parcial
				if (key === 'Name') {
					return queryUtils.where(key, 'contains', query[key]);
				}
				//Per al camp Project, afegim el prefix "/project/" si no el porta ja
				if (key === 'Project') {
					const projectValue = query[key].startsWith('/project/') ? query[key] : `/project/${query[key]}`;
					return queryUtils.where(key, '=', projectValue);
				}
				//Per a altres camps, mantenim la cerca exacta
				return queryUtils.where(key, '=', query[key]);
			});
			if (rallyQueries.length) {
				queryOptions.query = rallyQueries.reduce((a, b) => a.and(b));
			}
		}

		const result = await rallyApi.query(queryOptions);

		if (!result.Results || result.Results.length === 0) {
			return {
				content: [{
					type: 'text',
					text: 'No s\'han trobat iteracions a Rally.',
				}]
			};
		}

		const iterations = result.Results
			.map(iteration => ({
				ObjectID: iteration.ObjectID,
				Name: iteration.Name,
				State: iteration.State,
				StartDate: iteration.StartDate,
				EndDate: iteration.EndDate,
				Project: iteration.Project._refObjectName,
			}))
			// Ordenem per StartDate descendent: iteracions més recents primer
			.sort((a, b) => {
				const aDate = a?.StartDate ? new Date(a.StartDate).getTime() : 0;
				const bDate = b?.StartDate ? new Date(b.StartDate).getTime() : 0;
				return bDate - aDate;
			});

		//Afegim les noves iteracions a rallyData sense duplicats
		iterations.forEach(newIteration => {
			const existingIterationIndex = rallyData.iterations.findIndex(
				existingIteration => existingIteration.ObjectID === newIteration.ObjectID
			);

			if (existingIterationIndex === -1) {
				//Iteració nova, l'afegim
				rallyData.iterations.push(newIteration);
			} else {
				//Iteració existent, l'actualitzem
				rallyData.iterations[existingIterationIndex] = newIteration;
			}
		});
		mcpServer.sendResourceListChanged();

		return {
			content: [{
				type: 'text',
				text: `Iteracions trobades a Rally via API (${iterations.length}):\n\n${JSON.stringify(iterations, null, '\t')}`,
			}],
			structuredContent: {
				iterations: iterations
			}
		};

	} catch (error) {
		console.error(`Error en getIterations: ${error.message}`);
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error en getIterations: ${error.message}`,
			}]
		};
	}
}

export const getIterationsTool = {
	name: 'getIterations',
	title: 'Get Iterations',
	description: 'This tool queries active iterations (sprints) in Broadcom Rally that match the provided filters. If no filters are provided, it will return all iterations.',
	inputSchema: {
		query: z
			.object({
				ObjectID: z.string().optional().describe('The ObjectID of the iteration to get.'),
				Name: z.string().optional().describe('The Name of the iteration to get. Supports partial matching (like search).'),
				State: z.string().optional().describe('The State of the iteration to get.'),
				Project: z.string().optional().describe('The Project of the iteration to get.'),
				StartDate: z.string().optional().describe('The StartDate of the iteration to get.'),
				EndDate: z.string().optional().describe('The EndDate of the iteration to get.'),
			}).describe('A JSON object for filtering iterations. Only ObjectID, Name, State, Project, StartDate and EndDate fields are allowed. For example: `{"Name": "Sprint 1"}` to get iterations with names containing "Sprint 1". When filtering by a related entity, always use the ObjectID of the entity instead of the name.')
	},
	icons,
	annotations: {
		readOnlyHint: true
	}
};