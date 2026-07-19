import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import type { FavoriteItem, RallyItemRef } from '../../types/rally';

const STORAGE_KEY = 'robert.favorites';

/**
 * Persists the user-curated list of favorite Rally items (user stories, defects, sprints).
 * Favoriting is toggled from each record's detail view and is independent of the recently
 * viewed history — favorites are never auto-evicted.
 */
export class FavoritesMessageHandler {
	constructor(
		private errorHandler: ErrorHandler,
		private context: vscode.ExtensionContext
	) {}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'getFavoriteItems':
				await this.handleGetFavoriteItems(webview);
				return true;
			case 'toggleFavoriteItem':
				await this.handleToggleFavoriteItem(webview, message);
				return true;
			default:
				return false;
		}
	}

	private getStoredItems(): FavoriteItem[] {
		return (this.context.globalState.get<FavoriteItem[]>(STORAGE_KEY, []) ?? []).filter(Boolean);
	}

	/** Most recently favorited first. No cap — this is a curated list. */
	private normalize(items: FavoriteItem[]): FavoriteItem[] {
		return [...items].sort((a, b) => b.favoritedAt - a.favoritedAt);
	}

	private async persist(webview: vscode.Webview, items: FavoriteItem[]): Promise<void> {
		const normalized = this.normalize(items);
		await this.context.globalState.update(STORAGE_KEY, normalized);
		webview.postMessage({ command: 'favoriteItemsLoaded', items: normalized });
	}

	private async handleGetFavoriteItems(webview: vscode.Webview): Promise<void> {
		webview.postMessage({ command: 'favoriteItemsLoaded', items: this.normalize(this.getStoredItems()) });
	}

	private async handleToggleFavoriteItem(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const incoming = message.item as RallyItemRef;
			if (!incoming?.objectId || !incoming?.type) {
				return;
			}

			const current = this.getStoredItems();
			const alreadyFavorite = current.some(item => item.objectId === incoming.objectId && item.type === incoming.type);
			if (alreadyFavorite) {
				await this.persist(
					webview,
					current.filter(item => !(item.objectId === incoming.objectId && item.type === incoming.type))
				);
			} else {
				const newItem: FavoriteItem = { objectId: incoming.objectId, formattedId: incoming.formattedId, name: incoming.name, type: incoming.type, favoritedAt: Date.now() };
				await this.persist(webview, [newItem, ...current]);
			}
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'toggleFavoriteItem');
		}
	}
}
