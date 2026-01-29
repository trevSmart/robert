import {getRallyApi} from '../utils.js';
import {z} from 'zod';

export async function createTestFolder({testFolder}) {
	const rallyApi = getRallyApi();

	try {
		//Validate required fields
		const requiredFields = ['Name', 'Project'];
		const missingFields = requiredFields.filter(field => !testFolder[field]);

		if (missingFields.length) {
			throw new Error(`Test folder is missing required fields: ${missingFields.join(', ')}`);
		}

		//Validate that Project is a valid Rally object reference
		if (!testFolder.Project.startsWith('/project/')) {
			throw new Error('Invalid Project reference. Must start with /project/');
		}

		//Validate that Parent is a valid Rally object reference if provided
		if (testFolder.Parent && !testFolder.Parent.startsWith('/testfolder/')) {
			throw new Error('Invalid Parent reference. Must start with /testfolder/');
		}

		console.error(`Creating test folder with data: ${JSON.stringify(testFolder, null, 3)}`);

		//Build the test folder data
		const testFolderData = {
			Name: testFolder.Name,
			Project: testFolder.Project
		};

		//Add optional fields if provided
		if (testFolder.Description) {
			testFolderData.Description = testFolder.Description;
		}

		if (testFolder.Parent) {
			testFolderData.Parent = testFolder.Parent;
		}

		if (testFolder.Owner) {
			testFolderData.Owner = testFolder.Owner;
		}

		console.error(`Test folder data to be sent: ${JSON.stringify(testFolderData, null, 3)}`);

		const result = await rallyApi.create({
			type: 'testfolder',
			data: testFolderData,
			fetch: ['FormattedID', 'Name', '_ref', 'ObjectID']
		});

		console.error(`!!!!!!`);
		console.error(`Test folder result: ${JSON.stringify(result, null, 3)}`);
		console.error(`!!!!!!`);

		const createdTestFolder = result.Object;
		console.error(`Successfully created test folder: ${createdTestFolder.FormattedID} - ${createdTestFolder.Name}`);

		return {
			content: [{
				type: 'text',
				text: `Successfully created test folder:\n${JSON.stringify({
					FormattedID: createdTestFolder.FormattedID,
					ObjectID: createdTestFolder.ObjectID,
					Name: createdTestFolder.Name,
					_ref: createdTestFolder._ref
				}, null, 2)}`
			}]
		};

	} catch (error) {
		console.error(`Error creating test folder: ${error.message}`);
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error creating test folder: ${error.message}`
			}]
		};
	}
}

export const createTestFolderTool = {
	name: 'createTestFolder',
	title: 'Create Test Folder',
	description: 'This tool creates a new test folder in Rally. Test folders are used to organize test cases hierarchically.',
	inputSchema: {
		testFolder: z
			.object({
				Name: z.string()
					.describe('The name of the test folder. Example: "L0 - I83853 - Evolutivos Contact Salesforce 3Q 2025"'),
				Project: z.string()
					.describe('The project ObjectID to associate the test folder with. Example: /project/74278607305'),
				Description: z.string()
					.optional()
					.describe('The description of the test folder. Example: "Test folder for initiative I83853"'),
				Parent: z.string()
					.optional()
					.describe('The parent test folder ObjectID to create a hierarchical structure. Example: /testfolder/12345. Leave empty for root level folders.'),
				Owner: z.string()
					.optional()
					.describe('The user ObjectID to set as owner of the test folder. Example: /user/12345')
			})
			.describe('The test folder data to create. Must include Name and Project.')
	}
};
