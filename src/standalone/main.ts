/**
 * Entry point of the standalone (Electron) version of IBM Robert.
 *
 * The VS Code extension and this app share all product code (React UI,
 * message handlers, settings, Jira/Rally providers). This file only plays the
 * role VS Code plays for the extension: it provides a `vscode` module shim,
 * an extension context, a window hosting the webview, menus and settings UI.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type * as vscode from 'vscode';
import { app, BrowserWindow, clipboard, dialog, Menu, type MenuItemConstructorOptions, nativeTheme, Notification, safeStorage, session, shell } from 'electron';
import { APP_SCHEME, AppProtocol, registerAppSchemeAsPrivileged } from './appProtocol';
import { ElectronWebview, ElectronWebviewView } from './ElectronWebview';
import { ConfigurationStore, type SecretCodec } from './host/ConfigurationStore';
import { FileLogChannel } from './host/FileLogChannel';
import { FileMemento } from './host/FileMemento';
import { getThemeBackground, type ThemeKind } from './host/theme';
import { Uri } from './host/Uri';
import { createVscodeShim } from './host/vscodeShim';
import { installVscodeModule } from './installVscodeModule';
import { SettingsWindowController } from './settingsWindow';

/** Repository / app.asar root: this file lives in out/src/standalone/. */
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
/** Name shown to the user (Dock, menus, dialogs, notifications). Must match productName in electron-builder.yml. */
const APP_NAME = 'Robert';
/**
 * Internal app name. It names the profile directory (<appData>/IBM Robert) and the
 * macOS Keychain item that safeStorage uses ("IBM Robert Safe Storage"), so changing
 * it would lose existing settings and saved API tokens.
 */
const APP_INTERNAL_NAME = 'IBM Robert';
/** Robert's version (app.getVersion() reports Electron's when running from source). */
const APP_VERSION = (JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8')) as { version: string }).version;
const MAX_LOG_BYTES = 5 * 1024 * 1024;

app.setName(APP_INTERNAL_NAME);
// ROBERT_STANDALONE_USER_DATA lets tests and power users run an isolated profile.
app.setPath('userData', process.env.ROBERT_STANDALONE_USER_DATA || path.join(app.getPath('appData'), APP_INTERNAL_NAME));
app.setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion: APP_VERSION, copyright: 'For IBM internal use only.' });
registerAppSchemeAsPrivileged();

if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	app
		.whenReady()
		.then(start)
		.catch(error => {
			// Covers both whenReady() and failures inside start() (e.g. unwritable profile dir).
			console.error('[Robert] Failed to start', error);
			dialog.showErrorBox(`${APP_NAME} could not start`, error instanceof Error ? error.message : String(error));
			app.exit(1);
		});
}

/**
 * On Linux, safeStorage may fall back to the `basic_text` backend (no keyring
 * detected), which "encrypts" with a hardcoded password. That is not real
 * protection, so treat it as unavailable and let ConfigurationStore refuse to
 * store secrets (users then provide them through ROBERT_* env vars).
 */
function isSecureStorageAvailable(): boolean {
	if (!safeStorage.isEncryptionAvailable()) {
		return false;
	}
	if (process.platform === 'linux') {
		const backend = safeStorage.getSelectedStorageBackend();
		return backend !== 'basic_text' && backend !== 'unknown';
	}
	return true;
}

const safeStorageCodec: SecretCodec = {
	isAvailable: isSecureStorageAvailable,
	encrypt: plain => safeStorage.encryptString(plain).toString('base64'),
	decrypt: encoded => safeStorage.decryptString(Buffer.from(encoded, 'base64'))
};

