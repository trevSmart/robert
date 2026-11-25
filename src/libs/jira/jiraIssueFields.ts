/**
 * Camps d'una incidència de Jira que Robert no mostra enlloc més (p. ex. «Talla»,
 * a la pestanya «Esfuerzo Desarrollo» de la fitxa de Jira).
 *
 * Els valors surten d'una sola crida (`fields=*all` + names/schema/editmeta/renderedFields),
 * en l'ordre de la pantalla d'edició. Les pestanyes de la fitxa de Jira són les de la
 * pantalla de visualització (view screen), i l'API pública només les dona a qui té
 * *Administer Jira*: si l'usuari les pot llegir, els camps s'agrupen per pestanya;
 * si no (401/403), es recorda per a la sessió i es mostra la llista plana.
 */
import type { IssueFieldsResult, IssueFieldTab, IssueFieldValue } from '../../types/jira';
import { ErrorHandler } from '../../ErrorHandler';
import { getJiraSettings, jiraRequest } from './jiraClient';
import { callJira } from './jiraCall';
import { JIRA_FIELDS } from './jiraMetadata';
import { validateJiraConfiguration } from './utils';

const errorHandler = ErrorHandler.getInstance();

/** Camps que Robert ja mostra a la fitxa o en una altra pestanya (o que no tenen sentit com a text). */
function fieldsShownElsewhere(): Set<string> {
	return new Set(['summary', 'description', 'status', 'assignee', 'priority', 'project', 'issuetype', 'parent', 'attachment', 'comment', 'worklog', 'issuelinks', 'subtasks', JIRA_FIELDS.sprint, JIRA_FIELDS.flagged, ...JIRA_FIELDS.storyPoints].filter(Boolean));
}

const LAYOUT_TTL_MS = 10 * 60 * 1000;

/** Pestanyes de la view screen (null: el projecte no en té, p. ex. team-managed). */
type ScreenLayout = Array<{ name: string; fieldIds: string[] }> | null;

const layoutCache = new Map<string, { layout: ScreenLayout; at: number }>();
/** Lloc Jira on l'usuari no pot llegir la configuració de pantalles (no és admin). */
let screenConfigDeniedFor: string | null = null;

export function clearIssueFieldsCache(): void {
	layoutCache.clear();
	screenConfigDeniedFor = null;
}

function isPermissionError(error: unknown): boolean {
	return error instanceof Error && /returned (401|403)\b/.test(error.message);
}

function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

/** Text d'un valor simple o d'un objecte típic de Jira (opció, usuari, versió, component, sprint...). */
function scalarText(value: unknown): string | null {
	if (isEmpty(value)) {
		return null;
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return String(value);
	}
	if (typeof value === 'boolean') {
		return value ? 'Yes' : 'No';
	}
	if (typeof value !== 'object') {
		return null;
	}
	const item = value as Record<string, any>;
	// Selecció en cascada: «Pare / Fill».
	if (typeof item.value === 'string' && item.child && typeof item.child.value === 'string') {
		return `${item.value} / ${item.child.value}`;
	}
	for (const key of ['displayName', 'value', 'name', 'title', 'key', 'emailAddress']) {
		if (typeof item[key] === 'string' && item[key]) {
			return item[key];
		}
	}
	// Time tracking.
	const times = [
		['Original', item.originalEstimate],
		['Remaining', item.remainingEstimate],
		['Logged', item.timeSpent]
	].filter(([, time]) => typeof time === 'string' && time);
	if (times.length > 0) {
		return times.map(([label, time]) => `${label} ${time}`).join(' · ');
	}
	return null;
}

/**
 * Valor d'un camp per mostrar, o null si és buit o no se sap representar.
 * `rendered` és el valor de `renderedFields` (HTML per als camps de text ric, data formatada per a les dates).
 */
