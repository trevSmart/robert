/**
 * Tenant-specific Jira metadata: custom-field IDs (sprint, story points,
 * flagged, ...) and issue types (sub-tasks, bugs).
 *
 * Custom-field IDs and issue-type names differ between Jira sites (and are
 * localized), so they are discovered from the site's field and issue-type
 * metadata and cached per site. Until discovery succeeds (or if it fails),
 * the defaults of the site Robert was first built against are used.
 */
import { ErrorHandler } from '../../ErrorHandler';
import { SettingsManager } from '../../SettingsManager';
import { getJiraSettings, jiraRequest, quoteJql, validateJiraSettings } from './jiraClient';

const errorHandler = ErrorHandler.getInstance();

export interface JiraFieldIds {
	sprint: string;
	/** Candidate story-point fields, in priority order (company- and team-managed projects use different ones). */
	storyPoints: string[];
	epicLink: string;
	flagged: string;
	team: string;
}

const DEFAULT_FIELDS: Readonly<JiraFieldIds> = Object.freeze({
	sprint: 'customfield_10020',
	storyPoints: ['customfield_10016'],
	epicLink: 'customfield_10014',
	flagged: 'customfield_10021',
	team: 'customfield_10001'
});

/** Issue-type names used when metadata is unavailable (the original tenant's names). */
const DEFAULT_SUBTASK_TYPE_NAMES = ['Subtarea'];
const DEFAULT_BUG_TYPE_NAMES = ['Incidencias'];

/** Names that identify a bug issue type when no explicit list is configured (compared case-insensitively). */
const BUG_TYPE_NAME_CANDIDATES = ['bug', 'bugs', 'defect', 'defecto', 'incidencia', 'incidencias', 'incidència', 'incidències'];

const SCHEMA = {
	sprint: 'com.pyxis.greenhopper.jira:gh-sprint',
	storyPointEstimate: 'com.pyxis.greenhopper.jira:jsw-story-points',
	epicLink: 'com.pyxis.greenhopper.jira:gh-epic-link',
	team: ['com.atlassian.jira.plugin.system.customfieldtypes:atlassian-team', 'com.atlassian.teams:rm-teams-custom-field-team']
};

interface JiraFieldMetadata {
	id: string;
	name?: string;
	custom?: boolean;
	schema?: { type?: string; custom?: string };
}

interface JiraIssueTypeMetadata {
	id: string;
	name?: string;
	untranslatedName?: string;
	subtask?: boolean;
}

export interface JiraIssueTypes {
	/** True when the IDs below come from the site's metadata. */
	discovered: boolean;
	subtaskIds: string[];
	bugIds: string[];
	/** Names used for JQL and matching when metadata is unavailable. */
	subtaskNames: string[];
	bugNames: string[];
}

/** Live field IDs (mutated in place when metadata is loaded). */
export const JIRA_FIELDS: JiraFieldIds = { ...DEFAULT_FIELDS, storyPoints: [...DEFAULT_FIELDS.storyPoints] };

/** Live issue-type mapping (mutated in place when metadata is loaded). */
export const JIRA_ISSUE_TYPES: JiraIssueTypes = defaultIssueTypes();

function defaultIssueTypes(): JiraIssueTypes {
	return { discovered: false, subtaskIds: [], bugIds: [], subtaskNames: [...DEFAULT_SUBTASK_TYPE_NAMES], bugNames: [...DEFAULT_BUG_TYPE_NAMES] };
}

/** Picks the custom-field IDs Robert needs from `GET /rest/api/3/field`. Missing ones keep their default. */
export function resolveFieldIds(fields: JiraFieldMetadata[]): JiraFieldIds {
	const bySchema = (custom: string | string[]) => {
		const wanted = Array.isArray(custom) ? custom : [custom];
		return fields.find(field => field.schema?.custom && wanted.includes(field.schema.custom))?.id;
	};
	const byName = (pattern: RegExp, predicate: (field: JiraFieldMetadata) => boolean = () => true) => fields.filter(field => field.custom !== false && field.name && pattern.test(field.name.trim()) && predicate(field)).map(field => field.id);

	const storyPoints = [
		...fields.filter(field => field.schema?.custom === SCHEMA.storyPointEstimate).map(field => field.id),
		// "Story Points" (company-managed) / "Story point estimate" (team-managed).
		...byName(/^story points?( estimate)?$/i, field => field.schema?.type === 'number')
	].filter((id, index, all) => all.indexOf(id) === index);

	return {
		sprint: bySchema(SCHEMA.sprint) ?? DEFAULT_FIELDS.sprint,
		storyPoints: storyPoints.length > 0 ? storyPoints : [...DEFAULT_FIELDS.storyPoints],
		epicLink: bySchema(SCHEMA.epicLink) ?? DEFAULT_FIELDS.epicLink,
		flagged: byName(/^flagged$/i)[0] ?? DEFAULT_FIELDS.flagged,
		team: bySchema(SCHEMA.team) ?? DEFAULT_FIELDS.team
	};
}

/** Parses the optional comma-separated `robert.jiraBugIssueTypes` setting. */
export function parseIssueTypeNames(value: string | undefined | null): string[] {
	return (value ?? '')
		.split(',')
		.map(name => name.trim())
		.filter(Boolean);
}

/**
 * Classifies the site's issue types from `GET /rest/api/3/issuetype`.
 * Sub-tasks come from the `subtask` flag; bugs from `bugTypeNames` when given,
 * otherwise from well-known (localized) bug type names.
 */
