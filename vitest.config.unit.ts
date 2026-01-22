import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
	test: {
		name: 'unit',
		include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		exclude: ['**/node_modules/**', '**/out/**', '**/dist/**', 'test/**'],
		environment: 'node',
		globals: true,
		setupFiles: ['./test/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'**/node_modules/**',
				'**/out/**',
				'**/dist/**',
				'**/*.test.ts',
				'**/*.test.tsx',
				'**/types/**',
				'**/webview/**'
			]
		},
		mockReset: true,
		restoreMocks: true
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			vscode: resolve(__dirname, 'test/mocks/vscode.ts')
		}
	}
});
