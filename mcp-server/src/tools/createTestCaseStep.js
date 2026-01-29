import {getRallyApi, queryUtils} from '../utils.js';
import {log} from '../../index.js';
import {z} from 'zod';

export async function createTestCaseStep({testCaseId, Input, ExpectedResult, Order}) {
	const rallyApi = getRallyApi();

	try {
		// Validate required fields
		if (!testCaseId) {
			return {
				isError: true,
				content: [{
					type: 'text',
					text: 'Error: testCaseId is required'
				}]
			};
		}

		if (!Input || !ExpectedResult) {
			return {
				isError: true,
				content: [{
					type: 'text',
					text: 'Error: Input and ExpectedResult are required'
				}]
			};
		}

		// Get the test case to verify it exists
		const testCaseResult = await rallyApi.query({
			type: 'testcase',
			fetch: ['FormattedID', 'Name', '_ref'],
			query: queryUtils.where('ObjectID', '=', testCaseId)
		});

		if (!testCaseResult.Results || testCaseResult.Results.length === 0) {
			return {
				isError: true,
				content: [{
					type: 'text',
					text: `Error: Test case with ObjectID ${testCaseId} not found`
				}]
			};
		}

		const testCase = testCaseResult.Results[0];

		// Get all existing steps to determine where to insert the new step
		const existingStepsResult = await rallyApi.query({
			type: 'testcasestep',
			fetch: ['ObjectID', 'StepIndex', '_ref'],
			query: queryUtils.where('TestCase', '=', testCase._ref),
			order: 'StepIndex'
		});

		const existingSteps = existingStepsResult.Results || [];
		const totalSteps = existingSteps.length;

		// Determine the target StepIndex for the new step
		let targetStepIndex;
		let needsReordering = false;

		if (Order === undefined || Order === null || Order < 1 || Order > totalSteps + 1) {
			// Insert at the end
			targetStepIndex = totalSteps + 1;
		} else {
			// Insert at the specified position
			targetStepIndex = Order;
			needsReordering = Order <= totalSteps; // Need to reorder if inserting before existing steps
		}

		// If we need to reorder, update existing steps first
		if (needsReordering) {
			log(`Reordering existing steps to make room at position ${targetStepIndex}`);
			
			// Update steps that need to be shifted (in reverse order to avoid conflicts)
			for (let i = existingSteps.length - 1; i >= 0; i--) {
				const step = existingSteps[i];
				if (step.StepIndex >= targetStepIndex) {
					await rallyApi.update({
						ref: step._ref,
						data: {StepIndex: step.StepIndex + 1}
					});
					log(`Moved step from index ${step.StepIndex} to ${step.StepIndex + 1}`);
				}
			}
		}

		// Create the new step
		const stepToCreate = {
			TestCase: testCase._ref,
			StepIndex: targetStepIndex,
			Input: Input,
			ExpectedResult: ExpectedResult
		};

		log(`Creating test case step with data: ${JSON.stringify(stepToCreate, null, 3)}`);

		const stepResult = await rallyApi.create({
			type: 'testcasestep',
			data: stepToCreate,
			fetch: ['StepIndex', 'Input', 'ExpectedResult', 'TestCase']
		});

		const createdStep = stepResult.Object;
		log(`Successfully created step ${createdStep.StepIndex} for test case ${testCase.FormattedID}`);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					TestCase: {
						ObjectID: testCase.ObjectID,
						FormattedID: testCase.FormattedID,
						Name: testCase.Name
					},
					Step: {
						StepIndex: createdStep.StepIndex,
						Input: createdStep.Input,
						ExpectedResult: createdStep.ExpectedResult
					}
				}, null, 3)
			}],
			structuredContent: {
				TestCase: {
					ObjectID: testCase.ObjectID,
					FormattedID: testCase.FormattedID,
					Name: testCase.Name
				},
				Step: {
					StepIndex: createdStep.StepIndex,
					Input: createdStep.Input,
					ExpectedResult: createdStep.ExpectedResult
				}
			}
		};

	} catch (error) {
		log(`Error creating test case step: ${error}`, 'error');
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error creating test case step: ${error.message}`
			}]
		};
	}
}

export const createTestCaseStepTool = {
	name: 'createTestCaseStep',
	title: 'Create Test Case Step',
	description: 'This tool creates a single step for an existing test case. The step can be inserted at a specific position or at the end if no Order is specified.',
	inputSchema: {
		testCaseId: z.string()
			.describe('The ObjectID of the test case to add the step to. Example: "12345"'),
		Input: z.string()
			.describe('The input/action for this test step. Example: "Enter username in username field"'),
		ExpectedResult: z.string()
			.describe('The expected result for this test step. Example: "Username field should be populated with entered value"'),
		Order: z.number()
			.optional()
			.describe('Optional: The position where to insert this step (1-based). If not provided, or if the value is invalid (< 1 or > current number of steps), the step will be inserted at the end.')
	}
};
