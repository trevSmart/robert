import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: 'out/webview',
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'src/webview/main.tsx'),
				settings: resolve(__dirname, 'src/webview/settings.tsx'),
				logo: resolve(__dirname, 'src/webview/logo.tsx')
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
