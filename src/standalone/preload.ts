/**
 * Preload script for the standalone (Electron) app's windows.
 *
 * Exposes a VS Code compatible `acquireVsCodeApi()` so the React webview code
 * runs unchanged, and a small `robertSettings` bridge for the settings window.
 *
 * Runs in a sandboxed renderer, where `require` is limited to Electron's own
 * modules: keep this file free of local imports and top-level exports (the IPC
 * channel names below must match `ipcChannels.ts`).
 */
(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports -- sandboxed preload must stay a plain script
	const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');

	const IPC_TO_HOST = 'robert:webview:to-host';
	const IPC_TO_PAGE = 'robert:webview:to-page';
	const IPC_SETTINGS_GET = 'robert:settings:get';
	const IPC_SETTINGS_SAVE = 'robert:settings:save';
	const STATE_KEY = '__robertWebviewState';

	// Host → page: VS Code webviews receive messages as window "message" events.
	ipcRenderer.on(IPC_TO_PAGE, (_event, message) => {
		window.postMessage(message, '*');
	});

	let acquired = false;
	contextBridge.exposeInMainWorld('acquireVsCodeApi', () => {
		if (acquired) {
			throw new Error('An instance of the VS Code API has already been acquired');
		}
		acquired = true;
		return {
			postMessage: (message: unknown) => ipcRenderer.send(IPC_TO_HOST, message),
			getState: () => {
				try {
					const raw = sessionStorage.getItem(STATE_KEY);
					return raw ? JSON.parse(raw) : undefined;
				} catch {
					return undefined;
				}
			},
			setState: (state: unknown) => {
				try {
					sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
				} catch {
					// Ignore quota / serialization errors, like VS Code does.
				}
				return state;
			}
		};
	});

	contextBridge.exposeInMainWorld('robertSettings', {
		get: () => ipcRenderer.invoke(IPC_SETTINGS_GET),
		save: (values: Record<string, unknown>) => ipcRenderer.invoke(IPC_SETTINGS_SAVE, values)
	});
})();
