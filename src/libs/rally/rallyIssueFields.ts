/**
 * Camps d'un artefacte de Rally (user story o defect) que Robert no mostra enlloc més, per a la
 * card «Fields» (la mateixa que amb Jira).
 *
 * Els valors surten de l'objecte amb `fetch=true` (camps estàndard i personalitzats, `c_*`). Els
 * noms visibles, si un camp és personalitzat i si està amagat surten dels `Attributes` del
 * `TypeDefinition` del tipus, en cache per workspace. Rally no exposa la disposició de la pàgina
 * de detall, així que els camps s'agrupen en dues pestanyes: «Custom» i «Standard».
 * Si no es pot llegir el TypeDefinition, es mostren igualment amb el nom de l'API.
 */
import type { IssueFieldsItemType, IssueFieldsResult, IssueFieldTab, IssueFieldValue } from '../../types/jira';
import type { RallyApiResult } from '../../types/rally';
import { ErrorHandler } from '../../ErrorHandler';
import { callRally } from './rallyCall';
import { getRallyApi, queryUtils, validateRallyConfiguration } from './utils';

const errorHandler = ErrorHandler.getInstance();

/** WSAPI type of each item type of the card. */
const RALLY_TYPES: Record<IssueFieldsItemType, string> = {
	userstory: 'HierarchicalRequirement',
	defect: 'Defect'
};

/**
 * Attributes that Robert already shows in the user story / defect detail (or in Related Records),
 * plus technical ones that mean nothing to the user.
 */
const HIDDEN_ATTRIBUTES = new Set([
	// Shown elsewhere.
	'FormattedID',
	'Name',
	'Description',
	'ScheduleState',
	'State',
	'Owner',
	'c_Assignee',
	'c_Appgar',
	'Project',
	'Iteration',
	'PlanEstimate',
	'TaskEstimateTotal',
	'TaskStatus',
	'Blocked',
	'BlockedReason',
	'Severity',
	'Priority',
	'Tasks',
	'TestCases',
	'Defects',
	'Discussion',
	'Attachments',
	'RevisionHistory',
	// Roll-ups and counters of things shown elsewhere (tasks, test cases, defects, children).
	'ToDo',
	'TaskActualTotal',
	'TaskRemainingTotal',
	'TestCaseCount',
	'PassingTestCaseCount',
	'TestCaseStatus',
	'DefectStatus',
	'DirectChildrenCount',
	// Technical.
	'ObjectID',
	'ObjectUUID',
	'VersionId',
	'Subscription',
	'Workspace',
	'DragAndDropRank',
	'DisplayColor',
	'LatestDiscussionAgeInMinutes',
	'HasParent',
	'Recycled'
]);

/** Attribute types that cannot be shown as text. */
const UNSUPPORTED_TYPES = new Set(['BINARY_DATA', 'RAW']);

/** The subset of a Rally AttributeDefinition this card needs. */
export interface RallyAttribute {
	elementName: string;
	name: string;
	attributeType: string;
	custom: boolean;
	hidden: boolean;
}

const ATTRIBUTES_TTL_MS = 10 * 60 * 1000;
const attributesCache = new Map<string, { attributes: RallyAttribute[]; at: number }>();

export function clearRallyIssueFieldsCache(): void {
	attributesCache.clear();
}

