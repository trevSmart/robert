import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';
import { RobertWebviewProvider } from './RobertWebviewProvider';

// In-memory state for the status popover (dummy content)
const robertPopoverState = {
	allFiles: true,
	nextEditSuggestions: true,
	snoozedUntil: 0
};

export function activate(context: vscode.ExtensionContext) {
	// Create a dedicated Output channel for the extension
	const output = vscode.window.createOutputChannel('Robert');
	output.appendLine('[Robert] Extension activated');
	context.subscriptions.push(output);

	// Initialize error handler with output channel
	const errorHandler = ErrorHandler.getInstance(output);
	errorHandler.setOutputChannel(output);

	// Extension is now active
	const disposable = vscode.commands.registerCommand('robert.helloWorld', () => {
		errorHandler.executeWithErrorHandlingSync(() => {
			vscode.window.showInformationMessage('Hello World from Robert!');
		}, 'robert.helloWorld command');
	});

	context.subscriptions.push(disposable);

	// Register the webview provider for activity bar
	const webviewProvider = new RobertWebviewProvider(context.extensionUri, output);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(RobertWebviewProvider.viewType, webviewProvider));

	// Register custom text editor provider
	context.subscriptions.push(
		vscode.window.registerCustomEditorProvider(RobertWebviewProvider.editorType, webviewProvider, {
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: false
		})
	);

	// Register command to open our panel in a new editor tab
	const openViewCommand = vscode.commands.registerCommand('robert.openView', async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			output.appendLine('[Robert] Command: openView');
			// Mostra la view lateral de l'activity bar
			await vscode.commands.executeCommand('workbench.view.extension.robert');
		}, 'robert.openView command');
	});
	context.subscriptions.push(openViewCommand);

	// Register command to show panel only if it isn't already visible
	const showIfHiddenCommand = vscode.commands.registerCommand('robert.showPanelIfHidden', async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			output.appendLine('[Robert] Command: showPanelIfHidden');
			webviewProvider.showMainPanelIfHidden();
		}, 'robert.showPanelIfHidden command');
	});
	context.subscriptions.push(showIfHiddenCommand);

	// Register command used by the status bar to open a small, lightweight popover
	const openStatusPanelCommand = vscode.commands.registerCommand('robert.openStatusPanel', async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			output.appendLine('[Robert] Command: openStatusPanel');
			// Mostra la view lateral de l'activity bar
			await vscode.commands.executeCommand('workbench.view.extension.robert');
		}, 'robert.openStatusPanel command');
	});
	context.subscriptions.push(openStatusPanelCommand);

	// Command to reveal the Output channel
	context.subscriptions.push(vscode.commands.registerCommand('robert.showOutput', () => output.show(true)));

	// Create and setup status bar item
	const statusBarItem = createStatusBarItem(context, errorHandler);
	context.subscriptions.push(statusBarItem);

	// Commands used by interactive tooltip links
	context.subscriptions.push(
		vscode.commands.registerCommand('robert.toggleAllFiles', () => {
			errorHandler.executeWithErrorHandlingSync(() => {
				robertPopoverState.allFiles = !robertPopoverState.allFiles;
				// Re-render tooltip to reflect the new state
				updateStatusBarItem(statusBarItem, 'idle', errorHandler);
			}, 'robert.toggleAllFiles command');
		}),
		vscode.commands.registerCommand('robert.toggleNextEdit', () => {
			errorHandler.executeWithErrorHandlingSync(() => {
				robertPopoverState.nextEditSuggestions = !robertPopoverState.nextEditSuggestions;
				// Re-render tooltip to reflect the new state
				updateStatusBarItem(statusBarItem, 'idle', errorHandler);
			}, 'robert.toggleNextEdit command');
		}),
		vscode.commands.registerCommand('robert.snooze', (minutes: number = 5) => {
			errorHandler.executeWithErrorHandlingSync(() => {
				const now = Date.now();
				robertPopoverState.snoozedUntil = now + minutes * 60 * 1000;
				updateStatusBarItem(statusBarItem, 'idle', errorHandler);
				vscode.window.showInformationMessage(`Robert snoozed for ${minutes} minutes`);
			}, 'robert.snooze command');
		}),
		vscode.commands.registerCommand('robert.openSettings', () => {
			errorHandler.executeWithErrorHandlingSync(() => {
				vscode.commands.executeCommand('workbench.action.openSettings', '@ext:robert');
			}, 'robert.openSettings command');
		})
	);

	// Log successful activation
	errorHandler.logInfo('Extension activated successfully', 'Extension Activation');
}

function createStatusBarItem(context: vscode.ExtensionContext, errorHandler: ErrorHandler): vscode.StatusBarItem {
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

	// Initialize with default state
	updateStatusBarItem(statusBarItem, 'idle', errorHandler);

	// Update status bar every 5 seconds with different states
	const intervalId = setInterval(() => {
		errorHandler.executeWithErrorHandlingSync(() => {
			const states = ['idle', 'active', 'busy', 'error'];
			const randomState = states[Math.floor(Math.random() * states.length)];
			updateStatusBarItem(statusBarItem, randomState, errorHandler);
		}, 'Status bar update interval');
	}, 5000);

	// Clean up interval when extension deactivates
	context.subscriptions.push({
		dispose: () => clearInterval(intervalId)
	});

	return statusBarItem;
}

