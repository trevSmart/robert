/**
 * Settings dialog backend (shared by both hosts) on top of an in-memory VS Code
 * configuration with user and workspace scopes, plus an in-memory SecretStorage.
 */
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
	type Scope = 'global' | 'workspace';
	const scopes: Record<Scope, Map<string, unknown>> = { global: new Map(), workspace: new Map() };
	const defaults = new Map<string, unknown>();
	const listeners = new Set<(event: { affectsConfiguration(section: string): boolean }) => void>();
	const workspace = {
		workspaceFolders: [{ name: 'proj' }] as unknown[] | undefined,
		workspaceFile: undefined,
		name: 'proj',
		getConfiguration: (section: string) => ({
			get: (key: string, fallback?: unknown) => scopes.workspace.get(`${section}.${key}`) ?? scopes.global.get(`${section}.${key}`) ?? defaults.get(`${section}.${key}`) ?? fallback,
			inspect: (key: string) => ({
				key: `${section}.${key}`,
				defaultValue: defaults.get(`${section}.${key}`),
				globalValue: scopes.global.get(`${section}.${key}`),
				workspaceValue: scopes.workspace.get(`${section}.${key}`)
			}),
			update: async (key: string, value: unknown, target: number) => {
				const scope = scopes[target === 2 ? 'workspace' : 'global'];
				const fullKey = `${section}.${key}`;
				if (value === undefined) scope.delete(fullKey);
				else scope.set(fullKey, value);
				for (const listener of listeners) listener({ affectsConfiguration: s => fullKey === s || fullKey.startsWith(`${s}.`) });
			}
		}),
		onDidChangeConfiguration: (listener: (event: { affectsConfiguration(section: string): boolean }) => void) => {
			listeners.add(listener);
			return { dispose: () => listeners.delete(listener) };
		}
	};
	const shownWarnings: string[] = [];
	const vscode = {
		workspace,
		ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
		window: {
			createOutputChannel: () => ({ appendLine: () => undefined, show: () => undefined, dispose: () => undefined, debug: () => undefined, info: () => undefined, warn: () => undefined, error: () => undefined }),
			showWarningMessage: async (message: string) => {
				shownWarnings.push(message);
				return undefined;
			}
		},
		commands: { executeCommand: async () => undefined }
	};
	return { scopes, defaults, workspace, vscode, shownWarnings };
});

vi.mock('vscode', () => hoisted.vscode);

import { CredentialStore, jiraCredentialKey, rallyCredentialKey, type SecretStorageLike } from './CredentialStore';
import { migrateLegacyCredentials } from './legacyCredentialMigration';
import { SettingsService, setSettingsHostInfo } from './SettingsService';
import { envVarForSetting, readSettingsSchema } from './settingsSchema';
import { SettingsManager } from '../SettingsManager';

const ROOT = path.resolve(__dirname, '../..');
const schema = readSettingsSchema(path.join(ROOT, 'package.json'));

function memorySecretStorage(seed: Record<string, string> = {}): SecretStorageLike & { values: Map<string, string> } {
	const values = new Map(Object.entries(seed));
	return {
		values,
		get: async key => values.get(key),
		store: async (key, value) => void values.set(key, value),
		delete: async key => void values.delete(key),
		keys: async () => [...values.keys()]
	};
}

const SITE = 'https://acme.atlassian.net';
const EMAIL = 'me@acme.com';

beforeEach(async () => {
	hoisted.scopes.global.clear();
	hoisted.scopes.workspace.clear();
	hoisted.defaults.clear();
	hoisted.shownWarnings.length = 0;
	for (const [key, entry] of Object.entries(schema)) {
		hoisted.defaults.set(key, entry.default);
	}
	hoisted.workspace.workspaceFolders = [{ name: 'proj' }];
	setSettingsHostInfo({ kind: 'vscode' });
	for (const name of ['ROBERT_JIRA_API_TOKEN', 'ROBERT_JIRA_EMAIL', 'ROBERT_JIRA_BASE_URL', 'ROBERT_RALLY_API_KEY', 'ROBERT_PROVIDER']) {
		delete process.env[name];
	}
	await CredentialStore.getInstance().initialize(memorySecretStorage());
});

describe('credential keys', () => {
	it('normalizes site URLs and emails so equivalent connections share a credential', () => {
		expect(jiraCredentialKey('https://Acme.atlassian.net/', ' Me@Acme.com ')).toBe(jiraCredentialKey(SITE, EMAIL));
		expect(rallyCredentialKey('https://eu1.rallydev.com/')).toBe(rallyCredentialKey('https://EU1.rallydev.com'));
		expect(jiraCredentialKey(SITE, 'other@acme.com')).not.toBe(jiraCredentialKey(SITE, EMAIL));
	});
});

