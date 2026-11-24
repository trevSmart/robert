import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeCommand } = vi.hoisted(() => ({ executeCommand: vi.fn(async (_command: string) => undefined) }));
vi.mock('vscode', () => ({
	commands: { executeCommand },
	window: { createOutputChannel: () => ({ appendLine: () => undefined, info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined }) }
}));

import { setSettingsHostInfo } from '../../settings/SettingsService';
import { availableViewActions, ViewActionsMessageHandler } from './ViewActionsMessageHandler';

const errorHandler = { logInfo: vi.fn(), logWarning: vi.fn() };
const createWebview = () => ({ postMessage: vi.fn(async () => true) });

describe('availableViewActions', () => {
	it('offers Open in Editor only in the VS Code sidebar view', () => {
		expect(availableViewActions('vscode', 'activity-bar')).toEqual(['settings', 'openInEditor', 'reload']);
		expect(availableViewActions('vscode', 'separate-window')).toEqual(['settings', 'reload']);
		expect(availableViewActions('standalone', 'activity-bar')).toEqual(['settings', 'reload']);
	});
});

describe('ViewActionsMessageHandler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setSettingsHostInfo({ kind: 'vscode' });
	});

	const handler = () => new ViewActionsMessageHandler(errorHandler as never);

	it('answers the actions available to the requesting webview', async () => {
		const webview = createWebview();
		expect(await handler().handle('getViewActions', webview as never, { context: 'separate-window' })).toBe(true);
		expect(webview.postMessage).toHaveBeenCalledWith({ command: 'viewActions', actions: ['settings', 'reload'] });
	});

	it('runs the command of an available action', async () => {
		await handler().handle('runViewAction', createWebview() as never, { action: 'openInEditor', context: 'activity-bar' });
		await handler().handle('runViewAction', createWebview() as never, { action: 'reload', context: 'separate-window' });
		expect(executeCommand.mock.calls).toEqual([['robert.openInEditor'], ['robert.reload']]);
	});

	it('ignores actions that are not available there or unknown', async () => {
		await handler().handle('runViewAction', createWebview() as never, { action: 'openInEditor', context: 'separate-window' });
		setSettingsHostInfo({ kind: 'standalone' });
		await handler().handle('runViewAction', createWebview() as never, { action: 'openInEditor', context: 'activity-bar' });
		await handler().handle('runViewAction', createWebview() as never, { action: 'rm -rf', context: 'activity-bar' });
		expect(executeCommand).not.toHaveBeenCalled();
		expect(errorHandler.logWarning).toHaveBeenCalledTimes(3);
	});

	it('leaves other commands to the next handler', async () => {
		expect(await handler().handle('getFavoriteItems', createWebview() as never, {})).toBe(false);
	});
});
