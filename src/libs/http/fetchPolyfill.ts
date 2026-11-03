// Polyfill for fetch in older VS Code versions (< 1.77, Node.js < 18).
// Uses a dynamic import so environments that already have fetch never load node-fetch.
// `options` is typed as a union to support both DOM and node-fetch RequestInit types
// across different environments/TS configurations.
export type FetchOptions = RequestInit | import('node-fetch').RequestInit;

export const fetchPolyfill = async (url: string, options?: FetchOptions): Promise<Response> => {
	// Try to use native fetch if available (Node.js 18+ / VS Code 1.77+)
	if (typeof globalThis.fetch === 'function') {
		return globalThis.fetch(url, options as RequestInit);
	}

	// Fallback to node-fetch for older environments
	try {
		const nodeFetch = await import('node-fetch');
		return nodeFetch.default(url, options as import('node-fetch').RequestInit) as unknown as Response;
	} catch {
		throw new Error('fetch is not available and node-fetch polyfill could not be loaded. Please upgrade VS Code to version 1.77 or later.');
	}
};
