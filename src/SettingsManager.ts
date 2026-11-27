import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';
import { CredentialStore, jiraCredentialKey, rallyCredentialKey } from './settings/CredentialStore';

export interface RobertSettings {
	autoRefresh: boolean;
	debugMode: boolean;
	provider: 'jira' | 'rally';
	rallyInstance: string;
	/** From the OS keychain (per Rally instance), else the ROBERT_RALLY_API_KEY env var. Not a VS Code setting. */
	rallyApiKey: string;
	rallyProjectName: string;
	jiraBaseUrl: string;
	jiraEmail: string;
	/** From the OS keychain (per Jira site + email), else the ROBERT_JIRA_API_TOKEN env var. Not a VS Code setting. */
	jiraApiToken: string;
	jiraProjectKey: string;
	/** Comma-separated Jira issue-type names treated as bugs/defects. Empty = auto-detect. */
	jiraBugIssueTypes: string;
	collaborationServerUrl: string;
	collaborationEnabled: boolean;
	collaborationAutoConnect: boolean;
	statusBarShowSprintDaysLeft: boolean;
	showWelcomeAnimation: boolean;
	/** Tab shown when the main view starts (see STARTUP_SECTIONS in the webview). */
	startupTab: string;
}

/**
 * Environment variable names for settings resolved by getSetting()'s generic
 * branch. Must match getSettings() and ENVIRONMENT_VARIABLES.md.
 */
const GENERIC_ENV_VARS: Partial<Record<keyof RobertSettings, string>> = {
	autoRefresh: 'ROBERT_AUTO_REFRESH',
	debugMode: 'ROBERT_DEBUG_MODE',
	statusBarShowSprintDaysLeft: 'ROBERT_STATUS_BAR_SPRINT_DAYS',
	showWelcomeAnimation: 'ROBERT_SHOW_WELCOME_ANIMATION',
	startupTab: 'ROBERT_STARTUP_TAB'
};

export type CredentialKind = 'jira' | 'rally';

/** How the credential of the active connection is resolved (the value itself is never exposed). */
export interface CredentialStatus {
	kind: CredentialKind;
	/** Secret storage key for the current connection, undefined while the connection is incomplete. */
	secretKey?: string;
	connectionLabel: string;
	connectionComplete: boolean;
	incompleteReason?: string;
	stored: boolean;
	source: 'keychain' | 'legacySetting' | 'env' | 'none';
	envVar: string;
}

/**
 * Settings that held API credentials in plain text before they moved to the OS
 * keychain. No longer declared in package.json; read only until migrated
 * (see settings/legacyCredentialMigration.ts).
 */
export const LEGACY_CREDENTIAL_SETTINGS: Record<CredentialKind, { key: 'jiraApiToken' | 'rallyApiKey'; envVar: string }> = {
	jira: { key: 'jiraApiToken', envVar: 'ROBERT_JIRA_API_TOKEN' },
	rally: { key: 'rallyApiKey', envVar: 'ROBERT_RALLY_API_KEY' }
};

export class SettingsManager {
	private static instance: SettingsManager;
	private _errorHandler: ErrorHandler;

	private constructor() {
		this._errorHandler = ErrorHandler.getInstance();
	}

	public static getInstance(): SettingsManager {
		if (!SettingsManager.instance) {
			SettingsManager.instance = new SettingsManager();
		}
		return SettingsManager.instance;
	}

