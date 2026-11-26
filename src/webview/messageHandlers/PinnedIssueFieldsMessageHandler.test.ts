import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('vscode', () => ({
	default: {},
	workspace: {},
	window: {},
	commands: {},
	Uri: {}
}));

import { PinnedIssueFieldsMessageHandler } from './PinnedIssueFieldsMessageHandler';

const STORAGE_KEY = 'robert.pinnedIssueFields';

function createContext(workspaceSeed: Record<string, unknown> = {}) {
	const workspace = new Map<string, unknown>(Object.entries(workspaceSeed));
	return {
		workspaceState: {
			get: vi.fn((key: string) => workspace.get(key)),
			update: vi.fn(async (key: string, value: unknown) => {
				workspace.set(key, value);
			})
		},
		__workspace: workspace
	};
}

const errorHandler = { handleError: vi.fn(), logInfo: vi.fn() };

describe('PinnedIssueFieldsMessageHandler', () => {
	let webview: { postMessage: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		webview = { postMessage: vi.fn() };
		vi.clearAllMocks();
	});

	it('returns an empty list when nothing is stored', async () => {
		const handler = new PinnedIssueFieldsMessageHandler(errorHandler as any, createContext() as any);
		expect(await handler.handle('getPinnedIssueFields', webview as any, {})).toBe(true);
		expect(webview.postMessage).toHaveBeenCalledWith({ type: 'pinnedIssueFieldsLoaded', fieldIds: [] });
	});

	it('ignores malformed stored values', async () => {
		const handler = new PinnedIssueFieldsMessageHandler(errorHandler as any, createContext({ [STORAGE_KEY]: ['labels', 3, '', null] }) as any);
		await handler.handle('getPinnedIssueFields', webview as any, {});
		expect(webview.postMessage).toHaveBeenCalledWith({ type: 'pinnedIssueFieldsLoaded', fieldIds: ['labels'] });
	});

	it('pins a field at the end of the list and unpins it on the next toggle', async () => {
		const context = createContext({ [STORAGE_KEY]: ['labels'] });
		const handler = new PinnedIssueFieldsMessageHandler(errorHandler as any, context as any);

		await handler.handle('togglePinnedIssueField', webview as any, { fieldId: 'customfield_10042' });
		expect(context.__workspace.get(STORAGE_KEY)).toEqual(['labels', 'customfield_10042']);
		expect(webview.postMessage).toHaveBeenLastCalledWith({ type: 'pinnedIssueFieldsLoaded', fieldIds: ['labels', 'customfield_10042'] });

		await handler.handle('togglePinnedIssueField', webview as any, { fieldId: 'labels' });
		expect(context.__workspace.get(STORAGE_KEY)).toEqual(['customfield_10042']);
		expect(errorHandler.logInfo).toHaveBeenCalledTimes(2);
	});

	it('does nothing without a field id', async () => {
		const context = createContext();
		const handler = new PinnedIssueFieldsMessageHandler(errorHandler as any, context as any);
		expect(await handler.handle('togglePinnedIssueField', webview as any, {})).toBe(true);
		expect(context.workspaceState.update).not.toHaveBeenCalled();
		expect(webview.postMessage).not.toHaveBeenCalled();
	});

	it('does not handle other commands', async () => {
		const handler = new PinnedIssueFieldsMessageHandler(errorHandler as any, createContext() as any);
		expect(await handler.handle('getFavoriteItems', webview as any, {})).toBe(false);
	});
});
