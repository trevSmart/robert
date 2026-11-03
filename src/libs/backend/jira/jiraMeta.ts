import { ErrorHandler } from '../../../ErrorHandler';
import { jiraRequest, getJiraConfig, type JiraConfig } from './jiraApi';

const errorHandler = ErrorHandler.getInstance();

/** Cache key covering every setting that can invalidate resolved metadata. */
function configKey(config: JiraConfig): string {
	return `${config.instance}|${config.email}|${config.apiToken}|${config.projectKey}|${config.boardId}`;
}

let _boardIdCache: { boardId: number; key: string } | null = null;
let _storyPointsFieldCache: { fieldId: string | null; key: string } | null = null;

export function clearJiraMetaCaches(): void {
	_boardIdCache = null;
	_storyPointsFieldCache = null;
}

interface JiraBoard {
	id: number;
	name: string;
	type: string;
}

/**
 * Resolve the board whose sprints we read.
 *
 * Uses `robert.jiraBoardId` when set; otherwise auto-detects the project's first scrum board
 * (falling back to any board) via the Agile API.
 */
export async function resolveBoardId(config: JiraConfig = getJiraConfig()): Promise<number> {
	if (config.boardId) {
		const explicit = Number(config.boardId);
		if (Number.isFinite(explicit)) {
			return explicit;
		}
		errorHandler.logWarning(`Configured jiraBoardId '${config.boardId}' is not numeric; auto-detecting instead`, 'jiraMeta.resolveBoardId');
	}

	const key = configKey(config);
	if (_boardIdCache && _boardIdCache.key === key) {
		return _boardIdCache.boardId;
	}

	const response = await jiraRequest<{ values?: JiraBoard[] }>(
		'/rest/agile/1.0/board',
		{
			label: 'Resolving Jira board...',
			query: { projectKeyOrId: config.projectKey, maxResults: 50 }
		},
		config
	);

	const boards = response.values ?? [];
	if (!boards.length) {
		throw new Error(`No Jira board found for project "${config.projectKey}". Set robert.jiraBoardId explicitly.`);
	}

	const board = boards.find(b => b.type === 'scrum') ?? boards[0];
	if (boards.length > 1) {
		errorHandler.logInfo(`Project "${config.projectKey}" has ${boards.length} boards; using "${board.name}" (id ${board.id}). Set robert.jiraBoardId to override.`, 'jiraMeta.resolveBoardId');
	}

	_boardIdCache = { boardId: board.id, key };
	return board.id;
}

/**
 * Resolve the custom field holding story points.
 *
 * The field ID differs per Jira site, so it is configurable; when unset we look it up by name
 * through the field catalogue. Returns null when the site has no story-points field at all.
 */
export async function resolveStoryPointsField(config: JiraConfig = getJiraConfig()): Promise<string | null> {
	if (config.storyPointsField) {
		return config.storyPointsField;
	}

	const key = configKey(config);
	if (_storyPointsFieldCache && _storyPointsFieldCache.key === key) {
		return _storyPointsFieldCache.fieldId;
	}

	let fieldId: string | null = null;
	try {
		const fields = await jiraRequest<Array<{ id: string; name: string }>>('/rest/api/3/field', { label: 'Resolving Jira fields...' }, config);
		const match = fields.find(f => {
			const name = f.name?.toLowerCase() ?? '';
			return name === 'story points' || name === 'story point estimate';
		});
		fieldId = match?.id ?? null;

		if (!fieldId) {
			errorHandler.logInfo('No story points field found on this Jira site; estimates will read as 0.', 'jiraMeta.resolveStoryPointsField');
		}
	} catch (error) {
		// Field discovery needs broad permissions; degrade rather than break the whole load.
		errorHandler.logWarning(`Could not resolve the Jira story points field: ${error instanceof Error ? error.message : String(error)}`, 'jiraMeta.resolveStoryPointsField');
	}

	_storyPointsFieldCache = { fieldId, key };
	return fieldId;
}

export interface JiraSprint {
	id: number;
	name: string;
	state: string;
	startDate?: string;
	endDate?: string;
	completeDate?: string;
	goal?: string;
}

/** All sprints on the configured board, oldest state first (closed, active, future). */
export async function getBoardSprints(config: JiraConfig = getJiraConfig()): Promise<JiraSprint[]> {
	const boardId = await resolveBoardId(config);
	const collected: JiraSprint[] = [];
	let startAt = 0;

	// The sprint endpoint is offset-paginated and reports completion via `isLast`.
	for (;;) {
		const page = await jiraRequest<{ values?: JiraSprint[]; isLast?: boolean }>(
			`/rest/agile/1.0/board/${boardId}/sprint`,
			{
				label: 'Loading Jira sprints...',
				query: { startAt, maxResults: 50, state: 'active,future,closed' }
			},
			config
		);

		const values = page.values ?? [];
		collected.push(...values);

		if (page.isLast || values.length === 0) {
			break;
		}
		startAt += values.length;
	}

	return collected;
}
