import * as vscode from 'vscode';
import { RobertWebviewProvider } from './RobertWebviewProvider';

// In-memory state for the status popover (dummy content)
const robertPopoverState = {
	allFiles: true,
	nextEditSuggestions: true,
	snoozedUntil: 0
};

export function activate(context: vscode.ExtensionContext) {
	// Extension is now active
	const disposable = vscode.commands.registerCommand('robert.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Robert!');
	});

	context.subscriptions.push(disposable);

	// Register the webview provider for activity bar
	const webviewProvider = new RobertWebviewProvider(context.extensionUri);
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
		webviewProvider.createWebviewPanel();
	});
	context.subscriptions.push(openViewCommand);

	// Register command used by the status bar to open a small, lightweight popover
	const openStatusPanelCommand = vscode.commands.registerCommand('robert.openStatusPanel', () => {
		showStatusPopover(webviewProvider);
	});
	context.subscriptions.push(openStatusPanelCommand);

	// Create and setup status bar item
	const statusBarItem = createStatusBarItem(context);
	context.subscriptions.push(statusBarItem);

	// Commands used by interactive tooltip links
	context.subscriptions.push(
		vscode.commands.registerCommand('robert.toggleAllFiles', () => {
			robertPopoverState.allFiles = !robertPopoverState.allFiles;
			// Re-render tooltip to reflect the new state
			updateStatusBarItem(statusBarItem, 'idle');
		}),
		vscode.commands.registerCommand('robert.toggleNextEdit', () => {
			robertPopoverState.nextEditSuggestions = !robertPopoverState.nextEditSuggestions;
			updateStatusBarItem(statusBarItem, 'idle');
		}),
		vscode.commands.registerCommand('robert.snooze', (minutes: number = 5) => {
			const now = Date.now();
			robertPopoverState.snoozedUntil = now + minutes * 60 * 1000;
			updateStatusBarItem(statusBarItem, 'idle');
			vscode.window.showInformationMessage(`Robert snoozed for ${minutes} minutes`);
		}),
		vscode.commands.registerCommand('robert.openSettings', () => {
			vscode.commands.executeCommand('workbench.action.openSettings', '@ext:robert');
		})
	);
}

function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

	// Initialize with default state
	updateStatusBarItem(statusBarItem, 'idle');

	// Update status bar every 5 seconds with different states
	const intervalId = setInterval(() => {
		const states = ['idle', 'active', 'busy', 'error'];
		const randomState = states[Math.floor(Math.random() * states.length)];
		updateStatusBarItem(statusBarItem, randomState);
	}, 5000);
	// Clean up interval when extension deactivates
	context.subscriptions.push({
		dispose: () => clearInterval(intervalId)
	});

	return statusBarItem;
}

function updateStatusBarItem(item: vscode.StatusBarItem, state: string) {
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
	item.tooltip = buildStatusTooltip();

	// Clicking the status bar: keep a useful default action (open full panel)
	item.command = 'robert.openView';
	item.show();
}

function buildStatusTooltip(): vscode.MarkdownString {
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
}

export function deactivate() {
	// This function is called when the extension is deactivated
}

// Lightweight floating popover using QuickPick (closest to a small panel)
function showStatusPopover(webviewProvider: RobertWebviewProvider) {
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
		const picked = qp.selectedItems[0];
		if (!picked) {
			qp.hide();
			qp.dispose();
			return;
		}
		if (picked.label.includes('Obrir panell complet')) {
			webviewProvider.createWebviewPanel();
		} else if (picked.label.includes('Obrir vista lateral')) {
			vscode.commands.executeCommand('workbench.view.extension.robert');
		}
		qp.hide();
		qp.dispose();
	};

	qp.onDidAccept(accept);
	qp.onDidTriggerItemButton(() => {
		webviewProvider.createWebviewPanel();
		qp.hide();
		qp.dispose();
	});
	qp.onDidTriggerButton(() => {
		webviewProvider.createWebviewPanel();
		qp.hide();
		qp.dispose();
	});

	qp.show();
}
