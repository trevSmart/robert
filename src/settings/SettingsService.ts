import * as path from 'node:path';
import * as vscode from 'vscode';
import { ErrorHandler } from '../ErrorHandler';
import { type CredentialKind, SettingsManager } from '../SettingsManager';
import { removeLegacyCredentialSetting } from './legacyCredentialMigration';
import type { CredentialFieldModel, SettingFieldModel, SettingsHostModel, SettingsScope, SettingsStateMessage, SettingValueSource } from './protocol';
import { envVarForSetting, groupForSetting, parseEnvValue, readSettingsSchema, SETTING_GROUPS, type SettingSchema, settingLabel } from './settingsSchema';

const SECTION = 'robert';

/** What differs between hosts for the settings dialog. The VS Code extension uses the defaults. */
export interface SettingsHostInfo {
	kind: 'vscode' | 'standalone';
	/** Where user settings are stored (standalone settings file), shown in the dialog. */
	userSettingsLocation?: string;
}

let hostInfo: SettingsHostInfo = { kind: 'vscode' };

/** Called by the standalone app at startup; the extension keeps the default. */
export function setSettingsHostInfo(info: SettingsHostInfo): void {
	hostInfo = info;
}

/** Settings that must be valid HTTPS URLs. */
const HTTPS_SETTINGS = new Set(['robert.jiraBaseUrl', 'robert.rallyInstance']);
/** Settings that must be valid URLs (any scheme). */
const URL_SETTINGS = new Set(['robert.collaboration.serverUrl']);

const CREDENTIALS: Array<{ kind: CredentialKind; label: string; group: string }> = [
	{ kind: 'jira', label: 'API Token', group: 'Jira Cloud' },
	{ kind: 'rally', label: 'API Key', group: 'Rally' }
];

const services = new Map<string, SettingsService>();

/**
 * Backend of the settings dialog, shared by both hosts. Reads the setting
 * definitions from package.json, describes every setting per scope for the
 * dialog, and writes single settings to the scope the user picked.
 *
 * Writes go through `vscode.workspace.getConfiguration().update()`, so in the
 * extension they land in the user or workspace settings.json exactly as if
 * edited in VS Code's Settings UI; in the standalone app the vscode shim stores
 * them in its own settings file.
 */
export class SettingsService {
	private readonly errorHandler = ErrorHandler.getInstance();

	constructor(
		private readonly schema: Record<string, SettingSchema>,
		private readonly env: NodeJS.ProcessEnv = process.env
	) {}

	/** One service per extension root, reading its package.json once. */
	public static forExtensionPath(extensionPath: string): SettingsService {
		let service = services.get(extensionPath);
		if (!service) {
			service = new SettingsService(readSettingsSchemaSafely(extensionPath));
			services.set(extensionPath, service);
		}
		return service;
	}

	public hasWorkspace(): boolean {
		return hostInfo.kind === 'vscode' && Boolean(vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.length);
	}

	public getHostModel(): SettingsHostModel {
		const hasWorkspace = this.hasWorkspace();
		return {
			kind: hostInfo.kind,
			hasWorkspace,
			workspaceName: hasWorkspace ? vscode.workspace.name : undefined,
			// Robert's settings usually depend on the project the workspace belongs to.
			defaultScope: hasWorkspace ? 'workspace' : 'user',
			canOpenNativeSettings: hostInfo.kind === 'vscode',
			userSettingsLocation: hostInfo.userSettingsLocation
		};
	}

	public buildState(): SettingsStateMessage {
		const config = vscode.workspace.getConfiguration(SECTION);
		const fields = Object.entries(this.schema)
			.filter(([key]) => key.startsWith(`${SECTION}.`))
			.sort(([a, sa], [b, sb]) => (sa.order ?? Number.MAX_SAFE_INTEGER) - (sb.order ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b))
			.map(([key, schema]) => this.buildField(config, key, schema));
		const settingsManager = SettingsManager.getInstance();
		const credentials: CredentialFieldModel[] = CREDENTIALS.map(({ kind, label, group }) => {
			const status = settingsManager.getCredentialStatus(kind);
			return {
				id: kind,
				label,
				group,
				connectionLabel: status.connectionLabel,
				connectionComplete: status.connectionComplete,
				incompleteReason: status.incompleteReason,
				stored: status.stored,
				source: status.source,
				envVar: status.envVar
			};
		});
		return {
			command: 'settingsState',
			host: this.getHostModel(),
			fields,
			credentials,
			groups: SETTING_GROUPS.map(group => group.title)
		};
	}

	/**
	 * Writes one setting to a scope. `null`/`undefined` (or an empty string)
	 * removes the value from that scope, so the next scope / env var / default applies.
	 * Throws an Error with a user-facing message when the value or scope is invalid.
	 */
	public async update(key: string, scope: SettingsScope, rawValue: unknown): Promise<void> {
		const schema = this.schema[key];
		if (!schema || !key.startsWith(`${SECTION}.`)) {
			throw new Error(`Unknown setting: ${key}`);
		}
		if (scope === 'workspace') {
			if (!this.hasWorkspace()) {
				throw new Error('Open a folder or workspace to change workspace settings.');
			}
			if (!this.settingScopes(schema).includes('workspace')) {
				throw new Error(`${settingLabel(key)} can only be set in User settings.`);
			}
		}
		const value = this.sanitize(key, schema, rawValue);
		const target = scope === 'workspace' ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
		await vscode.workspace.getConfiguration(SECTION).update(key.slice(SECTION.length + 1), value, target);
		this.errorHandler.logInfo(`${value === undefined ? 'Removed' : 'Updated'} ${key} in ${scope} settings`, 'SettingsService.update');
	}

