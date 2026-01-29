
import {getRallyApi} from '../utils.js';
import {z} from 'zod';

export async function updateTask({taskRef, updates}) {
    //Validate required fields
    if (!taskRef) {
        throw new Error('taskRef is required');
    }
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
        throw new Error('updates must be a non-empty object');
    }

    //If taskRef is a number (ObjectID), convert to ref
    if (!Number.isNaN(Number(taskRef)) && !taskRef.startsWith('/task/')) {
        taskRef = `/task/${taskRef}`;
    }

    //Validate that taskRef looks like a valid Rally ref
    if (!taskRef.startsWith('/task/')) {
        throw new Error('Invalid taskRef: must be a valid task reference or ObjectID');
    }

    //console.error(`Updating task ${taskRef} with updates:`, JSON.stringify(updates, null, 2));

    const rallyApi = getRallyApi();

    const result = await rallyApi.update({
        ref: taskRef,
        data: updates,
        fetch: ['FormattedID', 'Name', 'State'] //Fetch some basic fields
    });

    const updatedObject = result.Object;
    //console.error(`Successfully updated task: ${updatedObject.FormattedID} - ${updatedObject.Name}`);

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    FormattedID: updatedObject.FormattedID,
                    Name: updatedObject.Name,
                    State: updatedObject.State,
                    _ref: updatedObject._ref
                }, null, 2)
            }
        ]
    };
}

export const updateTaskTool = {
    name: 'updateTask',
    title: 'Update Task',
    description: 'This tool updates an existing task in Rally.',
    inputSchema: {
        taskRef: z
            .string()
            .describe('The reference or ObjectID of the task to update.'),
        updates: z
            .record(z.any())
            .describe('The fields to update.')
    }
};