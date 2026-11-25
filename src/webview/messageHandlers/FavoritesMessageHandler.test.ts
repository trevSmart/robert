import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('vscode', () => ({
	default: {},
	workspace: {},
	window: {},
	commands: {},
	Uri: {}
}));

import { FavoritesMessageHandler } from './FavoritesMessageHandler';

const STORAGE_KEY = 'robert.favorites';
const LEGACY_STORAGE_KEY = 'robert.pinnedItems';

/** Minimal Memento double: undefined for unset keys, and update(undefined) deletes. */
function createMemento(store: Map<string, unknown>) {
	return {
		get: vi.fn((key: string, fallback?: unknown) => (store.has(key) ? store.get(key) : fallback)),
		update: vi.fn(async (key: string, value: unknown) => {
			if (value === undefined) {
				store.delete(key);
			} else {
				store.set(key, value);
			}
		})
	};
}

/** `__store` is globalState (where the legacy lists live); `__workspace` is workspaceState. */
function createContext(seed: Record<string, unknown> = {}, workspaceSeed: Record<string, unknown> = {}) {
	const store = new Map<string, unknown>(Object.entries(seed));
	const workspace = new Map<string, unknown>(Object.entries(workspaceSeed));
	return {
		globalState: createMemento(store),
		workspaceState: createMemento(workspace),
		__store: store,
		__workspace: workspace
	};
}

const createWebview = () => ({ postMessage: vi.fn() });
const errorHandler = { handleError: vi.fn() };

const legacyItem = {
	objectId: '123',
	formattedId: 'US1',
	name: 'Story one',
	type: 'userstory',
	project: 'DSS',
	pinnedAt: 1000
};

