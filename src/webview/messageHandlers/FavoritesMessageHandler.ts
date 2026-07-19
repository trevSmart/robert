import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import type { PinnedItem, RallyItemRef } from '../../types/rally';

const STORAGE_KEY = 'robert.pinnedItems';

/**
 * Persists the user-curated list of pinned Rally items (user stories, defects, sprints).
 * Pinning is toggled from each record's detail view and is independent of the recently
 * viewed history — pinned items are never auto-evicted.
 */
export class PinnedItemsMessageHandler {
	constructor(
		private errorHandler: ErrorHandler,
		private context: vscode.ExtensionContext
	) {}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'getPinnedItems':
				await this.handleGetPinnedItems(webview);
				return true;
			case 'togglePinnedItem':
				await this.handleTogglePinnedItem(webview, message);
				return true;
			default:
				return false;
		}
	}

	private getStoredItems(): PinnedItem[] {
		return (this.context.globalState.get<PinnedItem[]>(STORAGE_KEY, []) ?? []).filter(Boolean);
	}

	/** Most recently pinned first. No cap — this is a curated list. */
	private normalize(items: PinnedItem[]): PinnedItem[] {
		return [...items].sort((a, b) => b.pinnedAt - a.pinnedAt);
	}

	private async persist(webview: vscode.Webview, items: PinnedItem[]): Promise<void> {
		const normalized = this.normalize(items);
		await this.context.globalState.update(STORAGE_KEY, normalized);
		webview.postMessage({ command: 'pinnedItemsLoaded', items: normalized });
	}

	private async handleGetPinnedItems(webview: vscode.Webview): Promise<void> {
		webview.postMessage({ command: 'pinnedItemsLoaded', items: this.normalize(this.getStoredItems()) });
	}

	private async handleTogglePinnedItem(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const incoming = message.item as RallyItemRef;
			if (!incoming?.objectId || !incoming?.type) {
				return;
			}

			const current = this.getStoredItems();
			const alreadyPinned = current.some(item => item.objectId === incoming.objectId && item.type === incoming.type);
			if (alreadyPinned) {
				await this.persist(
					webview,
					current.filter(item => !(item.objectId === incoming.objectId && item.type === incoming.type))
				);
			} else {
				const newItem: PinnedItem = { objectId: incoming.objectId, formattedId: incoming.formattedId, name: incoming.name, type: incoming.type, pinnedAt: Date.now() };
				await this.persist(webview, [newItem, ...current]);
			}
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'togglePinnedItem');
		}
	}
}
