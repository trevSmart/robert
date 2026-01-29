import {getRallyApi} from '../utils.js';
import {log} from '../../index.js';
import {rallyData} from '../../index.js';
import {z} from 'zod';

export async function createTestCase({testCase}) {
    try {
        // Support both WorkProduct and UserStory for backward compatibility
        const workProduct = testCase.WorkProduct || testCase.UserStory;
        
        // Validate required fields
        const requiredFields = ['Name', 'Project', 'TestFolder'];
        const missingFields = requiredFields.filter(field => !testCase[field]);

        if (missingFields.length) {
            throw new Error(`Test case is missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate that WorkProduct is provided
        if (!workProduct) {
            throw new Error('Test case is missing required field: WorkProduct (or UserStory for backward compatibility)');
        }

        // Validate that WorkProduct is a valid Rally object reference (User Story or Defect)
        if (!workProduct.startsWith('/hierarchicalrequirement/') && !workProduct.startsWith('/defect/')) {
            throw new Error('Invalid WorkProduct reference. Must start with /hierarchicalrequirement/ or /defect/');
        }

        //Validate that Steps is an array and has at least one step
        if (!Array.isArray(testCase.Steps)) {
            testCase.Steps = [];
        }

        //Validate each step has required fields
        testCase.Steps.forEach((step, index) => {
            if (!step.Input || !step.ExpectedResult) {
                throw new Error(`Step ${index + 1} is missing required fields: Input and ExpectedResult`);
            }
        });

        log(`Creating test case with data: ${JSON.stringify(testCase, null, 3)}`);

        const rallyApi = getRallyApi();

        //First, create the test case
        const testCaseData = {
            Name: testCase.Name,
            Description: testCase.Description || '',
            WorkProduct: workProduct, //Link to the user story or defect
            Project: testCase.Project || rallyData.defaultProject.ObjectID,
            Iteration: testCase.Iteration,
            Owner: testCase.Owner,
            Objective: testCase.Objective || testCase.Name,
            PreConditions: testCase.PreConditions || 'Probar con usuario de negocio',
            TestFolder: testCase.TestFolder,
            Type: 'Acceptance',
            Priority: 'Useful',
            c_APPGAR: 'APPCLD.CSBDSF',
            c_Canal: 'Salesforce'
        };

        log(`Creating test case with data: ${JSON.stringify(testCaseData, null, 3)}`);

        const testCaseResult = await rallyApi.create({
            type: 'testcase',
            data: testCaseData,
            fetch: ['FormattedID', 'Name', '_ref']
        });

        log(`!!!!!!`);
        log(`Test case result: ${JSON.stringify(testCaseResult, null, 3)}`);
        log(`!!!!!!`);

        const createdTestCase = testCaseResult.Object;
        log(`Successfully created test case: ${createdTestCase.FormattedID} - ${createdTestCase.Name}`);

        let createdSteps = [];
        if (testCase.Steps.length) {
            //Now create the test case steps in batch (up to 25 steps)
            const stepDataArray = testCase.Steps.map((step, index) => ({
                TestCase: createdTestCase._ref,
                StepIndex: index + 1,
                Input: step.Input,
                ExpectedResult: step.ExpectedResult
            }));

            log(`Creating ${stepDataArray.length} steps in batch with data: ${JSON.stringify(stepDataArray, null, 3)}`);

            let stepResults;
            try {
                stepResults = await rallyApi.create({
                    type: 'testcasestep',
                    data: stepDataArray,
                    fetch: ['StepIndex', 'Input', 'ExpectedResult']
                });

                log(`!!!!!!`);
                log(`Step results: ${JSON.stringify(stepResults, null, 3)}`);
                log(`!!!!!!`);

            } catch (error) {
                log(`Error creating test case steps: ${error}`, 'error');
                throw error;
            }

            // Handle both single result and array of results
            const resultsArray = Array.isArray(stepResults) ? stepResults : [stepResults];
            createdSteps = resultsArray.map(result => {
                const step = result.Object;
                log(`Successfully created step ${step.StepIndex}: ${step.Input}`);
                return {
                    StepIndex: step.StepIndex,
                    Input: step.Input,
                    ExpectedResult: step.ExpectedResult
                };
            });
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({TestCase: createdTestCase, Steps: createdSteps, TotalSteps: createdSteps.length}, null, 3)
            }],
            structuredContent: {
                TestCase: createdTestCase,
                Steps: createdSteps,
                TotalSteps: createdSteps.length
            }
        };

    } catch (error) {
        log(`Error creating test case: ${error}`, 'error');
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: `Error creating test case: ${error}`
                }
            ]
        };
    }
}

export const createTestCaseTool = {
    name: 'createTestCase',
    title: 'Create Test Case',
    description: 'This tool creates a new test case for a user story or defect with N steps.',
    inputSchema: {
        testCase: z
            .object({
                Name: z.string()
                    .describe('The name of the test case. Example: "Test login functionality"'),
                Description: z.string()
                    .optional()
                    .describe('The description of the test case. Example: "Test case to verify user login functionality"'),
                WorkProduct: z.string()
                    .optional()
                    .describe('The work product ObjectID to associate the test case with. Can be a user story (/hierarchicalrequirement/12345) or a defect (/defect/12345). If not provided, UserStory field will be used for backward compatibility.'),
                UserStory: z.string()
                    .optional()
                    .describe('(DEPRECATED: Use WorkProduct instead) The user story ObjectID to associate the test case with. Example: /hierarchicalrequirement/12345'),
                Project: z.string()
                    .describe('The project ObjectID to associate the test case with. Example: /project/12345'),
                Iteration: z.string()
                    .optional()
                    .describe('The iteration ObjectID to associate the test case with. Example: /iteration/12345'),
                Owner: z.string()
                    .describe('The user ObjectID to associate the test case with. Example: /user/12345'),
                TestFolder: z.string()
                    .describe('The test folder ObjectID to associate the test case with. Example: /testfolder/12345'),
                Steps: z
                    .array(z.object({
                        Input: z.string().describe('The input/action for this test step. Example: "Enter username in username field"'),
                        ExpectedResult: z.string().describe('The expected result for this test step. Example: "Username field should be populated with entered value"')
                    }))
                    .optional()
                    .describe('An array of test case steps. Each step must have Input and ExpectedResult.')
            })
            .describe('The test case data to create. Must include Name, WorkProduct (or UserStory), Project, Owner, and TestFolder.')
    }
};