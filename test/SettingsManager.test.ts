import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsManager } from '../src/SettingsManager.js';

vi.mock('vscode', () => ({
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string, defaultValue: unknown) => {
				const defaults: Record<string, unknown> = {
					autoRefresh: true,
					debugMode: false,
					jiraBaseUrl: 'https://example.atlassian.net',
					jiraApiToken: '',
					jiraProjectKey: '',
					'collaboration.serverUrl': 'https://robert-8vdt.onrender.com',
					'collaboration.enabled': false,
					'collaboration.autoConnect': true,
					showOutputChannelOnStartup: false,
					statusBarShowSprintDaysLeft: true
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
			dispose: vi.fn(),
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn()
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
			expect(settings.autoRefresh).toBeDefined();
			expect(settings.debugMode).toBeDefined();
			expect(settings.jiraBaseUrl).toBeDefined();
			expect(settings.jiraApiToken).toBeDefined();
			expect(settings.jiraProjectKey).toBeDefined();
		});

		it('should return valid setting types', () => {
			const settings = settingsManager.getSettings();
			
			expect(typeof settings.autoRefresh).toBe('boolean');
			expect(typeof settings.debugMode).toBe('boolean');
			expect(typeof settings.jiraBaseUrl).toBe('string');
			expect(typeof settings.jiraApiToken).toBe('string');
			expect(typeof settings.jiraProjectKey).toBe('string');
		});
	});

	describe('getSetting', () => {
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
				jiraBaseUrl: 'https://example.atlassian.net'
			});
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject non-HTTPS Jira base URL', () => {
			const result = settingsManager.validateSettings({
				jiraBaseUrl: 'http://example.atlassian.net'
			});
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Jira base URL must be a valid HTTPS URL');
		});

		it('should reject empty Jira API token', () => {
			const result = settingsManager.validateSettings({
				jiraApiToken: '   '
			});
			
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Jira API token cannot be empty');
		});

		it('should accept empty Jira project key (all projects)', () => {
			const result = settingsManager.validateSettings({
				jiraProjectKey: ''
			});
			
			expect(result.errors).not.toContain('Jira project key cannot be empty');
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
				jiraBaseUrl: 'https://example.atlassian.net',
				collaborationServerUrl: 'https://robert-8vdt.onrender.com'
			});
			
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});
});