describe('FavoritesMessageHandler legacy migration', () => {
	let context: ReturnType<typeof createContext>;
	let webview: ReturnType<typeof createWebview>;

	const makeHandler = (project: string | null = 'DSS') => new FavoritesMessageHandler(errorHandler as any, context as any, () => project);

	beforeEach(() => {
		vi.clearAllMocks();
		webview = createWebview();
	});

	it('migrates legacy pinned items, mapping pinnedAt to favoritedAt', async () => {
		context = createContext({ [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.get(STORAGE_KEY)).toEqual([
			{
				objectId: '123',
				formattedId: 'US1',
				name: 'Story one',
				type: 'userstory',
				project: 'DSS',
				favoritedAt: 1000
			}
		]);
	});

	it('drops the legacy key once migrated so it never runs twice', async () => {
		context = createContext({ [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.has(LEGACY_STORAGE_KEY)).toBe(false);
	});

	it('sends the migrated items to the webview', async () => {
		context = createContext({ [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(webview.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				command: 'favoriteItemsLoaded',
				items: [expect.objectContaining({ objectId: '123', favoritedAt: 1000 })]
			})
		);
	});

	it('leaves an existing favorites list untouched', async () => {
		const existing = [
			{
				objectId: '999',
				formattedId: 'US9',
				name: 'Kept',
				type: 'userstory',
				favoritedAt: 5000
			}
		];
		context = createContext({
			[STORAGE_KEY]: existing,
			[LEGACY_STORAGE_KEY]: [legacyItem]
		});

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.get(STORAGE_KEY)).toEqual(existing);
	});

	it('does not resurrect legacy items when the user has emptied their favorites', async () => {
		context = createContext({
			[STORAGE_KEY]: [],
			[LEGACY_STORAGE_KEY]: [legacyItem]
		});

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.get(STORAGE_KEY)).toEqual([]);
	});

	it('migrates on toggle too, so favoriting before the list loads keeps the old items', async () => {
		context = createContext({ [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('toggleFavoriteItem', webview as any, {
			item: {
				objectId: '456',
				formattedId: 'US2',
				name: 'Story two',
				type: 'userstory'
			}
		});

		const stored = context.__workspace.get(STORAGE_KEY) as { objectId: string }[];
		expect(stored.map(i => i.objectId).sort()).toEqual(['123', '456']);
	});

	it('is a no-op on a fresh install with no stored data', async () => {
		context = createContext();

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.has(STORAGE_KEY)).toBe(false);
		expect(context.__workspace.get(STORAGE_KEY)).toEqual([]);
		expect(webview.postMessage).toHaveBeenCalledWith({
			command: 'favoriteItemsLoaded',
			items: []
		});
	});
});

describe('FavoritesMessageHandler per-workspace storage', () => {
	const story = (objectId: string, project: string | null) => ({ objectId, formattedId: `US${objectId}`, name: `Story ${objectId}`, type: 'userstory', project });

	beforeEach(() => vi.clearAllMocks());

	it('stores new favorites in workspaceState, not globalState', async () => {
		const context = createContext();
		const handler = new FavoritesMessageHandler(errorHandler as any, context as any, () => 'DSS');

		await handler.handle('toggleFavoriteItem', createWebview() as any, { item: story('1', 'DSS') });

		expect(context.__store.has(STORAGE_KEY)).toBe(false);
		expect((context.__workspace.get(STORAGE_KEY) as { objectId: string }[]).map(i => i.objectId)).toEqual(['1']);
	});

	it('keeps favorites of different workspaces apart', async () => {
		const global = new Map<string, unknown>();
		const ws = (project: string) => {
			const workspace = new Map<string, unknown>();
			const context = { globalState: createMemento(global), workspaceState: createMemento(workspace) };
			return { handler: new FavoritesMessageHandler(errorHandler as any, context as any, () => project), workspace };
		};
		const a = ws('AAA');
		const b = ws('BBB');

		await a.handler.handle('toggleFavoriteItem', createWebview() as any, { item: story('1', 'AAA') });
		const webviewB = createWebview();
		await b.handler.handle('getFavoriteItems', webviewB as any, {});

		expect(webviewB.postMessage).toHaveBeenCalledWith({ command: 'favoriteItemsLoaded', items: [] });
	});

	it('seeds a workspace with the legacy global favorites of its own project only', async () => {
		const context = createContext({
			[STORAGE_KEY]: [
				{ ...story('1', 'DSS'), favoritedAt: 1 },
				{ ...story('2', 'OTHER'), favoritedAt: 2 },
				{ ...story('3', null), favoritedAt: 3 }
			]
		});
		const webview = createWebview();

		await new FavoritesMessageHandler(errorHandler as any, context as any, () => 'DSS').handle('getFavoriteItems', webview as any, {});

		expect(webview.postMessage).toHaveBeenCalledWith({ command: 'favoriteItemsLoaded', items: [expect.objectContaining({ objectId: '1' })] });
		// The global list stays, so other workspaces can still seed their own share.
		expect((context.__store.get(STORAGE_KEY) as unknown[]).length).toBe(3);
	});

	it('does not reseed a workspace whose favorites were emptied', async () => {
		const context = createContext({ [STORAGE_KEY]: [{ ...story('1', 'DSS'), favoritedAt: 1 }] }, { [STORAGE_KEY]: [] });
		const webview = createWebview();

		await new FavoritesMessageHandler(errorHandler as any, context as any, () => 'DSS').handle('getFavoriteItems', webview as any, {});

		expect(webview.postMessage).toHaveBeenCalledWith({ command: 'favoriteItemsLoaded', items: [] });
	});

	it('starts empty when the workspace has no project configured', async () => {
		const context = createContext({ [STORAGE_KEY]: [{ ...story('1', 'DSS'), favoritedAt: 1 }] });
		const webview = createWebview();

		await new FavoritesMessageHandler(errorHandler as any, context as any, () => null).handle('getFavoriteItems', webview as any, {});

		expect(webview.postMessage).toHaveBeenCalledWith({ command: 'favoriteItemsLoaded', items: [] });
	});
});
