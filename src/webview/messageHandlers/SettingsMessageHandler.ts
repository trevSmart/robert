import * as vscode from 'vscode';
import type { ErrorHandler } from '../../ErrorHandler';
import type { CredentialKind } from '../../SettingsManager';
import type { SettingsResultMessage, SettingsScope } from '../../settings/protocol';
import type { SettingsService } from '../../settings/SettingsService';

const EXTENSION_SETTINGS_QUERY = '@ext:trevSmart.robert';

const isCredentialKind = (value: unknown): value is CredentialKind => value === 'jira' || value === 'rally';
const isScope = (value: unknown): value is SettingsScope => value === 'user' || value === 'workspace';

/**
 * Handles the settings dialog of the webview (both hosts). Every write is a
 * single setting or credential, answered with `settingsResult` and followed by
 * a fresh `settingsState`. Credential values only travel webview → host.
 */
export class SettingsMessageHandler {
	constructor(
		private readonly errorHandler: ErrorHandler,
		private readonly service: SettingsService
	) {}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'settingsLoad':
				await this.postState(webview);
				return true;
			case 'settingsUpdate':
				await this.run(webview, message?.requestId, async () => {
					if (typeof message.key !== 'string' || !isScope(message.scope)) {
						throw new Error('Invalid settings request.');
					}
					await this.service.update(message.key, message.scope, message.value);
				});
				return true;
			case 'settingsSetSecret':
				await this.run(webview, message?.requestId, async () => {
					if (!isCredentialKind(message.id) || typeof message.value !== 'string') {
						throw new Error('Invalid credential request.');
					}
					await this.service.setCredential(message.id, message.value);
				});
				return true;
			case 'settingsClearSecret':
				await this.run(webview, message?.requestId, async () => {
					if (!isCredentialKind(message.id)) {
						throw new Error('Invalid credential request.');
					}
					await this.service.clearCredential(message.id);
				});
				return true;
			case 'settingsShowLogs':
				await vscode.commands.executeCommand('robert.showOutput');
				return true;
			case 'settingsOpenNative':
				await this.openNativeSettings(message?.scope === 'workspace' ? 'workspace' : 'user');
				return true;
			default:
				return false;
		}
	}

	private async run(webview: vscode.Webview, requestId: unknown, action: () => Promise<void>): Promise<void> {
		const result: SettingsResultMessage = { command: 'settingsResult', requestId: String(requestId ?? ''), ok: true };
		try {
			await action();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			// Never log the request itself: it may carry a credential.
			this.errorHandler.logWarning(`Settings change failed: ${err.message}`, 'SettingsMessageHandler');
			result.ok = false;
			result.error = err.message;
		}
		await webview.postMessage(result);
		await this.postState(webview);
	}

	private async postState(webview: vscode.Webview): Promise<void> {
		await webview.postMessage(this.service.buildState());
	}

	/** Opens VS Code's own Settings editor filtered to Robert (extension only; no-op in the standalone app). */
	private async openNativeSettings(scope: SettingsScope): Promise<void> {
		if (!this.service.getHostModel().canOpenNativeSettings) {
			return;
		}
		try {
			if (scope === 'workspace' && this.service.hasWorkspace()) {
				await vscode.commands.executeCommand('workbench.action.openWorkspaceSettings', { query: EXTENSION_SETTINGS_QUERY });
			} else {
				await vscode.commands.executeCommand('workbench.action.openSettings', EXTENSION_SETTINGS_QUERY);
			}
		} catch (error) {
			this.errorHandler.logWarning(`Could not open VS Code settings: ${error instanceof Error ? error.message : String(error)}`, 'SettingsMessageHandler');
			await vscode.commands.executeCommand('workbench.action.openSettings', EXTENSION_SETTINGS_QUERY);
		}
	}
}
