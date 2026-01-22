import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';
import { RobertWebviewProvider } from './RobertWebviewProvider';
import type { RallyData } from './types/rally';
import { OutputChannelManager } from './utils/OutputChannelManager';

// Immediate logging when module is loaded
const immediateOutput = OutputChannelManager.getInstance();
immediateOutput.appendLine('[Robert] 📦 Module loaded - extension.ts imported');

// Rally data cache - centralized state management
export const rallyData: RallyData = {
	projects: [],
	users: [],
	iterations: [],
	userStories: [],
	tasks: [],
	defects: [],
	defaultProject: null,
	currentUser: null
};

// In-memory state for the status popover (dummy content)
const robertPopoverState = {
	allFiles: true,
	nextEditSuggestions: true,
	snoozedUntil: 0
};

export function activate(context: vscode.ExtensionContext) {
	// Get the centralized output channel manager
	const outputManager = OutputChannelManager.getInstance();
	outputManager.appendLine('[Robert] 🚀 Extension activate() function called');
	outputManager.appendLine('[Robert] Extension activated');
	context.subscriptions.push(outputManager);

	// Detect if running in debug mode
	const isDebugMode = detectDebugMode(context);
	outputManager.appendLine(`[Robert] Debug mode detected: ${isDebugMode}`);

	// Initialize error handler
	outputManager.appendLine('[Robert] 🔧 Initializing ErrorHandler');
	const errorHandler = ErrorHandler.getInstance();
	outputManager.appendLine('[Robert] ✅ ErrorHandler initialized successfully');

	// Extension is now active
	outputManager.appendLine('[Robert] 📝 Registering helloWorld command');
	const disposable = vscode.commands.registerCommand('robert.helloWorld', () => {
		errorHandler.executeWithErrorHandlingSync(() => {
			vscode.window.showInformationMessage('Hello World from Robert!');
		}, 'robert.helloWorld command');
	});

	context.subscriptions.push(disposable);
	outputManager.appendLine('[Robert] ✅ helloWorld command registered successfully');

	// Register the webview provider for activity bar
	outputManager.appendLine('[Robert] 📋 Registering webview provider for activity bar');
	const webviewProvider = new RobertWebviewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(RobertWebviewProvider.viewType, webviewProvider, {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);
	outputManager.appendLine('[Robert] ✅ Webview provider registered successfully');

	// Prefetch Rally data on activation to warm the cache (non-blocking)
	void webviewProvider.prefetchRallyData('activation');

	// If in debug mode, perform additional actions
	if (isDebugMode) {
		outputManager.appendLine('[Robert] Running in debug mode - enabling additional features');
		enableDebugFeatures(context, outputManager, webviewProvider);
	}

	// Register custom text editor provider
	context.subscriptions.push(
		vscode.window.registerCustomEditorProvider(RobertWebviewProvider.editorType, webviewProvider, {
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: false
		})
	);

	// Register command to open main view
	const openMainViewCommand = vscode.commands.registerCommand('robert.openMainView', async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			outputManager.appendLine('[Robert] Command: openMainView');
			// Open the main view in the activity bar
			await vscode.commands.executeCommand('workbench.view.extension.robert');
		}, 'robert.openMainView command');
	});
	context.subscriptions.push(openMainViewCommand);

	// Register command to open extension settings
	const openExtensionSettingsCommand = vscode.commands.registerCommand('robert.openExtensionSettings', async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			outputManager.appendLine('[Robert] Command: openExtensionSettings');
			// Open VS Code settings for this extension
			await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:robert');
		}, 'robert.openExtensionSettings command');
	});
	context.subscriptions.push(openExtensionSettingsCommand);

	// Register command to show panel only if it isn't already visible
	const showIfHiddenCommand = vscode.commands.registerCommand('robert.showPanelIfHidden', async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			outputManager.appendLine('[Robert] Command: showPanelIfHidden');
			webviewProvider.showMainPanelIfHidden();
		}, 'robert.showPanelIfHidden command');
	});
	context.subscriptions.push(showIfHiddenCommand);

	// Register command used by the status bar to open a small, lightweight popover
	const openStatusPanelCommand = vscode.commands.registerCommand('robert.openStatusPanel', async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			outputManager.appendLine('[Robert] Command: openStatusPanel');
			// Mostra la view lateral de l'activity bar
			await vscode.commands.executeCommand('workbench.view.extension.robert');
		}, 'robert.openStatusPanel command');
	});
	context.subscriptions.push(openStatusPanelCommand);

	// Command to reveal the Output channel
	context.subscriptions.push(vscode.commands.registerCommand('robert.showOutput', () => outputManager.show()));

	// Register debug commands (always available)
	context.subscriptions.push(
		vscode.commands.registerCommand('robert.debug.enable', async () => {
			try {
				outputManager.appendLine('[Robert] Debug: Enabling debug mode');
				await vscode.workspace.getConfiguration('robert').update('debugMode', true, vscode.ConfigurationTarget.Global);
				outputManager.appendLine('[Robert] Debug: Debug mode enabled successfully');
				vscode.window.showInformationMessage('Debug mode enabled! Restart the extension to apply changes.');
			} catch (error) {
				outputManager.appendLine(`[Robert] Debug: Error enabling debug mode: ${error}`);
				vscode.window.showErrorMessage('Failed to enable debug mode. Check the output for details.');
			}
		}),
		vscode.commands.registerCommand('robert.debug.disable', async () => {
			try {
				outputManager.appendLine('[Robert] Debug: Disabling debug mode');
				await vscode.workspace.getConfiguration('robert').update('debugMode', false, vscode.ConfigurationTarget.Global);
				outputManager.appendLine('[Robert] Debug: Debug mode disabled successfully');
				vscode.window.showInformationMessage('Debug mode disabled! Restart the extension to apply changes.');
			} catch (error) {
				outputManager.appendLine(`[Robert] Debug: Error disabling debug mode: ${error}`);
				vscode.window.showErrorMessage('Failed to disable debug mode. Check the output for details.');
			}
		}),
		vscode.commands.registerCommand('robert.debug.toggle', async () => {
			try {
				const currentDebugMode = vscode.workspace.getConfiguration('robert').get('debugMode', false);
				const newDebugMode = !currentDebugMode;

				outputManager.appendLine(`[Robert] Debug: Toggling debug mode from ${currentDebugMode} to ${newDebugMode}`);
				await vscode.workspace.getConfiguration('robert').update('debugMode', newDebugMode, vscode.ConfigurationTarget.Global);
				outputManager.appendLine(`[Robert] Debug: Debug mode ${newDebugMode ? 'enabled' : 'disabled'} successfully`);

				const message = newDebugMode ? 'Debug mode enabled!' : 'Debug mode disabled!';
				vscode.window.showInformationMessage(`${message} Restart the extension to apply changes.`);
			} catch (error) {
				outputManager.appendLine(`[Robert] Debug: Error toggling debug mode: ${error}`);
				vscode.window.showErrorMessage('Failed to toggle debug mode. Check the output for details.');
			}
		})
	);

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
		})
	);

	// Log successful activation
	errorHandler.logInfo('Extension activated successfully', 'Extension Activation');
}