function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: unknown): string | null {
	if (typeof value !== 'string' || !value) {
		return null;
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

/**
 * Value of a Rally attribute ready to display, or null when it is empty or cannot be shown.
 * Collections only come with their size (`fetch=true`), except Tags, which also carry their names.
 */
export function formatRallyFieldValue(value: unknown, attributeType: string): { text: string; html?: string } | null {
	if (isEmpty(value) || UNSUPPORTED_TYPES.has(attributeType)) {
		return null;
	}
	if (attributeType === 'TEXT') {
		return typeof value === 'string' && value.trim() ? { text: '', html: value } : null;
	}
	if (attributeType === 'DATE') {
		const text = formatDate(value);
		return text ? { text } : null;
	}
	if (typeof value === 'boolean') {
		return { text: value ? 'Yes' : 'No' };
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return { text: String(value) };
	}
	if (typeof value !== 'object') {
		return null;
	}
	const item = value as Record<string, any>;
	if (attributeType === 'COLLECTION' || typeof item.Count === 'number') {
		const tagNames = Array.isArray(item._tagsNameArray) ? item._tagsNameArray.map((tag: any) => tag?.Name).filter((name: unknown): name is string => typeof name === 'string' && !!name) : [];
		if (tagNames.length > 0) {
			return { text: tagNames.join(', ') };
		}
		const count = Number(item.Count) || 0;
		return count > 0 ? { text: `${count} item${count === 1 ? '' : 's'}` } : null;
	}
	// Web link: { LinkID, DisplayString }.
	if ('LinkID' in item || 'DisplayString' in item) {
		const text = item.DisplayString || item.LinkID;
		return typeof text === 'string' && text ? { text } : null;
	}
	for (const key of ['_refObjectName', 'DisplayName', 'Name', 'FormattedID']) {
		if (typeof item[key] === 'string' && item[key]) {
			return { text: item[key] };
		}
	}
	return null;
}

/** Display name for an attribute that is not in the TypeDefinition (or when it could not be read). */
function fallbackAttribute(elementName: string, value: unknown): RallyAttribute {
	const isCollection = !!value && typeof value === 'object' && typeof (value as any).Count === 'number';
	return {
		elementName,
		name: elementName.replace(/^c_/, ''),
		attributeType: isCollection ? 'COLLECTION' : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? 'DATE' : 'STRING',
		custom: elementName.startsWith('c_'),
		hidden: false
	};
}

/**
 * Fields to show for a Rally object, in two tabs («Custom» first, then «Standard»), sorted by name.
 * Fields the workspace hides, fields shown elsewhere in Robert and empty fields are left out.
 * `attributes` is null when the TypeDefinition could not be read.
 */
export function buildRallyIssueFields(object: Record<string, unknown>, attributes: RallyAttribute[] | null): IssueFieldsResult {
	const byElementName = new Map((attributes ?? []).map(attribute => [attribute.elementName, attribute]));
	const custom: IssueFieldValue[] = [];
	const standard: IssueFieldValue[] = [];

	for (const [elementName, value] of Object.entries(object)) {
		if (elementName.startsWith('_') || HIDDEN_ATTRIBUTES.has(elementName)) {
			continue;
		}
		const attribute = byElementName.get(elementName) ?? (attributes ? null : fallbackAttribute(elementName, value));
		// With the TypeDefinition, unknown keys are not attributes (e.g. `Errors`): skip them.
		if (!attribute || attribute.hidden) {
			continue;
		}
		const formatted = formatRallyFieldValue(value, attribute.attributeType);
		if (formatted) {
			(attribute.custom ? custom : standard).push({ id: elementName, name: attribute.name || elementName, ...formatted });
		}
	}

	const byName = (a: IssueFieldValue, b: IssueFieldValue) => a.name.localeCompare(b.name);
	const tabs: IssueFieldTab[] = [
		{ name: 'Custom', fields: custom.sort(byName) },
		{ name: 'Standard', fields: standard.sort(byName) }
	].filter(tab => tab.fields.length > 0);
	return { tabs: tabs.length > 0 ? tabs : [{ name: null, fields: [] }], groupedByScreen: false };
}

function resultsOf(result: unknown): any[] {
	const data = result as RallyApiResult & { Results?: any[] };
	return data?.Results || data?.QueryResult?.Results || [];
}

async function fetchAttributes(typeName: string, workspaceRef: string | undefined): Promise<RallyAttribute[]> {
	const rallyApi = getRallyApi();
	const scope = workspaceRef ? { workspace: workspaceRef } : undefined;
	const typeDefinitions = resultsOf(
		await callRally(
			rallyApi,
			{
				type: 'typedefinition',
				fetch: ['ObjectID', 'ElementName', 'Attributes'],
				query: queryUtils.where('ElementName', '=', typeName),
				limit: 1,
				scope
			},
			'Loading field definitions...'
		)
	);
	const attributesRef = typeDefinitions[0]?.Attributes?._ref;
	if (!attributesRef) {
		throw new Error(`No TypeDefinition found for ${typeName}`);
	}
	const attributes = resultsOf(
		await callRally(
			rallyApi,
			{
				ref: attributesRef,
				fetch: ['ElementName', 'Name', 'AttributeType', 'Custom', 'Hidden'],
				limit: 1000,
				scope
			},
			'Loading field definitions...'
		)
	);
	return attributes
		.filter(attribute => typeof attribute?.ElementName === 'string')
		.map(attribute => ({
			elementName: attribute.ElementName,
			name: typeof attribute.Name === 'string' ? attribute.Name : attribute.ElementName,
			attributeType: String(attribute.AttributeType ?? ''),
			custom: attribute.Custom === true,
			hidden: attribute.Hidden === true
		}));
}

/** Attribute definitions of the type (cached per workspace), or null when they cannot be read. */
async function getAttributes(typeName: string, workspaceRef: string | undefined): Promise<RallyAttribute[] | null> {
	const key = `${workspaceRef ?? ''}|${typeName}`;
	const cached = attributesCache.get(key);
	if (cached && Date.now() - cached.at < ATTRIBUTES_TTL_MS) {
		return cached.attributes;
	}
	try {
		const attributes = await fetchAttributes(typeName, workspaceRef);
		attributesCache.set(key, { attributes, at: Date.now() });
		return attributes;
	} catch (error) {
		errorHandler.logWarning(`Could not read the Rally field definitions of ${typeName}, showing API field names: ${error instanceof Error ? error.message : String(error)}`, 'rallyIssueFields.getAttributes');
		return null;
	}
}

export async function getIssueFields(objectId: string, itemType: IssueFieldsItemType = 'userstory'): Promise<IssueFieldsResult> {
	const validation = await validateRallyConfiguration();
	if (!validation.isValid) {
		throw new Error(`Rally configuration error: ${validation.errors.join(', ')}`);
	}
	const typeName = RALLY_TYPES[itemType] ?? RALLY_TYPES.userstory;
	const objects = resultsOf(
		await callRally(
			getRallyApi(),
			{
				type: typeName.toLowerCase(),
				// `fetch=true`: every field of the object, custom ones included.
				fetch: ['true'],
				query: queryUtils.where('ObjectID', '=', objectId),
				limit: 1
			},
			'Loading fields...'
		)
	);
	const object = objects[0];
	if (!object) {
		throw new Error(`${itemType === 'defect' ? 'Defect' : 'User story'} ${objectId} not found in Rally`);
	}
	const attributes = await getAttributes(typeName, object.Workspace?._ref);
	const result = buildRallyIssueFields(object, attributes);
	const count = result.tabs.reduce((sum, tab) => sum + tab.fields.length, 0);
	errorHandler.logInfo(`Loaded ${count} field value(s) for Rally ${typeName} ${object.FormattedID ?? objectId}`, 'rallyIssueFields.getIssueFields');
	return result;
}
