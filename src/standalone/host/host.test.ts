import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationStore, type SecretCodec, SecureStorageUnavailableError, type SettingSchema } from './ConfigurationStore';
import { FileMemento } from './FileMemento';
import { injectTheme, buildThemeCss } from './theme';
import { Uri } from './Uri';
import { createVscodeShim } from './vscodeShim';

const SCHEMA: Record<string, SettingSchema> = {
	'robert.provider': { type: 'string', default: 'jira', enum: ['jira', 'rally'] },
	'robert.jiraEmail': { type: 'string', default: '' },
	'robert.jiraApiToken': { type: 'string', default: '' },
	'robert.debugMode': { type: 'boolean', default: false },
	'robert.collaboration.enabled': { type: 'boolean', default: false }
};

/** Reversible fake codec so tests can assert values are not stored in plain text. */
const fakeCodec: SecretCodec = {
	isAvailable: () => true,
	encrypt: plain => Buffer.from(plain).toString('base64'),
	decrypt: encoded => Buffer.from(encoded, 'base64').toString()
};

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'robert-standalone-'));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ConfigurationStore', () => {
	it('returns manifest defaults for unset keys, like VS Code', () => {
		const store = new ConfigurationStore(path.join(tmpDir, 'settings.json'), SCHEMA);
		const config = store.getConfiguration('robert');
		expect(config.get('provider')).toBe('jira');
		expect(config.get('debugMode')).toBe(false);
		expect(config.get('collaboration.enabled')).toBe(false);
		expect(config.get('unknownKey', 'fallback')).toBe('fallback');
	});

	it('persists updates and reloads them from disk', async () => {
		const file = path.join(tmpDir, 'settings.json');
		const store = new ConfigurationStore(file, SCHEMA);
		await store.getConfiguration('robert').update('jiraEmail', 'me@example.com');
		await store.getConfiguration('robert').update('collaboration.enabled', true);

		const reloaded = new ConfigurationStore(file, SCHEMA);
		expect(reloaded.getConfiguration('robert').get('jiraEmail')).toBe('me@example.com');
		expect(reloaded.getConfiguration('robert').get('collaboration.enabled')).toBe(true);
	});

	it('fires change events only for keys whose effective value changed', () => {
		const store = new ConfigurationStore(path.join(tmpDir, 'settings.json'), SCHEMA);
		const events: Array<(key: string) => boolean> = [];
		store.onDidChange(event => events.push(key => event.affectsConfiguration(key)));

		expect(store.update({ 'robert.provider': 'jira' })).toEqual([]);
		expect(events).toHaveLength(0);

		expect(store.update({ 'robert.provider': 'rally', 'robert.collaboration.enabled': true })).toEqual(['robert.provider', 'robert.collaboration.enabled']);
		expect(events).toHaveLength(1);
		expect(events[0]('robert.provider')).toBe(true);
		expect(events[0]('robert.collaboration')).toBe(true);
		expect(events[0]('robert.jiraEmail')).toBe(false);
	});

	it('encrypts secret settings at rest when a codec is available', () => {
		const file = path.join(tmpDir, 'settings.json');
		const store = new ConfigurationStore(file, SCHEMA, fakeCodec);
		store.update({ 'robert.jiraApiToken': 'top-secret', 'robert.jiraEmail': 'me@example.com' });

		const raw = fs.readFileSync(file, 'utf8');
		expect(raw).not.toContain('top-secret');
		expect(raw).toContain('me@example.com');
		expect(new ConfigurationStore(file, SCHEMA, fakeCodec).getConfiguration('robert').get('jiraApiToken')).toBe('top-secret');
	});

	it('refuses to store secrets in plain text when secure storage is unavailable', () => {
		const file = path.join(tmpDir, 'settings.json');
		const unavailable: SecretCodec = { ...fakeCodec, isAvailable: () => false };
		for (const codec of [unavailable, undefined]) {
			const store = new ConfigurationStore(file, SCHEMA, codec);
			expect(() => store.update({ 'robert.jiraEmail': 'me@example.com', 'robert.jiraApiToken': 'top-secret' })).toThrow(SecureStorageUnavailableError);
			expect(() => store.update({ 'robert.jiraApiToken': 'top-secret' })).toThrow(/ROBERT_JIRA_API_TOKEN/);
			// The whole batch is rejected and nothing reaches disk.
			expect(fs.existsSync(file)).toBe(false);
			expect(store.getConfiguration('robert').get('jiraEmail')).toBe('');
			// Clearing a secret is still allowed.
			expect(() => store.update({ 'robert.jiraApiToken': undefined })).not.toThrow();
		}
	});

	it('treats an undecryptable secret as unset instead of throwing', () => {
		const file = path.join(tmpDir, 'settings.json');
		fs.writeFileSync(file, JSON.stringify({ 'robert.jiraApiToken': { __encrypted: 'garbage' } }));
		const brokenCodec: SecretCodec = {
			...fakeCodec,
			decrypt: () => {
				throw new Error('bad key');
			}
		};
		const store = new ConfigurationStore(file, SCHEMA, brokenCodec);
		expect(store.getConfiguration('robert').get('jiraApiToken')).toBe('');
	});

	it('reads the schema from the real extension manifest', () => {
		const schema = ConfigurationStore.readSchemaFromManifest(path.resolve(__dirname, '../../../package.json'));
		expect(schema['robert.provider']?.enum).toEqual(['jira', 'rally']);
		expect(schema['robert.jiraApiToken']).toBeDefined();
	});
});