	/** Stores the credential of the active connection in the OS keychain. */
	public async setCredential(kind: CredentialKind, value: string): Promise<void> {
		if (!value.trim()) {
			throw new Error('Enter a value to store.');
		}
		await SettingsManager.getInstance().setCredential(kind, value);
		// The keychain value now wins; drop any plain-text copy older versions left in settings.
		await removeLegacyCredentialSetting(kind);
	}

	/** Removes the credential of the active connection from the OS keychain (and any plain-text leftover). */
	public async clearCredential(kind: CredentialKind): Promise<void> {
		await SettingsManager.getInstance().setCredential(kind, '');
		await removeLegacyCredentialSetting(kind);
	}

	private settingScopes(schema: SettingSchema): SettingsScope[] {
		if (hostInfo.kind === 'standalone' || schema.scope === 'application' || schema.scope === 'machine') {
			return ['user'];
		}
		return ['user', 'workspace'];
	}

	private buildField(config: vscode.WorkspaceConfiguration, key: string, schema: SettingSchema): SettingFieldModel {
		const type = (['string', 'boolean', 'number', 'integer'].includes(schema.type ?? '') ? schema.type : 'string') as SettingFieldModel['type'];
		const inspected = config.inspect<unknown>(key.slice(SECTION.length + 1));
		const values = {
			user: inspected?.globalValue,
			workspace: inspected?.workspaceValue,
			workspaceFolder: inspected?.workspaceFolderValue
		};
		const envName = envVarForSetting(key);
		const rawEnv = this.env[envName];
		const envIsSet = rawEnv !== undefined && rawEnv.trim() !== '';
		const env = { name: envName, isSet: envIsSet, value: envIsSet ? parseEnvValue(type, rawEnv) : undefined };

		// Same precedence as SettingsManager: explicit (folder > workspace > user) > env var > default.
		// Empty strings count as "not set", as SettingsManager treats them.
		const isSet = (value: unknown) => value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
		const explicit: Array<[SettingValueSource, unknown]> = [
			['workspaceFolder', values.workspaceFolder],
			['workspace', values.workspace],
			['user', values.user]
		];
		const found = explicit.find(([, value]) => isSet(value));
		let effectiveSource: SettingValueSource;
		let effectiveValue: unknown;
		if (found) {
			[effectiveSource, effectiveValue] = found;
		} else if (env.isSet) {
			effectiveSource = 'env';
			effectiveValue = env.value;
		} else {
			effectiveSource = 'default';
			effectiveValue = schema.default;
		}

		return {
			key,
			label: settingLabel(key),
			description: schema.description ?? stripMarkdown(schema.markdownDescription ?? ''),
			type,
			enum: schema.enum,
			enumDescriptions: schema.enumDescriptions,
			minimum: schema.minimum,
			maximum: schema.maximum,
			defaultValue: schema.default,
			group: groupForSetting(key),
			scopes: this.settingScopes(schema),
			values,
			env,
			effectiveValue,
			effectiveSource
		};
	}

	private sanitize(key: string, schema: SettingSchema, raw: unknown): unknown {
		if (raw === null || raw === undefined) {
			return undefined;
		}
		const label = settingLabel(key);
		switch (schema.type) {
			case 'boolean':
				if (typeof raw !== 'boolean') {
					throw new Error(`${label} must be true or false.`);
				}
				return raw;
			case 'number':
			case 'integer': {
				const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
				if (String(raw).trim() === '') {
					return undefined;
				}
				if (!Number.isFinite(n) || (schema.type === 'integer' && !Number.isInteger(n))) {
					throw new Error(`${label} must be a${schema.type === 'integer' ? 'n integer' : ' number'}.`);
				}
				if ((schema.minimum !== undefined && n < schema.minimum) || (schema.maximum !== undefined && n > schema.maximum)) {
					throw new Error(`${label} must be between ${schema.minimum ?? '-∞'} and ${schema.maximum ?? '∞'}.`);
				}
				return n;
			}
			default: {
				if (typeof raw !== 'string') {
					throw new Error(`${label} must be text.`);
				}
				const value = raw.trim();
				if (value === '') {
					return undefined;
				}
				if (schema.enum && !schema.enum.includes(value)) {
					throw new Error(`${label} must be one of: ${schema.enum.join(', ')}.`);
				}
				if (HTTPS_SETTINGS.has(key) && !/^https:\/\/[^\s/]+/i.test(value)) {
					throw new Error(`${label} must be an HTTPS URL (https://…).`);
				}
				if (URL_SETTINGS.has(key)) {
					try {
						new URL(value);
					} catch {
						throw new Error(`${label} must be a valid URL.`);
					}
				}
				return value;
			}
		}
	}
}

/** Settings declared in the package.json at an extension root; empty (with a warning) if it cannot be read. */
export function readSettingsSchemaSafely(extensionPath: string): Record<string, SettingSchema> {
	try {
		return readSettingsSchema(path.join(extensionPath, 'package.json'));
	} catch (error) {
		ErrorHandler.getInstance().logWarning(`Could not read the settings schema: ${error instanceof Error ? error.message : String(error)}`, 'SettingsService');
		return {};
	}
}

/** Plain-text version of a markdownDescription for the dialog (links → their text, no emphasis marks). */
function stripMarkdown(markdown: string): string {
	return markdown
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/`#?([^`#]+)#?`/g, '$1')
		.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');
}
