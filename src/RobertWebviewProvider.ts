import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';
import { getProjects } from './libs/rally/rallyServices';
import { SettingsManager } from './SettingsManager';
import { TemplateManager } from './utils/TemplateManager';

export class RobertWebviewProvider implements vscode.WebviewViewProvider, vscode.CustomTextEditorProvider {
	public static readonly viewType = 'robert.mainView';
	public static readonly editorType = 'robert.editor';

	private _disposables: vscode.Disposable[] = [];
	private _currentPanel: vscode.WebviewPanel | undefined;
	private _currentView?: vscode.WebviewView;
	private _errorHandler: ErrorHandler;
	private _templateManager: TemplateManager;
	private _settingsManager: SettingsManager;

	// State persistence for webview
	private _webviewState: Map<string, unknown> = new Map();

	// Track current view state
	private _isInSettingsView: boolean = false;

	// Debug mode state
	private _isDebugMode: boolean = false;

	constructor(private readonly _extensionUri: vscode.Uri) {
		this._errorHandler = ErrorHandler.getInstance();
		this._templateManager = new TemplateManager(_extensionUri);
		this._settingsManager = SettingsManager.getInstance();

		this._errorHandler.logInfo('WebviewProvider initialized', 'RobertWebviewProvider.constructor');
	}

	/**
	 * Set debug mode state
	 */
	public setDebugMode(isDebug: boolean): void {
		this._isDebugMode = isDebug;
		this._errorHandler.logInfo(`Debug mode set to: ${isDebug}`, 'RobertWebviewProvider.setDebugMode');
	}

