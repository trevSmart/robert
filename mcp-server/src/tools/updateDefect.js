import {getRallyApi} from '../utils.js';
import {z} from 'zod';

export async function updateDefect({defectRef, updates}) {
	// Validate required fields
	if (!defectRef) {
		throw new Error('defectRef is required');
	}
	if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
		throw new Error('updates must be a non-empty object');
	}

	// If defectRef is a number (ObjectID), convert to ref
	if (!Number.isNaN(Number(defectRef)) && !defectRef.startsWith('/defect/')) {
		defectRef = `/defect/${defectRef}`;
	}

	// Validate that defectRef looks like a valid Rally ref
	if (!defectRef.startsWith('/defect/')) {
		throw new Error('Invalid defectRef: must be a valid defect reference or ObjectID');
	}

	const rallyApi = getRallyApi();

	try {
		const result = await rallyApi.update({
			ref: defectRef,
			data: updates,
			fetch: ['FormattedID', 'Name', 'State', 'Severity', 'Priority'] // Fetch some basic fields
		});

		const updatedObject = result.Object;

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						FormattedID: updatedObject.FormattedID,
						Name: updatedObject.Name,
						State: updatedObject.State,
						Severity: updatedObject.Severity,
						Priority: updatedObject.Priority,
						_ref: updatedObject._ref
					}, null, 2)
				}
			]
		};
	} catch (error) {
		console.error('Error updating defect:', error);
		console.error('Error details:', {
			message: error.message,
			statusCode: error.statusCode,
			statusMessage: error.statusMessage,
			body: error.body
		});

		// Provide more specific error information
		if (error.statusCode === 401) {
			if (error.message.includes('Unauthorized')) {
				throw new Error('401 Unauthorized: API key may be invalid or user lacks permissions');
			} else {
				throw new Error('401 Unauthorized: User may not have permission to update defects in this workspace');
			}
		}

		throw error;
	}
}

export const updateDefectToolDefinition = {
	name: 'updateDefect',
	title: 'Update Defect',
	description: 'This tool updates an existing defect in Rally.',
	inputSchema: {
		defectRef: z
			.string()
			.describe('The reference or ObjectID of the defect to update.'),
		updates: z
			.record(z.any())
			.describe('The fields to update.')
	}
};
