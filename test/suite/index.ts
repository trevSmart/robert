/**
 * Integration test suite index
 * Sets up Mocha to run integration tests with @vscode/test-electron
 */

import * as path from 'node:path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'bdd',
		color: true,
		timeout: 30000
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((resolve, reject) => {
		glob('**/**.test.js', { cwd: testsRoot })
			.then((files) => {
				// Add files to the test suite
				files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

				try {
					// Run the mocha test
					mocha.run((failures: number) => {
						if (failures > 0) {
							reject(new Error(`${failures} tests failed.`));
						} else {
							resolve();
						}
					});
				} catch (err) {
					console.error(err);
					reject(err);
				}
			})
			.catch((err) => {
				reject(err);
			});
	});
}
