import * as vscode from 'vscode';
import { ErrorHandler } from '../ErrorHandler';
import { type CredentialKind, LEGACY_CREDENTIAL_SETTINGS } from '../SettingsManager';
import { CredentialStore, jiraCredentialKey, rallyCredentialKey } from './CredentialStore';

/**
 * Older versions kept `robert.jiraApiToken` / `robert.rallyApiKey` in settings
 * (plain text in VS Code's settings.json; encrypted in the standalone settings
 * file). This one-time migration moves each value found to the OS keychain,
 * under the connection configured at the same scope, and removes the setting.
 */

const SECTION = 'robert';

type Level = 'workspace' | 'user';

interface InspectedValues {
	defaultValue?: unknown;
	globalValue?: unknown;
	workspaceValue?: unknown;
}

const isSet = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** Value of a connection setting as seen from one scope: that scope, then lower ones, then env var, then default. */
function valueAtLevel(config: vscode.WorkspaceConfiguration, key: string, envVar: string, level: Level): string {
	const inspected = (config.inspect<unknown>(key) ?? {}) as InspectedValues;
	const candidates = level === 'workspace' ? [inspected.workspaceValue, inspected.globalValue] : [inspected.globalValue];
	const explicit = candidates.find(isSet);
	if (explicit) {
		return explicit.trim();
	}
	const env = process.env[envVar];
	if (isSet(env)) {
		return env.trim();
	}
	return isSet(inspected.defaultValue) ? inspected.defaultValue.trim() : '';
}

function credentialKeyAtLevel(config: vscode.WorkspaceConfiguration, kind: CredentialKind, level: Level): string | undefined {
	if (kind === 'jira') {
		const baseUrl = valueAtLevel(config, 'jiraBaseUrl', 'ROBERT_JIRA_BASE_URL', level);
		const email = valueAtLevel(config, 'jiraEmail', 'ROBERT_JIRA_EMAIL', level);
		return baseUrl && email ? jiraCredentialKey(baseUrl, email) : undefined;
	}
	const instance = valueAtLevel(config, 'rallyInstance', 'ROBERT_RALLY_INSTANCE', level);
	return instance ? rallyCredentialKey(instance) : undefined;
}

function targetFor(level: Level): vscode.ConfigurationTarget {
	return level === 'workspace' ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
}

/** Removes the legacy plain-text credential setting from one scope. Returns false (and warns) when VS Code refuses. */
async function removeAtLevel(config: vscode.WorkspaceConfiguration, kind: CredentialKind, level: Level): Promise<boolean> {
	const key = LEGACY_CREDENTIAL_SETTINGS[kind].key;
	try {
		await config.update(key, undefined, targetFor(level));
		return true;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		ErrorHandler.getInstance().logWarning(`Could not remove ${SECTION}.${key} from ${level} settings: ${message}`, 'legacyCredentialMigration');
		void vscode.window.showWarningMessage(`Robert: remove "${SECTION}.${key}" from your ${level} settings.json by hand. The credential is now stored in the OS keychain and the plain-text copy is no longer needed.`);
		return false;
	}
}

/** Drops the plain-text copy of a credential from every scope (after the user stored a new one in the keychain). */
export async function removeLegacyCredentialSetting(kind: CredentialKind): Promise<void> {
	const config = vscode.workspace.getConfiguration(SECTION);
	const inspected = (config.inspect<unknown>(LEGACY_CREDENTIAL_SETTINGS[kind].key) ?? {}) as InspectedValues;
	if (inspected.workspaceValue !== undefined) {
		await removeAtLevel(config, kind, 'workspace');
	}
	if (inspected.globalValue !== undefined) {
		await removeAtLevel(config, kind, 'user');
	}
}

/**
 * Moves plain-text credentials left by older versions to the OS keychain.
 * Safe to run on every start: it does nothing once the settings are gone.
 * A value whose connection is incomplete at its scope (e.g. no Jira email) is
 * kept, and SettingsManager keeps using it as a fallback, until the user stores
 * a credential from the settings dialog.
 */
export async function migrateLegacyCredentials(): Promise<void> {
	const errorHandler = ErrorHandler.getInstance();
	const store = CredentialStore.getInstance();
	if (!store.isAvailable()) {
		return;
	}
	const config = vscode.workspace.getConfiguration(SECTION);
	for (const kind of Object.keys(LEGACY_CREDENTIAL_SETTINGS) as CredentialKind[]) {
		const key = LEGACY_CREDENTIAL_SETTINGS[kind].key;
		const inspected = (config.inspect<unknown>(key) ?? {}) as InspectedValues;
		const levels: Array<[Level, unknown]> = [
			['workspace', inspected.workspaceValue],
			['user', inspected.globalValue]
		];
		for (const [level, value] of levels) {
			if (value === undefined) {
				continue;
			}
			if (!isSet(value)) {
				// Empty leftover: nothing to keep.
				await removeAtLevel(config, kind, level);
				continue;
			}
			const secretKey = credentialKeyAtLevel(config, kind, level);
			if (!secretKey) {
				errorHandler.logWarning(`Kept ${SECTION}.${key} in ${level} settings: its connection is incomplete, so it cannot be moved to the OS keychain yet. Store the credential from Robert's settings to replace it.`, 'legacyCredentialMigration');
				continue;
			}
			try {
				if (!store.has(secretKey)) {
					await store.set(secretKey, value.trim());
				}
			} catch (error) {
				errorHandler.logWarning(`Could not move ${SECTION}.${key} to the OS keychain: ${error instanceof Error ? error.message : String(error)}. It stays in ${level} settings for now.`, 'legacyCredentialMigration');
				continue;
			}
			if (await removeAtLevel(config, kind, level)) {
				errorHandler.logInfo(`Moved ${SECTION}.${key} from ${level} settings to the OS keychain`, 'legacyCredentialMigration');
			}
		}
	}
}
