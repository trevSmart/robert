import type * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';

const STORAGE_KEY = 'robert.pinnedIssueFields';

/**
 * Persists the Jira fields pinned in the «Fields» card of the item detail (field ids such as
 * `customfield_10042` or `labels`). Pinned fields stay visible while the card is collapsed and
 * apply to every issue. The list is per workspace, like the Home favorites.
 */
export class PinnedIssueFieldsMessageHandler {
	constructor(
		private errorHandler: ErrorHandler,
		private context: vscode.ExtensionContext
	) {}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'getPinnedIssueFields':
				this.postPinned(webview, this.read());
				return true;
			case 'togglePinnedIssueField':
				await this.handleToggle(webview, message);
				return true;
			default:
				return false;
		}
	}

	private read(): string[] {
		const stored = this.context.workspaceState.get<unknown>(STORAGE_KEY);
		return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
	}

	private postPinned(webview: vscode.Webview, fieldIds: string[]): void {
		webview.postMessage({ type: 'pinnedIssueFieldsLoaded', fieldIds });
	}

	private async handleToggle(webview: vscode.Webview, message: any): Promise<void> {
		const fieldId = typeof message?.fieldId === 'string' ? message.fieldId.trim() : '';
		if (!fieldId) {
			return;
		}
		try {
			const current = this.read();
			const wasPinned = current.includes(fieldId);
			const next = wasPinned ? current.filter(id => id !== fieldId) : [...current, fieldId];
			await this.context.workspaceState.update(STORAGE_KEY, next);
			this.errorHandler.logInfo(`${wasPinned ? 'Unpinned' : 'Pinned'} issue field ${fieldId} (${next.length} pinned)`, 'PinnedIssueFieldsMessageHandler');
			this.postPinned(webview, next);
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'togglePinnedIssueField');
			// Resync the webview, which toggled optimistically.
			this.postPinned(webview, this.read());
		}
	}
}
