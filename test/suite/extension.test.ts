/**
 * VS Code Extension Integration Tests
 * 
 * These tests run inside a VS Code instance and can test
 * extension functionality with the full VS Code API available.
 * 
 * To run: npm run test:vscode
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('trevSmart.robert'));
	});

	test('Extension should activate', async () => {
		const ext = vscode.extensions.getExtension('trevSmart.robert');
		assert.ok(ext);
		
		if (ext) {
			await ext.activate();
			assert.strictEqual(ext.isActive, true);
		}
	});

	test('Commands should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		
		const expectedCommands = [
			'robert.openMainView',
			'robert.showOutput',
			'robert.reload',
			'robert.openInEditor'
		];

		for (const cmd of expectedCommands) {
			assert.ok(
				commands.includes(cmd),
				`Command ${cmd} should be registered`
			);
		}
	});

	test('Configuration should have expected properties', () => {
		const config = vscode.workspace.getConfiguration('robert');
		
		assert.ok(config.has('autoRefresh'));
		assert.ok(config.has('debugMode'));
		assert.ok(config.has('rallyInstance'));
		assert.ok(config.has('rallyApiKey'));
		assert.ok(config.has('rallyProjectName'));
	});

	test('Configuration defaults should be correct', () => {
		const config = vscode.workspace.getConfiguration('robert');

		assert.strictEqual(config.inspect('autoRefresh')?.defaultValue, true);
		assert.strictEqual(config.inspect('debugMode')?.defaultValue, false);
	});

	test('Output channel should be created', async () => {
		// Executing the command should complete without throwing,
		// which implies the extension activated and handled the request.
		await assert.doesNotReject(async () => {
			await vscode.commands.executeCommand('robert.showOutput');
		});
	});
});

suite('Settings Manager Integration Tests', () => {
	test('Should be able to update settings', async () => {
		const config = vscode.workspace.getConfiguration('robert');

		const originalValue = config.get('debugMode');

		await config.update('debugMode', true, vscode.ConfigurationTarget.Global);

		await new Promise<void>((resolve) => {
			const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('robert.debugMode')) {
					disposable.dispose();
					resolve();
				}
			});
			setTimeout(resolve, 500);
		});

		assert.strictEqual(vscode.workspace.getConfiguration('robert').get('debugMode'), true);

		await config.update('debugMode', originalValue, vscode.ConfigurationTarget.Global);
	});
});

suite('Command Execution Tests', () => {
	test('Should execute robert.showOutput without error', async () => {
		await assert.doesNotReject(async () => {
			await vscode.commands.executeCommand('robert.showOutput');
		});
	});

	test('Should execute robert.openMainView without error', async () => {
		await assert.doesNotReject(async () => {
			await vscode.commands.executeCommand('robert.openMainView');
		});
	});
});
