// Minimal stand-in for the `vscode` module so the extension backend can run in plain Node.
import { execFile } from 'node:child_process';

const store = new Map<string, unknown>();

function log(level: string, message: unknown): void {
	const text = message instanceof Error ? message.stack || message.message : String(message);
	if (level === 'debug' || level === 'trace') {
		if (process.env.ROBERT_DEBUG_MODE === 'true') {
			console.log(`[Robert] ${level}: ${text}`);
		}
		return;
	}
	const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
	fn(`[Robert] ${level}: ${text}`);
}

function createOutputChannel(name: string) {
	const channel = {
		name,
		trace: (m: string) => log('trace', m),
		debug: (m: string) => log('debug', m),
		info: (m: string) => log('info', m),
		warn: (m: string) => log('warn', m),
		error: (m: string | Error) => log('error', m),
		appendLine: (m: string) => log('info', m),
		append: (m: string) => log('info', m),
		clear: () => {},
		show: () => {},
		hide: () => {},
		dispose: () => {}
	};
	return channel;
}

function getConfiguration(_section?: string) {
	return {
		get<T>(key: string, defaultValue?: T): T | undefined {
			return (store.has(key) ? (store.get(key) as T) : defaultValue) as T | undefined;
		},
		async update(key: string, value: unknown): Promise<void> {
			store.set(key, value);
		},
		has: (key: string) => store.has(key),
		inspect: () => undefined
	};
}

function openExternal(uri: { toString(): string }): Promise<boolean> {
	const url = uri.toString();
	if (!/^https?:\/\//i.test(url)) {
		return Promise.resolve(false);
	}
	const [cmd, args]: [string, string[]] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
	return new Promise(resolve => {
		execFile(cmd, args, error => resolve(!error));
	});
}

class Uri {
	constructor(
		public scheme: string,
		private raw: string,
		public fsPath = ''
	) {}
	static parse(value: string): Uri {
		const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(value);
		return new Uri(match ? match[1].toLowerCase() : '', value);
	}
	static file(path: string): Uri {
		return new Uri('file', `file://${path}`, path);
	}
	static joinPath(base: Uri, ...parts: string[]): Uri {
		return Uri.file([base.fsPath, ...parts].join('/'));
	}
	toString(): string {
		return this.raw;
	}
}

class LanguageModelError extends Error {}
class CancellationError extends Error {}

const unsupported = (what: string) => async () => {
	throw new Error(`${what} is not available outside VS Code`);
};

export const window = {
	createOutputChannel,
	showInformationMessage: async (m: string) => log('info', m),
	showWarningMessage: async (m: string) => log('warn', m),
	showErrorMessage: async (m: string) => log('error', m),
	showTextDocument: unsupported('showTextDocument')
};

export const workspace = {
	getConfiguration,
	workspaceFolders: undefined as undefined,
	openTextDocument: unsupported('openTextDocument')
};

export const env = {
	openExternal,
	clipboard: { readText: async () => '', writeText: async () => {} }
};

export const commands = {
	executeCommand: unsupported('executeCommand'),
	getCommands: async () => [] as string[]
};

export const lm = { selectChatModels: async () => [] as unknown[] };

export const ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 };
export const ExtensionMode = { Production: 1, Development: 2, Test: 3 };
export const ViewColumn = { One: 1, Two: 2 };
export const LanguageModelChatMessage = { User: (content: string) => ({ role: 1, content }) };

export { Uri, LanguageModelError, CancellationError };
