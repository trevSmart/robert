import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// Extension is now active
	const disposable = vscode.commands.registerCommand('robert.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Robert!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
	// This function is called when the extension is deactivated
}