function updateStatusBarItem(item: vscode.StatusBarItem, state: string, errorHandler: ErrorHandler) {
	try {
		const now = new Date();
		const timeString = now.toLocaleTimeString('ca-ES', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		switch (state) {
			case 'idle':
				item.text = `$(organization) Robert ${timeString}`;
				item.tooltip = `Robert Extension - Ready | Last updated: ${timeString} | Click to open panel`;
				item.backgroundColor = undefined;
				break;
			case 'active':
				item.text = `$(organization) Robert $(check) ${timeString}`;
				item.tooltip = `Robert Extension - Panel is open | Last activity: ${timeString} | Click to focus`;
				item.backgroundColor = new vscode.ThemeColor('statusBarItem.activeBackground');
				break;
			case 'busy':
				item.text = `$(organization) Robert $(sync~spin) ${timeString}`;
				item.tooltip = `Robert Extension - Processing... | Started: ${timeString} | Click to open`;
				item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
				break;
			case 'error':
				item.text = `$(organization) Robert $(error) ${timeString}`;
				item.tooltip = `Robert Extension - Error occurred | Time: ${timeString} | Click for details`;
				item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
				break;
		}

		// Build interactive tooltip similar to a small anchored popover
		item.tooltip = buildStatusTooltip(errorHandler);

		// Clicking the status bar: show the panel if it's not already visible (focus otherwise)
		item.command = 'robert.showPanelIfHidden';
		item.show();
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'updateStatusBarItem');
	}
}

function buildStatusTooltip(errorHandler: ErrorHandler): vscode.MarkdownString {
	try {
		const md = new vscode.MarkdownString(undefined, true);
		md.isTrusted = true;

		const checked = (on: boolean) => (on ? '$(check)' : '$(circle-slash)');
		const pad = (s: string) => `&nbsp;&nbsp;${s}`;

		// Encode args helper for command markdown links
		const enc = (args: unknown[]) => encodeURIComponent(JSON.stringify(args));

		const allFilesLink = `command:robert.toggleAllFiles?${enc([])}`;
		const nextEditLink = `command:robert.toggleNextEdit?${enc([])}`;
		const snooze5Link = `command:robert.snooze?${enc([5])}`;
		const settingsLink = `command:robert.openSettings?${enc([])}`;

		const snoozed = robertPopoverState.snoozedUntil > Date.now();
		const snoozeLabel = snoozed ? `Snoozed until ${new Date(robertPopoverState.snoozedUntil).toLocaleTimeString()}` : 'Snooze (5 min)';

		md.appendMarkdown('**Code Completions**  ');
		md.appendMarkdown(`[$(gear)](${settingsLink} "Settings")\n\n`);
		md.appendMarkdown(`[$${checked(robertPopoverState.allFiles)}](${allFilesLink}) ${pad('All files')}\n\n`);
		md.appendMarkdown(`[$${checked(robertPopoverState.nextEditSuggestions)}](${nextEditLink}) ${pad('Next edit suggestions')}\n\n`);
		md.appendMarkdown(`[Snooze](${snooze5Link} "Hide for 5 minutes") ${pad(snoozeLabel)}\n`);

		return md;
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'buildStatusTooltip');
		return new vscode.MarkdownString('Error building tooltip');
	}
}

export function deactivate() {
	// This function is called when the extension is deactivated
	// Cleanup can go here if needed
}

// Lightweight floating popover using QuickPick (closest to a small panel)
function _showStatusPopover(webviewProvider: RobertWebviewProvider) {
	try {
		const qp = vscode.window.createQuickPick();
		qp.title = 'Robert';
		qp.placeholder = 'IBM Robert — resum ràpid';
		qp.matchOnDetail = true;
		qp.matchOnDescription = true;

		qp.items = [
			{
				label: '$(organization) Robert',
				description: 'Extensió activa',
				detail: 'Pots obrir el panell complet o la vista lateral'
			},
			{
				label: '$(rocket) Obrir panell complet',
				description: 'Webview en una pestanya nova',
				detail: ''
			},
			{
				label: '$(sidebar-expand) Obrir vista lateral',
				description: 'Mostra la vista del contenidor IBM Robert',
				detail: ''
			}
		];

		// Add a button to open the full panel quickly
		qp.buttons = [{ iconPath: new vscode.ThemeIcon('screen-full'), tooltip: 'Obrir panell complet' }];

		const accept = () => {
			try {
				const picked = qp.selectedItems[0];
				if (!picked) {
					qp.hide();
					qp.dispose();
					return;
				}
				if (picked.label.includes('Obrir panell complet')) {
					webviewProvider.createWebviewPanel();
				} else if (picked.label.includes('Obrir vista lateral')) {
					vscode.commands.executeCommand('workbench.view.extension.robert.mainView');
				}
				qp.hide();
				qp.dispose();
			} catch (error) {
				const errorHandler = ErrorHandler.getInstance();
				errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'showStatusPopover.accept');
				qp.hide();
				qp.dispose();
			}
		};

		qp.onDidAccept(accept);
		qp.onDidTriggerItemButton(() => {
			try {
				webviewProvider.createWebviewPanel();
				qp.hide();
				qp.dispose();
			} catch (error) {
				const errorHandler = ErrorHandler.getInstance();
				errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'showStatusPopover.button');
				qp.hide();
				qp.dispose();
			}
		});
		qp.onDidTriggerButton(() => {
			try {
				webviewProvider.createWebviewPanel();
				qp.hide();
				qp.dispose();
			} catch (error) {
				const errorHandler = ErrorHandler.getInstance();
				errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'showStatusPopover.button');
				qp.hide();
				qp.dispose();
			}
		});

		qp.show();
	} catch (error) {
		const errorHandler = ErrorHandler.getInstance();
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'showStatusPopover');
	}
}
