import { type BrowserWindow, type IpcMainEvent, ipcMain } from 'electron';
import type { AppProtocol } from './appProtocol';
import { Uri } from './host/Uri';
import { buildThemeSwitchScript, injectTheme, type ThemeKind } from './host/theme';
import { IPC_TO_HOST, IPC_TO_PAGE } from './ipcChannels';

type MessageListener = (message: unknown) => unknown;

/**
 * Implements the parts of `vscode.Webview` that Robert uses (`html`,
 * `postMessage`, `onDidReceiveMessage`, `asWebviewUri`, `cspSource`) on top
 * of an Electron BrowserWindow. The page talks to it through the preload
 * script, which exposes a VS Code compatible `acquireVsCodeApi()`.
 */
export class ElectronWebview {
	public options: Record<string, unknown> = {};

	private _html = '';
	private _ready = false;
	private _disposed = false;
	private readonly _pending: unknown[] = [];
	private readonly _listeners = new Set<MessageListener>();
	private readonly _ipcHandler = (event: IpcMainEvent, message: unknown) => {
		if (event.sender === this.window.webContents) {
			for (const listener of [...this._listeners]) {
				void Promise.resolve(listener(message)).catch(error => console.error('[Robert] Webview message listener failed', error));
			}
		}
	};

	constructor(
		private readonly window: BrowserWindow,
		private readonly appProtocol: AppProtocol,
		private readonly ownerId: string,
		private readonly getTheme: () => ThemeKind
	) {
		ipcMain.on(IPC_TO_HOST, this._ipcHandler);

		// Messages posted before the page has loaded are queued and flushed once
		// it is ready, so the first handshake messages are not lost.
		window.webContents.on('did-start-loading', () => {
			this._ready = false;
		});
		window.webContents.on('did-finish-load', () => {
			this._ready = true;
			for (const message of this._pending.splice(0)) {
				this.window.webContents.send(IPC_TO_PAGE, message);
			}
		});
		window.on('closed', () => this.dispose());
	}

	public get cspSource(): string {
		return this.appProtocol.cspSource;
	}

	public get html(): string {
		return this._html;
	}

	public set html(value: string) {
		this._html = value;
		if (this._disposed) {
			return;
		}
		this._pending.length = 0;
		const url = this.appProtocol.putDocument(this.ownerId, injectTheme(value, this.getTheme()));
		void this.window.loadURL(url).catch(error => console.error('[Robert] Failed to load webview document', error));
	}

	public asWebviewUri(uri: Uri): Uri {
		return Uri.parse(this.appProtocol.toAppUrl(uri.fsPath));
	}

	public postMessage(message: unknown): Promise<boolean> {
		if (this._disposed || this.window.isDestroyed()) {
			return Promise.resolve(false);
		}
		if (!this._ready) {
			this._pending.push(message);
			return Promise.resolve(true);
		}
		this.window.webContents.send(IPC_TO_PAGE, message);
		return Promise.resolve(true);
	}

	public onDidReceiveMessage(listener: MessageListener, thisArgs?: unknown, disposables?: Array<{ dispose(): unknown }>): { dispose(): void } {
		const bound: MessageListener = message => listener.call(thisArgs, message);
		this._listeners.add(bound);
		const disposable = { dispose: () => void this._listeners.delete(bound) };
		disposables?.push(disposable);
		return disposable;
	}

	/** Re-themes the loaded document when the OS theme changes. */
	public applyTheme(kind: ThemeKind): void {
		if (!this._disposed && !this.window.isDestroyed()) {
			void this.window.webContents.executeJavaScript(buildThemeSwitchScript(kind)).catch(() => undefined);
		}
	}

	public dispose(): void {
		if (this._disposed) {
			return;
		}
		this._disposed = true;
		ipcMain.removeListener(IPC_TO_HOST, this._ipcHandler);
		this._listeners.clear();
		this.appProtocol.releaseDocuments(this.ownerId);
	}
}

/**
 * Minimal `vscode.WebviewView` wrapper so `RobertWebviewProvider.resolveWebviewView`
 * can drive the main window exactly as it drives VS Code's activity bar view.
 */
export class ElectronWebviewView {
	public readonly viewType = 'robert.mainView';
	public title = 'Robert';
	public description?: string;
	private readonly disposeListeners = new Set<() => void>();

	constructor(
		public readonly webview: ElectronWebview,
		private readonly window: BrowserWindow
	) {
		window.on('closed', () => {
			for (const listener of [...this.disposeListeners]) {
				listener();
			}
			this.disposeListeners.clear();
		});
	}

	public get visible(): boolean {
		return !this.window.isDestroyed() && this.window.isVisible();
	}

	public show(): void {
		if (!this.window.isDestroyed()) {
			this.window.show();
			this.window.focus();
		}
	}

	public onDidDispose(listener: () => void, thisArgs?: unknown, disposables?: Array<{ dispose(): unknown }>): { dispose(): void } {
		const bound = () => listener.call(thisArgs);
		this.disposeListeners.add(bound);
		const disposable = { dispose: () => void this.disposeListeners.delete(bound) };
		disposables?.push(disposable);
		return disposable;
	}

	public onDidChangeVisibility(): { dispose(): void } {
		return { dispose: () => undefined };
	}
}
