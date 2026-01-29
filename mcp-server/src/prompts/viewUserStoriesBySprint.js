import {z} from 'zod';
import {completable} from '@modelcontextprotocol/sdk/server/completable.js';
import {rallyData} from '../../index.js';

// Static-style definition (like apexRunScriptPromptDefinition) with dynamic suggestions
export const viewUserStoriesBySprintPromptDefinition = {
	title: 'View user stories by sprint',
	description: 'Select a sprint (iteration) and list all its user stories',
	argsSchema: {
		sprint: completable(
			z.string().describe('Sprint / iteration whose user stories you want to see'),
			(value = '') => {
				const iterations = Array.isArray(rallyData.iterations) ? rallyData.iterations : [];

				// Sort iterations by StartDate descending, then build a unique list of
				// labels in the form "Name - Mes Any" (e.g. "Sprint 85 - Enero 2025").
				const sortedIterations = [...iterations].sort((a, b) => {
					const aDate = a?.StartDate ? new Date(a.StartDate).getTime() : 0;
					const bDate = b?.StartDate ? new Date(b.StartDate).getTime() : 0;
					return bDate - aDate;
				});

				const monthNames = [
					'Enero',
					'Febrero',
					'Marzo',
					'Abril',
					'Mayo',
					'Junio',
					'Julio',
					'Agosto',
					'Septiembre',
					'Octubre',
					'Noviembre',
					'Diciembre'
				];

				const labels = [];
				const seen = new Set();
				for (const iteration of sortedIterations) {
					const name = iteration?.Name;
					if (!name) { continue; }

					// Build the base label "Name - Mes Año"
					let baseLabel = name;
					if (iteration.StartDate) {
						const date = new Date(iteration.StartDate);
						if (!Number.isNaN(date.getTime())) {
							const month = monthNames[date.getUTCMonth()];
							const year = date.getUTCFullYear();
							baseLabel = `${name} - ${month} ${year}`;
						}
					}

					// If we are within the sprint date range, mark as "En curso"
					let labelWithSuffix = baseLabel;
					const start = iteration?.StartDate ? new Date(iteration.StartDate) : null;
					const end = iteration?.EndDate ? new Date(iteration.EndDate) : null;
					const nowMs = Date.now();
					const startMs = start && !Number.isNaN(start.getTime()) ? start.getTime() : null;
					const endMs = end && !Number.isNaN(end.getTime()) ? end.getTime() : null;
					if (startMs !== null && endMs !== null && startMs <= nowMs && nowMs <= endMs) {
						labelWithSuffix = `${baseLabel} - EN CURSO`;
					}

					// Deduplicate by the base label to avoid duplicates
					if (seen.has(baseLabel)) { continue; }
					seen.add(baseLabel);
					labels.push(labelWithSuffix);
				}

				const search = String(value || '').toLowerCase();

				if (!labels.length) {
					return [];
				}

				if (!search) {
					return labels.slice(0, 20);
				}

				return labels
					.filter(label => label.toLowerCase().includes(search))
					.slice(0, 20);
			}
		)
	},
	icons: [{src: 'src/assets/icon.png', sizes: ['64x64'], mimeType: 'image/png'}]
};

export function viewUserStoriesBySprintPrompt(args = {}) {
	const {sprint} = args;
	const iterations = Array.isArray(rallyData.iterations) ? rallyData.iterations : [];
	// The sprint argument may come from completion in the form
	// "Name - Mes Año". We always match using the plain Name part.
	const sprintName = typeof sprint === 'string' && sprint.includes(' - ') ? sprint.split(' - ')[0] : sprint;
	const selectedIteration = sprintName ? iterations.find(iteration => iteration?.Name === sprintName) || null : null;
	const projectRef = rallyData.defaultProject ? `/project/${rallyData.defaultProject.ObjectID}` : 'defaultProject (resolve at runtime)';

	let header;
	let instructions;

	if (!sprint) {
		header = 'The user wants to see all user stories for a specific sprint / iteration, but no sprint name or number was provided yet.';
		instructions = 'Ask the user to select a sprint (iteration) first. You can suggest calling the getIterations tool to list available sprints, then call getUserStories filtered by that iteration ObjectID to list all user stories.';
	} else if (selectedIteration) {
		header = `The user wants to see all user stories for iteration "${selectedIteration.Name}" (ObjectID ${selectedIteration.ObjectID}).`;
		instructions = `Use the getUserStories tool to retrieve all user stories for this iteration. Prefer filtering by Iteration.ObjectID = ${selectedIteration.ObjectID} and by Project = ${projectRef}. Present the results in a clear table, with one row per user story and useful columns (e.g. FormattedID, Name, State, Owner, PlanEstimate), ordered by FormattedID in ascending order.`;
	} else {
		header = `The user wants to see all user stories for an iteration identified as "${sprint}".`;
		instructions = `If possible, use the getIterations tool to locate the iteration by name, then call getUserStories filtered by that iteration ObjectID and by Project = ${projectRef} to list all user stories. Present the results in a clear table, with one row per user story and useful columns (e.g. FormattedID, Name, State, Owner, PlanEstimate), ordered by FormattedID in ascending order.`;
	}

	return {
		messages: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `${header}\n\n${instructions}`
				}
			}
		]
	};
}
