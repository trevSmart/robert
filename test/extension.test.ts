import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock vscode module
vi.mock('vscode', () => ({
	ExtensionMode: {
		Development: 1,
		Test: 2,
		Production: 3
	},
	window: {
		createOutputChannel: vi.fn(() => ({
			appendLine: vi.fn(),
			append: vi.fn(),
			show: vi.fn(),
			hide: vi.fn(),
			clear: vi.fn(),
			dispose: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn()
		})),
		createStatusBarItem: vi.fn(() => ({
			text: '',
			tooltip: '',
			command: '',
			show: vi.fn(),
			hide: vi.fn(),
			dispose: vi.fn()
		})),
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		registerWebviewViewProvider: vi.fn(),
		registerCustomEditorProvider: vi.fn(),
		tabGroups: {
			all: []
		}
	},
	commands: {
		registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
		executeCommand: vi.fn()
	},
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string, defaultValue: unknown) => defaultValue)
		})),
		onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() }))
	},
	Uri: {
		file: vi.fn((path: string) => ({ fsPath: path, path })),
		parse: vi.fn((uri: string) => ({ toString: () => uri }))
	},
	StatusBarAlignment: {
		Left: 1,
		Right: 2
	},
	ThemeColor: vi.fn((id: string) => ({ id })),
	MarkdownString: vi.fn(function (this: any, value?: string) {
		this.value = value;
		this.isTrusted = false;
		this.appendMarkdown = vi.fn((text: string) => {
			this.value = (this.value || '') + text;
			return this;
		});
		return this;
	}),
	Disposable: vi.fn(function (this: any, callback?: () => void) {
		return { dispose: callback || vi.fn() };
	}),
}));

// Mock the provider facade to avoid actual Jira/Rally API calls
vi.mock('../src/libs/provider', () => ({
	getProjects: vi.fn(async () => ({ projects: [] })),
	getUsers: vi.fn(async () => ({ users: [] })),
	getIterations: vi.fn(async () => ({ iterations: [] })),
	getUserStories: vi.fn(async () => ({ userStories: [] })),
	getTasks: vi.fn(async () => ({ tasks: [] })),
	getDefects: vi.fn(async () => ({ defects: [] })),
	getCurrentUser: vi.fn(async () => ({ user: null })),
	getUserStoryDefects: vi.fn(async () => ({ defects: [] })),
	getUserStoryDiscussions: vi.fn(async () => ({ discussions: [] })),
	getUserStoryTests: vi.fn(async () => ({ testCases: [] })),
	getRecentTeamMembers: vi.fn(async () => ({ members: [] })),
	getAllTeamMembersProgress: vi.fn(async () => ({ progress: [] })),
	getUserSprintProgress: vi.fn(async () => ({})),
	getMemberHoursHistory: vi.fn(async () => ({ history: [] })),
	globalSearch: vi.fn(async () => ({ results: [] })),
	getUserStoryByObjectId: vi.fn(async () => null),
	getDefectByObjectId: vi.fn(async () => null),
	getTaskWithParent: vi.fn(async () => null),
	getTestCaseWithParent: vi.fn(async () => null),
	getUserStoryRevisions: vi.fn(async () => ({ revisions: [] })),
	getUserStoryRevisionsCount: vi.fn(async () => ({ count: 0 })),
	fetchImageAsBase64: vi.fn(async () => ({ error: 'mock' })),
	getItemUrl: vi.fn(async () => null),
	validateConfiguration: vi.fn(async () => ({ isValid: true, errors: [] })),
	setProviderBroadcaster: vi.fn(),
	clearAllProviderCaches: vi.fn(),
	getActiveProvider: vi.fn(() => 'jira'),
	getProviderLabel: vi.fn(() => 'Jira'),
	isRally: vi.fn(() => false)
}));

describe('Extension', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('jiraData', () => {
		it('should export jiraData object', async () => {
			const { jiraData } = await import('../src/extension.js');
			
			expect(jiraData).toBeDefined();
			expect(jiraData.projects).toEqual([]);
			expect(jiraData.users).toEqual([]);
			expect(jiraData.iterations).toEqual([]);
			expect(jiraData.userStories).toEqual([]);
			expect(jiraData.tasks).toEqual([]);
			expect(jiraData.defects).toEqual([]);
		});
	});

	describe('activate', () => {
		it('should activate extension without errors', async () => {
			const vscode = await import('vscode');
			const { activate } = await import('../src/extension.js');
			
			const mockContext = {
				subscriptions: [],
				extensionUri: vscode.Uri.parse('file:///test'),
				extensionPath: '/test',
				extensionMode: vscode.ExtensionMode.Development,
				globalStorageUri: vscode.Uri.parse('file:///storage'),
				logUri: vscode.Uri.parse('file:///logs'),
				storagePath: '/storage',
				globalStoragePath: '/global-storage',
				logPath: '/logs',
				asAbsolutePath: vi.fn((relativePath: string) => `/test/${relativePath}`),
				storageUri: vscode.Uri.parse('file:///storage'),
				globalState: {
					get: vi.fn(),
					update: vi.fn(),
					keys: vi.fn(() => [])
				},
				workspaceState: {
					get: vi.fn(),
					update: vi.fn(),
					keys: vi.fn(() => [])
				},
				secrets: {
					get: vi.fn(),
					store: vi.fn(),
					delete: vi.fn()
				},
				environmentVariableCollection: {
					persistent: true,
					replace: vi.fn(),
					append: vi.fn(),
					prepend: vi.fn(),
					get: vi.fn(),
					forEach: vi.fn(),
					delete: vi.fn(),
					clear: vi.fn()
				},
				extension: {
					id: 'test.robert',
					extensionUri: vscode.Uri.parse('file:///test'),
					extensionPath: '/test',
					isActive: true,
					packageJSON: {},
					extensionKind: 1,
					exports: undefined,
					activate: vi.fn()
				}
			};
			
			expect(() => activate(mockContext as any)).not.toThrow();
		});
	});

	describe('deactivate', () => {
		it('should deactivate extension without errors', async () => {
			const { deactivate } = await import('../src/extension.js');
			
			expect(() => deactivate()).not.toThrow();
		});
	});
});
