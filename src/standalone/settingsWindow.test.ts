import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigurationStore, type SecretCodec, type SettingSchema } from './host/ConfigurationStore';
import { buildSettingFields, envVarForSetting, sanitizeSettingValues } from './settingsWindow';

const SCHEMA: Record<string, SettingSchema> = {
	'robert.provider': { type: 'string', default: 'jira', enum: ['jira', 'rally'] },
	'robert.jiraBaseUrl': { type: 'string', default: 'https://jiracloudab.atlassian.net' },
	'robert.jiraApiToken': { type: 'string', default: '' },
	'robert.debugMode': { type: 'boolean', default: false }
};

const codec: SecretCodec = {
	isAvailable: () => true,
	encrypt: plain => Buffer.from(plain).toString('base64'),
	decrypt: encoded => Buffer.from(encoded, 'base64').toString()
};

let tmpDir: string;
let store: ConfigurationStore;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'robert-settings-window-'));
	store = new ConfigurationStore(path.join(tmpDir, 'settings.json'), SCHEMA, codec);
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('sanitizeSettingValues', () => {
	it('keeps explicit values equal to the manifest default (they must override env vars)', () => {
		expect(sanitizeSettingValues(store, { 'robert.provider': 'jira', 'robert.debugMode': false })).toEqual({ 'robert.provider': 'jira', 'robert.debugMode': false });
	});

	it('turns null into a reset and an empty string into "not configured"', () => {
		expect(sanitizeSettingValues(store, { 'robert.provider': null, 'robert.debugMode': null, 'robert.jiraBaseUrl': '  ' })).toEqual({
			'robert.provider': undefined,
			'robert.debugMode': undefined,
			'robert.jiraBaseUrl': undefined
		});
	});

	it('keeps a stored secret when submitted empty and clears it on reset', () => {
		expect(sanitizeSettingValues(store, { 'robert.jiraApiToken': '' })).toEqual({});
		expect(sanitizeSettingValues(store, { 'robert.jiraApiToken': null })).toEqual({ 'robert.jiraApiToken': undefined });
		expect(sanitizeSettingValues(store, { 'robert.jiraApiToken': 'abc' })).toEqual({ 'robert.jiraApiToken': 'abc' });
	});

	it('drops unknown keys and values outside an enum', () => {
		expect(sanitizeSettingValues(store, { 'robert.provider': 'github', 'robert.nope': 'x', 'other.key': 1 })).toEqual({});
	});
});

describe('buildSettingFields', () => {
	it('reports whether each setting is explicitly set, without exposing secrets', () => {
		store.update({ 'robert.provider': 'jira', 'robert.jiraApiToken': 'top-secret' });
		const fields = Object.fromEntries(buildSettingFields(store).map(field => [field.key, field]));

		expect(fields['robert.provider']).toMatchObject({ isSet: true, value: 'jira', defaultValue: 'jira' });
		expect(fields['robert.debugMode']).toMatchObject({ isSet: false, value: false, defaultValue: false });
		expect(fields['robert.jiraApiToken']).toMatchObject({ isSet: true, secret: true });
		expect(fields['robert.jiraApiToken'].value).toBeUndefined();
		expect(JSON.stringify(fields)).not.toContain('top-secret');
	});
});

describe('environment fallback', () => {
	it('maps every manifest setting to the env var name SettingsManager reads', () => {
		const schema = ConfigurationStore.readSchemaFromManifest(path.resolve(__dirname, '../../package.json'));
		const settingsManagerSource = fs.readFileSync(path.resolve(__dirname, '../SettingsManager.ts'), 'utf8');
		for (const key of Object.keys(schema)) {
			const envVar = envVarForSetting(key);
			expect(settingsManagerSource, `${key} -> ${envVar}`).toMatch(new RegExp(`\\b${envVar}\\b`));
		}
	});

	it('exposes env values for unset settings but never for secrets', () => {
		const fields = Object.fromEntries(buildSettingFields(store, { ROBERT_PROVIDER: 'rally', ROBERT_DEBUG_MODE: 'yes', ROBERT_JIRA_API_TOKEN: 'env-secret' }).map(field => [field.key, field]));
		expect(fields['robert.provider']).toMatchObject({ isSet: false, envVar: 'ROBERT_PROVIDER', envIsSet: true, envValue: 'rally' });
		expect(fields['robert.debugMode']).toMatchObject({ envIsSet: true, envValue: true });
		expect(fields['robert.jiraApiToken']).toMatchObject({ envVar: 'ROBERT_JIRA_API_TOKEN', envIsSet: true });
		expect(JSON.stringify(fields)).not.toContain('env-secret');
	});
});
