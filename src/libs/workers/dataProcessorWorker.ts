/**
 * Data Processor Worker - Procesa dades pesades en un thread separat
 * Evita bloquejar el thread principal
 */

import { parentPort } from 'worker_threads';

interface WorkerMessage {
	type: 'formatUserStories' | 'formatIterations' | 'formatTasks' | 'formatDefects';
	payload: any;
}

interface WorkerResult {
	success: boolean;
	data?: any;
	error?: string;
	processed: number;
}

function sanitizeDescription(description: unknown): string | null {
	if (description == null) {
		return null;
	}

	if (typeof description !== 'string') {
		return String(description);
	}

	let sanitized = description;
	let previous: string;
	// Repeatedly remove HTML-like tags to avoid incomplete multi-character sanitization
	do {
		previous = sanitized;
		sanitized = sanitized.replace(/<[^>]*>/g, '');
	} while (sanitized !== previous);

	// Remove any remaining angle brackets to avoid HTML element injection
	sanitized = sanitized.replace(/[<>]/g, '');

	return sanitized;
}

function formatUserStories(results: any[]): any[] {
	return results.map((userStory: any) => ({
		objectId: userStory.ObjectID ?? userStory.objectId,
		formattedId: userStory.FormattedID ?? userStory.formattedId,
		name: userStory.Name ?? userStory.name,
		description: sanitizeDescription(userStory.Description ?? userStory.description),
		state: userStory.State ?? userStory.state,
		planEstimate: userStory.PlanEstimate ?? userStory.planEstimate,
		toDo: userStory.ToDo ?? userStory.toDo,
		assignee: userStory.c_Assignee ? (userStory.c_Assignee._refObjectName ?? userStory.c_Assignee.refObjectName) : userStory.c_assignee ? (userStory.c_assignee._refObjectName ?? userStory.c_assignee.refObjectName) : 'Sense assignat',
		project: userStory.Project ? (userStory.Project._refObjectName ?? userStory.Project.refObjectName) : userStory.project ? (userStory.project._refObjectName ?? userStory.project.refObjectName) : null,
		iteration: userStory.Iteration ? (userStory.Iteration._refObjectName ?? userStory.Iteration.refObjectName) : userStory.iteration ? (userStory.iteration._refObjectName ?? userStory.iteration.refObjectName) : null,
		blocked: userStory.Blocked ?? userStory.blocked,
		taskEstimateTotal: userStory.TaskEstimateTotal ?? userStory.taskEstimateTotal,
		taskStatus: userStory.TaskStatus ?? userStory.taskStatus,
		tasksCount: userStory.Tasks?.Count ?? userStory.tasks?.count ?? 0,
		testCasesCount: userStory.TestCases?.Count ?? userStory.testCases?.count ?? 0,
		defectsCount: userStory.Defects?.Count ?? userStory.defects?.count ?? 0,
		discussionCount: userStory.Discussion?.Count ?? userStory.discussion?.count ?? 0,
		appgar: userStory.c_Appgar ?? userStory.appgar,
		scheduleState: userStory.ScheduleState ?? userStory.scheduleState ?? 'Unknown'
	}));
}

function formatIterations(results: any[]): any[] {
	return results.map((iteration: any) => ({
		objectId: iteration.ObjectID ?? iteration.objectId,
		name: iteration.Name ?? iteration.name,
		startDate: iteration.StartDate ?? iteration.startDate,
		endDate: iteration.EndDate ?? iteration.endDate,
		state: iteration.State ?? iteration.state,
		project: iteration.Project ? (iteration.Project._refObjectName ?? iteration.Project.refObjectName) : iteration.project ? (iteration.project._refObjectName ?? iteration.project.refObjectName) : null,
		_ref: iteration._ref
	}));
}

function formatTasks(results: any[]): any[] {
	return results.map((task: any) => ({
		objectId: task.ObjectID ?? task.objectId,
		formattedId: task.FormattedID ?? task.formattedId,
		name: task.Name ?? task.name,
		description: sanitizeDescription(task.Description ?? task.description),
		state: task.State ?? task.state,
		owner: task.Owner ? (task.Owner._refObjectName ?? task.Owner.refObjectName) : task.owner ? (task.owner._refObjectName ?? task.owner.refObjectName) : 'Sense propietari',
		estimate: task.Estimate ?? task.estimate ?? 0,
		toDo: task.ToDo ?? task.toDo ?? 0,
		timeSpent: task.TimeSpent ?? task.timeSpent ?? 0,
		workItem: task.WorkProduct ? (task.WorkProduct._refObjectName ?? task.WorkProduct.refObjectName) : task.workProduct ? (task.workProduct._refObjectName ?? task.workProduct.refObjectName) : null,
		rank: task.Rank ?? task.rank ?? 0
	}));
}

function formatDefects(results: any[]): any[] {
	return results.map((defect: any) => ({
		objectId: defect.ObjectID ?? defect.objectId,
		formattedId: defect.FormattedID ?? defect.formattedId,
		name: defect.Name ?? defect.name,
		description: sanitizeDescription(defect.Description ?? defect.description),
		state: defect.State ?? defect.state,
		severity: defect.Severity ?? defect.severity ?? 'Normal',
		priority: defect.Priority ?? defect.priority ?? 'Normal',
		owner: defect.Owner ? (defect.Owner._refObjectName ?? defect.Owner.refObjectName) : defect.owner ? (defect.owner._refObjectName ?? defect.owner.refObjectName) : 'Sense assignat',
		project: defect.Project ? (defect.Project._refObjectName ?? defect.Project.refObjectName) : defect.project ? (defect.project._refObjectName ?? defect.project.refObjectName) : null,
		iteration: defect.Iteration ? (defect.Iteration._refObjectName ?? defect.Iteration.refObjectName) : defect.iteration ? (defect.iteration._refObjectName ?? defect.iteration.refObjectName) : null,
		scheduleState: defect.ScheduleState ?? defect.scheduleState ?? 'Unknown',
		blocked: defect.Blocked ?? defect.blocked ?? false,
		discussionCount: defect.Discussion?.Count ?? defect.discussion?.count ?? 0
	}));
}

// Handle messages from main thread
if (parentPort) {
	parentPort.on('message', (message: WorkerMessage) => {
		try {
			let result: any[];

			switch (message.type) {
				case 'formatUserStories':
					result = formatUserStories(message.payload);
					break;
				case 'formatIterations':
					result = formatIterations(message.payload);
					break;
				case 'formatTasks':
					result = formatTasks(message.payload);
					break;
				case 'formatDefects':
					result = formatDefects(message.payload);
					break;
				default:
					throw new Error(`Unknown message type: ${message.type}`);
			}

			parentPort!.postMessage({
				success: true,
				data: result,
				processed: result.length
			} as WorkerResult);
		} catch (error) {
			parentPort!.postMessage({
				success: false,
				error: error instanceof Error ? error.message : String(error),
				processed: 0
			} as WorkerResult);
		}
	});
}
