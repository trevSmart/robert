import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import type { FavoriteItem, JiraItemRef } from '../../types/jira';
import { type CurrentProjectResolver, resolveConfiguredProject, WorkspaceItemStore } from './workspaceItemStore';

const STORAGE_KEY = 'robert.favorites';

/** Key used before the pinned → favorites rename. Read once, then dropped. */
const LEGACY_STORAGE_KEY = 'robert.pinnedItems';

/** Item shape persisted under the legacy key: same fields, but `pinnedAt` instead of `favoritedAt`. */
interface LegacyPinnedItem extends JiraItemRef {
	pinnedAt: number;
}

/**
 * Persists the user-curated list of favorite Jira items (user stories, defects, sprints).
 * Favoriting is toggled from each record's detail view and is independent of the recently
 * viewed history — favorites are never auto-evicted. The list is per workspace (see
 * WorkspaceItemStore).
 */
export class FavoritesMessageHandler {
	private migrationChecked = false;
	private store: WorkspaceItemStore<FavoriteItem>;

	constructor(
		private errorHandler: ErrorHandler,
		private context: vscode.ExtensionContext,
		currentProject: CurrentProjectResolver = resolveConfiguredProject
	) {
		this.store = new WorkspaceItemStore<FavoriteItem>(context, STORAGE_KEY, currentProject);
	}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'getFavoriteItems':
				await this.ensureMigrated();
				await this.handleGetFavoriteItems(webview);
				return true;
			case 'toggleFavoriteItem':
				// Also migrate here: toggling before the list has loaded would otherwise
				// read an empty list and persist over the legacy data.
				await this.ensureMigrated();
				await this.handleToggleFavoriteItem(webview, message);
				return true;
			default:
				return false;
		}
	}

	/**
	 * One-time move of the global list stored under the pre-rename key, so users upgrading from a
	 * "pinned" build keep their favorites instead of silently starting from an empty list. It runs
	 * on the legacy global list, before WorkspaceItemStore seeds this workspace from it.
	 */
	private async ensureMigrated(): Promise<void> {
		if (this.migrationChecked) return;
		this.migrationChecked = true;

		try {
			// Any existing entry — including an empty array, meaning the user removed them all —
			// says we already own the data. Only a missing entry should fall back to the legacy key.
			if (this.context.globalState.get<FavoriteItem[]>(STORAGE_KEY) !== undefined) return;

			const legacy = this.context.globalState.get<LegacyPinnedItem[]>(LEGACY_STORAGE_KEY);
			if (legacy === undefined) return;

			const migrated: FavoriteItem[] = (legacy ?? []).filter(Boolean).map(({ pinnedAt, ...rest }) => ({
				...rest,
				favoritedAt: pinnedAt ?? Date.now()
			}));
			await this.context.globalState.update(STORAGE_KEY, migrated);
			await this.context.globalState.update(LEGACY_STORAGE_KEY, undefined);
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'migrateLegacyFavorites');
		}
	}

	/** Most recently favorited first. No cap — this is a curated list. */
	private normalize(items: FavoriteItem[]): FavoriteItem[] {
		return [...items].sort((a, b) => b.favoritedAt - a.favoritedAt);
	}

	private async persist(webview: vscode.Webview, items: FavoriteItem[]): Promise<void> {
		const normalized = this.normalize(items);
		await this.store.write(normalized);
		webview.postMessage({ command: 'favoriteItemsLoaded', items: normalized });
	}

	private async handleGetFavoriteItems(webview: vscode.Webview): Promise<void> {
		try {
			webview.postMessage({
				command: 'favoriteItemsLoaded',
				items: this.normalize(await this.store.read())
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'getFavoriteItems');
		}
	}

	private async handleToggleFavoriteItem(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const raw = message.item as JiraItemRef;
			if (!raw?.objectId || !raw?.type) {
				return;
			}
			const incoming: JiraItemRef = { ...raw, objectId: String(raw.objectId) };

			const current = await this.store.read();
			const alreadyFavorite = current.some(item => item.objectId === incoming.objectId && item.type === incoming.type);
			if (alreadyFavorite) {
				await this.persist(
					webview,
					current.filter(item => !(item.objectId === incoming.objectId && item.type === incoming.type))
				);
			} else {
				const newItem: FavoriteItem = {
					objectId: incoming.objectId,
					formattedId: incoming.formattedId,
					name: incoming.name,
					type: incoming.type,
					favoritedAt: Date.now()
				};
				await this.persist(webview, [newItem, ...current]);
			}
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'toggleFavoriteItem');
		}
	}
}
