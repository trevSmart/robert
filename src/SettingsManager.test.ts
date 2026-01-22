/**
 * Unit tests for SettingsManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { SettingsManager } from './SettingsManager';

describe('SettingsManager', () => {
	let settingsManager: SettingsManager;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset singleton instance
		(SettingsManager as any).instance = undefined;
		settingsManager = SettingsManager.getInstance();
	});

	describe('getInstance', () => {
		it('should return a singleton instance', () => {
			const instance1 = SettingsManager.getInstance();
			const instance2 = SettingsManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('getSettings', () => {
		it('should retrieve settings from VS Code configuration', () => {
			const settings = settingsManager.getSettings();

			expect(settings).toBeDefined();
			expect(settings.apiEndpoint).toBeDefined();
			expect(settings.refreshInterval).toBeDefined();
			expect(settings.theme).toBeDefined();
			expect(settings.autoRefresh).toBeDefined();
			expect(settings.notifications).toBeDefined();
			expect(settings.debugMode).toBeDefined();
			expect(settings.advancedFeatures).toBeDefined();
			expect(settings.maxResults).toBeDefined();
			expect(settings.timeout).toBeDefined();
			expect(settings.rallyInstance).toBeDefined();
			expect(settings.rallyApiKey).toBeDefined();
			expect(settings.rallyProjectName).toBeDefined();
		});

		it('should return default values when configuration is not set', () => {
			const settings = settingsManager.getSettings();

			expect(settings.apiEndpoint).toBe('https://rally.example.com');
			expect(settings.refreshInterval).toBe(30);
			expect(settings.theme).toBe('auto');
			expect(settings.autoRefresh).toBe(true);
			expect(settings.notifications).toBe(true);
			expect(settings.debugMode).toBe(false);
			expect(settings.advancedFeatures).toBe(false);
			expect(settings.maxResults).toBe(100);
			expect(settings.timeout).toBe(5000);
			expect(settings.rallyInstance).toBe('https://rally1.rallydev.com');
			expect(settings.rallyApiKey).toBe('');
			expect(settings.rallyProjectName).toBe('');
		});
	});

	describe('saveSettings', () => {
		it('should save settings to VS Code configuration', async () => {
			const mockUpdate = vi.fn().mockResolvedValue(undefined);
			const mockConfig = {
				get: vi.fn((key: string, defaultValue: any) => defaultValue),
				update: mockUpdate,
				has: vi.fn(() => true),
				inspect: vi.fn()
			};

			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);

			await settingsManager.saveSettings({
				apiEndpoint: 'https://custom.api.com',
				refreshInterval: 60
			});

			expect(mockUpdate).toHaveBeenCalledWith('apiEndpoint', 'https://custom.api.com', vscode.ConfigurationTarget.Global);
			expect(mockUpdate).toHaveBeenCalledWith('refreshInterval', 60, vscode.ConfigurationTarget.Global);
		});
	});

	describe('getDefaultSettings', () => {
		it('should return default settings', () => {
			const defaults = settingsManager.getDefaultSettings();

			expect(defaults.apiEndpoint).toBe('https://rally.example.com');
			expect(defaults.refreshInterval).toBe(30);
			expect(defaults.theme).toBe('auto');
			expect(defaults.autoRefresh).toBe(true);
			expect(defaults.notifications).toBe(true);
			expect(defaults.debugMode).toBe(false);
			expect(defaults.advancedFeatures).toBe(false);
			expect(defaults.maxResults).toBe(100);
			expect(defaults.timeout).toBe(5000);
			expect(defaults.rallyInstance).toBe('https://rally1.rallydev.com');
			expect(defaults.rallyApiKey).toBe('');
			expect(defaults.rallyProjectName).toBe('');
		});
	});

	describe('validateSettings', () => {
		it('should validate valid settings', () => {
			const validSettings = {
				refreshInterval: 30,
				maxResults: 100,
				timeout: 5000
			};

			const result = settingsManager.validateSettings(validSettings);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect invalid refreshInterval', () => {
			const invalidSettings = {
				refreshInterval: 2
			};

			const result = settingsManager.validateSettings(invalidSettings);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Refresh interval must be between 5 and 3600 seconds');
		});

		it('should detect invalid maxResults', () => {
			const invalidSettings = {
				maxResults: 5
			};

			const result = settingsManager.validateSettings(invalidSettings);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Max results must be between 10 and 1000');
		});

		it('should detect invalid timeout', () => {
			const invalidSettings = {
				timeout: 500
			};

			const result = settingsManager.validateSettings(invalidSettings);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Timeout must be between 1000 and 60000 milliseconds');
		});

		it('should return multiple errors for multiple invalid fields', () => {
			const invalidSettings = {
				refreshInterval: 2,
				maxResults: 5,
				timeout: 500
			};

			const result = settingsManager.validateSettings(invalidSettings);
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});
});