describe('envVarForSetting', () => {
	it('maps settings to the ROBERT_* variables SettingsManager reads', () => {
		expect(envVarForSetting('robert.jiraBaseUrl')).toBe('ROBERT_JIRA_BASE_URL');
		expect(envVarForSetting('robert.collaboration.serverUrl')).toBe('ROBERT_COLLABORATION_SERVER_URL');
		expect(envVarForSetting('robert.statusBarShowSprintDaysLeft')).toBe('ROBERT_STATUS_BAR_SPRINT_DAYS');
	});
});

describe('SettingsManager credentials', () => {
	it('reads the token stored for the active connection and switches when the connection changes', async () => {
		const manager = SettingsManager.getInstance();
		hoisted.scopes.global.set('robert.jiraBaseUrl', SITE);
		hoisted.scopes.global.set('robert.jiraEmail', EMAIL);
		await manager.setCredential('jira', 'token-acme');
		expect(manager.getSetting('jiraApiToken')).toBe('token-acme');
		expect(manager.getSettings().jiraApiToken).toBe('token-acme');

		// Another workspace pointing at another site gets its own (missing) token.
		hoisted.scopes.workspace.set('robert.jiraBaseUrl', 'https://other.atlassian.net');
		expect(manager.getSetting('jiraApiToken')).toBe('');
		process.env.ROBERT_JIRA_API_TOKEN = 'from-env';
		expect(manager.getSetting('jiraApiToken')).toBe('from-env');
		expect(manager.getCredentialStatus('jira')).toMatchObject({ source: 'env', stored: false, connectionComplete: true });
	});

	it('refuses to store a token while the connection is incomplete', async () => {
		const manager = SettingsManager.getInstance();
		await expect(manager.setCredential('jira', 'x')).rejects.toThrow(/email/i);
		expect(manager.getCredentialStatus('jira')).toMatchObject({ connectionComplete: false, source: 'none' });
	});

	it('still uses a plain-text token left in settings until it is migrated', () => {
		hoisted.scopes.global.set('robert.rallyApiKey', 'legacy-key');
		const manager = SettingsManager.getInstance();
		expect(manager.getSetting('rallyApiKey')).toBe('legacy-key');
		expect(manager.getCredentialStatus('rally').source).toBe('legacySetting');
	});
});

describe('migrateLegacyCredentials', () => {
	it('moves plain-text tokens of each scope to the keychain, keyed by that scope connection, and removes them', async () => {
		const storage = memorySecretStorage();
		await CredentialStore.getInstance().initialize(storage);
		hoisted.scopes.global.set('robert.jiraBaseUrl', SITE);
		hoisted.scopes.global.set('robert.jiraEmail', EMAIL);
		hoisted.scopes.global.set('robert.jiraApiToken', 'user-token');
		hoisted.scopes.workspace.set('robert.jiraBaseUrl', 'https://other.atlassian.net');
		hoisted.scopes.workspace.set('robert.jiraApiToken', 'workspace-token');
		hoisted.scopes.global.set('robert.rallyApiKey', 'rally-key');

		await migrateLegacyCredentials();

		expect(storage.values.get(jiraCredentialKey(SITE, EMAIL))).toBe('user-token');
		expect(storage.values.get(jiraCredentialKey('https://other.atlassian.net', EMAIL))).toBe('workspace-token');
		expect(storage.values.get(rallyCredentialKey('https://eu1.rallydev.com'))).toBe('rally-key');
		expect(hoisted.scopes.global.has('robert.jiraApiToken')).toBe(false);
		expect(hoisted.scopes.workspace.has('robert.jiraApiToken')).toBe(false);
		expect(hoisted.scopes.global.has('robert.rallyApiKey')).toBe(false);
		// The workspace connection now resolves its own migrated token.
		expect(SettingsManager.getInstance().getSetting('jiraApiToken')).toBe('workspace-token');
	});

	it('keeps a token whose connection is incomplete and does not overwrite stored credentials', async () => {
		const storage = memorySecretStorage({ [rallyCredentialKey('https://eu1.rallydev.com')]: 'newer' });
		await CredentialStore.getInstance().initialize(storage);
		hoisted.scopes.global.set('robert.jiraApiToken', 'no-email-yet');
		hoisted.scopes.global.set('robert.rallyApiKey', 'older');

		await migrateLegacyCredentials();

		expect(hoisted.scopes.global.get('robert.jiraApiToken')).toBe('no-email-yet');
		expect(storage.values.get(rallyCredentialKey('https://eu1.rallydev.com'))).toBe('newer');
		expect(hoisted.scopes.global.has('robert.rallyApiKey')).toBe(false);
	});
});