function createStatusBarItem(context: vscode.ExtensionContext, errorHandler: ErrorHandler): vscode.StatusBarItem {
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

	// Initialize with default state
	updateStatusBarItem(statusBarItem, 'idle', errorHandler);

	return statusBarItem;
}

function updateStatusBarItem(item: vscode.StatusBarItem, state: string, errorHandler: ErrorHandler) {
	try {
		switch (state) {
			case 'idle':
				item.text = `IBM Robert`;
				item.tooltip = `IBM Robert Extension - Ready | Click to open panel`;
				item.backgroundColor = undefined;
				break;
			case 'active':
				item.text = `IBM Robert $(check)`;
				item.tooltip = `IBM Robert Extension - Panel is open | Click to focus`;
				item.backgroundColor = new vscode.ThemeColor('statusBarItem.activeBackground');
				break;
			case 'busy':
				item.text = `IBM Robert $(sync~spin)`;
				item.tooltip = `IBM Robert Extension - Processing... | Click to open`;
				item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
				break;
			case 'error':
				item.text = `IBM Robert $(error)`;
				item.tooltip = `IBM Robert Extension - Error occurred | Click for details`;
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

		const snoozed = robertPopoverState.snoozedUntil > Date.now();
		const snoozeLabel = snoozed ? `Snoozed until ${new Date(robertPopoverState.snoozedUntil).toLocaleTimeString()}` : 'Snooze (5 min)';

		md.appendMarkdown('**IBM Robert**  ');
		md.appendMarkdown(`[$${checked(robertPopoverState.allFiles)}](${allFilesLink}) ${pad('All files')}\n\n`);
		md.appendMarkdown(`[$${checked(robertPopoverState.nextEditSuggestions)}](${nextEditLink}) ${pad('Next edit suggestions')}\n\n`);
		md.appendMarkdown(`[Snooze](${snooze5Link} "Hide for 5 minutes") ${pad(snoozeLabel)}\n`);

		return md;
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'buildStatusTooltip');
		return new vscode.MarkdownString('Error building tooltip');
	}
}