export function resolveIssueTypes(types: JiraIssueTypeMetadata[], bugTypeNames: string[] = []): JiraIssueTypes {
	const wanted = (bugTypeNames.length > 0 ? bugTypeNames : BUG_TYPE_NAME_CANDIDATES).map(name => name.toLowerCase());
	const isBug = (type: JiraIssueTypeMetadata) => !type.subtask && [type.name, type.untranslatedName].some(name => name && wanted.includes(name.trim().toLowerCase()));
	const subtasks = types.filter(type => type.subtask === true);
	const bugs = types.filter(isBug);
	return {
		discovered: true,
		subtaskIds: subtasks.map(type => String(type.id)),
		bugIds: bugs.map(type => String(type.id)),
		subtaskNames: subtasks.map(type => type.name ?? '').filter(Boolean),
		bugNames: bugs.map(type => type.name ?? '').filter(Boolean)
	};
}

// --- JQL / matching helpers -------------------------------------------------

/** JQL clause matching (or excluding) sub-task issues. Uses Jira's built-in function, so it is locale-independent. */
export function subtaskJql(include: boolean): string {
	return include ? 'issuetype in subTaskIssueTypes()' : 'issuetype not in subTaskIssueTypes()';
}

/** JQL value list for bug types, or null when the site has no bug type (callers then skip defect queries). */
export function bugTypesJqlList(types: JiraIssueTypes = JIRA_ISSUE_TYPES): string | null {
	if (types.discovered) {
		return types.bugIds.length > 0 ? `(${types.bugIds.join(', ')})` : null;
	}
	return types.bugNames.length > 0 ? `(${types.bugNames.map(quoteJql).join(', ')})` : null;
}

export function isSubtaskIssueType(issueType: { id?: string | number; name?: string; subtask?: boolean } | null | undefined, types: JiraIssueTypes = JIRA_ISSUE_TYPES): boolean {
	if (!issueType) {
		return false;
	}
	if (typeof issueType.subtask === 'boolean') {
		return issueType.subtask;
	}
	return types.discovered ? types.subtaskIds.includes(String(issueType.id)) : types.subtaskNames.includes(issueType.name ?? '');
}

export function isBugIssueType(issueType: { id?: string | number; name?: string } | null | undefined, types: JiraIssueTypes = JIRA_ISSUE_TYPES): boolean {
	if (!issueType) {
		return false;
	}
	return types.discovered ? types.bugIds.includes(String(issueType.id)) : types.bugNames.includes(issueType.name ?? '');
}

/** Story points of an issue: the first candidate field with a value. */
export function storyPointsOf(fields: Record<string, unknown>, ids: JiraFieldIds = JIRA_FIELDS): number {
	for (const id of ids.storyPoints) {
		const value = fields[id];
		if (typeof value === 'number') {
			return value;
		}
	}
	return 0;
}

// --- Loading ----------------------------------------------------------------

let loaded: { key: string; promise: Promise<void> } | null = null;

/**
 * Loads field and issue-type metadata for the configured site once (cached per
 * site and bug-type setting). Never throws: on failure the defaults stay in
 * place and the next call retries.
 */
export function ensureJiraMetadata(): Promise<void> {
	if (!validateJiraSettings().isValid) {
		return Promise.resolve();
	}
	const bugTypeNames = parseIssueTypeNames(SettingsManager.getInstance().getSetting('jiraBugIssueTypes'));
	const key = `${getJiraSettings().baseUrl}|${bugTypeNames.join(',')}`;
	if (loaded?.key === key) {
		return loaded.promise;
	}

	const promise = (async () => {
		const [fields, types] = await Promise.all([jiraRequest<JiraFieldMetadata[]>('/rest/api/3/field'), jiraRequest<JiraIssueTypeMetadata[]>('/rest/api/3/issuetype')]);
		Object.assign(JIRA_FIELDS, resolveFieldIds(Array.isArray(fields) ? fields : []));
		Object.assign(JIRA_ISSUE_TYPES, resolveIssueTypes(Array.isArray(types) ? types : [], bugTypeNames));
		errorHandler.logInfo(
			`Jira metadata loaded: sprint=${JIRA_FIELDS.sprint}, storyPoints=${JIRA_FIELDS.storyPoints.join('|')}, flagged=${JIRA_FIELDS.flagged}, subtask types=[${JIRA_ISSUE_TYPES.subtaskNames.join(', ')}], bug types=[${JIRA_ISSUE_TYPES.bugNames.join(', ')}]`,
			'jiraMetadata.ensureJiraMetadata'
		);
		if (JIRA_ISSUE_TYPES.bugIds.length === 0) {
			errorHandler.logWarning('No bug issue type found on this Jira site; defects will be empty. Set robert.jiraBugIssueTypes to the names of your bug issue types.', 'jiraMetadata.ensureJiraMetadata');
		}
	})().catch(error => {
		errorHandler.logWarning(`Could not load Jira field/issue-type metadata, using defaults: ${error instanceof Error ? error.message : String(error)}`, 'jiraMetadata.ensureJiraMetadata');
		if (loaded?.promise === promise) {
			loaded = null;
		}
	});
	loaded = { key, promise };
	return promise;
}

/** Forgets loaded metadata (provider/site change, reload). */
export function resetJiraMetadata(): void {
	loaded = null;
	Object.assign(JIRA_FIELDS, { ...DEFAULT_FIELDS, storyPoints: [...DEFAULT_FIELDS.storyPoints] });
	Object.assign(JIRA_ISSUE_TYPES, defaultIssueTypes());
}
