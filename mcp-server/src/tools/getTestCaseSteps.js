import {getRallyApi, queryUtils} from '../utils.js';
import {z} from 'zod';

export async function getTestCaseSteps({testCaseId}) {
	const rallyApi = getRallyApi();

	try {
		// Validem que s'hagi proporcionat l'ID del test case
		if (!testCaseId) {
			return {
				isError: true,
				content: [{
					type: 'text',
					text: 'Error: Cal proporcionar testCaseId'
				}]
			};
		}

		// Busquem directament els steps del test case
		const stepsResult = await rallyApi.query({
			type: 'testcasestep',
			fetch: ['StepIndex', 'Input', 'ExpectedResult', 'Notes', 'TestCase'],
			query: queryUtils.where('TestCase', '=', `/testcase/${testCaseId}`),
			order: 'StepIndex'
		});

		if (!stepsResult.Results || !stepsResult.Results.length) {
			return {
				content: [{
					type: 'text',
					text: 'No s\'han trobat steps per al test case especificat.',
				}]
			};
		}

		// Formatem els steps
		const steps = stepsResult.Results.map(step => ({
			StepIndex: step.StepIndex,
			Input: step.Input,
			ExpectedResult: step.ExpectedResult,
			Notes: step.Notes
		}));

		return {
			content: [{
				type: 'text',
				text: `Test Case Steps: ${JSON.stringify(steps, null, '\t')}`,
			}]
		};

	} catch (error) {
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error in getTestCaseSteps: ${error.message}`
			}]
		};
	}
}

export const getTestCaseStepsTool = {
	name: 'getTestCaseSteps',
	title: 'Get Test Case Steps',
	description: 'This tool retrieves the steps of a specific test case by its ObjectID.',
	inputSchema: {
		testCaseId: z.string().describe('The ObjectID of the test case to get steps for. Example: "12345"')
	},
	annotations: {
		readOnlyHint: true
	}
};
