import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import type { RecentlyViewedItem } from '../../types/rally';

const STORAGE_KEY = 'robert.recentlyViewedItems';
const MAX_UNPINNED_ITEMS = 10;

/**
 * Persists the list of Rally items (user stories, defects, sprints) the user has recently
 * opened in a detail view, so Home can show a jump-back-in list across sessions. Pinned items
 * are exempt from the unpinned trim limit and never dropped except by explicit delete.
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
			case 'toggleRecentlyViewedItemPin':
				await this.handleToggleRecentlyViewedItemPin(webview, message);
				return true;
			default:
				return false;
		}
	}

	private getStoredItems(): RecentlyViewedItem[] {
		return (this.context.globalState.get<RecentlyViewedItem[]>(STORAGE_KEY, []) ?? []).filter(Boolean);
	}

	/** Pinned items first (most recently viewed first), then unpinned items trimmed to MAX_UNPINNED_ITEMS. */
	private normalize(items: RecentlyViewedItem[]): RecentlyViewedItem[] {
		const byViewedAtDesc = (a: RecentlyViewedItem, b: RecentlyViewedItem) => b.viewedAt - a.viewedAt;
		const pinned = items.filter(item => item.pinned).sort(byViewedAtDesc);
		const unpinned = items
			.filter(item => !item.pinned)
			.sort(byViewedAtDesc)
			.slice(0, MAX_UNPINNED_ITEMS);
		return [...pinned, ...unpinned];
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

			const current = this.getStoredItems();
			const existing = current.find(item => item.objectId === incoming.objectId && item.type === incoming.type);
			const rest = current.filter(item => !(item.objectId === incoming.objectId && item.type === incoming.type));
			const newItem: RecentlyViewedItem = { ...incoming, pinned: existing?.pinned ?? false, viewedAt: Date.now() };

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

	private async handleToggleRecentlyViewedItemPin(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const { objectId, type } = message;
			const updated = this.getStoredItems().map(item => (item.objectId === objectId && item.type === type ? { ...item, pinned: !item.pinned } : item));
			await this.persist(webview, updated);
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'toggleRecentlyViewedItemPin');
		}
	}
}
