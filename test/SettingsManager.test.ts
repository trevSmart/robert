import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsManager } from '../src/SettingsManager.js';

// Mock vscode module
vi.mock('vscode', () => ({
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string, defaultValue: unknown) => {
				// Return default values for testing
				const defaults: Record<string, unknown> = {
					apiEndpoint: 'https://rally.example.com',
					refreshInterval: 30,
					autoRefresh: true,
					debugMode: false,
					advancedFeatures: false,
					maxResults: 100,
					rallyInstance: 'https://rally1.rallydev.com',
					rallyApiKey: '',
					rallyProjectName: '',
					'collaboration.serverUrl': 'https://robert-8vdt.onrender.com',
					'collaboration.enabled': false,
					'collaboration.autoConnect': true,
					showOutputChannelOnStartup: false
				};
				return defaults[key] ?? defaultValue;
			}),
			update: vi.fn()
		}))
	},
	ConfigurationTarget: {
		Global: 1,
		Workspace: 2,
		WorkspaceFolder: 3
	},
	window: {
		createOutputChannel: vi.fn(() => ({
			appendLine: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn()
		}))
	}
}));

describe('SettingsManager', () => {
	let settingsManager: SettingsManager;

	beforeEach(() => {
		settingsManager = SettingsManager.getInstance();
	});

	afterEach(() => {
		// Reset settings after each test if needed
	});

	describe('getInstance', () => {
		it('should return singleton instance', () => {
			const instance1 = SettingsManager.getInstance();
			const instance2 = SettingsManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('getSettings', () => {
		it('should return all settings with default values', () => {
			const settings = settingsManager.getSettings();
			
			expect(settings).toBeDefined();
			expect(settings.apiEndpoint).toBeDefined();
			expect(settings.refreshInterval).toBeDefined();
			expect(settings.autoRefresh).toBeDefined();
			expect(settings.debugMode).toBeDefined();
			expect(settings.advancedFeatures).toBeDefined();
			expect(settings.maxResults).toBeDefined();
			expect(settings.rallyInstance).toBeDefined();
			expect(settings.rallyApiKey).toBeDefined();
			expect(settings.rallyProjectName).toBeDefined();
		});

		it('should return valid setting types', () => {
			const settings = settingsManager.getSettings();
			
			expect(typeof settings.apiEndpoint).toBe('string');
			expect(typeof settings.refreshInterval).toBe('number');
			expect(typeof settings.autoRefresh).toBe('boolean');
			expect(typeof settings.debugMode).toBe('boolean');
			expect(typeof settings.advancedFeatures).toBe('boolean');
			expect(typeof settings.maxResults).toBe('number');
			expect(typeof settings.rallyInstance).toBe('string');
			expect(typeof settings.rallyApiKey).toBe('string');
			expect(typeof settings.rallyProjectName).toBe('string');
		});
	});

	describe('getSetting', () => {
		it('should get specific setting value', () => {
			const apiEndpoint = settingsManager.getSetting('apiEndpoint');
			expect(typeof apiEndpoint).toBe('string');
		});

		it('should get refreshInterval setting', () => {
			const refreshInterval = settingsManager.getSetting('refreshInterval');
			expect(typeof refreshInterval).toBe('number');
			expect(refreshInterval).toBeGreaterThanOrEqual(5);
			expect(refreshInterval).toBeLessThanOrEqual(3600);
		});

		it('should get boolean settings', () => {
			const autoRefresh = settingsManager.getSetting('autoRefresh');
			const debugMode = settingsManager.getSetting('debugMode');
			
			expect(typeof autoRefresh).toBe('boolean');
			expect(typeof debugMode).toBe('boolean');
		});
	});

	describe('validateSettings', () => {
		it('should validate correct settings', () => {
			const result = settingsManager.validateSettings({
				refreshInterval: 30,
				maxResults: 100
			});
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject invalid refreshInterval', () => {
			const result = settingsManager.validateSettings({
				refreshInterval: 3
			});
			
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should reject invalid maxResults', () => {
			const result = settingsManager.validateSettings({
				maxResults: 5000
			});
			
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should reject non-HTTPS Rally instance', () => {
			const result = settingsManager.validateSettings({
				rallyInstance: 'http://rally.example.com'
			});
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Rally instance must be a valid HTTPS URL');
		});

		it('should reject empty Rally API key', () => {
			const result = settingsManager.validateSettings({
				rallyApiKey: '   '
			});
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Rally API key cannot be empty');
		});

		it('should reject empty Rally project name', () => {
			const result = settingsManager.validateSettings({
				rallyProjectName: ''
			});
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Rally project name cannot be empty');
		});

		it('should reject invalid collaboration server URL', () => {
			const result = settingsManager.validateSettings({
				collaborationServerUrl: 'not-a-url'
			});
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Collaboration server URL must be a valid URL');
		});

		it('should accept multiple valid settings', () => {
			const result = settingsManager.validateSettings({
				refreshInterval: 60,
				maxResults: 200,
				rallyInstance: 'https://rally1.rallydev.com',
				collaborationServerUrl: 'https://robert-8vdt.onrender.com'
			});
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});
});
