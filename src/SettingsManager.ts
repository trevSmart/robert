import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';

export interface RobertSettings {
	autoRefresh: boolean;
	debugMode: boolean;
	provider: 'jira' | 'rally';
	rallyInstance: string;
	rallyApiKey: string;
	rallyProjectName: string;
	jiraBaseUrl: string;
	jiraEmail: string;
	jiraApiToken: string;
	jiraProjectKey: string;
	collaborationServerUrl: string;
	collaborationEnabled: boolean;
	collaborationAutoConnect: boolean;
	statusBarShowSprintDaysLeft: boolean;
	showWelcomeAnimation: boolean;
}

/**
 * Environment variable names for settings resolved by getSetting()'s generic
 * branch. Must match getSettings() and ENVIRONMENT_VARIABLES.md.
 */
const GENERIC_ENV_VARS: Partial<Record<keyof RobertSettings, string>> = {
	autoRefresh: 'ROBERT_AUTO_REFRESH',
	debugMode: 'ROBERT_DEBUG_MODE',
	statusBarShowSprintDaysLeft: 'ROBERT_STATUS_BAR_SPRINT_DAYS',
	showWelcomeAnimation: 'ROBERT_SHOW_WELCOME_ANIMATION'
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
					rallyApiKey: this.resolveSettingWithFallback('rallyApiKey', this.readExplicit<string>(config, 'rallyApiKey') ?? '', 'ROBERT_RALLY_API_KEY', ''),
					rallyProjectName: this.resolveSettingWithFallback('rallyProjectName', this.readExplicit<string>(config, 'rallyProjectName') ?? '', 'ROBERT_RALLY_PROJECT_NAME', ''),
					jiraBaseUrl: this.resolveSettingWithFallback('jiraBaseUrl', this.readExplicit<string>(config, 'jiraBaseUrl') ?? '', 'ROBERT_JIRA_BASE_URL', 'https://jiracloudab.atlassian.net'),
					jiraEmail: this.resolveSettingWithFallback('jiraEmail', this.readExplicit<string>(config, 'jiraEmail') ?? '', 'ROBERT_JIRA_EMAIL', ''),
					jiraApiToken: this.resolveSettingWithFallback('jiraApiToken', this.readExplicit<string>(config, 'jiraApiToken') ?? '', 'ROBERT_JIRA_API_TOKEN', ''),
					jiraProjectKey: this.resolveSettingWithFallback('jiraProjectKey', this.readExplicit<string>(config, 'jiraProjectKey') ?? '', 'ROBERT_JIRA_PROJECT_KEY', ''),
					collaborationServerUrl: this.resolveSettingWithFallback('collaboration.serverUrl', this.readExplicit<string>(config, 'collaboration.serverUrl') ?? '', 'ROBERT_COLLABORATION_SERVER_URL', 'https://robert-8vdt.onrender.com'),
					collaborationEnabled: this.resolveBooleanSettingWithFallback('collaboration.enabled', this.readExplicit<boolean>(config, 'collaboration.enabled'), 'ROBERT_COLLABORATION_ENABLED', false),
					collaborationAutoConnect: this.resolveBooleanSettingWithFallback('collaboration.autoConnect', this.readExplicit<boolean>(config, 'collaboration.autoConnect'), 'ROBERT_COLLABORATION_AUTO_CONNECT', true),
					statusBarShowSprintDaysLeft: this.resolveBooleanSettingWithFallback('statusBarShowSprintDaysLeft', this.readExplicit<boolean>(config, 'statusBarShowSprintDaysLeft'), 'ROBERT_STATUS_BAR_SPRINT_DAYS', true),
					showWelcomeAnimation: this.resolveBooleanSettingWithFallback('showWelcomeAnimation', this.readExplicit<boolean>(config, 'showWelcomeAnimation'), 'ROBERT_SHOW_WELCOME_ANIMATION', true)
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
			for (const key of ['provider', 'rallyInstance', 'rallyApiKey', 'rallyProjectName'] as const) {
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
			if (settings.jiraApiToken !== undefined) {
				await config.update('jiraApiToken', settings.jiraApiToken, vscode.ConfigurationTarget.Global);
			}
			if (settings.jiraProjectKey !== undefined) {
				await config.update('jiraProjectKey', settings.jiraProjectKey, vscode.ConfigurationTarget.Global);
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
			for (const key of ['provider', 'rallyInstance', 'rallyApiKey', 'rallyProjectName'] as const) {
				await config.update(key, defaultSettings[key], vscode.ConfigurationTarget.Global);
			}
			await config.update('jiraBaseUrl', defaultSettings.jiraBaseUrl, vscode.ConfigurationTarget.Global);
			await config.update('jiraEmail', defaultSettings.jiraEmail, vscode.ConfigurationTarget.Global);
			await config.update('jiraApiToken', defaultSettings.jiraApiToken, vscode.ConfigurationTarget.Global);
			await config.update('jiraProjectKey', defaultSettings.jiraProjectKey, vscode.ConfigurationTarget.Global);
			await config.update('collaboration.serverUrl', defaultSettings.collaborationServerUrl, vscode.ConfigurationTarget.Global);
			await config.update('collaboration.enabled', defaultSettings.collaborationEnabled, vscode.ConfigurationTarget.Global);
			await config.update('collaboration.autoConnect', defaultSettings.collaborationAutoConnect, vscode.ConfigurationTarget.Global);
			await config.update('statusBarShowSprintDaysLeft', defaultSettings.statusBarShowSprintDaysLeft, vscode.ConfigurationTarget.Global);
			await config.update('showWelcomeAnimation', defaultSettings.showWelcomeAnimation, vscode.ConfigurationTarget.Global);
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
				const rallyEnv: Record<string, string> = {
					rallyInstance: 'ROBERT_RALLY_INSTANCE',
					rallyApiKey: 'ROBERT_RALLY_API_KEY',
					rallyProjectName: 'ROBERT_RALLY_PROJECT_NAME'
				};
				if (key in rallyEnv) {
					const vscodeVal = this.readExplicit<string>(config, key) ?? '';
					return this.resolveSettingWithFallback(key, vscodeVal, rallyEnv[key], defaultValue as string) as RobertSettings[K];
				}

				if (key === 'jiraApiToken') {
					const vscodeVal = this.readExplicit<string>(config, key) ?? '';
					return this.resolveSettingWithFallback(key, vscodeVal, 'ROBERT_JIRA_API_TOKEN', defaultValue as string) as RobertSettings[K];
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
			collaborationServerUrl: 'https://robert-8vdt.onrender.com',
			collaborationEnabled: false,
			collaborationAutoConnect: true,
			statusBarShowSprintDaysLeft: true,
			showWelcomeAnimation: true
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

		if (settings.rallyProjectName !== undefined && settings.rallyProjectName.trim() === '') {
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
