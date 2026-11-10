import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
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

function mockRallyInstance(value: string): void {
	vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
		get: (key: string, defaultValue?: unknown) => (key === 'rallyInstance' ? value : defaultValue),
		update: vi.fn()
	} as unknown as ReturnType<typeof vscode.workspace.getConfiguration>);
}

describe('SettingsManager', () => {
	let settingsManager: SettingsManager;

	beforeEach(() => {
		settingsManager = SettingsManager.getInstance();
	});

	afterEach(() => {
		vi.mocked(vscode.workspace.getConfiguration).mockReset();
		vi.mocked(vscode.workspace.getConfiguration).mockImplementation(() => ({
			get: (key: string, defaultValue: unknown) => {
				const defaults: Record<string, unknown> = {
					autoRefresh: true,
					debugMode: false,
					rallyInstance: 'https://rally1.rallydev.com',
					rallyApiKey: '',
					rallyProjectName: '',
					'collaboration.serverUrl': 'https://robert-8vdt.onrender.com',
					'collaboration.enabled': false,
					'collaboration.autoConnect': true,
					showOutputChannelOnStartup: false,
					statusBarShowSprintDaysLeft: true
				};
				return defaults[key] ?? defaultValue;
			},
			update: vi.fn()
		}) as unknown as ReturnType<typeof vscode.workspace.getConfiguration>);
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

		it('strips trailing slashes from the Rally instance', () => {
			mockRallyInstance('https://eu1.rallydev.com///');

			expect(settingsManager.getSetting('rallyInstance')).toBe('https://eu1.rallydev.com');
			expect(settingsManager.getSettings().rallyInstance).toBe('https://eu1.rallydev.com');
		});

		it('defaults the Rally instance to the EU cluster when unset', () => {
			const previous = process.env.ROBERT_RALLY_INSTANCE;
			delete process.env.ROBERT_RALLY_INSTANCE;
			mockRallyInstance('');

			expect(settingsManager.getSetting('rallyInstance')).toBe('https://eu1.rallydev.com');

			if (previous === undefined) {
				delete process.env.ROBERT_RALLY_INSTANCE;
			} else {
				process.env.ROBERT_RALLY_INSTANCE = previous;
			}
		});
	});

	describe('precedence: settings > environment > defaults', () => {
		/** Mimics VS Code: get() returns the manifest default for unset keys; inspect() tells them apart. */
		function mockVsCodeConfig(userValues: Record<string, unknown>): void {
			const manifestDefaults: Record<string, unknown> = { provider: 'jira', jiraBaseUrl: 'https://jiracloudab.atlassian.net', debugMode: false };
			vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
				get: (key: string, defaultValue?: unknown) => userValues[key] ?? manifestDefaults[key] ?? defaultValue,
				inspect: (key: string) => ({ key: `robert.${key}`, defaultValue: manifestDefaults[key], globalValue: userValues[key] }),
				update: vi.fn()
			} as unknown as ReturnType<typeof vscode.workspace.getConfiguration>);
		}

		const ENV_KEYS = ['ROBERT_PROVIDER', 'ROBERT_JIRA_BASE_URL', 'ROBERT_DEBUG_MODE'];
		let savedEnv: Record<string, string | undefined>;
		beforeEach(() => {
			savedEnv = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
		});
		afterEach(() => {
			for (const key of ENV_KEYS) {
				if (savedEnv[key] === undefined) delete process.env[key];
				else process.env[key] = savedEnv[key];
			}
		});

		it('uses ROBERT_* environment variables when the setting is unset, even if the manifest has a default', () => {
			process.env.ROBERT_PROVIDER = 'rally';
			process.env.ROBERT_JIRA_BASE_URL = 'https://env.atlassian.net';
			process.env.ROBERT_DEBUG_MODE = 'true';
			mockVsCodeConfig({});

			expect(settingsManager.getSetting('provider')).toBe('rally');
			expect(settingsManager.getSettings().jiraBaseUrl).toBe('https://env.atlassian.net');
			expect(settingsManager.getSetting('debugMode')).toBe(true);
		});

		it('lets an explicit setting win over the environment', () => {
			process.env.ROBERT_PROVIDER = 'rally';
			process.env.ROBERT_DEBUG_MODE = 'true';
			mockVsCodeConfig({ provider: 'jira', debugMode: false });

			expect(settingsManager.getSettings().provider).toBe('jira');
			expect(settingsManager.getSetting('debugMode')).toBe(false);
		});

		it('keeps an explicit false instead of replacing it with a true default', () => {
			mockVsCodeConfig({ autoRefresh: false, showWelcomeAnimation: false });

			expect(settingsManager.getSetting('autoRefresh')).toBe(false);
			expect(settingsManager.getSetting('showWelcomeAnimation')).toBe(false);
		});

		it('falls back to defaults when neither a setting nor an environment variable is set', () => {
			for (const key of ENV_KEYS) delete process.env[key];
			mockVsCodeConfig({});

			expect(settingsManager.getSettings().provider).toBe('jira');
			expect(settingsManager.getSettings().jiraBaseUrl).toBe('https://jiracloudab.atlassian.net');
		});
	});

	describe('package contribution', () => {
		it('contributes eu1 as the Rally instance default', () => {
			const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
				contributes: { configuration: { properties: Record<string, { default: string }> } };
			};

			expect(pkg.contributes.configuration.properties['robert.rallyInstance'].default).toBe('https://eu1.rallydev.com');
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
