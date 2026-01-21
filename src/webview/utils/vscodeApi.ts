type VsCodeApi = {
	postMessage(message: Record<string, unknown>): void;
	setState?(state: unknown): void;
	getState?(): unknown;
};

export function getVsCodeApi(): VsCodeApi | null {
	if (typeof window === 'undefined') {
		return null;
	}

	if (window.__vscodeApi) {
		return window.__vscodeApi;
	}

	if (typeof window.acquireVsCodeApi === 'function') {
		try {
			const api = window.acquireVsCodeApi();
			window.__vscodeApi = api;
			return api;
		} catch (error) {
			console.error('[Robert] Failed to acquire VS Code API', error);
		}
	}

	return null;
}
