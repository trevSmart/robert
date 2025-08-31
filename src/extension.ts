import * as vscode from 'vscode';
import { RobertWebviewProvider } from './RobertWebviewProvider';

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

	// Register command to open separate window (now reveals sidebar view)
	const openViewCommand = vscode.commands.registerCommand('robert.openView', async () => {
		// Try to focus the activity bar view container for our extension
		// Command id for the view container: 'workbench.view.extension.<containerId>' where containerId is 'robert'
		try {
			await vscode.commands.executeCommand('workbench.view.extension.robert');
			// Also ensure the specific view has focus
			await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
		} catch (_e) {
			// Fallback: if focusing the view fails, open a panel
			webviewProvider.createWebviewPanel();
		}
	});
	context.subscriptions.push(openViewCommand);

	// Create and setup status bar item
	const statusBarItem = createStatusBarItem(context);
	context.subscriptions.push(statusBarItem);
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
	item.command = 'robert.openView';
	item.show();
}

export function deactivate() {
	// This function is called when the extension is deactivated
}
