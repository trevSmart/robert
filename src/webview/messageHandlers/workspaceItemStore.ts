import type * as vscode from 'vscode';
import { getConfiguredProjects } from '../../libs/provider/projectScope';
import type { JiraItemRef } from '../../types/jira';

/** Returns the projects the current workspace is configured for (Jira project keys / Rally project names). */
export type CurrentProjectResolver = () => string[];

/** Default resolver: the projects configured for the active provider in this workspace. */
export const resolveConfiguredProject: CurrentProjectResolver = () => getConfiguredProjects();

/**
 * Per-workspace persistence for the Home lists (recently viewed, favorites).
 *
 * The lists used to live in `globalState`, so every workspace showed the same items even when
 * it pointed at a different project. They now live in `workspaceState`. The first time a
 * workspace reads a list it has never stored, it is seeded with the legacy global entries that
 * belong to the projects this workspace is configured for; the global list is left untouched so
 * other workspaces can seed their own share from it.
 */
export class WorkspaceItemStore<T extends JiraItemRef> {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly storageKey: string,
		private readonly currentProject: CurrentProjectResolver = resolveConfiguredProject
	) {}

	async read(): Promise<T[]> {
		let items = this.context.workspaceState.get<T[]>(this.storageKey);
		if (items === undefined) {
			items = this.legacyItemsForCurrentProject();
			await this.context.workspaceState.update(this.storageKey, items);
		}
		// Older versions stored Rally objectIds as numbers; normalise so `===` matches the string ids we receive now.
		return (items ?? []).filter(Boolean).map(item => ({ ...item, objectId: String(item.objectId) }));
	}

	async write(items: T[]): Promise<void> {
		await this.context.workspaceState.update(this.storageKey, items);
	}

	private legacyItemsForCurrentProject(): T[] {
		const legacy = this.context.globalState.get<T[]>(this.storageKey);
		if (!legacy?.length) return [];
		let projects: string[];
		try {
			projects = this.currentProject();
		} catch {
			projects = [];
		}
		// Without a project there is no way to tell which entries belong here; start empty.
		if (!projects.length) return [];
		return legacy.filter(item => item && typeof item.project === 'string' && projects.includes(item.project));
	}
}