function currentTheme(): ThemeKind {
	return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function isHttpUrl(url: string): boolean {
	return /^https?:\/\//i.test(url);
}

/** Links handed to the OS: web pages and e-mail addresses (e.g. team member mailto: links). */
function isExternalUrl(url: string): boolean {
	return isHttpUrl(url) || /^mailto:/i.test(url);
}

function openLogFile(filePath: string): void {
	void shell.openPath(filePath);
}

function prepareLogFile(filePath: string): void {
	try {
		if (fs.statSync(filePath).size > MAX_LOG_BYTES) {
			fs.renameSync(filePath, `${filePath}.1`);
		}
	} catch {
		// No previous log file.
	}
}

async function start(): Promise<void> {
	const userData = app.getPath('userData');
	const iconPath = path.join(ROOT_DIR, 'resources', 'icons', 'robert-logo4.png');
	const appProtocol = new AppProtocol(ROOT_DIR);
	appProtocol.install();

	// Only allow clipboard writes (copy buttons); deny camera, notifications API, etc.
	session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(permission === 'clipboard-sanitized-write'));

	// --- vscode module shim ---------------------------------------------------
	const config = new ConfigurationStore(path.join(userData, 'settings.json'), ConfigurationStore.readSchemaFromManifest(path.join(ROOT_DIR, 'package.json')), safeStorageCodec);
	// Settings that change what data Robert shows (provider + its connection); changing them reloads all data.
	const dataSettingKeys = Object.keys(config.getSchema()).filter(key => key === 'robert.provider' || key.startsWith('robert.jira') || key.startsWith('robert.rally'));
	const isVerbose = () => !app.isPackaged || config.getValue('robert.debugMode') === true || /^(true|1|yes)$/i.test(process.env.ROBERT_DEBUG_MODE ?? '');
	const logFile = path.join(userData, 'logs', 'robert.log');
	prepareLogFile(logFile);

	const recentNotifications = new Map<string, number>();
	const shim = createVscodeShim({
		config,
		appName: APP_NAME,
		createLogChannel: name => new FileLogChannel(name, logFile, isVerbose, openLogFile, !app.isPackaged),
		notify: (level, message) => {
			// Collapse bursts of identical notifications (e.g. repeated network errors).
			const key = `${level}:${message}`;
			const now = Date.now();
			if ((recentNotifications.get(key) ?? 0) > now - 10_000) {
				return;
			}
			recentNotifications.set(key, now);
			if (Notification.isSupported()) {
				new Notification({ title: level === 'error' ? `${APP_NAME} — Error` : APP_NAME, body: message, silent: level === 'info' }).show();
			}
		},
		openExternal: async url => {
			if (!isExternalUrl(url)) {
				return false;
			}
			await shell.openExternal(url);
			return true;
		},
		readClipboard: () => clipboard.readText(),
		writeClipboard: text => clipboard.writeText(text)
	});
	installVscodeModule(shim);

	// Backend modules must be loaded after the shim is installed, so they are
	// required here rather than imported at the top of the file.
	/* eslint-disable @typescript-eslint/no-require-imports */
	const { RobertWebviewProvider } = require('../RobertWebviewProvider') as typeof import('../RobertWebviewProvider');
	const { OutputChannelManager } = require('../utils/OutputChannelManager') as typeof import('../utils/OutputChannelManager');
	const { ErrorHandler } = require('../ErrorHandler') as typeof import('../ErrorHandler');
	const { initDevMode, isTestTabEnabled, getTestTabEnabledReason } = require('../utils/devMode') as typeof import('../utils/devMode');
	const { resetProviderData } = require('../extension') as typeof import('../extension');
	const { getProviderLabel } = require('../libs/provider') as typeof import('../libs/provider');
	/* eslint-enable @typescript-eslint/no-require-imports */

	const output = OutputChannelManager.getInstance();
	const errorHandler = ErrorHandler.getInstance();

	const context = {
		subscriptions: [] as Array<{ dispose(): unknown }>,
		globalState: new FileMemento(path.join(userData, 'globalState.json')),
		workspaceState: new FileMemento(path.join(userData, 'workspaceState.json')),
		extensionUri: Uri.file(ROOT_DIR),
		extensionPath: ROOT_DIR,
		extensionMode: app.isPackaged ? shim.ExtensionMode.Production : shim.ExtensionMode.Development,
		globalStorageUri: Uri.file(userData),
		storageUri: Uri.file(userData),
		logUri: Uri.file(path.dirname(logFile)),
		asAbsolutePath: (relativePath: string) => path.join(ROOT_DIR, relativePath)
	} as unknown as vscode.ExtensionContext;

	initDevMode(context, { isPackaged: app.isPackaged });
	output.appendLine(`[Robert] 🖥️  Standalone app ${APP_VERSION} starting (Electron ${process.versions.electron}, ${app.isPackaged ? 'packaged' : 'from source'})`);
	output.appendLine(`[Robert] Settings file: ${config.getFilePath()}`);
	output.appendLine(`[Robert] Test tab: ${isTestTabEnabled() ? 'enabled' : 'hidden'} (${getTestTabEnabledReason()})`);

	const provider = new RobertWebviewProvider(context.extensionUri, context);
	provider.setDebugMode(isVerbose());

	let mainWindow: BrowserWindow | undefined;
	let mainWebview: ElectronWebview | undefined;
	// Set when the app is really quitting (Cmd+Q, Dock "Quit", logout), so closing the window is allowed.
	let isQuitting = false;
	// On macOS, closing the window only hides it: the app keeps running in the Dock and keeps its state.
	const hideOnClose = process.platform === 'darwin';

	const createMainWindow = async () => {
		const window = new BrowserWindow({
			width: 1360,
			height: 900,
			minWidth: 480,
			minHeight: 400,
			title: APP_NAME,
			icon: iconPath,
			show: false,
			backgroundColor: getThemeBackground(currentTheme()),
			webPreferences: {
				preload: path.join(__dirname, 'preload.js'),
				contextIsolation: true,
				sandbox: true,
				nodeIntegration: false,
				autoplayPolicy: 'no-user-gesture-required',
				// The window stays hidden until ready-to-show; without this Chromium treats
				// the page as backgrounded and pauses the intro video.
				backgroundThrottling: false
			}
		});
		mainWindow = window;
		window.once('ready-to-show', () => window.show());

		// Keep the window on Robert's own pages; open web and mailto: links with the OS.
		window.webContents.setWindowOpenHandler(({ url }) => {
			if (isExternalUrl(url)) {
				void shell.openExternal(url);
			}
			return { action: 'deny' };
		});
		window.webContents.on('will-navigate', (event, url) => {
			if (!url.startsWith(`${APP_SCHEME}://`)) {
				event.preventDefault();
				if (isExternalUrl(url)) {
					void shell.openExternal(url);
				}
			}
		});

		// Mouse back/forward buttons (Windows/Linux) and trackpad swipes (macOS).
		window.on('app-command', (_event, command) => {
			if (command === 'browser-backward') provider.navigateHistory('back');
			if (command === 'browser-forward') provider.navigateHistory('forward');
		});
		window.on('swipe', (_event, direction) => {
			if (direction === 'right') provider.navigateHistory('back');
			if (direction === 'left') provider.navigateHistory('forward');
		});

		const webview = new ElectronWebview(window, appProtocol, 'main', currentTheme);
		mainWebview = webview;
		window.on('close', event => {
			if (!hideOnClose || isQuitting) {
				return;
			}
			event.preventDefault();
			// Hiding a full-screen window would leave an empty full-screen Space behind.
			if (window.isFullScreen()) {
				window.once('leave-full-screen', () => window.hide());
				window.setFullScreen(false);
			} else {
				window.hide();
			}
			output.appendLine('[Robert] 🪟 Main window closed; the app keeps running (Dock icon or Cmd+Q to quit)');
		});
		window.on('closed', () => {
			if (mainWindow === window) {
				mainWindow = undefined;
				mainWebview = undefined;
			}
		});

		const view = new ElectronWebviewView(webview, window);
		const token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => undefined }) };
		await provider.resolveWebviewView(view as unknown as vscode.WebviewView, { state: undefined } as vscode.WebviewViewResolveContext, token as unknown as vscode.CancellationToken);
	};

	const showMainWindow = async () => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.show();
			mainWindow.focus();
			return;
		}
		await createMainWindow();
	};

	const reload = async () => {
		await errorHandler.executeWithErrorHandling(async () => {
			output.appendLine('[Robert] 🔄 Reloading data');
			resetProviderData(output);
			await provider.prefetchJiraData('reload');
			// The provider (or its credentials) may have changed: rebind collaboration to the current user.
			await provider.refreshCollaborationIdentity();
			await provider.resetAndRefreshWebviews();
			output.appendLine('[Robert] ✅ Reload completed');
		}, 'standalone.reload');
	};

	// The settings window is a child of the main window only while the main window is visible.
	const settingsParent = () => (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? mainWindow : undefined);

	const settingsWindow = new SettingsWindowController(config, appProtocol, path.join(__dirname, 'preload.js'), iconPath, currentTheme, changedKeys => {
		output.appendLine(`[Robert] ⚙️  Settings saved: ${changedKeys.join(', ') || 'no changes'}`);
	});

	// React to setting changes the same way the extension does on onDidChangeConfiguration.
	config.onDidChange(event => {
		if (event.affectsConfiguration('robert.debugMode')) {
			provider.setDebugMode(isVerbose());
			provider.broadcastTestTabVisibility();
		}
		if (dataSettingKeys.some(key => event.affectsConfiguration(key))) {
			output.appendLine(`[Robert] 🔀 Connection settings changed (provider: ${getProviderLabel()}); reloading data`);
			void reload();
		}
		if (event.affectsConfiguration('robert.collaboration')) {
			shim.window.showInformationMessage(`Collaboration settings take effect after restarting ${APP_NAME}.`);
		}
	});

	// Commands the shared code may execute through vscode.commands.
	shim.commands.registerCommand('workbench.view.extension.robert', showMainWindow);
	shim.commands.registerCommand('robert.openMainView', showMainWindow);
	shim.commands.registerCommand('workbench.action.openSettings', () => settingsWindow.open(settingsParent()));
	shim.commands.registerCommand('robert.openSettings', () => settingsWindow.open(settingsParent()));
	shim.commands.registerCommand('robert.reload', reload);
	shim.commands.registerCommand('robert.showOutput', () => output.show());
	shim.commands.registerCommand('robert.goBack', () => provider.navigateHistory('back'));
	shim.commands.registerCommand('robert.goForward', () => provider.navigateHistory('forward'));

	nativeTheme.on('updated', () => mainWebview?.applyTheme(currentTheme()));

	Menu.setApplicationMenu(
		buildMenu({
			openSettings: () => settingsWindow.open(settingsParent()),
			reload: () => void reload(),
			back: () => provider.navigateHistory('back'),
			forward: () => provider.navigateHistory('forward'),
			showLogs: () => output.show()
		})
	);

	app.on('second-instance', () => void showMainWindow());
	app.on('activate', () => void showMainWindow());
	app.on('window-all-closed', () => {
		if (!hideOnClose) {
			app.quit();
		}
	});
	app.on('before-quit', () => {
		isQuitting = true;
		provider.dispose();
		for (const disposable of context.subscriptions) {
			disposable.dispose();
		}
		output.dispose();
	});

	// Like extension activation: warm the cache up front unless the intro video
	// (which prefetches while it plays) is going to be shown.
	if (!config.getValue('robert.showWelcomeAnimation')) {
		void provider.prefetchJiraData('activation');
	}
	await createMainWindow();
}