	/**
	 * Get all settings with their current values
	 * Priority: VS Code Settings > Environment Variables > Defaults
	 */
	public getSettings(): RobertSettings {
		return (
			this._errorHandler.executeWithErrorHandlingSync(() => {
				const config = vscode.workspace.getConfiguration('robert');

				const settings: RobertSettings = {
					autoRefresh: this.resolveBooleanSettingWithFallback('autoRefresh', this.readExplicit<boolean>(config, 'autoRefresh'), 'ROBERT_AUTO_REFRESH', true),
					debugMode: this.resolveBooleanSettingWithFallback('debugMode', this.readExplicit<boolean>(config, 'debugMode'), 'ROBERT_DEBUG_MODE', false),
					provider: this.resolveProvider(this.readExplicit<string>(config, 'provider') ?? ''),
					rallyInstance: this.resolveSettingWithFallback('rallyInstance', this.readExplicit<string>(config, 'rallyInstance') ?? '', 'ROBERT_RALLY_INSTANCE', 'https://eu1.rallydev.com'),
					rallyApiKey: this.resolveCredential('rally'),
					rallyProjectName: this.resolveSettingWithFallback('rallyProjectName', this.readExplicit<string>(config, 'rallyProjectName') ?? '', 'ROBERT_RALLY_PROJECT_NAME', ''),
					jiraBaseUrl: this.resolveSettingWithFallback('jiraBaseUrl', this.readExplicit<string>(config, 'jiraBaseUrl') ?? '', 'ROBERT_JIRA_BASE_URL', 'https://jiracloudab.atlassian.net'),
					jiraEmail: this.resolveSettingWithFallback('jiraEmail', this.readExplicit<string>(config, 'jiraEmail') ?? '', 'ROBERT_JIRA_EMAIL', ''),
					jiraApiToken: this.resolveCredential('jira'),
					jiraProjectKey: this.resolveSettingWithFallback('jiraProjectKey', this.readExplicit<string>(config, 'jiraProjectKey') ?? '', 'ROBERT_JIRA_PROJECT_KEY', ''),
					jiraBugIssueTypes: this.resolveSettingWithFallback('jiraBugIssueTypes', this.readExplicit<string>(config, 'jiraBugIssueTypes') ?? '', 'ROBERT_JIRA_BUG_ISSUE_TYPES', ''),
					collaborationServerUrl: this.resolveSettingWithFallback('collaboration.serverUrl', this.readExplicit<string>(config, 'collaboration.serverUrl') ?? '', 'ROBERT_COLLABORATION_SERVER_URL', 'https://robert-8vdt.onrender.com'),
					collaborationEnabled: this.resolveBooleanSettingWithFallback('collaboration.enabled', this.readExplicit<boolean>(config, 'collaboration.enabled'), 'ROBERT_COLLABORATION_ENABLED', false),
					collaborationAutoConnect: this.resolveBooleanSettingWithFallback('collaboration.autoConnect', this.readExplicit<boolean>(config, 'collaboration.autoConnect'), 'ROBERT_COLLABORATION_AUTO_CONNECT', true),
					statusBarShowSprintDaysLeft: this.resolveBooleanSettingWithFallback('statusBarShowSprintDaysLeft', this.readExplicit<boolean>(config, 'statusBarShowSprintDaysLeft'), 'ROBERT_STATUS_BAR_SPRINT_DAYS', true),
					showWelcomeAnimation: this.resolveBooleanSettingWithFallback('showWelcomeAnimation', this.readExplicit<boolean>(config, 'showWelcomeAnimation'), 'ROBERT_SHOW_WELCOME_ANIMATION', true),
					startupTab: this.resolveSettingWithFallback('startupTab', this.readExplicit<string>(config, 'startupTab') ?? '', 'ROBERT_STARTUP_TAB', 'home')
				};

				return settings;
			}, 'SettingsManager.getSettings') || this.getDefaultSettings()
		);
	}

	/**
	 * Save settings to VS Code configuration
	 */
	public async saveSettings(settings: Partial<RobertSettings>): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			const config = vscode.workspace.getConfiguration('robert');