export function formatIssueFieldValue(value: unknown, rendered: unknown, schema?: { type?: string }): { text: string; html?: string } | null {
	if (isEmpty(value)) {
		return null;
	}
	// Text ric (ADF a l'API v3): fem servir l'HTML que renderitza Jira.
	if (typeof value === 'object' && !Array.isArray(value) && (value as any).type === 'doc') {
		return typeof rendered === 'string' && rendered.trim() ? { text: '', html: rendered } : null;
	}
	if ((schema?.type === 'date' || schema?.type === 'datetime') && typeof rendered === 'string' && rendered.trim()) {
		return { text: rendered };
	}
	if (Array.isArray(value)) {
		const parts = value.map(scalarText).filter((part): part is string => !!part);
		return parts.length > 0 ? { text: parts.join(', ') } : null;
	}
	const text = scalarText(value);
	return text ? { text } : null;
}

/** Camps a mostrar de la incidència: primer els de la pantalla d'edició (en el seu ordre), després la resta de camps personalitzats per nom. */
function collectFieldValues(issue: any): Map<string, IssueFieldValue> {
	const fields: Record<string, unknown> = issue?.fields ?? {};
	const rendered: Record<string, unknown> = issue?.renderedFields ?? {};
	const names: Record<string, string> = issue?.names ?? {};
	const schemas: Record<string, { type?: string }> = issue?.schema ?? {};
	const editable: Record<string, { name?: string; schema?: { type?: string } }> = issue?.editmeta?.fields ?? {};
	const hidden = fieldsShownElsewhere();

	const ordered = [
		...Object.keys(editable),
		...Object.keys(fields)
			.filter(id => id.startsWith('customfield_') && !(id in editable))
			.sort((a, b) => (names[a] ?? a).localeCompare(names[b] ?? b))
	];

	const values = new Map<string, IssueFieldValue>();
	for (const id of ordered) {
		if (hidden.has(id) || values.has(id)) {
			continue;
		}
		const formatted = formatIssueFieldValue(fields[id], rendered[id], schemas[id] ?? editable[id]?.schema);
		if (formatted) {
			values.set(id, { id, name: names[id] ?? editable[id]?.name ?? id, ...formatted });
		}
	}
	return values;
}

async function pagedValues<T>(path: string): Promise<T[]> {
	const values: T[] = [];
	let startAt = 0;
	for (let page = 0; page < 20; page++) {
		const separator = path.includes('?') ? '&' : '?';
		const response = await jiraRequest<{ values?: T[]; isLast?: boolean }>(`${path}${separator}startAt=${startAt}&maxResults=100`);
		const pageValues = response?.values ?? [];
		values.push(...pageValues);
		if (response?.isLast !== false || pageValues.length === 0) {
			break;
		}
		startAt += pageValues.length;
	}
	return values;
}

/** Pestanyes i camps de la view screen d'un tipus d'incidència en un projecte (només amb permisos d'administració). */
async function fetchScreenLayout(projectId: string, projectKey: string, issueTypeId: string): Promise<ScreenLayout> {
	const schemes = await pagedValues<{ issueTypeScreenScheme?: { id?: string } }>(`/rest/api/3/issuetypescreenscheme/project?projectId=${encodeURIComponent(projectId)}`);
	const issueTypeScreenSchemeId = schemes[0]?.issueTypeScreenScheme?.id;
	if (!issueTypeScreenSchemeId) {
		return null;
	}
	const mappings = await pagedValues<{ issueTypeId?: string; screenSchemeId?: string }>(`/rest/api/3/issuetypescreenscheme/mapping?issueTypeScreenSchemeId=${encodeURIComponent(issueTypeScreenSchemeId)}`);
	const screenSchemeId = (mappings.find(mapping => mapping.issueTypeId === issueTypeId) ?? mappings.find(mapping => mapping.issueTypeId === 'default'))?.screenSchemeId;
	if (!screenSchemeId) {
		return null;
	}
	const screenSchemes = await pagedValues<{ screens?: { view?: number; default?: number } }>(`/rest/api/3/screenscheme?id=${encodeURIComponent(screenSchemeId)}`);
	const screens = screenSchemes[0]?.screens;
	const screenId = screens?.view ?? screens?.default;
	if (!screenId) {
		return null;
	}
	const projectParam = `projectKey=${encodeURIComponent(projectKey)}`;
	const tabs = await jiraRequest<Array<{ id: number; name: string }>>(`/rest/api/3/screens/${screenId}/tabs?${projectParam}`);
	const layout: Array<{ name: string; fieldIds: string[] }> = [];
	for (const tab of tabs ?? []) {
		const tabFields = await jiraRequest<Array<{ id: string }>>(`/rest/api/3/screens/${screenId}/tabs/${tab.id}/fields?${projectParam}`);
		layout.push({ name: tab.name, fieldIds: (tabFields ?? []).map(field => field.id) });
	}
	return layout;
}

