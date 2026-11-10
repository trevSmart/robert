import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = resolve(__dirname, '..');

// Bundles the extension backend (handlers + Jira services) for plain Node,
// replacing the `vscode` module and extension.ts with local stand-ins.
export default defineConfig({
	root,
	logLevel: 'warn',
	resolve: {
		alias: [
			// Web-only settings and Jira client: nothing is shared with the VS Code versions.
			{
				find: /^(\.{1,2}\/)+SettingsManager(\.js)?$/,
				replacement: resolve(__dirname, 'shims/SettingsManager.ts')
			},
			{
				find: /^\.\/jiraClient(\.js)?$/,
				replacement: resolve(__dirname, 'shims/jiraClient.ts')
			},
			{ find: /^vscode$/, replacement: resolve(__dirname, 'shims/vscode.ts') },
			{
				find: /^(\.\.\/)+extension(\.js)?$/,
				replacement: resolve(__dirname, 'shims/extension.ts')
			}
		]
	},
	build: {
		ssr: resolve(__dirname, 'server.ts'),
		outDir: resolve(root, 'out/web'),
		emptyOutDir: true,
		target: 'node20',
		minify: false,
		sourcemap: true,
		rollupOptions: {
			output: { format: 'es', entryFileNames: 'server.mjs' }
		}
	}
});
