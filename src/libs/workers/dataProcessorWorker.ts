/**
 * Data Processor Worker - Procesa dades pesades en un thread separat
 * Evita bloquejar el thread principal
 */

import { parentPort } from 'worker_threads';

interface WorkerMessage {
	type: 'formatUserStories' | 'formatIterations' | 'formatTasks' | 'formatDefects';
	payload: unknown[];
}

interface WorkerResult {
	success: boolean;
	data?: unknown[];
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

function formatUserStories(results: unknown[]): unknown[] {
	return results.map((userStory: unknown) => {
		const story = userStory as Record<string, unknown>;
		return {
			objectId: story.ObjectID ?? story.objectId,
			formattedId: story.FormattedID ?? story.formattedId,
			name: story.Name ?? story.name,
			description: sanitizeDescription(story.Description ?? story.description),
			state: story.State ?? story.state,
			planEstimate: story.PlanEstimate ?? story.planEstimate,
			toDo: story.ToDo ?? story.toDo,
			assignee: story.c_Assignee
				? ((story.c_Assignee as Record<string, unknown>)._refObjectName ?? (story.c_Assignee as Record<string, unknown>).refObjectName)
				: story.c_assignee
					? ((story.c_assignee as Record<string, unknown>)._refObjectName ?? (story.c_assignee as Record<string, unknown>).refObjectName)
					: 'Sense assignat',
			project: story.Project ? ((story.Project as Record<string, unknown>)._refObjectName ?? (story.Project as Record<string, unknown>).refObjectName) : story.project ? ((story.project as Record<string, unknown>)._refObjectName ?? (story.project as Record<string, unknown>).refObjectName) : null,
			iteration: story.Iteration
				? ((story.Iteration as Record<string, unknown>)._refObjectName ?? (story.Iteration as Record<string, unknown>).refObjectName)
				: story.iteration
					? ((story.iteration as Record<string, unknown>)._refObjectName ?? (story.iteration as Record<string, unknown>).refObjectName)
					: null,
			blocked: story.Blocked ?? story.blocked,
			taskEstimateTotal: story.TaskEstimateTotal ?? story.taskEstimateTotal,
			taskStatus: story.TaskStatus ?? story.taskStatus,
			tasksCount: (story.Tasks as Record<string, unknown>)?.Count ?? (story.tasks as Record<string, unknown>)?.count ?? 0,
			testCasesCount: (story.TestCases as Record<string, unknown>)?.Count ?? (story.testCases as Record<string, unknown>)?.count ?? 0,
			defectsCount: (story.Defects as Record<string, unknown>)?.Count ?? (story.defects as Record<string, unknown>)?.count ?? 0,
			discussionCount: (story.Discussion as Record<string, unknown>)?.Count ?? (story.discussion as Record<string, unknown>)?.count ?? 0,
			appgar: story.c_Appgar ?? story.appgar,
			scheduleState: story.ScheduleState ?? story.scheduleState
		};
	});
}

function formatIterations(results: unknown[]): unknown[] {
	return results.map((iteration: unknown) => {
		const iter = iteration as Record<string, unknown>;
		return {
			objectId: iter.ObjectID ?? iter.objectId,
			name: iter.Name ?? iter.name,
			startDate: iter.StartDate ?? iter.startDate,
			endDate: iter.EndDate ?? iter.endDate,
			state: iter.State ?? iter.state,
			project: iter.Project ? ((iter.Project as Record<string, unknown>)._refObjectName ?? (iter.Project as Record<string, unknown>).refObjectName) : iter.project ? ((iter.project as Record<string, unknown>)._refObjectName ?? (iter.project as Record<string, unknown>).refObjectName) : null,
			_ref: iter._ref
		};
	});
}

function formatTasks(results: unknown[]): unknown[] {
	return results.map((task: unknown) => {
		const t = task as Record<string, unknown>;
		return {
			objectId: t.ObjectID ?? t.objectId,
			formattedId: t.FormattedID ?? t.formattedId,
			name: t.Name ?? t.name,
			description: sanitizeDescription(t.Description ?? t.description),
			state: t.State ?? t.state,
			owner: t.Owner ? ((t.Owner as Record<string, unknown>)._refObjectName ?? (t.Owner as Record<string, unknown>).refObjectName) : t.owner ? ((t.owner as Record<string, unknown>)._refObjectName ?? (t.owner as Record<string, unknown>).refObjectName) : 'Sense propietari',
			estimate: t.Estimate ?? t.estimate ?? 0,
			toDo: t.ToDo ?? t.toDo ?? 0,
			timeSpent: t.TimeSpent ?? t.timeSpent ?? 0,
			workItem: t.WorkProduct ? ((t.WorkProduct as Record<string, unknown>)._refObjectName ?? (t.WorkProduct as Record<string, unknown>).refObjectName) : t.workProduct ? ((t.workProduct as Record<string, unknown>)._refObjectName ?? (t.workProduct as Record<string, unknown>).refObjectName) : null,
			rank: t.Rank ?? t.rank ?? 0
		};
	});
}

function formatDefects(results: unknown[]): unknown[] {
	return results.map((defect: unknown) => {
		const d = defect as Record<string, unknown>;
		return {
			objectId: d.ObjectID ?? d.objectId,
			formattedId: d.FormattedID ?? d.formattedId,
			name: d.Name ?? d.name,
			description: sanitizeDescription(d.Description ?? d.description),
			state: d.State ?? d.state,
			severity: d.Severity ?? d.severity ?? 'Normal',
			priority: d.Priority ?? d.priority ?? 'Normal',
			owner: d.Owner ? ((d.Owner as Record<string, unknown>)._refObjectName ?? (d.Owner as Record<string, unknown>).refObjectName) : d.owner ? ((d.owner as Record<string, unknown>)._refObjectName ?? (d.owner as Record<string, unknown>).refObjectName) : 'Sense assignat',
			project: d.Project ? ((d.Project as Record<string, unknown>)._refObjectName ?? (d.Project as Record<string, unknown>).refObjectName) : d.project ? ((d.project as Record<string, unknown>)._refObjectName ?? (d.project as Record<string, unknown>).refObjectName) : null,
			iteration: d.Iteration ? ((d.Iteration as Record<string, unknown>)._refObjectName ?? (d.Iteration as Record<string, unknown>).refObjectName) : d.iteration ? ((d.iteration as Record<string, unknown>)._refObjectName ?? (d.iteration as Record<string, unknown>).refObjectName) : null,
			blocked: d.Blocked ?? d.blocked ?? false,
			discussionCount: (d.Discussion as Record<string, unknown>)?.Count ?? (d.discussion as Record<string, unknown>)?.count ?? 0
		};
	});
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
