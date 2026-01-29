
import {getRallyApi} from '../utils.js';
import {z} from 'zod';

export async function createDefect({defect}) {
    //Validate required fields
    if (!defect || !defect.Name) {
        throw new Error('Defect Name is required');
    }

    console.error('Creating defect with data:', JSON.stringify(defect, null, 2));

    const rallyApi = getRallyApi();

    try {
        //First, test if we can read data to verify connection
        console.error('Testing connection by reading workspace info...');
        const workspaceTest = await rallyApi.query({
            type: 'workspace',
            fetch: ['Name', 'ObjectID'],
            limit: 1
        });
        console.error('Connection test successful, found workspaces:', workspaceTest.Results.length);

        //Now try to create the defect
        console.error('Attempting to create defect...');
        const result = await rallyApi.create({
            type: 'defect',
            data: {
                Name: defect.Name
            },
            fetch: ['FormattedID'],
            scope: {
                workspace: defect.workspace || '/workspace/12345' //Using default workspace for testing
            },
            requestOptions: {}
        });

        const createdObject = result.Object;
        console.error(`Successfully created defect: ${createdObject.FormattedID} - ${createdObject.Name}`);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        FormattedID: createdObject.FormattedID,
                        Name: createdObject.Name,
                        _ref: createdObject._ref
                    }, null, 2)
                }
            ]
        };
    } catch (error) {
        console.error('Error creating defect:', error);
        console.error('Error details:', {
            message: error.message,
            statusCode: error.statusCode,
            statusMessage: error.statusMessage,
            body: error.body
        });

        //Provide more specific error information
        if (error.statusCode === 401) {
            if (error.message.includes('Unauthorized')) {
                throw new Error('401 Unauthorized: API key may be invalid or user lacks permissions');
            } else {
                throw new Error('401 Unauthorized: User may not have permission to create defects in this workspace');
            }
        }

        throw error;
    }
}

export const createDefectTool = {
	name: 'createDefect',
	title: 'Create Defect',
	description: 'This tool creates a new defect in Rally using the exact example from the documentation.',
	inputSchema: {
		defect: z
			.object({
				Name: z.string().describe('The name of the defect')
			})
			.describe('The defect data to create. Must include Name.')
	}
};