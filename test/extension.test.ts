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
			show: vi.fn(),
			hide: vi.fn(),
			dispose: vi.fn()
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
		}))
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
	Disposable: {
		from: vi.fn((...disposables: unknown[]) => ({
			dispose: vi.fn()
		}))
	}
}));

// Mock rally services to avoid actual Rally API calls
vi.mock('../src/libs/rally/rallyServices', () => ({
	getProjects: vi.fn(async () => ({ projects: [] })),
	getUsers: vi.fn(async () => ({ users: [] })),
	getIterations: vi.fn(async () => ({ iterations: [] })),
	getUserStories: vi.fn(async () => ({ userStories: [] })),
	getTasks: vi.fn(async () => ({ tasks: [] })),
	getDefects: vi.fn(async () => ({ defects: [] })),
	getCurrentUser: vi.fn(async () => ({ user: null })),
	getUserStoryDefects: vi.fn(async () => ({ defects: [] })),
	getUserStoryTests: vi.fn(async () => ({ tests: [] })),
	getUserStoryDiscussions: vi.fn(async () => ({ discussions: [] })),
	getRecentTeamMembers: vi.fn(async () => ({ members: [] })),
	getAllTeamMembersProgress: vi.fn(async () => ({ progress: [] })),
	globalSearch: vi.fn(async () => ({ results: [] })),
	getUserStoryByObjectId: vi.fn(async () => null),
	getDefectByObjectId: vi.fn(async () => null),
	getTaskWithParent: vi.fn(async () => null),
	getTestCaseWithParent: vi.fn(async () => null),
	clearAllRallyCaches: vi.fn()
}));

describe('Extension', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rallyData', () => {
		it('should export rallyData object', async () => {
			const { rallyData } = await import('../src/extension.js');
			
			expect(rallyData).toBeDefined();
			expect(rallyData.projects).toEqual([]);
			expect(rallyData.users).toEqual([]);
			expect(rallyData.iterations).toEqual([]);
			expect(rallyData.userStories).toEqual([]);
			expect(rallyData.tasks).toEqual([]);
			expect(rallyData.defects).toEqual([]);
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
