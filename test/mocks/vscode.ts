/**
 * Mock implementation of vscode module for unit tests
 * This allows testing extension code without requiring a full VS Code environment
 */

import { vi } from 'vitest';

export const Uri = {
	file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
	parse: (uri: string) => ({ fsPath: uri, scheme: 'file', path: uri })
};

export const Range = class Range {
	constructor(
		public start: any,
		public end: any
	) {}
};

export const Position = class Position {
	constructor(
		public line: number,
		public character: number
	) {}
};

export const workspace = {
	getConfiguration: vi.fn(() => ({
		get: vi.fn((key: string, defaultValue?: any) => defaultValue),
		update: vi.fn(),
		has: vi.fn(() => true),
		inspect: vi.fn()
	})),
	workspaceFolders: [],
	onDidChangeConfiguration: vi.fn(),
	onDidChangeWorkspaceFolders: vi.fn(),
	onDidSaveTextDocument: vi.fn(),
	applyEdit: vi.fn(),
	fs: {
		readFile: vi.fn(),
		writeFile: vi.fn()
	}
};

export const window = {
	showInformationMessage: vi.fn(),
	showWarningMessage: vi.fn(),
	showErrorMessage: vi.fn(),
	createOutputChannel: vi.fn(() => ({
		appendLine: vi.fn(),
		append: vi.fn(),
		clear: vi.fn(),
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
	createWebviewPanel: vi.fn(),
	registerWebviewViewProvider: vi.fn(),
	registerCustomEditorProvider: vi.fn(),
	showQuickPick: vi.fn(),
	showInputBox: vi.fn(),
	activeTextEditor: undefined,
	visibleTextEditors: []
};

export const commands = {
	registerCommand: vi.fn((command: string, callback: Function) => ({
		dispose: vi.fn()
	})),
	executeCommand: vi.fn()
};

export const extensions = {
	getExtension: vi.fn(),
	all: []
};

export const ExtensionContext = class ExtensionContext {
	subscriptions: any[] = [];
	workspaceState = {
		get: vi.fn(),
		update: vi.fn()
	};
	globalState = {
		get: vi.fn(),
		update: vi.fn(),
		setKeysForSync: vi.fn()
	};
	extensionPath = '/mock/extension/path';
	extensionUri = Uri.file('/mock/extension/path');
	storageUri = Uri.file('/mock/storage/path');
	globalStorageUri = Uri.file('/mock/global/storage/path');
	logUri = Uri.file('/mock/log/path');
	asAbsolutePath(relativePath: string) {
		return `/mock/extension/path/${relativePath}`;
	}
};

export const ViewColumn = {
	Active: -1,
	Beside: -2,
	One: 1,
	Two: 2,
	Three: 3,
	Four: 4,
	Five: 5,
	Six: 6,
	Seven: 7,
	Eight: 8,
	Nine: 9
};

export const StatusBarAlignment = {
	Left: 1,
	Right: 2
};

export const ConfigurationTarget = {
	Global: 1,
	Workspace: 2,
	WorkspaceFolder: 3
};

export const DiagnosticSeverity = {
	Error: 0,
	Warning: 1,
	Information: 2,
	Hint: 3
};

export const EventEmitter = class EventEmitter<T> {
	private listeners: Function[] = [];

	event = (listener: Function) => {
		this.listeners.push(listener);
		return {
			dispose: () => {
				const index = this.listeners.indexOf(listener);
				if (index > -1) {
					this.listeners.splice(index, 1);
				}
			}
		};
	};

	fire(data: T) {
		this.listeners.forEach((listener) => listener(data));
	}

	dispose() {
		this.listeners = [];
	}
};

export const CancellationTokenSource = class CancellationTokenSource {
	token = {
		isCancellationRequested: false,
		onCancellationRequested: vi.fn()
	};
	cancel() {
		this.token.isCancellationRequested = true;
	}
	dispose() {}
};

export const WebviewViewProvider = class WebviewViewProvider {};
export const CustomTextEditorProvider = class CustomTextEditorProvider {};


