import { SettingsManager } from '../../SettingsManager';
import { ErrorHandler } from '../../ErrorHandler';
import type { BackendKind } from '../../SettingsManager';
import type { IBackend } from './IBackend';
import { RallyBackend } from './RallyBackend';
import { JiraBackend } from './JiraBackend';

export type { IBackend } from './IBackend';
export * from './IBackend';

const errorHandler = ErrorHandler.getInstance();

// Memoized backend instance – rebuilt whenever `robert.backend` changes.
let _backendCache: { backend: IBackend; kind: BackendKind } | null = null;

/**
 * Resolve the currently configured backend.
 *
 * Callers should invoke this per operation rather than holding onto the result, so that a
 * settings change takes effect without an extension reload.
 */
export function getBackend(): IBackend {
	const kind = SettingsManager.getInstance().getSetting('backend');

	if (_backendCache && _backendCache.kind === kind) {
		return _backendCache.backend;
	}

	const backend: IBackend = kind === 'jira' ? new JiraBackend() : new RallyBackend();
	errorHandler.logInfo(`Active backend: ${backend.displayName}`, 'backend.getBackend');

	_backendCache = { backend, kind };
	return backend;
}

/**
 * Drop the memoized backend (and its caches). Call when settings change or the extension reloads.
 */
export function resetBackend(): void {
	_backendCache?.backend.clearAllCaches();
	_backendCache = null;
}
