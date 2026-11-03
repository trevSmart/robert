/**
 * Name of the active agile backend ("Rally" or "Jira"), as reported by the extension host.
 *
 * The webview is backend-agnostic — it only needs this for user-facing copy (button labels,
 * error messages). It arrives on `devModeInit` and in the preloaded initial data; until then
 * we fall back to a neutral label rather than guessing.
 */

let backendName = '';

export function setBackendName(name: unknown): void {
	if (typeof name === 'string' && name.trim()) {
		backendName = name.trim();
	}
}

/** Display name of the backend, or `fallback` when the host has not reported one yet. */
export function getBackendName(fallback = 'the backend'): string {
	return backendName || fallback;
}
