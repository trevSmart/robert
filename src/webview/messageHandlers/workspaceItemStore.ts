import type * as vscode from 'vscode';
import { SettingsManager } from '../../SettingsManager';
import type { JiraItemRef } from '../../types/jira';

/** Returns the project the current workspace is configured for (Jira project key / Rally project name), or null. */
export type CurrentProjectResolver = () => string | null;

/** Default resolver: the project configured for the active provider in this workspace. */
export const resolveConfiguredProject: CurrentProjectResolver = () => {
	const settings = SettingsManager.getInstance().getSettings();
	const project = settings.provider === 'rally' ? settings.rallyProjectName : settings.jiraProjectKey;
	return project?.trim() ? project.trim() : null;
};

/**
 * Per-workspace persistence for the Home lists (recently viewed, favorites).
 *
 * The lists used to live in `globalState`, so every workspace showed the same items even when
 * it pointed at a different project. They now live in `workspaceState`. The first time a
 * workspace reads a list it has never stored, it is seeded with the legacy global entries that
 * belong to the project this workspace is configured for; the global list is left untouched so
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
		let project: string | null;
		try {
			project = this.currentProject();
		} catch {
			project = null;
		}
		// Without a project there is no way to tell which entries belong here; start empty.
		if (!project) return [];
		return legacy.filter(item => item && item.project === project);
	}
}
