import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';
import { RobertWebviewProvider } from './RobertWebviewProvider';
import { SettingsManager } from './SettingsManager';
import type { RallyData } from './types/rally';
import { OutputChannelManager } from './utils/OutputChannelManager';
import { clearAllRallyCaches } from './libs/rally/rallyServices';

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
	currentUser: undefined
};

// Store global references for reload functionality
let globalWebviewProvider: RobertWebviewProvider | null = null;
let _globalExtensionContext: vscode.ExtensionContext | null = null;

// In-memory state for the status popover (dummy content)
const robertPopoverState = {
	allFiles: true,
	nextEditSuggestions: true,
	snoozedUntil: 0
};

/**
 * Reload the extension without reloading the IDE
 * Clears cache, resets data, and refreshes the webview
 */
async function reloadExtension(outputManager: OutputChannelManager, _errorHandler: ErrorHandler): Promise<void> {
	try {
		outputManager.appendLine('[Robert] 🔄 Starting extension reload');

		// Step 1: Clear all Rally caches
		outputManager.appendLine('[Robert] 🗑️  Clearing Rally caches...');
		clearAllRallyCaches();

		// Step 2: Clear rallyData
		outputManager.appendLine('[Robert] 🗑️  Clearing rally data...');
		rallyData.projects = [];
		rallyData.users = [];
		rallyData.iterations = [];
		rallyData.userStories = [];
		rallyData.tasks = [];
		rallyData.defects = [];
		rallyData.currentUser = undefined;

		// Step 3: Refresh webview provider (no need to re-register, just refresh data)
		if (globalWebviewProvider) {
			outputManager.appendLine('[Robert] 🔄 Refreshing webview provider...');
			// Prefetch Rally data to warm the cache and trigger webview refresh
			await globalWebviewProvider.prefetchRallyData('reload');
			// Notify webview to refresh (via postMessage)
			await globalWebviewProvider.resetAndRefreshWebviews();
			outputManager.appendLine('[Robert] ✅ Extension reload completed successfully');
		} else {
			outputManager.appendLine('[Robert] ⚠️  Global webview provider not available');
		}
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		outputManager.appendLine(`[Robert] ❌ Error during extension reload: ${err.message}`);
		throw err;
	}
}

export function activate(context: vscode.ExtensionContext) {
	// Get the centralized output channel manager
	const outputManager = OutputChannelManager.getInstance();
	outputManager.appendLine('[Robert] 🚀 Extension activate() function called');
	outputManager.appendLine('[Robert] Extension activated');
	context.subscriptions.push(outputManager);

	// Store global context for reload functionality
	_globalExtensionContext = context;

	// Detect if running in debug mode
	const isDebugMode = detectDebugMode(context);
	outputManager.appendLine(`[Robert] Debug mode detected: ${isDebugMode}`);

	// Initialize error handler
	outputManager.appendLine('[Robert] 🔧 Initializing ErrorHandler');
	const errorHandler = ErrorHandler.getInstance();
	outputManager.appendLine('[Robert] ✅ ErrorHandler initialized successfully');

	// Get settings manager to check if should show output channel on startup
	const settingsManager = SettingsManager.getInstance();
	const showOutputOnStartup = settingsManager.getSetting('showOutputChannelOnStartup');

	// Auto-show output channel if setting is enabled
	if (showOutputOnStartup) {
		outputManager.appendLine('[Robert] 📺 Showing output channel on startup (showOutputChannelOnStartup setting enabled)');
		outputManager.show();
	} else if (isDebugMode) {
		outputManager.appendLine('[Robert] 🐛 Debug mode enabled (output channel not shown - enable showOutputChannelOnStartup setting to change this)');
	}

	// Register the webview provider for activity bar
	outputManager.appendLine('[Robert] 📋 Registering webview provider for activity bar');
	const webviewProvider = new RobertWebviewProvider(context.extensionUri);
	globalWebviewProvider = webviewProvider;
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

	// Register command to reload extension (without reloading the entire IDE)
	const reloadCommand = vscode.commands.registerCommand('robert.reload', async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			outputManager.appendLine('[Robert] Command: reload - Starting extension reload');
			await reloadExtension(outputManager, errorHandler);
		}, 'robert.reload command');
	});
	context.subscriptions.push(reloadCommand);

	// Register command to open in editor
	const openInEditorCommand = vscode.commands.registerCommand('robert.openInEditor', async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			outputManager.appendLine('[Robert] Command: openInEditor');
			await webviewProvider.createWebviewPanel();
		}, 'robert.openInEditor command');
	});
	context.subscriptions.push(openInEditorCommand);

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

		// Clicking the status bar: show the panel
		item.command = 'robert.openMainView';
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