			if (settings.autoRefresh !== undefined) {
				await config.update('autoRefresh', settings.autoRefresh, vscode.ConfigurationTarget.Global);
			}
			if (settings.debugMode !== undefined) {
				await config.update('debugMode', settings.debugMode, vscode.ConfigurationTarget.Global);
			}
			for (const key of ['provider', 'rallyInstance', 'rallyProjectName'] as const) {
				if (settings[key] !== undefined) {
					await config.update(key, settings[key], vscode.ConfigurationTarget.Global);
				}
			}
			if (settings.jiraBaseUrl !== undefined) {
				await config.update('jiraBaseUrl', settings.jiraBaseUrl, vscode.ConfigurationTarget.Global);
			}
			if (settings.jiraEmail !== undefined) {
				await config.update('jiraEmail', settings.jiraEmail, vscode.ConfigurationTarget.Global);
			}
			if (settings.jiraProjectKey !== undefined) {
				await config.update('jiraProjectKey', settings.jiraProjectKey, vscode.ConfigurationTarget.Global);
			}
			if (settings.jiraBugIssueTypes !== undefined) {
				await config.update('jiraBugIssueTypes', settings.jiraBugIssueTypes, vscode.ConfigurationTarget.Global);
			}
			if (settings.collaborationServerUrl !== undefined) {
				await config.update('collaboration.serverUrl', settings.collaborationServerUrl, vscode.ConfigurationTarget.Global);
			}
			if (settings.collaborationEnabled !== undefined) {
				await config.update('collaboration.enabled', settings.collaborationEnabled, vscode.ConfigurationTarget.Global);
			}
			if (settings.collaborationAutoConnect !== undefined) {
				await config.update('collaboration.autoConnect', settings.collaborationAutoConnect, vscode.ConfigurationTarget.Global);
			}
			if (settings.statusBarShowSprintDaysLeft !== undefined) {
				await config.update('statusBarShowSprintDaysLeft', settings.statusBarShowSprintDaysLeft, vscode.ConfigurationTarget.Global);
			}
			if (settings.showWelcomeAnimation !== undefined) {
				await config.update('showWelcomeAnimation', settings.showWelcomeAnimation, vscode.ConfigurationTarget.Global);
			}
			if (settings.startupTab !== undefined) {
				await config.update('startupTab', settings.startupTab, vscode.ConfigurationTarget.Global);
			}

			// Credentials go to the keychain, for the connection configured above.
			if (settings.jiraApiToken !== undefined) {
				await this.setCredential('jira', settings.jiraApiToken);
			}
			if (settings.rallyApiKey !== undefined) {
				await this.setCredential('rally', settings.rallyApiKey);
			}

