import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	appType: 'mpa',
	build: {
		outDir: 'out/webview',
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'src/webview/main.html'),
				settings: resolve(__dirname, 'src/webview/settings.html'),
				logo: resolve(__dirname, 'src/webview/logo.html')
			},
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: '[name].js',
				assetFileNames: '[name].[ext]'
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
