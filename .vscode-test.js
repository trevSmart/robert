const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
	{
		label: 'integrationTests',
		files: 'out/test/suite/**/*.test.js',
		version: 'stable',
		workspaceFolder: './test-workspace',
		mocha: {
			ui: 'tdd',
			timeout: 20000,
			color: true
		},
		launchArgs: [
			'--disable-extensions' // Disable other extensions to avoid interference
		]
	}
]);
