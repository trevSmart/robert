import {z} from 'zod';
import {completable} from '@modelcontextprotocol/sdk/server/completable.js';
// log is not used in this module; removing import to satisfy linting rules
import {rallyData} from '../../index.js';

export function createNewUserStoryPromptDefinition() {
	return {
		title: 'Create new user story',
		description: 'Create new user story',
		argsSchema: {
			userStory: z.object({
				project: completable(z.string().describe('Project to create the user story in'), value => ['Yes', 'No'].filter(d => d.toLowerCase().startsWith(value.toLowerCase()))),
				// project: completable(z.enum(), (value = '') => rallyData.projects.map(project => project.Name).filter(d => d.toLowerCase().startsWith(value.toLowerCase()))),
				//project: completable(z.enum(rallyData.projects.map(project => project.Name)), (value = '') => rallyData.projects.map(project => project.Name).filter(d => d.toLowerCase().startsWith(value.toLowerCase()))),
				iteration: completable(z.string().describe('Iteration to create the user story in'), value => ['Yes', 'No'].filter(d => d.toLowerCase().startsWith(value.toLowerCase()))),
				owner: completable(z.string().describe('Owner of the user story'), value => ['Yes', 'No'].filter(d => d.toLowerCase().startsWith(value.toLowerCase()))),
				name: z.string().describe('User story to create'),
				description: z.string().describe('User story description'),
				acceptanceCriteria: z.string().describe('User story acceptance criteria'),
				assignee: z.string().describe('User story assignee'),
				estimate: z.string().describe('User story estimate')
			})
		}
	};
}

export function createNewUserStoryPrompt({userStory}) {
	return {
		messages: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `We are creating a new user story for:
	· Project: ${userStory?.project || rallyData.defaultProject.Name}
	· Iteration: ${userStory?.iteration || ''}
	· Owner: ${userStory?.owner || rallyData.currentUser.DisplayName}

	with the following information:
	name: ${userStory?.name || ''}
	description: ${userStory?.description || ''}
	acceptance criteria: ${userStory?.acceptanceCriteria || ''}
	assignee: ${userStory?.assignee || ''}
	estimate: ${userStory?.estimate || ''}`
				}
			}
		]
	};
}