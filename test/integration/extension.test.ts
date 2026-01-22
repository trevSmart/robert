/**
 * Integration test for extension activation
 * Uses @vscode/test-electron to test in a real VS Code instance
 */

import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('Extension Integration Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		const extension = vscode.extensions.getExtension('trevSmart.robert');
		assert.ok(extension, 'Extension should be found');
	});

	test('Extension should activate', async () => {
		const extension = vscode.extensions.getExtension('trevSmart.robert');
		assert.ok(extension, 'Extension should be found');

		await extension.activate();
		assert.strictEqual(extension.isActive, true, 'Extension should be active');
	});

	test('Commands should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		const robertCommands = commands.filter((cmd) => cmd.startsWith('robert.'));

		assert.ok(
			robertCommands.length > 0,
			'At least one robert command should be registered'
		);

		// Check for essential commands
		const essentialCommands = [
			'robert.helloWorld',
			'robert.openView',
			'robert.openMainView',
			'robert.openSettings'
		];

		for (const cmd of essentialCommands) {
			assert.ok(
				robertCommands.includes(cmd),
				`Command ${cmd} should be registered`
			);
		}
	});

	test('Configuration should be available', () => {
		const config = vscode.workspace.getConfiguration('robert');
		assert.ok(config, 'Robert configuration should be available');

		// Check for essential configuration properties
		assert.ok(
			config.has('apiEndpoint'),
			'Configuration should have apiEndpoint'
		);
		assert.ok(
			config.has('refreshInterval'),
			'Configuration should have refreshInterval'
		);
		assert.ok(config.has('theme'), 'Configuration should have theme');
	});

	test('Hello World command should work', async () => {
		await vscode.commands.executeCommand('robert.helloWorld');
		// Command should execute without throwing
		assert.ok(true, 'Hello World command executed successfully');
	});
});