describe('SettingsService', () => {
	const service = () => new SettingsService(schema, {});

	it('defaults to the workspace scope when a workspace is open, user otherwise', () => {
		expect(service().buildState().host).toMatchObject({ kind: 'vscode', hasWorkspace: true, defaultScope: 'workspace', canOpenNativeSettings: true });
		hoisted.workspace.workspaceFolders = undefined;
		expect(service().buildState().host).toMatchObject({ hasWorkspace: false, defaultScope: 'user' });
	});

	it('describes values per scope and where the effective value comes from', () => {
		hoisted.scopes.global.set('robert.jiraProjectKey', 'USR');
		hoisted.scopes.workspace.set('robert.jiraProjectKey', 'WSP');
		const fields = Object.fromEntries(new SettingsService(schema, { ROBERT_JIRA_EMAIL: 'env@acme.com' }).buildState().fields.map(field => [field.key, field]));
		expect(fields['robert.jiraProjectKey']).toMatchObject({ values: { user: 'USR', workspace: 'WSP' }, effectiveValue: 'WSP', effectiveSource: 'workspace', scopes: ['user', 'workspace'] });
		expect(fields['robert.jiraEmail']).toMatchObject({ effectiveValue: 'env@acme.com', effectiveSource: 'env', env: { name: 'ROBERT_JIRA_EMAIL', isSet: true } });
		expect(fields['robert.provider']).toMatchObject({ effectiveValue: 'jira', effectiveSource: 'default', enum: ['jira', 'rally'] });
		expect(fields['robert.debugMode'].scopes).toEqual(['user']);
		expect(fields['robert.jiraApiToken']).toBeUndefined();
	});

	it('writes a single setting to the chosen scope and removes it with null', async () => {
		await service().update('robert.jiraProjectKey', 'workspace', ' DSS ');
		expect(hoisted.scopes.workspace.get('robert.jiraProjectKey')).toBe('DSS');
		expect(hoisted.scopes.global.has('robert.jiraProjectKey')).toBe(false);

		await service().update('robert.jiraProjectKey', 'user', 'ABC');
		expect(hoisted.scopes.global.get('robert.jiraProjectKey')).toBe('ABC');

		await service().update('robert.jiraProjectKey', 'workspace', null);
		expect(hoisted.scopes.workspace.has('robert.jiraProjectKey')).toBe(false);
		expect(hoisted.scopes.global.get('robert.jiraProjectKey')).toBe('ABC');
	});

	it('rejects invalid values and scopes', async () => {
		await expect(service().update('robert.jiraBaseUrl', 'workspace', 'http://insecure')).rejects.toThrow(/HTTPS/);
		await expect(service().update('robert.jiraBaseUrl', 'workspace', 'https://acme.atlassian.net bad')).rejects.toThrow(/HTTPS/);
		await expect(service().update('robert.rallyInstance', 'workspace', 'https://#')).rejects.toThrow(/HTTPS/);
		await expect(service().update('robert.provider', 'workspace', 'trello')).rejects.toThrow(/one of/);
		await expect(service().update('robert.debugMode', 'workspace', true)).rejects.toThrow(/User settings/);
		await expect(service().update('robert.jiraApiToken', 'user', 'secret')).rejects.toThrow(/Unknown setting/);
		hoisted.workspace.workspaceFolders = undefined;
		await expect(service().update('robert.jiraProjectKey', 'workspace', 'X')).rejects.toThrow(/Open a folder/);
		expect(hoisted.scopes.workspace.size).toBe(0);
	});

	it('only offers the user scope in the standalone app', () => {
		setSettingsHostInfo({ kind: 'standalone', userSettingsLocation: '/tmp/settings.json' });
		const state = service().buildState();
		expect(state.host).toMatchObject({ kind: 'standalone', hasWorkspace: false, defaultScope: 'user', canOpenNativeSettings: false, userSettingsLocation: '/tmp/settings.json' });
		expect(state.fields.every(field => field.scopes.length === 1 && field.scopes[0] === 'user')).toBe(true);
	});

	it('stores credentials for the active connection, never exposes them, and drops plain-text leftovers', async () => {
		hoisted.scopes.workspace.set('robert.jiraBaseUrl', SITE);
		hoisted.scopes.workspace.set('robert.jiraEmail', EMAIL);
		hoisted.scopes.global.set('robert.jiraApiToken', 'old-plain-text');

		await service().setCredential('jira', 'new-token');
		expect(CredentialStore.getInstance().get(jiraCredentialKey(SITE, EMAIL))).toBe('new-token');
		expect(hoisted.scopes.global.has('robert.jiraApiToken')).toBe(false);

		const state = service().buildState();
		expect(JSON.stringify(state)).not.toContain('new-token');
		expect(state.credentials.find(c => c.id === 'jira')).toMatchObject({ stored: true, source: 'keychain', connectionLabel: `${SITE} · ${EMAIL}` });

		await service().clearCredential('jira');
		expect(CredentialStore.getInstance().get(jiraCredentialKey(SITE, EMAIL))).toBeUndefined();
		await expect(service().setCredential('jira', '   ')).rejects.toThrow(/Enter a value/);
	});
});
