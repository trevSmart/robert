import * as vscode from 'vscode';
import type { ErrorHandler } from '../../ErrorHandler';
import { getSettingsHostInfo } from '../../settings/SettingsService';

/**
 * Actions of the "more actions" menu at the right end of the main tab bar.
 *
 * VS Code shows the same actions in the view's title bar, but an editor tab
 * (robert.openInEditor) and the standalone app have no such title bar, so the
 * UI offers them itself. `settings` opens the dialog inside the same webview
 * and needs no host round trip; the others run the matching command.
 */
export type ViewAction = 'settings' | 'openInEditor' | 'reload';

const ACTION_COMMANDS: Partial<Record<ViewAction, string>> = {
	openInEditor: 'robert.openInEditor',
	reload: 'robert.reload'
};

/** Actions offered to a webview, given the host and where the webview lives (its `context`). */
export function availableViewActions(hostKind: 'vscode' | 'standalone', context: unknown): ViewAction[] {
	// Only the sidebar view can move to an editor tab; the app has no editor area.
	const canOpenInEditor = hostKind === 'vscode' && context === 'activity-bar';
	return canOpenInEditor ? ['settings', 'openInEditor', 'reload'] : ['settings', 'reload'];
}

export class ViewActionsMessageHandler {
	constructor(private readonly errorHandler: ErrorHandler) {}

	async handle(command: string, webview: vscode.Webview, message: { action?: unknown; context?: unknown }): Promise<boolean> {
		const actions = availableViewActions(getSettingsHostInfo().kind, message?.context);
		switch (command) {
			case 'getViewActions':
				await webview.postMessage({ command: 'viewActions', actions });
				return true;
			case 'runViewAction': {
				const action = message?.action as ViewAction;
				const commandId = actions.includes(action) ? ACTION_COMMANDS[action] : undefined;
				if (!commandId) {
					this.errorHandler.logWarning(`Ignored view action "${String(message?.action)}" (not available here)`, 'ViewActionsMessageHandler');
					return true;
				}
				this.errorHandler.logInfo(`View action from the tab bar menu: ${action}`, 'ViewActionsMessageHandler');
				await vscode.commands.executeCommand(commandId);
				return true;
			}
			default:
				return false;
		}
	}
}
