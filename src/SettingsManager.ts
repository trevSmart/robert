import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';

export interface RobertSettings {
	apiEndpoint: string;
	refreshInterval: number;
	theme: string;
	autoRefresh: boolean;
	notifications: boolean;
	debugMode: boolean;
	advancedFeatures: boolean;
	maxResults: number;
	timeout: number;
	rallyInstance: string;
	rallyApiKey: string;
	rallyProjectName: string;
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
	 */
	public getSettings(): RobertSettings {
		return (
			this._errorHandler.executeWithErrorHandlingSync(() => {
				const config = vscode.workspace.getConfiguration('robert');

				const settings: RobertSettings = {
					apiEndpoint: config.get<string>('apiEndpoint', 'https://rally.example.com'),
					refreshInterval: config.get<number>('refreshInterval', 30),
					theme: config.get<string>('theme', 'auto'),
					autoRefresh: config.get<boolean>('autoRefresh', true),
					notifications: config.get<boolean>('notifications', true),
					debugMode: config.get<boolean>('debugMode', false),
					advancedFeatures: config.get<boolean>('advancedFeatures', false),
					maxResults: config.get<number>('maxResults', 100),
					timeout: config.get<number>('timeout', 5000),
					rallyInstance: config.get<string>('rallyInstance', 'https://rally1.rallydev.com'),
					rallyApiKey: config.get<string>('rallyApiKey', ''),
					rallyProjectName: config.get<string>('rallyProjectName', '')
				};

				this._errorHandler.logInfo('Settings retrieved from VS Code configuration', 'SettingsManager.getSettings');
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

			// Update each setting individually
			if (settings.apiEndpoint !== undefined) {
				await config.update('apiEndpoint', settings.apiEndpoint, vscode.ConfigurationTarget.Global);
			}
			if (settings.refreshInterval !== undefined) {
				await config.update('refreshInterval', settings.refreshInterval, vscode.ConfigurationTarget.Global);
			}
			if (settings.theme !== undefined) {
				await config.update('theme', settings.theme, vscode.ConfigurationTarget.Global);
			}
			if (settings.autoRefresh !== undefined) {
				await config.update('autoRefresh', settings.autoRefresh, vscode.ConfigurationTarget.Global);
			}
			if (settings.notifications !== undefined) {
				await config.update('notifications', settings.notifications, vscode.ConfigurationTarget.Global);
			}
			if (settings.debugMode !== undefined) {
				await config.update('debugMode', settings.debugMode, vscode.ConfigurationTarget.Global);
			}
			if (settings.advancedFeatures !== undefined) {
				await config.update('advancedFeatures', settings.advancedFeatures, vscode.ConfigurationTarget.Global);
			}
			if (settings.maxResults !== undefined) {
				await config.update('maxResults', settings.maxResults, vscode.ConfigurationTarget.Global);
			}
			if (settings.timeout !== undefined) {
				await config.update('timeout', settings.timeout, vscode.ConfigurationTarget.Global);
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

			// Reset each setting to its default value
			await config.update('apiEndpoint', defaultSettings.apiEndpoint, vscode.ConfigurationTarget.Global);
			await config.update('refreshInterval', defaultSettings.refreshInterval, vscode.ConfigurationTarget.Global);
			await config.update('theme', defaultSettings.theme, vscode.ConfigurationTarget.Global);
			await config.update('autoRefresh', defaultSettings.autoRefresh, vscode.ConfigurationTarget.Global);
			await config.update('notifications', defaultSettings.notifications, vscode.ConfigurationTarget.Global);
			await config.update('debugMode', defaultSettings.debugMode, vscode.ConfigurationTarget.Global);
			await config.update('advancedFeatures', defaultSettings.advancedFeatures, vscode.ConfigurationTarget.Global);
			await config.update('maxResults', defaultSettings.maxResults, vscode.ConfigurationTarget.Global);
			await config.update('timeout', defaultSettings.timeout, vscode.ConfigurationTarget.Global);
			await config.update('rallyInstance', defaultSettings.rallyInstance, vscode.ConfigurationTarget.Global);
			await config.update('rallyApiKey', defaultSettings.rallyApiKey, vscode.ConfigurationTarget.Global);
			await config.update('rallyProjectName', defaultSettings.rallyProjectName, vscode.ConfigurationTarget.Global);

			this._errorHandler.logInfo('Settings reset to default values', 'SettingsManager.resetSettings');
		}, 'SettingsManager.resetSettings');
	}

	/**
	 * Get a specific setting value
	 */
	public getSetting<K extends keyof RobertSettings>(key: K): RobertSettings[K] {
		return (
			this._errorHandler.executeWithErrorHandlingSync(() => {
				const config = vscode.workspace.getConfiguration('robert');
				const defaultValue = this.getDefaultSettings()[key];

				// Type assertion to handle the generic return type
				return config.get(key, defaultValue) as RobertSettings[K];
			}, `SettingsManager.getSetting.${key}`) || this.getDefaultSettings()[key]
		);
	}

	/**
	 * Update a specific setting value
	 */
	public async updateSetting<K extends keyof RobertSettings>(key: K, value: RobertSettings[K]): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			const config = vscode.workspace.getConfiguration('robert');
			await config.update(key, value, vscode.ConfigurationTarget.Global);

			this._errorHandler.logInfo(`Setting ${key} updated to ${value}`, 'SettingsManager.updateSetting');
		}, `SettingsManager.updateSetting.${key}`);
	}

	/**
	 * Get default settings
	 */
	private getDefaultSettings(): RobertSettings {
		return {
			apiEndpoint: 'https://rally.example.com',
			refreshInterval: 30,
			theme: 'auto',
			autoRefresh: true,
			notifications: true,
			debugMode: false,
			advancedFeatures: false,
			maxResults: 100,
			timeout: 5000,
			rallyInstance: 'https://rally1.rallydev.com',
			rallyApiKey: '',
			rallyProjectName: ''
		};
	}

	/**
	 * Validate settings values
	 */
	public validateSettings(settings: Partial<RobertSettings>): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (settings.refreshInterval !== undefined && (settings.refreshInterval < 5 || settings.refreshInterval > 3600)) {
			errors.push('Refresh interval must be between 5 and 3600 seconds');
		}

		if (settings.maxResults !== undefined && (settings.maxResults < 10 || settings.maxResults > 1000)) {
			errors.push('Max results must be between 10 and 1000');
		}

		if (settings.timeout !== undefined && (settings.timeout < 1000 || settings.timeout > 60_000)) {
			errors.push('Timeout must be between 1000 and 60000 milliseconds');
		}

		if (settings.theme !== undefined && !['auto', 'light', 'dark', 'high-contrast'].includes(settings.theme)) {
			errors.push('Theme must be one of: auto, light, dark, high-contrast');
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

		return {
			isValid: errors.length === 0,
			errors
		};
	}
}
