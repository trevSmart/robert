import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['**/*.test.ts'],
		exclude: ['node_modules', 'out', 'dist', '.vscode-test', 'test/suite/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules',
				'out',
				'dist',
				'.vscode-test',
				'**/*.test.ts',
				'**/types/**',
				'src/webview/**' // Exclude React webview components from unit tests
			]
		},
		testTimeout: 10000
	}
});
