import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		react({
			jsxRuntime: 'automatic'
		})
	],
	appType: 'mpa',
	experimental: {
		// Assets referenced from CSS (e.g. the codicon font) must use a path relative
		// to the stylesheet: an absolute "/codicon.ttf" resolves against the webview
		// origin root instead of out/webview/, so the icon font never loads and every
		// codicon renders as an empty box. HTML URLs are rewritten by the host instead.
		renderBuiltUrl(_filename, { hostType }) {
			return hostType === 'css' ? { relative: true } : undefined;
		}
	},
	build: {
		outDir: 'out/webview',
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'src/webview/main.html'),
				logo: resolve(__dirname, 'src/webview/logo.html')
			},
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: '[name].js',
				assetFileNames: '[name].[ext]'
			},
			onwarn(warning, warn) {
				warn(warning);
			}
		},
		minify: false, // Keep readable for debugging
		sourcemap: true
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src')
		}
	}
});
