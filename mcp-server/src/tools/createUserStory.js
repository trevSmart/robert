
import {getRallyApi} from '../utils.js';
import {rallyData, sendElicitRequest} from '../../index.js';
import {z} from 'zod';

export async function createUserStory({userStory}) {
    //Validate required fields
    const requiredFields = ['Project', 'Name', 'Description'];
    const missingFields = requiredFields.filter(field => !userStory[field]);

    if (missingFields.length) {
        throw new Error(`User story is missing required fields: ${missingFields.join(', ')}`);
    }

    //Validate that Project is a valid Rally object reference
    if (!userStory.Project.startsWith('/project/')) {
        throw new Error('Invalid Project reference');
    }

    //Validate that Iteration is a valid Rally object reference if provided
    if (userStory.Iteration && !userStory.Iteration.startsWith('/iteration/')) {
        throw new Error('Invalid Iteration reference');
    }

    const elicitResult = await sendElicitRequest({
        confirmation: {
            type: 'string',
            title: 'Create User Story confirmation',
            description: 'Are you sure you want to create this user story?',
            enum: ['Yes', 'No'],
            enumNames: ['✅ Create user story', '❌ Don\'t create']
        }
    });

    if (elicitResult.action !== 'accept' || elicitResult.content?.confirmation !== 'Yes') {
        return {
            content: [{type: 'text', text: 'User story creation cancelled by user'}]
        };
    }

    const rallyApi = getRallyApi();

    try {
        //Prepare data object with required fields
        const data = {
            Name: userStory.Name,
            Description: userStory.Description,
            Project: userStory.Project || rallyData.defaultProject.ObjectID,
            Owner: userStory.Owner,
            c_APPGAR: 'APPCLD.CSBDSF',
            c_Canal: 'Salesforce',
            c_Tipo: '72219812153' //Desarrollo
        };

        //Add Iteration if provided
        if (userStory.Iteration) {
            data.Iteration = userStory.Iteration;
        }

        //Add Owner if provided
        if (userStory.Owner) {
            data.Owner = userStory.Owner;
        }

        //Try without scope first, using the exact structure from documentation
        const result = await rallyApi.create({
            type: 'hierarchicalrequirement',
            data: data,
            fetch: ['FormattedID', 'Name'],
            requestOptions: {}
        });

        const createdObject = result.Object;
        console.error(`Successfully created user story: ${createdObject.FormattedID} - ${createdObject.Name}`);

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
        console.error('Error creating user story:', error);
        throw error;
    }
}

export const createUserStoryTool = {
	name: 'createUserStory',
	title: 'Create User Story',
	description: 'This tool creates a new user story in Rally.',
	inputSchema: {
		userStory: z
			.object({
				Project: z.string().describe('The project ObjectID to associate the user story with. Example: /project/12345'),
				Name: z.string().describe('The name of the user story. Example: "User story title"'),
				Description: z.string().describe('The description of the user story. Example: "User story description"'),
				Iteration: z.string().optional().describe('The iteration ObjectID to associate the user story with. Example: /iteration/12345'),
				Owner: z.string().optional().describe('The user ObjectID to associate the user story with. Example: /user/12345')
			})
			.describe('The user story data to create. Must include Project, Name, Owner and Description.')
	}
};