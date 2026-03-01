import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';

export interface RobertSettings {
	autoRefresh: boolean;
	debugMode: boolean;
	rallyInstance: string;
	rallyApiKey: string;
	rallyProjectName: string;
	collaborationServerUrl: string;
	collaborationEnabled: boolean;
	collaborationAutoConnect: boolean;
	showOutputChannelOnStartup: boolean;
	statusBarShowSprintDaysLeft: boolean;
}

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
					autoRefresh: this.resolveBooleanSettingWithFallback('autoRefresh', config.get<boolean>('autoRefresh'), 'ROBERT_AUTO_REFRESH', true),
					debugMode: this.resolveBooleanSettingWithFallback('debugMode', config.get<boolean>('debugMode'), 'ROBERT_DEBUG_MODE', false),
					rallyInstance: this.resolveSettingWithFallback('rallyInstance', config.get<string>('rallyInstance', ''), 'ROBERT_RALLY_INSTANCE', 'https://rally1.rallydev.com'),
					rallyApiKey: this.resolveSettingWithFallback('rallyApiKey', config.get<string>('rallyApiKey', ''), 'ROBERT_RALLY_API_KEY', ''),
					rallyProjectName: this.resolveSettingWithFallback('rallyProjectName', config.get<string>('rallyProjectName', ''), 'ROBERT_RALLY_PROJECT_NAME', ''),
					collaborationServerUrl: this.resolveSettingWithFallback('collaboration.serverUrl', config.get<string>('collaboration.serverUrl', ''), 'ROBERT_COLLABORATION_SERVER_URL', 'https://robert-8vdt.onrender.com'),
					collaborationEnabled: this.resolveBooleanSettingWithFallback('collaboration.enabled', config.get<boolean>('collaboration.enabled'), 'ROBERT_COLLABORATION_ENABLED', false),
					collaborationAutoConnect: this.resolveBooleanSettingWithFallback('collaboration.autoConnect', config.get<boolean>('collaboration.autoConnect'), 'ROBERT_COLLABORATION_AUTO_CONNECT', true),
					showOutputChannelOnStartup: this.resolveBooleanSettingWithFallback('showOutputChannelOnStartup', config.get<boolean>('showOutputChannelOnStartup'), 'ROBERT_SHOW_OUTPUT_ON_STARTUP', false),
					statusBarShowSprintDaysLeft: this.resolveBooleanSettingWithFallback('statusBarShowSprintDaysLeft', config.get<boolean>('statusBarShowSprintDaysLeft'), 'ROBERT_STATUS_BAR_SPRINT_DAYS', true)
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
			if (settings.rallyInstance !== undefined) {
				await config.update('rallyInstance', settings.rallyInstance, vscode.ConfigurationTarget.Global);
			}
			if (settings.rallyApiKey !== undefined) {
				await config.update('rallyApiKey', settings.rallyApiKey, vscode.ConfigurationTarget.Global);
			}
			if (settings.rallyProjectName !== undefined) {
				await config.update('rallyProjectName', settings.rallyProjectName, vscode.ConfigurationTarget.Global);
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
			if (settings.showOutputChannelOnStartup !== undefined) {
				await config.update('showOutputChannelOnStartup', settings.showOutputChannelOnStartup, vscode.ConfigurationTarget.Global);
			}
			if (settings.statusBarShowSprintDaysLeft !== undefined) {
				await config.update('statusBarShowSprintDaysLeft', settings.statusBarShowSprintDaysLeft, vscode.ConfigurationTarget.Global);
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
			await config.update('rallyInstance', defaultSettings.rallyInstance, vscode.ConfigurationTarget.Global);
			await config.update('rallyApiKey', defaultSettings.rallyApiKey, vscode.ConfigurationTarget.Global);
			await config.update('rallyProjectName', defaultSettings.rallyProjectName, vscode.ConfigurationTarget.Global);
			await config.update('collaboration.serverUrl', defaultSettings.collaborationServerUrl, vscode.ConfigurationTarget.Global);
			await config.update('collaboration.enabled', defaultSettings.collaborationEnabled, vscode.ConfigurationTarget.Global);
			await config.update('collaboration.autoConnect', defaultSettings.collaborationAutoConnect, vscode.ConfigurationTarget.Global);
			await config.update('showOutputChannelOnStartup', defaultSettings.showOutputChannelOnStartup, vscode.ConfigurationTarget.Global);
			await config.update('statusBarShowSprintDaysLeft', defaultSettings.statusBarShowSprintDaysLeft, vscode.ConfigurationTarget.Global);
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
					const vscodeVal = config.get('collaboration.serverUrl', '');
					return this.resolveSettingWithFallback('collaboration.serverUrl', vscodeVal, 'ROBERT_COLLABORATION_SERVER_URL', defaultValue as string) as RobertSettings[K];
				}
				if (key === 'collaborationEnabled') {
					const vscodeVal = config.get<boolean>('collaboration.enabled');
					return this.resolveBooleanSettingWithFallback('collaboration.enabled', vscodeVal, 'ROBERT_COLLABORATION_ENABLED', defaultValue as boolean) as RobertSettings[K];
				}
				if (key === 'collaborationAutoConnect') {
					const vscodeVal = config.get<boolean>('collaboration.autoConnect');
					return this.resolveBooleanSettingWithFallback('collaboration.autoConnect', vscodeVal, 'ROBERT_COLLABORATION_AUTO_CONNECT', defaultValue as boolean) as RobertSettings[K];
				}

				if (key === 'rallyApiKey') {
					const vscodeVal = config.get<string>(key, '');
					return this.resolveSettingWithFallback(key, vscodeVal, 'ROBERT_RALLY_API_KEY', defaultValue as string) as RobertSettings[K];
				}
				if (key === 'rallyInstance') {
					const vscodeVal = config.get<string>(key, '');
					return this.resolveSettingWithFallback(key, vscodeVal, 'ROBERT_RALLY_INSTANCE', defaultValue as string) as RobertSettings[K];
				}
				if (key === 'rallyProjectName') {
					const vscodeVal = config.get<string>(key, '');
					return this.resolveSettingWithFallback(key, vscodeVal, 'ROBERT_RALLY_PROJECT_NAME', defaultValue as string) as RobertSettings[K];
				}

				if (typeof defaultValue === 'boolean') {
					const vscodeVal = config.get<boolean>(key);
					const envVarName = `ROBERT_${key.toUpperCase()}`;
					return this.resolveBooleanSettingWithFallback(key, vscodeVal, envVarName, defaultValue as boolean) as RobertSettings[K];
				}

				const vscodeVal = config.get<string>(key, '');
				const envVarName = `ROBERT_${key.toUpperCase()}`;
				return this.resolveSettingWithFallback(key, vscodeVal, envVarName, defaultValue as string) as RobertSettings[K];
			}, `SettingsManager.getSetting.${key}`) || this.getDefaultSettings()[key]
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
	 * Get default settings
	 */
	private getDefaultSettings(): RobertSettings {
		return {
			autoRefresh: true,
			debugMode: false,
			rallyInstance: 'https://rally1.rallydev.com',
			rallyApiKey: '',
			rallyProjectName: '',
			collaborationServerUrl: 'https://robert-8vdt.onrender.com',
			collaborationEnabled: false,
			collaborationAutoConnect: true,
			showOutputChannelOnStartup: false,
			statusBarShowSprintDaysLeft: true
		};
	}

	/**
	 * Resolve string setting with priority: VS Code setting > Environment variable > Default
	 * @param settingKey - The configuration key
	 * @param vscodeValue - Value from VS Code config
	 * @param envVarName - Environment variable name to check
	 * @param defaultValue - Fallback default value
	 */
	private resolveSettingWithFallback(settingKey: string, vscodeValue: string, envVarName: string, defaultValue: string): string {
		if (vscodeValue && vscodeValue.trim() !== '') {
			return vscodeValue;
		}

		const envValue = process.env[envVarName];
		if (envValue && envValue.trim() !== '') {
			this._errorHandler.logDebug(`Setting '${settingKey}' loaded from environment variable '${envVarName}'`, 'SettingsManager.resolveSettingWithFallback');
			return envValue;
		}

		return defaultValue;
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
	public validateSettings(settings: Partial<RobertSettings>): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

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