function buildMenu(actions: { openSettings(): void; reload(): void; back(): void; forward(): void; showLogs(): void }): Menu {
	const isMac = process.platform === 'darwin';
	const settingsItem: MenuItemConstructorOptions = { label: isMac ? 'Settings…' : 'Settings', accelerator: 'CmdOrCtrl+,', click: actions.openSettings };

	const template: MenuItemConstructorOptions[] = [
		...(isMac
			? [
					{
						label: APP_NAME,
						submenu: [{ role: 'about' }, { type: 'separator' }, settingsItem, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }]
					} as MenuItemConstructorOptions
				]
			: [{ label: 'File', submenu: [settingsItem, { type: 'separator' }, { role: 'quit' }] } as MenuItemConstructorOptions]),
		{ role: 'editMenu' },
		{
			label: 'View',
			submenu: [
				{ label: 'Reload Data', accelerator: 'CmdOrCtrl+R', click: actions.reload },
				{ type: 'separator' },
				{ label: 'Back', accelerator: isMac ? 'Cmd+[' : 'Alt+Left', click: actions.back },
				{ label: 'Forward', accelerator: isMac ? 'Cmd+]' : 'Alt+Right', click: actions.forward },
				{ type: 'separator' },
				{ role: 'resetZoom' },
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' },
				{ type: 'separator' },
				{ label: 'Show Logs', click: actions.showLogs },
				{ role: 'toggleDevTools' }
			]
		},
		{ role: 'windowMenu' }
	];
	return Menu.buildFromTemplate(template);
}