/**
 * Detect if the extension is running in debug mode
 */
function detectDebugMode(context: vscode.ExtensionContext): boolean {
	// Method 1: Check if extension is running from development host
	const isDevelopmentHost = context.extensionMode === vscode.ExtensionMode.Development;

	// Method 2: Check if running in Extension Development Host
	const isExtensionDevelopmentHost = process.env.VSCODE_EXTENSION_DEVELOPMENT === 'true';

	// Method 3: Check if running from source (not packaged)
	const isRunningFromSource = !context.extensionPath.includes('.vscode/extensions');

	// Method 4: Check if debug configuration is active
	const isDebugConfiguration = vscode.workspace.getConfiguration('robert').get('debugMode', false);

	const debugMode = isDevelopmentHost || isExtensionDevelopmentHost || isRunningFromSource || isDebugConfiguration;

	return debugMode;
}

/**
 * Enable additional features when running in debug mode
 */
function enableDebugFeatures(context: vscode.ExtensionContext, outputManager: OutputChannelManager, webviewProvider: RobertWebviewProvider): void {
	// Log detailed extension information
	outputManager.appendLine(`[Robert] Extension Path: ${context.extensionPath}`);
	outputManager.appendLine(`[Robert] Extension Mode: ${vscode.ExtensionMode[context.extensionMode]}`);
	outputManager.appendLine(`[Robert] Extension URI: ${context.extensionUri}`);
	outputManager.appendLine(`[Robert] Global Storage URI: ${context.globalStorageUri}`);
	outputManager.appendLine(`[Robert] Logs URI: ${context.logUri}`);

	// Enable verbose logging
	outputManager.appendLine('[Robert] Debug mode: Verbose logging enabled');

	// Register additional debug commands
	context.subscriptions.push(
		vscode.commands.registerCommand('robert.debug.info', () => {
			outputManager.appendLine('[Robert] Debug Info Command Executed');
			vscode.window.showInformationMessage('Debug mode is active! Check the Robert output channel for details.');
		})
	);

	// Pass debug mode information to webview provider
	webviewProvider.setDebugMode(true);
}

export function deactivate() {
	// This function is called when the extension is deactivated
	// Cleanup can go here if needed

	// Log extension deactivation to output
	const outputManager = OutputChannelManager.getInstance();
	outputManager.appendLine('[Robert] 🚫 EXTENSION DEACTIVATED');
	outputManager.appendLine(`[Robert] Time: ${new Date().toISOString()}`);
	outputManager.appendLine('[Robert] ---');
	// Note: Not showing output channel on deactivation to avoid annoying users
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