describe('FileMemento', () => {
	it('stores, reads back and deletes values', async () => {
		const file = path.join(tmpDir, 'state.json');
		const memento = new FileMemento(file);
		expect(memento.get('favorites', [])).toEqual([]);

		await memento.update('favorites', [{ id: 'US1' }]);
		expect(new FileMemento(file).get('favorites')).toEqual([{ id: 'US1' }]);

		await memento.update('favorites', undefined);
		expect(new FileMemento(file).get('favorites')).toBeUndefined();
		expect(memento.keys()).toEqual([]);
	});
});

describe('Uri', () => {
	it('round-trips file paths and joins segments', () => {
		const root = Uri.file(tmpDir);
		const joined = Uri.joinPath(root, 'resources', 'icons', 'robert logo.png');
		expect(joined.fsPath).toBe(path.join(tmpDir, 'resources', 'icons', 'robert logo.png'));
		expect(joined.toString()).toContain('robert%20logo.png');
	});

	it('parses web URLs', () => {
		const uri = Uri.parse('https://example.atlassian.net/browse/DSS-1?x=1#top');
		expect(uri.scheme).toBe('https');
		expect(uri.authority).toBe('example.atlassian.net');
		expect(uri.toString()).toBe('https://example.atlassian.net/browse/DSS-1?x=1#top');
	});
});

describe('theme injection', () => {
	it('adds the theme stylesheet first in <head> and the theme class to <body>', () => {
		const html = injectTheme('<html><head><meta charset="UTF-8"><link rel="stylesheet" href="app.css"></head><body><div id="root"></div></body></html>', 'dark');
		expect(html.indexOf('_robertStandaloneTheme')).toBeLessThan(html.indexOf('app.css'));
		expect(html).toContain('<body class="vscode-dark" data-vscode-theme-kind="vscode-dark">');
	});

	it('merges with an existing body class', () => {
		const html = injectTheme('<head></head><body class="app">', 'light');
		expect(html).toContain('class="vscode-light app"');
	});

	it('defines every --vscode-* variable used by the webview sources', () => {
		const webviewDir = path.resolve(__dirname, '../../webview');
		const used = new Set<string>();
		const walk = (dir: string) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					walk(full);
				} else if (/\.(tsx?|html|css)$/.test(entry.name)) {
					for (const match of fs.readFileSync(full, 'utf8').matchAll(/var\(\s*(--vscode-[a-zA-Z0-9-]+)/g)) {
						used.add(match[1]);
					}
				}
			}
		};
		walk(webviewDir);
		for (const kind of ['dark', 'light'] as const) {
			const css = buildThemeCss(kind);
			const missing = [...used].filter(name => !css.includes(`${name}:`));
			expect(missing, `${kind} theme is missing variables`).toEqual([]);
		}
	});
});

describe('vscode shim', () => {
	const createShim = () => {
		const config = new ConfigurationStore(path.join(tmpDir, 'settings.json'), SCHEMA);
		const notify = vi.fn();
		const openExternal = vi.fn(async () => true);
		const shim = createVscodeShim({
			config,
			appName: 'IBM Robert',
			createLogChannel: () => ({ info: vi.fn() }) as never,
			notify,
			openExternal,
			readClipboard: () => 'clip',
			writeClipboard: vi.fn()
		});
		return { shim, config, notify, openExternal };
	};

	it('routes notifications and external links to the host', async () => {
		const { shim, notify, openExternal } = createShim();
		await shim.window.showErrorMessage('boom');
		await shim.env.openExternal(shim.Uri.parse('https://example.com/a'));
		expect(notify).toHaveBeenCalledWith('error', 'boom');
		expect(openExternal).toHaveBeenCalledWith('https://example.com/a');
		expect(await shim.env.clipboard.readText()).toBe('clip');
	});

	it('runs registered commands and ignores VS Code-only ones', async () => {
		const { shim } = createShim();
		const handler = vi.fn(() => 42);
		shim.commands.registerCommand('robert.reload', handler);
		expect(await shim.commands.executeCommand('robert.reload', 'x')).toBe(42);
		expect(handler).toHaveBeenCalledWith('x');
		await expect(shim.commands.executeCommand('setContext', 'robertWebviewFocused', true)).resolves.toBeUndefined();
	});

	it('forwards configuration changes to onDidChangeConfiguration listeners', async () => {
		const { shim } = createShim();
		const seen: boolean[] = [];
		shim.workspace.onDidChangeConfiguration(event => seen.push(event.affectsConfiguration('robert.provider')));
		await shim.workspace.getConfiguration('robert').update('provider', 'rally', shim.ConfigurationTarget.Global);
		expect(seen).toEqual([true]);
	});

	it('reports VS Code-only features as unavailable instead of crashing', async () => {
		const { shim } = createShim();
		await expect(shim.workspace.openTextDocument()).rejects.toThrow(/standalone/);
		expect(await shim.lm.selectChatModels()).toEqual([]);
	});
});
