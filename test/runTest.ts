/**
 * Integration test runner using @vscode/test-electron
 * This runner launches a real VS Code instance to test the extension
 */

import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		const extensionDevelopmentPath = path.resolve(__dirname, '../..');

		// The path to the extension test runner script
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Download VS Code, unzip it and run the integration test
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				'--disable-extensions', // Disable other extensions
				'--disable-gpu', // Disable GPU acceleration for stability
				'--no-sandbox' // Required for CI environments
			]
		});
	} catch (err) {
		console.error('Failed to run tests:', err);
		process.exit(1);
	}
}

main();
