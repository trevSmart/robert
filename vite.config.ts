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
				// Suppress warnings about unresolved placeholders that will be replaced at runtime
				if (warning.message?.includes('__INTER_FONT_URI__') || warning.message?.includes('__REBUS_LOGO_URI__')) {
					return;
				}
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
