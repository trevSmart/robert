/**
 * Project scope - which of the configured projects the data services query.
 *
 * `robert.jiraProjectKey` and `robert.rallyProjectName` accept a comma-separated list of
 * projects. The user can narrow the view to one of them with the project selector in the
 * navigation bar; `null` means "all configured projects". The selection is stored per
 * workspace (`workspaceState`) and is shared by every Robert view in the window.
 *
 * Services read the scope on every call (`getActiveProjects()`), so changing it only needs the
 * webviews to reload their data. Caches that do not filter by project themselves prefix their
 * keys with `projectScopeKey()`, so switching back and forth never mixes data from two scopes.
 */
import { SettingsManager } from '../../SettingsManager';
import { ErrorHandler } from '../../ErrorHandler';

/** Minimal subset of `vscode.Memento` used to persist the selection. */
export interface ProjectScopeMemento {
	get<T>(key: string): T | undefined;
	update(key: string, value: unknown): Thenable<void> | Promise<void>;
}

export interface ProjectScopeState {
	/** Projects configured for the active provider, in setting order. */
	projects: string[];
	/** Selected project, or null for all configured projects. */
	active: string | null;
}

const STORAGE_KEY = 'robert.activeProject';

let memento: ProjectScopeMemento | null = null;
let activeProject: string | null = null;

/** Splits a comma-separated project setting into trimmed, non-empty, de-duplicated names. */
export function parseProjectList(raw: string | null | undefined): string[] {
	if (!raw) return [];
	const seen = new Set<string>();
	const projects: string[] = [];
	for (const part of String(raw).split(',')) {
		const name = part.trim();
		if (name && !seen.has(name)) {
			seen.add(name);
			projects.push(name);
		}
	}
	return projects;
}

/** Projects configured for the active provider (Jira project keys or Rally project names). */
export function getConfiguredProjects(): string[] {
	const settings = SettingsManager.getInstance();
	const raw = settings.getSetting('provider') === 'rally' ? settings.getSetting('rallyProjectName') : settings.getSetting('jiraProjectKey');
	return parseProjectList(raw);
}

/** Restores the persisted selection. Call once per host, before any data is loaded. */
export function initProjectScope(storage: ProjectScopeMemento): void {
	memento = storage;
	const stored = storage.get<string | null>(STORAGE_KEY);
	activeProject = typeof stored === 'string' && stored.trim() ? stored.trim() : null;
}

/** Selected project if it is still configured; otherwise null (all projects). */
export function getActiveProject(): string | null {
	if (!activeProject) return null;
	return getConfiguredProjects().includes(activeProject) ? activeProject : null;
}

/**
 * Projects the data services must query. One project when the user selected one, otherwise every
 * configured project. Empty only when no project is configured (Jira then spans all projects).
 */
export function getActiveProjects(): string[] {
	const active = getActiveProject();
	return active ? [active] : getConfiguredProjects();
}

/** Changes the selection (null = all projects) and persists it for this workspace. */
export async function setActiveProject(project: string | null): Promise<ProjectScopeState> {
	const next = project && getConfiguredProjects().includes(project) ? project : null;
	activeProject = next;
	if (memento) {
		await memento.update(STORAGE_KEY, next);
	}
	ErrorHandler.getInstance().logInfo(`Project scope set to ${next ?? 'all configured projects'} (${getActiveProjects().join(', ') || 'all projects'})`, 'projectScope.setActiveProject');
	return getProjectScopeState();
}

export function getProjectScopeState(): ProjectScopeState {
	return { projects: getConfiguredProjects(), active: getActiveProject() };
}

/** Stable cache-key prefix for the projects currently queried. */
export function projectScopeKey(): string {
	return `scope[${getActiveProjects().join('|')}]`;
}

/** Test helper: forgets the in-memory selection and storage. */
export function resetProjectScopeForTests(): void {
	memento = null;
	activeProject = null;
}
