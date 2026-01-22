import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
	test: {
		name: 'integration',
		include: ['test/**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/out/**', '**/dist/**'],
		environment: 'node',
		globals: true,
		testTimeout: 30000,
		hookTimeout: 30000,
		teardownTimeout: 10000,
		isolate: true,
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true
			}
		}
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src')
		}
	}
});
