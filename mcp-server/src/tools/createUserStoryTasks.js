
import {getRallyApi} from '../utils.js';
import {z} from 'zod';

export async function createUserStoryTasks({tasks = []}) {

	//Validate required fields for each task
	const requiredFields = ['Project', 'WorkProduct', 'Name', 'Description'];

	tasks.forEach((task, i) => {
		const missingFields = requiredFields.filter(field => !task[field]);

		if (missingFields.length) {
			throw new Error(`Task at index ${i} is missing required fields: ${missingFields.join(', ')}`);
		}

		//Validate that Project and WorkProduct are valid Rally object references
		if (!task.Project.startsWith('/project/')) {
			throw new Error(`Task at index ${i} has invalid Project reference: ${task.Project}`);
		}

		if (!task.WorkProduct.startsWith('/hierarchicalrequirement/')) {
			throw new Error(`Task at index ${i} has invalid WorkProduct reference: ${task.WorkProduct}`);
		}
	});

	//console.error(`Validation passed for ${tasks.length} tasks`);

	const rallyApi = getRallyApi();

	const createPromises = tasks.map(taskData =>
		//console.error('Creating task with data:', JSON.stringify(taskData, null, 2));
		 rallyApi.create({
			type: 'task',
			data: taskData,
			fetch: ['Name']
		}));

	return Promise.all(createPromises)
	.then(results => {
		//console.error('All tasks created successfully:');
		const output = results.map(result => {
			const createdObject = result.Object;
			//console.error(`Successfully created task: ${createdObject.FormattedID} - ${createdObject.Name}`);
			return {
				FormattedID: createdObject.FormattedID,
				Name: createdObject.Name,
				_ref: createdObject._ref
			};
		});

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(output, null, 2)
				}
			]
		};
	})
	.catch(error => {
		//console.error('One or more tasks could not be created.', error);
		throw error;
	});
}

export const createUserStoryTasksTool = {
	name: 'createUserStoryTasks',
	title: 'Create User Story Tasks',
	description: 'This tool creates one or more tasks for a user story.',
	inputSchema: {
		tasks: z
			.array(z.object({
				Project: z.string().describe('The project ObjectID to associate the task with. Example: /project/12345'),
				WorkProduct: z.string().describe('The user story ObjectID to associate the task with. Example: /hierarchicalrequirement/12345'),
				Name: z.string().describe('The name of the task'),
				Description: z.string().describe('The description of the task')
			}))
			.describe('An array of task objects to be created. Each object must contain the necessary fields for a task.')
	}
};