			this._errorHandler.logInfo('Settings saved to VS Code configuration', 'SettingsManager.saveSettings');
		}, 'SettingsManager.saveSettings');
	}

	/**
	 * Reset settings to default values
	 */
	public async resetSettings(): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			const config = vscode.workspace.getConfiguration('robert');
			const defaultSettings = this.getDefaultSettings();

			await config.update('autoRefresh', defaultSettings.autoRefresh, vscode.ConfigurationTarget.Global);
			await config.update('debugMode', defaultSettings.debugMode, vscode.ConfigurationTarget.Global);
			// Forget the credentials of the current connections before the connection settings change.
			await this.setCredential('jira', '');
			await this.setCredential('rally', '');
			for (const key of ['provider', 'rallyInstance', 'rallyProjectName'] as const) {
				await config.update(key, defaultSettings[key], vscode.ConfigurationTarget.Global);
			}
			await config.update('jiraBaseUrl', defaultSettings.jiraBaseUrl, vscode.ConfigurationTarget.Global);
			await config.update('jiraEmail', defaultSettings.jiraEmail, vscode.ConfigurationTarget.Global);
			await config.update('jiraProjectKey', defaultSettings.jiraProjectKey, vscode.ConfigurationTarget.Global);
			await config.update('jiraBugIssueTypes', defaultSettings.jiraBugIssueTypes, vscode.ConfigurationTarget.Global);
			await config.update('collaboration.serverUrl', defaultSettings.collaborationServerUrl, vscode.ConfigurationTarget.Global);
			await config.update('collaboration.enabled', defaultSettings.collaborationEnabled, vscode.ConfigurationTarget.Global);
			await config.update('collaboration.autoConnect', defaultSettings.collaborationAutoConnect, vscode.ConfigurationTarget.Global);
			await config.update('statusBarShowSprintDaysLeft', defaultSettings.statusBarShowSprintDaysLeft, vscode.ConfigurationTarget.Global);
			await config.update('showWelcomeAnimation', defaultSettings.showWelcomeAnimation, vscode.ConfigurationTarget.Global);
			await config.update('startupTab', defaultSettings.startupTab, vscode.ConfigurationTarget.Global);
			this._errorHandler.logInfo('Settings reset to default values', 'SettingsManager.resetSettings');
		}, 'SettingsManager.resetSettings');
	}

	/**
	 * Get a specific setting value
	 * Priority: VS Code Settings > Environment Variables > Defaults
	 */
	public getSetting<K extends keyof RobertSettings>(key: K): RobertSettings[K] {
		return (
			this._errorHandler.executeWithErrorHandlingSync(() => {
				const config = vscode.workspace.getConfiguration('robert');
				const defaultValue = this.getDefaultSettings()[key];

				if (key === 'collaborationServerUrl') {
					const vscodeVal = this.readExplicit<string>(config, 'collaboration.serverUrl') ?? '';
					return this.resolveSettingWithFallback('collaboration.serverUrl', vscodeVal, 'ROBERT_COLLABORATION_SERVER_URL', defaultValue as string) as RobertSettings[K];
				}
				if (key === 'collaborationEnabled') {
					const vscodeVal = this.readExplicit<boolean>(config, 'collaboration.enabled');
					return this.resolveBooleanSettingWithFallback('collaboration.enabled', vscodeVal, 'ROBERT_COLLABORATION_ENABLED', defaultValue as boolean) as RobertSettings[K];
				}
				if (key === 'collaborationAutoConnect') {
					const vscodeVal = this.readExplicit<boolean>(config, 'collaboration.autoConnect');
					return this.resolveBooleanSettingWithFallback('collaboration.autoConnect', vscodeVal, 'ROBERT_COLLABORATION_AUTO_CONNECT', defaultValue as boolean) as RobertSettings[K];
				}

				if (key === 'provider') {
					return this.resolveProvider(this.readExplicit<string>(config, 'provider') ?? '') as RobertSettings[K];
				}
				if (key === 'jiraApiToken') {
					return this.resolveCredential('jira') as RobertSettings[K];
				}
				if (key === 'rallyApiKey') {
					return this.resolveCredential('rally') as RobertSettings[K];
				}
				const rallyEnv: Record<string, string> = {
					rallyInstance: 'ROBERT_RALLY_INSTANCE',
					rallyProjectName: 'ROBERT_RALLY_PROJECT_NAME'
				};
				if (key in rallyEnv) {
					const vscodeVal = this.readExplicit<string>(config, key) ?? '';
					return this.resolveSettingWithFallback(key, vscodeVal, rallyEnv[key], defaultValue as string) as RobertSettings[K];
				}
				if (key === 'jiraBaseUrl') {
					const vscodeVal = this.readExplicit<string>(config, key) ?? '';
					return this.resolveSettingWithFallback(key, vscodeVal, 'ROBERT_JIRA_BASE_URL', defaultValue as string) as RobertSettings[K];
				}
				if (key === 'jiraEmail') {
					const vscodeVal = this.readExplicit<string>(config, key) ?? '';
					return this.resolveSettingWithFallback(key, vscodeVal, 'ROBERT_JIRA_EMAIL', defaultValue as string) as RobertSettings[K];
				}
				if (key === 'jiraProjectKey') {
					const vscodeVal = this.readExplicit<string>(config, key) ?? '';
					return this.resolveSettingWithFallback(key, vscodeVal, 'ROBERT_JIRA_PROJECT_KEY', defaultValue as string) as RobertSettings[K];
				}
				if (key === 'jiraBugIssueTypes') {
					const vscodeVal = this.readExplicit<string>(config, key) ?? '';
					return this.resolveSettingWithFallback(key, vscodeVal, 'ROBERT_JIRA_BUG_ISSUE_TYPES', defaultValue as string) as RobertSettings[K];
				}

				if (typeof defaultValue === 'boolean') {
					const vscodeVal = this.readExplicit<boolean>(config, key);
					const envVarName = GENERIC_ENV_VARS[key] ?? `ROBERT_${key.toUpperCase()}`;
					return this.resolveBooleanSettingWithFallback(key, vscodeVal, envVarName, defaultValue as boolean) as RobertSettings[K];
				}

				const vscodeVal = this.readExplicit<string>(config, key) ?? '';
				const envVarName = GENERIC_ENV_VARS[key] ?? `ROBERT_${key.toUpperCase()}`;
				return this.resolveSettingWithFallback(key, vscodeVal, envVarName, defaultValue as string) as RobertSettings[K];
			}, `SettingsManager.getSetting.${key}`) ?? this.getDefaultSettings()[key]
		);
	}

	/**
	 * Update a specific setting value
	 */
	public async updateSetting<K extends keyof RobertSettings>(key: K, value: RobertSettings[K]): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			const config = vscode.workspace.getConfiguration('robert');

			if (key === 'jiraApiToken' || key === 'rallyApiKey') {
				await this.setCredential(key === 'jiraApiToken' ? 'jira' : 'rally', String(value ?? ''));
				this._errorHandler.logInfo(`Credential ${key} updated`, 'SettingsManager.updateSetting');
				return;
			}

			// Handle nested settings
			if (key === 'collaborationServerUrl') {
				await config.update('collaboration.serverUrl', value, vscode.ConfigurationTarget.Global);
			} else if (key === 'collaborationEnabled') {
				await config.update('collaboration.enabled', value, vscode.ConfigurationTarget.Global);
			} else if (key === 'collaborationAutoConnect') {
				await config.update('collaboration.autoConnect', value, vscode.ConfigurationTarget.Global);
			} else {
				await config.update(key as string, value, vscode.ConfigurationTarget.Global);
			}

			this._errorHandler.logInfo(`Setting ${key} updated to ${value}`, 'SettingsManager.updateSetting');
		}, `SettingsManager.updateSetting.${key}`);
	}

	/**
	 * Describes the credential of the active connection for a provider: which
	 * secret key it lives under and where the value in use comes from.
	 */
	public getCredentialStatus(kind: CredentialKind): CredentialStatus {
		const { envVar } = LEGACY_CREDENTIAL_SETTINGS[kind];
		const store = CredentialStore.getInstance();
		let secretKey: string | undefined;
		let connectionLabel: string;
		let incompleteReason: string | undefined;
		if (kind === 'jira') {
			const baseUrl = this.getSetting('jiraBaseUrl').trim();
			const email = this.getSetting('jiraEmail').trim();
			connectionLabel = email ? `${baseUrl} · ${email}` : baseUrl;
			if (!baseUrl) incompleteReason = 'Set the Jira base URL first.';
			else if (!email) incompleteReason = 'Set the Jira email first: the token is stored for each site and account.';
			else secretKey = jiraCredentialKey(baseUrl, email);
		} else {
			const instance = this.getSetting('rallyInstance').trim();
			connectionLabel = instance;
			if (!instance) incompleteReason = 'Set the Rally instance URL first.';
			else secretKey = rallyCredentialKey(instance);
		}

		const stored = secretKey !== undefined && Boolean(store.get(secretKey));
		let source: CredentialStatus['source'] = 'none';
		if (stored) {
			source = 'keychain';
		} else if (this.readLegacyCredential(kind)) {
			source = 'legacySetting';
		} else if (process.env[envVar]?.trim()) {
			source = 'env';
		}
		return { kind, secretKey, connectionLabel, connectionComplete: secretKey !== undefined, incompleteReason, stored, source, envVar };
	}

	/**
	 * Stores (or, with an empty value, deletes) the credential of the active
	 * connection in the OS keychain.
	 */
	public async setCredential(kind: CredentialKind, value: string): Promise<void> {
		const status = this.getCredentialStatus(kind);
		const trimmed = value.trim();
		if (!status.secretKey) {
			if (trimmed) {
				throw new Error(status.incompleteReason ?? 'The connection is not configured yet.');
			}
			return;
		}
		const store = CredentialStore.getInstance();
		if (trimmed) {
			await store.set(status.secretKey, trimmed);
			this._errorHandler.logInfo(`${kind === 'jira' ? 'Jira API token' : 'Rally API key'} stored in the OS keychain for ${status.connectionLabel}`, 'SettingsManager.setCredential');
		} else if (store.has(status.secretKey)) {
			await store.delete(status.secretKey);
			this._errorHandler.logInfo(`${kind === 'jira' ? 'Jira API token' : 'Rally API key'} removed from the OS keychain for ${status.connectionLabel}`, 'SettingsManager.setCredential');
		}
	}

	/**
	 * Credential for the active connection. Priority: OS keychain > legacy plain-text
	 * setting (until migrated) > ROBERT_* environment variable.
	 */
	private resolveCredential(kind: CredentialKind): string {
		const { key, envVar } = LEGACY_CREDENTIAL_SETTINGS[kind];
		const { secretKey } = this.getCredentialStatus(kind);
		const stored = secretKey ? CredentialStore.getInstance().get(secretKey) : undefined;
		if (stored) {
			return stored;
		}
		return this.resolveSettingWithFallback(key, this.readLegacyCredential(kind), envVar, '');
	}

	/** Plain-text credential left in settings by older versions (any scope), or ''. */
	private readLegacyCredential(kind: CredentialKind): string {
		const config = vscode.workspace.getConfiguration('robert');
		const value = this.readExplicit<unknown>(config, LEGACY_CREDENTIAL_SETTINGS[kind].key);
		return typeof value === 'string' ? value.trim() : '';
	}

	/**
	 * Value the user explicitly configured (user, workspace or folder scope),
	 * ignoring the manifest default. `config.get()` returns the package.json
	 * default for unset keys, which would hide ROBERT_* environment variables
	 * and break the documented precedence: settings > environment > defaults.
	 * Falls back to `get()` when `inspect()` is unavailable (e.g. test doubles).
	 */
	private readExplicit<T>(config: vscode.WorkspaceConfiguration, key: string): T | undefined {
		const inspected = typeof config.inspect === 'function' ? config.inspect<T>(key) : undefined;
		if (!inspected) {
			return config.get<T>(key);
		}
		return inspected.workspaceFolderValue ?? inspected.workspaceValue ?? inspected.globalValue;
	}

	/**
	 * Get default settings
	 */
	private getDefaultSettings(): RobertSettings {
		return {
			autoRefresh: true,
			debugMode: false,
			provider: 'jira',
			rallyInstance: 'https://eu1.rallydev.com',
			rallyApiKey: '',
			rallyProjectName: '',
			jiraBaseUrl: 'https://jiracloudab.atlassian.net',
			jiraEmail: '',
			jiraApiToken: '',
			jiraProjectKey: '',
			jiraBugIssueTypes: '',
			collaborationServerUrl: 'https://robert-8vdt.onrender.com',
			collaborationEnabled: false,
			collaborationAutoConnect: true,
			statusBarShowSprintDaysLeft: true,
			showWelcomeAnimation: true,
			startupTab: 'home'
		};
	}

	/**
	 * Resolve the active data provider: VS Code setting > ROBERT_PROVIDER env var > "jira"
	 */
	private resolveProvider(vscodeValue: string | undefined): 'jira' | 'rally' {
		const raw = (vscodeValue && vscodeValue.trim() !== '' ? vscodeValue : process.env.ROBERT_PROVIDER || '').trim().toLowerCase();
		return raw === 'rally' ? 'rally' : 'jira';
	}

	/**
	 * Resolve string setting with priority: VS Code setting > Environment variable > Default
	 * @param settingKey - The configuration key
	 * @param vscodeValue - Value from VS Code config
	 * @param envVarName - Environment variable name to check
	 * @param defaultValue - Fallback default value
	 */
	private resolveSettingWithFallback(settingKey: string, vscodeValue: string, envVarName: string, defaultValue: string): string {
		let resolved = defaultValue;

		if (vscodeValue && vscodeValue.trim() !== '') {
			resolved = vscodeValue;
		} else {
			const envValue = process.env[envVarName];
			if (envValue && envValue.trim() !== '') {
				this._errorHandler.logDebug(`Setting '${settingKey}' loaded from environment variable '${envVarName}'`, 'SettingsManager.resolveSettingWithFallback');
				resolved = envValue;
			}
		}

		if (settingKey === 'rallyInstance') {
			return resolved.trim().replace(/\/+$/, '');
		}

		return resolved;
	}

	/**
	 * Resolve boolean setting with priority: VS Code setting > Environment variable > Default
	 * @param settingKey - The configuration key
	 * @param vscodeValue - Value from VS Code config (can be undefined)
	 * @param envVarName - Environment variable name to check
	 * @param defaultValue - Fallback default value
	 */
	private resolveBooleanSettingWithFallback(settingKey: string, vscodeValue: boolean | undefined, envVarName: string, defaultValue: boolean): boolean {
		// Priority 1: VS Code setting (if explicitly set)
		if (vscodeValue !== undefined) {
			return vscodeValue;
		}

		// Priority 2: Environment variable
		const envValue = process.env[envVarName];
		if (envValue !== undefined) {
			const boolValue = envValue.toLowerCase() === 'true' || envValue === '1' || envValue.toLowerCase() === 'yes';
			this._errorHandler.logDebug(`Setting '${settingKey}' loaded from environment variable '${envVarName}' (value: ${boolValue})`, 'SettingsManager.resolveBooleanSettingWithFallback');
			return boolValue;
		}

		// Priority 3: Default value
		return defaultValue;
	}

	/**
	 * Validate settings values
	 */
	public validateSettings(settings: Partial<RobertSettings>): {
		isValid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		if (settings.jiraBaseUrl !== undefined && !settings.jiraBaseUrl.startsWith('https://')) {
			errors.push('Jira base URL must be a valid HTTPS URL');
		}

		if (settings.jiraEmail !== undefined && settings.jiraEmail.trim() === '') {
			errors.push('Jira email cannot be empty');
		}

		if (settings.jiraApiToken !== undefined && settings.jiraApiToken.trim() === '') {
			errors.push('Jira API token cannot be empty');
		}

		if (settings.provider !== undefined && settings.provider !== 'jira' && settings.provider !== 'rally') {
			errors.push('Provider must be "jira" or "rally"');
		}

		if (settings.rallyInstance !== undefined && !settings.rallyInstance.startsWith('https://')) {
			errors.push('Rally instance must be a valid HTTPS URL');
		}

		if (settings.rallyApiKey !== undefined && settings.rallyApiKey.trim() === '') {
			errors.push('Rally API key cannot be empty');
		}

		// One or more comma-separated project names (see libs/provider/projectScope.ts).
		if (settings.rallyProjectName !== undefined && settings.rallyProjectName.split(',').every(name => name.trim() === '')) {
			errors.push('Rally project name cannot be empty');
		}

		if (settings.collaborationServerUrl !== undefined) {
			try {
				new URL(settings.collaborationServerUrl);
			} catch {
				errors.push('Collaboration server URL must be a valid URL');
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}
}
