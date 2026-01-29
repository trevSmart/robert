import {getRallyApi, queryUtils} from '../utils.js';
import {log} from '../../index.js';
import {z} from 'zod';

export async function updateTestCaseStep({stepId, testCaseId, stepIndex, Input, ExpectedResult}) {
	const rallyApi = getRallyApi();

	try {
		let stepRef;
		let existingStep;
		let testCase;

		// Option 1: Direct step identification by stepId (ObjectID)
		if (stepId) {
			const stepResult = await rallyApi.query({
				type: 'testcasestep',
				fetch: ['ObjectID', 'StepIndex', 'Input', 'ExpectedResult', 'TestCase', '_ref'],
				query: queryUtils.where('ObjectID', '=', stepId)
			});

			if (!stepResult.Results || stepResult.Results.length === 0) {
				return {
					isError: true,
					content: [{
						type: 'text',
						text: `Error: Step with ObjectID ${stepId} not found`
					}]
				};
			}

			existingStep = stepResult.Results[0];
			stepRef = existingStep._ref;

			// Extract test case ID from the step's TestCase reference to fetch full test case details
			const testCaseRef = existingStep.TestCase._ref || existingStep.TestCase;
			let extractedTestCaseId = null;
			if (typeof testCaseRef === 'string') {
				const match = testCaseRef.match(/(?<id>\d+)$/);
				if (match && match.groups && match.groups.id) {
					extractedTestCaseId = match.groups.id;
				} else {
					return {
						isError: true,
						content: [{
							type: 'text',
							text: `Error: Could not extract test case ID from reference: ${testCaseRef}`
						}]
					};
				}
			} else {
				return {
					isError: true,
					content: [{
						type: 'text',
						text: `Error: Test case reference is not a string: ${testCaseRef}`
					}]
				};
			}

			// Fetch full test case details (FormattedID, Name) which are not included in the step query
			const testCaseResult = await rallyApi.query({
				type: 'testcase',
				fetch: ['ObjectID', 'FormattedID', 'Name'],
				query: queryUtils.where('ObjectID', '=', extractedTestCaseId)
			});

			if (testCaseResult.Results && testCaseResult.Results.length > 0) {
				testCase = testCaseResult.Results[0];
			}
		}
		// Option 2: Identification by testCaseId + stepIndex combination
		else if (testCaseId && stepIndex !== undefined && stepIndex !== null) {
			// Get the test case to verify it exists
			const testCaseResult = await rallyApi.query({
				type: 'testcase',
				fetch: ['ObjectID', 'FormattedID', 'Name', '_ref'],
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

			testCase = testCaseResult.Results[0];

			// Find the specific step by index
			const stepResult = await rallyApi.query({
				type: 'testcasestep',
				fetch: ['ObjectID', 'StepIndex', 'Input', 'ExpectedResult', '_ref'],
				query: queryUtils.where('TestCase', '=', testCase._ref).and(queryUtils.where('StepIndex', '=', stepIndex))
			});

			if (!stepResult.Results || stepResult.Results.length === 0) {
				return {
					isError: true,
					content: [{
						type: 'text',
						text: `Error: Step with index ${stepIndex} not found for test case ${testCaseId}`
					}]
				};
			}

			existingStep = stepResult.Results[0];
			stepRef = existingStep._ref;
		} else {
			return {
				isError: true,
				content: [{
					type: 'text',
					text: 'Error: Either stepId OR (testCaseId + stepIndex) must be provided'
				}]
			};
		}

		// Build the update data - only include fields that are provided
		const updateData = {};
		if (Input !== undefined) {
			updateData.Input = Input;
		}
		if (ExpectedResult !== undefined) {
			updateData.ExpectedResult = ExpectedResult;
		}

		if (Object.keys(updateData).length === 0) {
			return {
				isError: true,
				content: [{
					type: 'text',
					text: 'Error: At least one field to update must be provided (Input or ExpectedResult)'
				}]
			};
		}

		log(`Updating test case step with data: ${JSON.stringify(updateData, null, 3)}`);

		// Update the step
		const updatedStepResult = await rallyApi.update({
			ref: stepRef,
			data: updateData,
			fetch: ['ObjectID', 'StepIndex', 'Input', 'ExpectedResult']
		});

		const updatedStep = updatedStepResult.Object;
		log(`Successfully updated step ${updatedStep.StepIndex}${testCase ? ` for test case ${testCase.FormattedID}` : ''}`);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					TestCase: testCase ? {
						ObjectID: testCase.ObjectID,
						FormattedID: testCase.FormattedID,
						Name: testCase.Name
					} : undefined,
					UpdatedStep: {
						ObjectID: updatedStep.ObjectID,
						StepIndex: updatedStep.StepIndex,
						Input: updatedStep.Input,
						ExpectedResult: updatedStep.ExpectedResult
					}
				}, null, 3)
			}],
			structuredContent: {
				TestCase: testCase ? {
					ObjectID: testCase.ObjectID,
					FormattedID: testCase.FormattedID,
					Name: testCase.Name
				} : undefined,
				UpdatedStep: {
					ObjectID: updatedStep.ObjectID,
					StepIndex: updatedStep.StepIndex,
					Input: updatedStep.Input,
					ExpectedResult: updatedStep.ExpectedResult
				}
			}
		};

	} catch (error) {
		log(`Error updating test case step: ${error}`, 'error');
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error updating test case step: ${error.message}`
			}]
		};
	}
}

export const updateTestCaseStepTool = {
	name: 'updateTestCaseStep',
	title: 'Update Test Case Step',
	description: 'This tool updates an existing test case step. You can identify the step either by its ObjectID (stepId) or by the combination of testCaseId and stepIndex.',
	inputSchema: {
		stepId: z.string()
			.optional()
			.describe('The ObjectID of the step to update. Example: "67890". Use this OR the testCaseId+stepIndex combination.'),
		testCaseId: z.string()
			.optional()
			.describe('The ObjectID of the test case containing the step. Example: "12345". Must be used together with stepIndex if stepId is not provided.'),
		stepIndex: z.number()
			.optional()
			.describe('The index of the step to update. Example: 1. Must be used together with testCaseId if stepId is not provided.'),
		Input: z.string()
			.optional()
			.describe('The new input/action for this test step. Example: "Enter username in username field"'),
		ExpectedResult: z.string()
			.optional()
			.describe('The new expected result for this test step. Example: "Username field should be populated with entered value"')
	}
};