async function getScreenLayout(projectId: string, projectKey: string, issueTypeId: string): Promise<ScreenLayout> {
	const { baseUrl } = getJiraSettings();
	if (screenConfigDeniedFor === baseUrl) {
		return null;
	}
	const key = `${baseUrl}|${projectId}|${issueTypeId}`;
	const cached = layoutCache.get(key);
	if (cached && Date.now() - cached.at < LAYOUT_TTL_MS) {
		return cached.layout;
	}
	let layout: ScreenLayout = null;
	try {
		layout = await fetchScreenLayout(projectId, projectKey, issueTypeId);
	} catch (error) {
		if (isPermissionError(error)) {
			screenConfigDeniedFor = baseUrl;
			errorHandler.logInfo('Jira screen tabs not readable with this account (needs the Administer Jira permission): showing issue fields as a flat list', 'jiraIssueFields.getScreenLayout');
			return null;
		}
		errorHandler.logWarning(`Could not read the Jira screen tabs of project ${projectKey}: ${error instanceof Error ? error.message : String(error)}`, 'jiraIssueFields.getScreenLayout');
	}
	layoutCache.set(key, { layout, at: Date.now() });
	return layout;
}

/** Agrupa els valors per les pestanyes de la pantalla; els camps que no hi són van a una pestanya «Other». */
export function groupByScreen(values: Map<string, IssueFieldValue>, layout: NonNullable<ScreenLayout>): IssueFieldTab[] {
	const placed = new Set<string>();
	const tabs: IssueFieldTab[] = layout.map(tab => ({
		name: tab.name,
		fields: tab.fieldIds.flatMap(id => {
			const value = values.get(id);
			if (!value || placed.has(id)) {
				return [];
			}
			placed.add(id);
			return [value];
		})
	}));
	const rest = [...values.values()].filter(value => !placed.has(value.id));
	if (rest.length > 0) {
		tabs.push({ name: 'Other', fields: rest });
	}
	return tabs;
}

export async function getIssueFields(objectId: string): Promise<IssueFieldsResult> {
	const validation = await validateJiraConfiguration();
	if (!validation.isValid) {
		throw new Error(`Jira configuration error: ${validation.errors.join(', ')}`);
	}
	return callJira(async () => {
		const issue = await jiraRequest<any>(`/rest/api/3/issue/${encodeURIComponent(objectId)}?fields=*all&expand=names,schema,editmeta,renderedFields`);
		const values = collectFieldValues(issue);
		const projectId = issue?.fields?.project?.id;
		const projectKey = issue?.fields?.project?.key;
		const issueTypeId = issue?.fields?.issuetype?.id;
		const layout = projectId && projectKey && issueTypeId ? await getScreenLayout(String(projectId), String(projectKey), String(issueTypeId)) : null;

		const result: IssueFieldsResult = layout && layout.length > 0 ? { tabs: groupByScreen(values, layout), groupedByScreen: true } : { tabs: [{ name: null, fields: [...values.values()] }], groupedByScreen: false };
		errorHandler.logInfo(`Loaded ${values.size} field value(s) for Jira issue ${issue?.key ?? objectId}${result.groupedByScreen ? ` in ${result.tabs.length} screen tab(s)` : ''}`, 'jiraIssueFields.getIssueFields');
		return result;
	}, 'Loading fields...');
}
