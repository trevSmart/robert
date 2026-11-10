import type { ConfigurationChangeEvent, ConfigurationStore } from './ConfigurationStore';
import type { FileLogChannel } from './FileLogChannel';
import { Uri } from './Uri';

/** Capabilities the Electron main process provides to the shim. */
export interface ShimHost {
	config: ConfigurationStore;
	createLogChannel(name: string): FileLogChannel;
	notify(level: 'info' | 'warning' | 'error', message: string): void;
	openExternal(url: string): Promise<boolean>;
	readClipboard(): string | Promise<string>;
	writeClipboard(text: string): void | Promise<void>;
	appName: string;
}

type Listener<T> = (event: T) => unknown;

class Disposable {
	constructor(private readonly callOnDispose: () => void) {}

	public static from(...disposables: Array<{ dispose(): unknown }>): Disposable {
		return new Disposable(() => disposables.forEach(d => d.dispose()));
	}

	public dispose(): void {
		this.callOnDispose();
	}
}

class EventEmitter<T> {
	private readonly listeners = new Set<Listener<T>>();

	public readonly event = (listener: Listener<T>, thisArgs?: unknown, disposables?: Array<{ dispose(): unknown }>): Disposable => {
		const bound: Listener<T> = e => listener.call(thisArgs, e);
		this.listeners.add(bound);
		const disposable = new Disposable(() => this.listeners.delete(bound));
		disposables?.push(disposable);
		return disposable;
	};

	public fire(event: T): void {
		for (const listener of [...this.listeners]) {
			listener(event);
		}
	}

	public dispose(): void {
		this.listeners.clear();
	}
}

class ThemeColor {
	constructor(public readonly id: string) {}
}

class ThemeIcon {
	constructor(public readonly id: string) {}
}

class MarkdownString {
	public isTrusted = false;
	public supportThemeIcons = false;
	public supportHtml = false;
	constructor(public value: string = '') {}
	public appendMarkdown(value: string): MarkdownString {
		this.value += value;
		return this;
	}
	public appendText(value: string): MarkdownString {
		this.value += value;
		return this;
	}
}

class CancellationError extends Error {
	constructor() {
		super('Canceled');
		this.name = 'Canceled';
	}
}

class LanguageModelError extends Error {
	public readonly code: string = 'Unknown';
}

class NotSupportedInStandaloneError extends Error {
	constructor(feature: string) {
		super(`${feature} is not available in the standalone Robert app.`);
		this.name = 'NotSupportedInStandaloneError';
	}
}

/**
 * Builds an object that mimics the subset of the `vscode` module that Robert's
 * backend code uses, so the same handlers, settings manager and providers run
 * unchanged inside Electron. Anything VS Code-specific with no standalone
 * equivalent (editors, chat, tabs) either no-ops or throws a clear error that
 * the existing error handling already reports.
 */
export function createVscodeShim(host: ShimHost) {
	const commandRegistry = new Map<string, (...args: unknown[]) => unknown>();
	const configurationChanged = new EventEmitter<ConfigurationChangeEvent>();
	host.config.onDidChange(event => configurationChanged.fire(event));

	const logChannels = new Map<string, FileLogChannel>();

	const notify =
		(level: 'info' | 'warning' | 'error') =>
		async (message: string, ..._items: unknown[]) => {
			host.notify(level, message);
			return undefined;
		};

	return {
		Uri,
		Disposable,
		EventEmitter,
		ThemeColor,
		ThemeIcon,
		MarkdownString,
		CancellationError,
		LanguageModelError,
		ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
		ViewColumn: { Active: -1, Beside: -2, One: 1, Two: 2, Three: 3 },
		ExtensionMode: { Production: 1, Development: 2, Test: 3 },
		StatusBarAlignment: { Left: 1, Right: 2 },
		LanguageModelChatMessage: {
			User: (content: string) => ({ role: 1, content })
		},

		workspace: {
			workspaceFolders: undefined,
			getConfiguration: (section?: string) => host.config.getConfiguration(section),
			onDidChangeConfiguration: configurationChanged.event,
			openTextDocument: async () => {
				throw new NotSupportedInStandaloneError('Opening documents in an editor');
			}
		},

		window: {
			createOutputChannel: (name: string) => {
				let channel = logChannels.get(name);
				if (!channel) {
					channel = host.createLogChannel(name);
					logChannels.set(name, channel);
				}
				return channel;
			},
			showInformationMessage: notify('info'),
			showWarningMessage: notify('warning'),
			showErrorMessage: notify('error'),
			showTextDocument: async () => {
				throw new NotSupportedInStandaloneError('Showing documents in an editor');
			},
			createWebviewPanel: () => {
				throw new NotSupportedInStandaloneError('Editor webview panels');
			},
			tabGroups: { all: [] as Array<{ tabs: unknown[] }>, close: async () => false }
		},

		commands: {
			registerCommand: (id: string, callback: (...args: unknown[]) => unknown, thisArg?: unknown) => {
				commandRegistry.set(id, (...args) => callback.apply(thisArg, args));
				return new Disposable(() => commandRegistry.delete(id));
			},
			executeCommand: async (id: string, ...args: unknown[]) => {
				const command = commandRegistry.get(id);
				// VS Code workbench commands (setContext, markdown preview, chat, ...)
				// have no standalone counterpart: ignore them instead of failing.
				return command ? command(...args) : undefined;
			},
			getCommands: async () => [...commandRegistry.keys()]
		},

		env: {
			appName: host.appName,
			language: 'en',
			openExternal: async (target: Uri | string) => host.openExternal(target.toString()),
			clipboard: {
				readText: async () => host.readClipboard(),
				writeText: async (text: string) => host.writeClipboard(text)
			}
		},

		lm: {
			selectChatModels: async () => []
		}
	};
}

export type VscodeShim = ReturnType<typeof createVscodeShim>;