	// WebviewView implementation (for activity bar)
	public async resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
		await this._errorHandler.executeWithErrorHandling(async () => {
			webviewView.webview.options = {
				enableScripts: true,
				localResourceRoots: [this._extensionUri]
			};

			this._currentView = webviewView;
			this._errorHandler.logViewCreation('Activity Bar View', 'RobertWebviewProvider.resolveWebviewView');

			// Log abans de renderitzar
			this._errorHandler.logInfo('Rendering main webview content for activity bar', 'RobertWebviewProvider.resolveWebviewView');

			// Generate unique ID for this webview instance
			const webviewId = this._generateWebviewId('activity-bar');
			webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview, 'activity-bar', webviewId);

			// Handle messages from webview
			this._setWebviewMessageListener(webviewView.webview, webviewId);

			// Handle view destruction
			webviewView.onDidDispose(
				() => {
					this._errorHandler.logViewDestruction('Activity Bar View', 'RobertWebviewProvider.resolveWebviewView');
					this._currentView = undefined;
				},
				undefined,
				this._disposables
			);
		}, 'resolveWebviewView');
	}

	public postMessageToView(message: { command: string; [key: string]: unknown }) {
		this._errorHandler.executeWithErrorHandlingSync(() => {
			if (this._currentView) {
				this._currentView.webview.postMessage(message);
			}
		}, 'postMessageToView');
	}

	// CustomTextEditor implementation (for editor tab)
	public async resolveCustomTextEditor(_document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			webviewPanel.webview.options = {
				enableScripts: true,
				localResourceRoots: [this._extensionUri]
			};

			// Log abans de renderitzar
			this._errorHandler.logInfo('Rendering main webview content for editor tab', 'RobertWebviewProvider.resolveCustomTextEditor');

			// Generate unique ID for this webview instance
			const webviewId = this._generateWebviewId('editor-tab');
			webviewPanel.webview.html = await this._getHtmlForWebview(webviewPanel.webview, 'editor-tab', webviewId);
			this._errorHandler.logViewCreation('Custom Text Editor', 'RobertWebviewProvider.resolveCustomTextEditor');

			// Handle messages from webview
			this._setWebviewMessageListener(webviewPanel.webview, webviewId);

			// Handle panel destruction
			webviewPanel.onDidDispose(
				() => {
					this._errorHandler.logViewDestruction('Custom Text Editor', 'RobertWebviewProvider.resolveCustomTextEditor');
				},
				undefined,
				this._disposables
			);
		}, 'resolveCustomTextEditor');
	}

	// WebviewPanel implementation (for separate window)
	public async createWebviewPanel(): Promise<vscode.WebviewPanel> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			// If panel already exists and is visible, reveal it
			if (this._currentPanel) {
				this._currentPanel.reveal(vscode.ViewColumn.One);
				return this._currentPanel;
			}

			// Create new panel
			const title = this._isDebugMode ? 'Robert — DEBUG' : 'Robert';
			const panel = vscode.window.createWebviewPanel('robert', title, vscode.ViewColumn.One, {
				enableScripts: true,
				localResourceRoots: [this._extensionUri]
			});

			// Store reference to current panel
			this._currentPanel = panel;
			this._errorHandler.logViewCreation('Webview Panel', 'RobertWebviewProvider.createWebviewPanel');

			// Generate unique ID for this webview instance
			const webviewId = this._generateWebviewId('separate-window');
			panel.webview.html = await this._getHtmlForWebview(panel.webview, 'separate-window', webviewId);

			// Handle messages from webview
			this._setWebviewMessageListener(panel.webview, webviewId);

			// Handle panel close
			panel.onDidDispose(
				() => {
					this._errorHandler.logViewDestruction('Webview Panel', 'RobertWebviewProvider.createWebviewPanel');
					// Clear reference when panel is closed
					this._currentPanel = undefined;
				},
				undefined,
				this._disposables
			);

			return panel;
		}, 'createWebviewPanel');

		// If result is undefined due to error, create a fallback panel
		if (!result) {
			return vscode.window.createWebviewPanel('robert', this._isDebugMode ? 'Robert — DEBUG' : 'Robert', vscode.ViewColumn.One, {
				enableScripts: true,
				localResourceRoots: [this._extensionUri]
			});
		}

		return result;
	}

	/**
	 * Reveal the main webview panel if it exists but isn't visible; otherwise create it.
	 * If it's already visible, this is a no-op.
	 * Prioritizes the activity bar view over separate panels.
	 */
	public async showMainPanelIfHidden(): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			// First priority: Check if activity bar view exists and is visible
			if (this._currentView) {
				this._errorHandler.logInfo('Activity bar view exists; ensuring it has focus', 'RobertWebviewProvider.showMainPanelIfHidden');
				// Execute command to show/focus the activity bar view
				vscode.commands.executeCommand('workbench.view.extension.robert');
				return;
			}

			// Second priority: Check if separate panel exists and is visible
			if (this._currentPanel) {
				if (this._currentPanel.visible) {
					this._errorHandler.logInfo('Main panel already visible; no action taken', 'RobertWebviewProvider.showMainPanelIfHidden');
					return;
				}
				this._errorHandler.logInfo('Revealing existing main panel', 'RobertWebviewProvider.showMainPanelIfHidden');
				this._currentPanel.reveal(vscode.ViewColumn.One);
				return;
			}

			// Fallback: Try to open activity bar view first, if that fails create a separate panel
			this._errorHandler.logInfo('No existing views found; opening activity bar view', 'RobertWebviewProvider.showMainPanelIfHidden');
			Promise.resolve(vscode.commands.executeCommand('workbench.view.extension.robert'))
				.then(() => {
					this._errorHandler.logInfo('Activity bar view opened successfully', 'RobertWebviewProvider.showMainPanelIfHidden');
				})
				.catch(async (error) => {
					this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'showMainPanelIfHidden.activityBar');
					this._errorHandler.logInfo('Failed to open activity bar view; creating separate panel', 'RobertWebviewProvider.showMainPanelIfHidden');
					await this.createWebviewPanel();
				});
		}, 'showMainPanelIfHidden');
	}

	// Small, lightweight panel to show the logo and short info
	public async createSettingsPanel(): Promise<vscode.WebviewPanel> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				const settingsTitle = this._isDebugMode ? 'Robert — Settings — DEBUG' : 'Robert — Settings';
				const panel = vscode.window.createWebviewPanel('robert.settings', settingsTitle, vscode.ViewColumn.One, {
					enableScripts: true,
					localResourceRoots: [this._extensionUri]
				});

				this._errorHandler.logViewCreation('Settings Panel', 'RobertWebviewProvider.createSettingsPanel');

				// Generate unique ID for this webview instance
				const webviewId = this._generateWebviewId('settings');
				const settingsHtml = await this._getHtmlForSettings(panel.webview, 'settings', webviewId);
				panel.webview.html = settingsHtml;

				// Handle messages from webview
				this._setWebviewMessageListener(panel.webview, webviewId);

				panel.onDidDispose(
					() => {
						this._errorHandler.logViewDestruction('Settings Panel', 'RobertWebviewProvider.createSettingsPanel');
					},
					undefined,
					this._disposables
				);

				return panel;
			}, 'createSettingsPanel')) ||
			vscode.window.createWebviewPanel('robert.settings', this._isDebugMode ? 'Robert — Settings — DEBUG' : 'Robert — Settings', vscode.ViewColumn.One, {
				enableScripts: true,
				localResourceRoots: [this._extensionUri]
			})
		);
	}

	/**
	 * Show settings in the current webview instead of opening a new panel
	 * This method is used when the settings button is clicked in the activity bar view
	 * If already in settings view, it toggles back to main view
	 */
	public async showSettingsInCurrentView(): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			// If already in settings view, toggle back to main view
			if (this._isInSettingsView) {
				this._errorHandler.logInfo('Toggling back to main view from settings', 'RobertWebviewProvider.showSettingsInCurrentView');
				await this.showMainViewInCurrentView();
				return;
			}

			// Check if we have a current view (activity bar)
			if (this._currentView) {
				this._errorHandler.logInfo('Showing settings in activity bar view', 'RobertWebviewProvider.showSettingsInCurrentView');
				const webviewId = this._generateWebviewId('settings');
				const settingsHtml = await this._getHtmlForSettings(this._currentView.webview, 'settings', webviewId);
				this._currentView.webview.html = settingsHtml;
				this._isInSettingsView = true;
				return;
			}

			// Check if we have a current panel (separate window)
			if (this._currentPanel) {
				this._errorHandler.logInfo('Showing settings in separate panel', 'RobertWebviewProvider.showSettingsInCurrentView');
				const webviewId = this._generateWebviewId('settings');
				const settingsHtml = await this._getHtmlForSettings(this._currentPanel.webview, 'settings', webviewId);
				this._currentPanel.webview.html = settingsHtml;
				this._isInSettingsView = true;
				return;
			}

			// Fallback: create a new settings panel if no current view exists
			this._errorHandler.logInfo('No current view found, creating new settings panel', 'RobertWebviewProvider.showSettingsInCurrentView');
			await this.createSettingsPanel();
		}, 'showSettingsInCurrentView');
	}

	/**
	 * Show main view in the current webview
	 * This method is used to return to the main view from settings
	 */
	public async showMainViewInCurrentView(): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			// Check if we have a current view (activity bar)
			if (this._currentView) {
				this._errorHandler.logInfo('Showing main view in activity bar view', 'RobertWebviewProvider.showMainViewInCurrentView');
				const webviewId = this._generateWebviewId('main');
				this._currentView.webview.html = await this._getHtmlForWebview(this._currentView.webview, 'main', webviewId);
				this._isInSettingsView = false;
				return;
			}

			// Check if we have a current panel (separate window)
			if (this._currentPanel) {
				this._errorHandler.logInfo('Showing main view in separate panel', 'RobertWebviewProvider.showMainViewInCurrentView');
				const webviewId = this._generateWebviewId('main');
				this._currentPanel.webview.html = await this._getHtmlForWebview(this._currentPanel.webview, 'main', webviewId);
				this._isInSettingsView = false;
				return;
			}

			// Fallback: show main panel if no current view exists
			this._errorHandler.logInfo('No current view found, showing main panel', 'RobertWebviewProvider.showMainViewInCurrentView');
			await this.showMainPanelIfHidden();
		}, 'showMainViewInCurrentView');
	}

	public async createLogoPanel(): Promise<vscode.WebviewPanel> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				// If panel already exists and is visible, reveal it
				if (this._currentPanel) {
					this._currentPanel.reveal(vscode.ViewColumn.One);
					return this._currentPanel;
				}

				const logoTtitle = this._isDebugMode ? 'Robert — Logo — DEBUG' : 'Robert — Logo';
				const panel = vscode.window.createWebviewPanel('robert.logo', logoTtitle, vscode.ViewColumn.One, {
					enableScripts: false,
					localResourceRoots: [this._extensionUri]
				});

				this._currentPanel = panel;
				this._errorHandler.logViewCreation('Logo Panel', 'RobertWebviewProvider.createLogoPanel');

				const logoHtml = await this._getHtmlForLogo(panel.webview);
				panel.webview.html = logoHtml;

				panel.onDidDispose(
					() => {
						this._errorHandler.logViewDestruction('Logo Panel', 'RobertWebviewProvider.createLogoPanel');
						this._currentPanel = undefined;
					},
					undefined,
					this._disposables
				);

				return panel;
			}, 'createLogoPanel')) ||
			vscode.window.createWebviewPanel('robert.logo', this._isDebugMode ? 'Robert — Logo — DEBUG' : 'Robert — Logo', vscode.ViewColumn.One, {
				enableScripts: false,
				localResourceRoots: [this._extensionUri]
			})
		);
	}

	private async _getHtmlForLogo(webview: vscode.Webview): Promise<string> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				this._errorHandler.logInfo('Logo webview content rendered with modern IBM logo', 'RobertWebviewProvider._getHtmlForLogo');

				const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'icons', 'ibm-logo-modern.webp'));
				const rebusLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'icons', 'ibm-logo-modern.webp'));

				const placeholders = {
					logoUri: logoUri.toString(),
					rebusLogoUri: rebusLogoUri.toString()
				};

				return await this._templateManager.loadTemplate('logoWebview.html', placeholders);
			}, 'getHtmlForLogo')) || '<html><body><p>Error loading logo</p></body></html>'
		);
	}

	private async _getHtmlForSettings(_webview: vscode.Webview, context: string, webviewId?: string): Promise<string> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				this._errorHandler.logInfo(`Settings webview content rendered for context: ${context}`, 'RobertWebviewProvider._getHtmlForSettings');

				const placeholders = {
					context: context,
					webviewId: webviewId || 'unknown',
					timestamp: new Date().toISOString(),
					extensionUri: this._extensionUri.toString()
				};

				return await this._templateManager.loadTemplate('settingsWebview.html', placeholders);
			}, 'getHtmlForSettings')) || '<html><body><p>Error loading settings</p></body></html>'
		);
	}

	private async _getHtmlForWebview(webview: vscode.Webview, context: string, webviewId?: string): Promise<string> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				// Log quan es renderitza la view principal
				this._errorHandler.logInfo(`Main webview content rendered for context: ${context}`, 'RobertWebviewProvider._getHtmlForWebview');
				this._errorHandler.logInfo('Rebus logo added to main webview', 'RobertWebviewProvider._getHtmlForWebview');

				const placeholders = {
					context: context,
					webviewId: webviewId || 'unknown',
					timestamp: new Date().toISOString(),
					extensionUri: this._extensionUri.toString(),
					logoUri: webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'icons', 'ibm-logo-modern.webp')).toString(),
					rebusLogoUri: webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'icons', 'ibm-logo-modern.webp')).toString()
				};

				return await this._templateManager.loadTemplate('mainWebview.html', placeholders);
			}, 'getHtmlForWebview')) || '<html><body><p>Error loading webview</p></body></html>'
		);
	}

	private _setWebviewMessageListener(webview: vscode.Webview, webviewId?: string) {
		webview.onDidReceiveMessage(
			async (message) => {
				await this._errorHandler.executeWithErrorHandling(async () => {
					// Log webview ID for debugging
					if (webviewId) {
						this._errorHandler.logInfo(`Message from webview: ${webviewId}`, 'WebviewMessageListener');
					}
					switch (message.command) {
						case 'hello':
							vscode.window.showInformationMessage(`Hello from ${message.context}!`);
							this._errorHandler.logInfo(`Message received: hello — context=${message.context}`, 'WebviewMessageListener');
							break;
						case 'info':
							vscode.window.showInformationMessage(`Context: ${message.context}, Time: ${message.timestamp}`);
							this._errorHandler.logInfo(`Message received: info — context=${message.context} time=${message.timestamp}`, 'WebviewMessageListener');
							break;
						case 'showDemo':
							vscode.window.showInformationMessage(`Demo for ${message.demoType} not implemented yet. Try adding Chart.js, D3.js, or other libraries!`);
							this._errorHandler.logInfo(`Message received: showDemo — demoType=${message.demoType}`, 'WebviewMessageListener');
							break;
						case 'saveState':
							if (message.webviewId && message.state) {
								this._saveWebviewState(message.webviewId, message.state);
								this._errorHandler.logInfo(`State saved for webview: ${message.webviewId}`, 'WebviewMessageListener');
							}
							break;
						case 'getState':
							if (message.webviewId) {
								const savedState = this._getWebviewState(message.webviewId);
								if (savedState) {
									webview.postMessage({
										command: 'restoreState',
										state: savedState
									});
									this._errorHandler.logInfo(`State restored for webview: ${message.webviewId}`, 'WebviewMessageListener');
								}
							}
							break;
						case 'getSettings':
							if (message.webviewId) {
								try {
									const settings = this._settingsManager.getSettings();
									webview.postMessage({
										command: 'settingsLoaded',
										settings: settings
									});
									this._errorHandler.logInfo(`Settings loaded for webview: ${message.webviewId}`, 'WebviewMessageListener');
								} catch (error) {
									this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'getSettings');
									webview.postMessage({
										command: 'settingsError',
										errors: ['Failed to load settings']
									});
								}
							}
							break;
						case 'saveSettings':
							if (message.webviewId && message.settings) {
								try {
									await this._settingsManager.saveSettings(message.settings);
									webview.postMessage({
										command: 'settingsSaved',
										success: true
									});
									this._errorHandler.logInfo(`Settings saved for webview: ${message.webviewId}`, 'WebviewMessageListener');
								} catch (error) {
									this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'saveSettings');
									webview.postMessage({
										command: 'settingsError',
										errors: ['Failed to save settings']
									});
								}
							}
							break;
						case 'resetSettings':
							if (message.webviewId) {
								try {
									await this._settingsManager.resetSettings();
									const defaultSettings = this._settingsManager.getSettings();
									webview.postMessage({
										command: 'settingsLoaded',
										settings: defaultSettings
									});
									this._errorHandler.logInfo(`Settings reset for webview: ${message.webviewId}`, 'WebviewMessageListener');
								} catch (error) {
									this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'resetSettings');
									webview.postMessage({
										command: 'settingsError',
										errors: ['Failed to reset settings']
									});
								}
							}
							break;
						case 'loadProjects':
							try {
								this._errorHandler.logInfo('Loading projects from Rally API', 'WebviewMessageListener');
								const projectsResult = await getProjects();

								if (projectsResult?.projects) {
									webview.postMessage({
										command: 'projectsLoaded',
										projects: projectsResult.projects
									});
									this._errorHandler.logInfo(`Projects loaded successfully: ${projectsResult.count} projects`, 'WebviewMessageListener');
								} else {
									webview.postMessage({
										command: 'projectsError',
										error: 'No projects found'
									});
									this._errorHandler.logInfo('No projects found', 'WebviewMessageListener');
								}
							} catch (error) {
								const errorMessage = error instanceof Error ? error.message : String(error);
								this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadProjects');

								// Si és un error de configuració, mostrem un missatge més específic
								if (errorMessage.includes('Rally configuration error')) {
									webview.postMessage({
										command: 'projectsError',
										error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
										needsConfiguration: true
									});
								} else {
									webview.postMessage({
										command: 'projectsError',
										error: 'Failed to load projects'
									});
								}
							}
							break;
						case 'goBackToMain':
							this._errorHandler.logInfo(`Go back to main view requested from ${message.context}`, 'WebviewMessageListener');
							// Show main view in the current webview instead of closing it
							if (webviewId) {
								this._errorHandler.logInfo(`Showing main view in current webview: ${webviewId}`, 'WebviewMessageListener');
								webview.html = await this._getHtmlForWebview(webview, 'main', webviewId);
								this._isInSettingsView = false;
							} else {
								// Fallback: close current panel and show main panel
								if (this._currentPanel) {
									this._currentPanel.dispose();
								}
								this.showMainPanelIfHidden();
							}
							break;
						default:
							this._errorHandler.logWarning(`Unknown message command: ${message.command}`, 'WebviewMessageListener');
							break;
					}
				}, 'WebviewMessageListener');
			},
			undefined,
			this._disposables
		);
	}

	/**
	 * Save state for a specific webview
	 */
	private _saveWebviewState(webviewId: string, state: unknown): void {
		this._webviewState.set(webviewId, state);
		this._errorHandler.logInfo(`State saved for webview: ${webviewId}`, 'RobertWebviewProvider._saveWebviewState');
	}

	/**
	 * Get state for a specific webview
	 */
	private _getWebviewState(webviewId: string): unknown {
		return this._webviewState.get(webviewId);
	}

	/**
	 * Generate a unique ID for a webview
	 */
	private _generateWebviewId(context: string): string {
		return `${context}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	public dispose() {
		this._errorHandler.executeWithErrorHandlingSync(() => {
			for (const disposable of this._disposables) {
				disposable.dispose();
			}
		}, 'RobertWebviewProvider.dispose');
	}
}
