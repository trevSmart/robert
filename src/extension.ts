import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// Register commands
	const openViewCommand = vscode.commands.registerCommand('robert.openView', () => {
		openRobertView(context);
	});

	const refreshViewCommand = vscode.commands.registerCommand('robert.refreshView', () => {
		refreshRobertView();
	});

	// Register view providers
	const robertExplorerProvider = new RobertExplorerProvider();
	const robertMainProvider = new RobertMainProvider();

	vscode.window.registerTreeDataProvider('robertExplorerView', robertExplorerProvider);
	vscode.window.registerTreeDataProvider('robertMainView', robertMainProvider);

	// Add subscriptions
	context.subscriptions.push(openViewCommand, refreshViewCommand);
}

export function deactivate() {
	// This function is called when the extension is deactivated
}

function openRobertView(_context: vscode.ExtensionContext) {
	// Open Robert view in a new editor tab
	const panel = vscode.window.createWebviewPanel('robertView', 'Robert View', vscode.ViewColumn.One, {
		enableScripts: true,
		retainContextWhenHidden: true
	});

	panel.webview.html = getWebviewContent();
}

function refreshRobertView() {
	vscode.window.showInformationMessage('Robert view refreshed!');
}

function getWebviewContent() {
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Robert View</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .header {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: var(--vscode-textLink-foreground);
        }
        .content {
            background-color: var(--vscode-input-background);
            padding: 15px;
            border-radius: 5px;
            border: 1px solid var(--vscode-input-border);
        }
    </style>
</head>
<body>
    <div class="header">🤖 Robert Extension</div>
    <div class="content">
        <p>Welcome to Robert! This view can be opened in multiple ways:</p>
        <ul>
            <li>📱 Activity Bar (dedicated panel)</li>
            <li>📄 Editor Tab (as a webview)</li>
            <li>🔍 Explorer Panel (integrated view)</li>
        </ul>
        <p>This is a flexible component that adapts to different contexts.</p>
    </div>
</body>
</html>`;
}

class RobertExplorerProvider implements vscode.TreeDataProvider<RobertItem> {
	getTreeItem(element: RobertItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: RobertItem): Thenable<RobertItem[]> {
		if (!element) {
			return Promise.resolve([new RobertItem('📱 Activity Bar View', 'robert.openView'), new RobertItem('📄 Editor Tab View', 'robert.openView'), new RobertItem('🔄 Refresh View', 'robert.refreshView')]);
		}
		return Promise.resolve([]);
	}
}

class RobertMainProvider implements vscode.TreeDataProvider<RobertItem> {
	getTreeItem(element: RobertItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: RobertItem): Thenable<RobertItem[]> {
		if (!element) {
			return Promise.resolve([new RobertItem('📄 Open in Editor', 'robert.openView'), new RobertItem('🔄 Refresh', 'robert.refreshView'), new RobertItem('⚙️ Settings', undefined)]);
		}
		return Promise.resolve([]);
	}
}

class RobertItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly commandId?: string
	) {
		super(label);

		if (commandId) {
			this.command = {
				command: commandId,
				title: label,
				arguments: []
			};
		}
	}
}
