import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import type { RecentlyViewedItem } from '../../types/rally';

const STORAGE_KEY = 'robert.recentlyViewedItems';
const MAX_ITEMS = 10;

/**
 * Persists the list of Rally items (user stories, defects, sprints) the user has recently
 * opened in a detail view, so Home can show a jump-back-in list across sessions. This is a
 * pure history: pinning is a separate concern handled by PinnedItemsMessageHandler.
 */
export class RecentlyViewedMessageHandler {
	constructor(
		private errorHandler: ErrorHandler,
		private context: vscode.ExtensionContext
	) {}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'getRecentlyViewedItems':
				await this.handleGetRecentlyViewedItems(webview);
				return true;
			case 'recordRecentlyViewedItem':
				await this.handleRecordRecentlyViewedItem(webview, message);
				return true;
			case 'deleteRecentlyViewedItem':
				await this.handleDeleteRecentlyViewedItem(webview, message);
				return true;
			default:
				return false;
		}
	}

	private getStoredItems(): RecentlyViewedItem[] {
		return (this.context.globalState.get<RecentlyViewedItem[]>(STORAGE_KEY, []) ?? []).filter(Boolean);
	}

	/** Most recently viewed first, capped to MAX_ITEMS. */
	private normalize(items: RecentlyViewedItem[]): RecentlyViewedItem[] {
		return [...items].sort((a, b) => b.viewedAt - a.viewedAt).slice(0, MAX_ITEMS);
	}

	private async persist(webview: vscode.Webview, items: RecentlyViewedItem[]): Promise<void> {
		const normalized = this.normalize(items);
		await this.context.globalState.update(STORAGE_KEY, normalized);
		webview.postMessage({ command: 'recentlyViewedItemsLoaded', items: normalized });
	}

	private async handleGetRecentlyViewedItems(webview: vscode.Webview): Promise<void> {
		webview.postMessage({ command: 'recentlyViewedItemsLoaded', items: this.normalize(this.getStoredItems()) });
	}

	private async handleRecordRecentlyViewedItem(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const incoming = message.item as RecentlyViewedItem;
			if (!incoming?.objectId || !incoming?.type) {
				return;
			}

			const rest = this.getStoredItems().filter(item => !(item.objectId === incoming.objectId && item.type === incoming.type));
			const newItem: RecentlyViewedItem = { ...incoming, viewedAt: Date.now() };
			await this.persist(webview, [newItem, ...rest]);
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'recordRecentlyViewedItem');
		}
	}

	private async handleDeleteRecentlyViewedItem(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const { objectId, type } = message;
			const remaining = this.getStoredItems().filter(item => !(item.objectId === objectId && item.type === type));
			await this.persist(webview, remaining);
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'deleteRecentlyViewedItem');
		}
	}
}
