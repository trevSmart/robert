import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('vscode', () => ({ default: {}, workspace: {}, window: {}, commands: {}, Uri: {} }));

import { FavoritesMessageHandler } from './FavoritesMessageHandler';

const STORAGE_KEY = 'robert.favorites';
const LEGACY_STORAGE_KEY = 'robert.pinnedItems';

/** Minimal globalState double: undefined for unset keys, and update(undefined) deletes. */
function createContext(seed: Record<string, unknown> = {}) {
	const store = new Map<string, unknown>(Object.entries(seed));
	return {
		globalState: {
			get: vi.fn((key: string, fallback?: unknown) => (store.has(key) ? store.get(key) : fallback)),
			update: vi.fn(async (key: string, value: unknown) => {
				if (value === undefined) {
					store.delete(key);
				} else {
					store.set(key, value);
				}
			})
		},
		__store: store
	};
}

const createWebview = () => ({ postMessage: vi.fn() });
const errorHandler = { handleError: vi.fn() };

const legacyItem = { objectId: '123', formattedId: 'US1', name: 'Story one', type: 'userstory', pinnedAt: 1000 };

describe('FavoritesMessageHandler legacy migration', () => {
	let context: ReturnType<typeof createContext>;
	let webview: ReturnType<typeof createWebview>;

	const makeHandler = () => new FavoritesMessageHandler(errorHandler as any, context as any);

	beforeEach(() => {
		vi.clearAllMocks();
		webview = createWebview();
	});

	it('migrates legacy pinned items, mapping pinnedAt to favoritedAt', async () => {
		context = createContext({ [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.get(STORAGE_KEY)).toEqual([{ objectId: '123', formattedId: 'US1', name: 'Story one', type: 'userstory', favoritedAt: 1000 }]);
	});

	it('drops the legacy key once migrated so it never runs twice', async () => {
		context = createContext({ [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.has(LEGACY_STORAGE_KEY)).toBe(false);
	});

	it('sends the migrated items to the webview', async () => {
		context = createContext({ [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'favoriteItemsLoaded', items: [expect.objectContaining({ objectId: '123', favoritedAt: 1000 })] }));
	});

	it('leaves an existing favorites list untouched', async () => {
		const existing = [{ objectId: '999', formattedId: 'US9', name: 'Kept', type: 'userstory', favoritedAt: 5000 }];
		context = createContext({ [STORAGE_KEY]: existing, [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.get(STORAGE_KEY)).toEqual(existing);
	});

	it('does not resurrect legacy items when the user has emptied their favorites', async () => {
		context = createContext({ [STORAGE_KEY]: [], [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.get(STORAGE_KEY)).toEqual([]);
	});

	it('migrates on toggle too, so favoriting before the list loads keeps the old items', async () => {
		context = createContext({ [LEGACY_STORAGE_KEY]: [legacyItem] });

		await makeHandler().handle('toggleFavoriteItem', webview as any, { item: { objectId: '456', formattedId: 'US2', name: 'Story two', type: 'userstory' } });

		const stored = context.__store.get(STORAGE_KEY) as { objectId: string }[];
		expect(stored.map(i => i.objectId).sort()).toEqual(['123', '456']);
	});

	it('is a no-op on a fresh install with no stored data', async () => {
		context = createContext();

		await makeHandler().handle('getFavoriteItems', webview as any, {});

		expect(context.__store.has(STORAGE_KEY)).toBe(false);
		expect(webview.postMessage).toHaveBeenCalledWith({ command: 'favoriteItemsLoaded', items: [] });
	});
});
