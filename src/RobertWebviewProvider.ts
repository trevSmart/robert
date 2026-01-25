import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ErrorHandler } from './ErrorHandler';
import { getProjects, getIterations, getUserStories, getTasks, getDefects, getCurrentUser } from './libs/rally/rallyServices';
import { validateRallyConfiguration } from './libs/rally/utils';
import { SettingsManager } from './SettingsManager';

export class RobertWebviewProvider implements vscode.WebviewViewProvider, vscode.CustomTextEditorProvider {
	public static readonly viewType = 'robert.mainView';
	public static readonly editorType = 'robert.editor';

	private _disposables: vscode.Disposable[] = [];
	private _currentPanel: vscode.WebviewPanel | undefined;
	private _currentView?: vscode.WebviewView;
	private _errorHandler: ErrorHandler;
	private _settingsManager: SettingsManager;

	// State persistence for webview
	private _webviewState: Map<string, unknown> = new Map();

	// Debug mode state
	private _isDebugMode: boolean = false;

	constructor(private readonly _extensionUri: vscode.Uri) {
		this._errorHandler = ErrorHandler.getInstance();
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

	/**
	 * Implement CustomTextEditorProvider interface (required but not used)
	 */
	public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			this._errorHandler.logInfo(`Resolving custom text editor for: ${document.uri.fsPath}`, 'RobertWebviewProvider.resolveCustomTextEditor');
			// This is a placeholder implementation; not currently used
		}, 'resolveCustomTextEditor');
	}

	/**
	 * Prefetch Rally data to warm the cache when the extension activates.
	 */
	public async prefetchRallyData(trigger: string = 'activation'): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			const settings = this._settingsManager.getSettings();
			if (!settings.autoRefresh) {
				this._errorHandler.logInfo('Auto refresh disabled; skipping Rally prefetch', 'RobertWebviewProvider.prefetchRallyData');
				return;
			}

			this._errorHandler.logInfo(`Prefetching Rally data (${trigger})`, 'RobertWebviewProvider.prefetchRallyData');

			// Log current Rally settings for debugging
			const rallyInstance = this._settingsManager.getSetting('rallyInstance');
			const rallyApiKey = this._settingsManager.getSetting('rallyApiKey');
			const rallyProjectName = this._settingsManager.getSetting('rallyProjectName')?.trim();
			this._errorHandler.logInfo(`Rally Settings - Instance: ${rallyInstance || '(not set)'}, API Key: ${rallyApiKey ? '***' + rallyApiKey.slice(-4) : '(not set)'}, Project: ${rallyProjectName || '(not set)'}`, 'RobertWebviewProvider.prefetchRallyData');

			this._errorHandler.logInfo('Starting Rally configuration validation...', 'RobertWebviewProvider.prefetchRallyData');
			const validation = await validateRallyConfiguration();
			this._errorHandler.logInfo(`Validation completed: isValid=${validation.isValid}, errors=${validation.errors.length}`, 'RobertWebviewProvider.prefetchRallyData');

			if (!validation.isValid) {
				this._errorHandler.logWarning(`Skipping Rally prefetch: ${validation.errors.join(', ')}`, 'RobertWebviewProvider.prefetchRallyData');
				return;
			}

			this._errorHandler.logInfo('Validation passed, starting data fetch...', 'RobertWebviewProvider.prefetchRallyData');

			this._errorHandler.logInfo('Starting parallel fetch of projects, iterations and current user...', 'RobertWebviewProvider.prefetchRallyData');
			const [projectsResult, iterationsResult, userResult] = await Promise.all([getProjects(), getIterations(), getCurrentUser()]);
			this._errorHandler.logInfo(`Prefetch completed: ${projectsResult?.count ?? 0} projects, ${iterationsResult?.count ?? 0} iterations, user: ${userResult?.user ? 'loaded' : 'not loaded'}`, 'RobertWebviewProvider.prefetchRallyData');
		}, 'RobertWebviewProvider.prefetchRallyData');
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

			// Generate unique ID for this webview instance
			const webviewId = this._generateWebviewId('activity-bar');
			webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview, 'activity-bar', webviewId);

			// Handle messages from webview
			this._setWebviewMessageListener(webviewView.webview, webviewId);
		}, 'RobertWebviewProvider.resolveWebviewView');
	}

	public async createWebviewPanel(): Promise<vscode.WebviewPanel> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				// If panel already exists and is visible, reveal it
				if (this._currentPanel) {
					this._currentPanel.reveal(vscode.ViewColumn.One);
					return this._currentPanel;
				}

				const panelTitle = this._isDebugMode ? 'Robert — DEBUG' : 'Robert';
				const panel = vscode.window.createWebviewPanel('robert.mainPanel', panelTitle, vscode.ViewColumn.One, {
					enableScripts: true,
					localResourceRoots: [this._extensionUri]
				});

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
			}, 'createWebviewPanel')) ||
			vscode.window.createWebviewPanel('robert.mainPanel', this._isDebugMode ? 'Robert — DEBUG' : 'Robert', vscode.ViewColumn.One, {
				enableScripts: true,
				localResourceRoots: [this._extensionUri]
			})
		);
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
				.catch(async error => {
					this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'showMainPanelIfHidden.activityBar');
					this._errorHandler.logInfo('Failed to open activity bar view; creating separate panel', 'RobertWebviewProvider.showMainPanelIfHidden');
					await this.createWebviewPanel();
				});
		}, 'showMainPanelIfHidden');
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
				return;
			}

			// Check if we have a current panel (separate window)
			if (this._currentPanel) {
				this._errorHandler.logInfo('Showing main view in separate panel', 'RobertWebviewProvider.showMainViewInCurrentView');
				const webviewId = this._generateWebviewId('main');
				this._currentPanel.webview.html = await this._getHtmlForWebview(this._currentPanel.webview, 'main', webviewId);
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
				this._errorHandler.logInfo('Logo webview content rendered from build HTML', 'RobertWebviewProvider._getHtmlForLogo');
				const rebusLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'icons', 'ibm-logo-bee.png'));
				const interFontUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'fonts', 'Inter-Variable.woff2'));
				return this._getHtmlFromBuild(webview, 'logo.html', {
					__REBUS_LOGO_URI__: rebusLogoUri.toString(),
					__INTER_FONT_URI__: interFontUri.toString()
				});
			}, 'getHtmlForLogo')) || '<html><body><p>Error loading logo</p></body></html>'
		);
	}

	private async _getHtmlForWebview(webview: vscode.Webview, context: string, webviewId?: string): Promise<string> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				// Log quan es renderitza la view principal
				this._errorHandler.logInfo(`Main webview content rendered for context: ${context}`, 'RobertWebviewProvider._getHtmlForWebview');
				this._errorHandler.logInfo('Rebus logo added to main webview', 'RobertWebviewProvider._getHtmlForWebview');

				const rebusLogoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'icons', 'ibm-logo-bee.png'));
				const interFontUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'fonts', 'Inter-Variable.woff2'));
				return this._getHtmlFromBuild(webview, 'main.html', {
					__WEBVIEW_ID__: webviewId || 'unknown',
					__CONTEXT__: context,
					__TIMESTAMP__: new Date().toISOString(),
					__REBUS_LOGO_URI__: rebusLogoUri.toString(),
					__INTER_FONT_URI__: interFontUri.toString()
				});
			}, 'getHtmlForWebview')) || '<html><body><p>Error loading webview</p></body></html>'
		);
	}

	private _getHtmlFromBuild(webview: vscode.Webview, htmlFile: string, placeholders: Record<string, string>): string {
		const buildDirFsPath = path.join(this._extensionUri.fsPath, 'out', 'webview', 'src', 'webview');
		const htmlPath = path.join(buildDirFsPath, htmlFile);

		let html = '';
		try {
			html = fs.readFileSync(htmlPath, 'utf8');
		} catch (error) {
			this._errorHandler.logWarning(`Failed to read ${htmlFile}: ${error instanceof Error ? error.message : String(error)}`, 'RobertWebviewProvider._getHtmlFromBuild');
			return '<html><body><p>Webview UI is missing. Please rebuild the webview bundle.</p></body></html>';
		}

		for (const [key, value] of Object.entries(placeholders)) {
			html = html.split(key).join(value);
		}

		const toWebviewUri = (rawPath: string): string => {
			const clean = rawPath.replace(/^\.?\/?/, '');
			const parts = clean.split('/');
			return webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', ...parts)).toString();
		};

		html = html.replace(/\b(href|src)="([^"]+)"/g, (match, attr, value) => {
			if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('vscode-resource:') || value.startsWith('vscode-webview-resource:') || value.startsWith('#') || value.startsWith('mailto:')) {
				return match;
			}
			const uri = toWebviewUri(value.replace(/^\//, ''));
			return `${attr}="${uri}"`;
		});

		const cspMeta = this._buildCspMeta(webview);
		const bridgeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'webview-bridge.js'));
		const bridgeScript = `<script src="${bridgeUri.toString()}"></script>`;
		html = html.replace('<head>', `<head>${cspMeta}${bridgeScript}`);

		return html;
	}

	private _buildCspMeta(webview: vscode.Webview): string {
		const csp = [
			"default-src 'none'",
			`img-src ${webview.cspSource} https: data:`,
			`script-src ${webview.cspSource} 'unsafe-eval' 'unsafe-inline'`,
			`style-src ${webview.cspSource} 'unsafe-inline'`,
			`font-src ${webview.cspSource} https: data:`,
			`connect-src ${webview.cspSource} https:`,
			"frame-ancestors 'none'",
			"base-uri 'self'"
		].join('; ');
		return `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
	}

	private _setWebviewMessageListener(webview: vscode.Webview, webviewId?: string) {
		this._errorHandler.logInfo(`Setting up message listener for webview: ${webviewId || 'unknown'}`, 'WebviewMessageListener');
		webview.onDidReceiveMessage(
			async message => {
				await this._errorHandler.executeWithErrorHandling(async () => {
					// Log all incoming messages for debugging
					this._errorHandler.logInfo(`Received message: ${message.command} from webview: ${webviewId || 'unknown'}`, 'WebviewMessageListener');

					// Log webview ID for debugging
					if (webviewId) {
						this._errorHandler.logInfo(`Message from webview: ${webviewId}`, 'WebviewMessageListener');
					}
					switch (message.command) {
						case 'webviewReady':
							this._errorHandler.logInfo(`Webview ready: context=${message.context}`, 'WebviewMessageListener');
							break;
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
						case 'openTutorialInEditor':
							if (message.tutorial) {
								try {
									await this._openTutorialInEditor(message.tutorial);
									this._errorHandler.logInfo(`Tutorial opened in editor: ${message.tutorial.title}`, 'WebviewMessageListener');
								} catch (error) {
									this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'openTutorialInEditor');
								}
							}
							break;
						case 'webviewError':
							this._errorHandler.logWarning(`Frontend error (${message.type ?? message.source ?? 'unknown'}) from ${message.webviewId ?? 'unknown webview'}: ${message.errorMessage ?? message.message ?? 'No message provided'}`, 'WebviewMessageListener.webviewError');
							if (message.errorStack || message.stack) {
								this._errorHandler.logInfo(String(message.errorStack ?? message.stack), 'WebviewMessageListener.webviewErrorStack');
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
						case 'loadIterations':
							try {
								this._errorHandler.logInfo('Loading iterations from Rally API', 'WebviewMessageListener');

								this._errorHandler.logDebug('Webview received loadIterations command', 'RobertWebviewProvider');

								// Load iterations and current user in parallel
								const [iterationsResult, userResult] = await Promise.all([getIterations(), getCurrentUser()]);

								if (iterationsResult?.iterations) {
									webview.postMessage({
										command: 'iterationsLoaded',
										iterations: iterationsResult.iterations,
										debugMode: this._isDebugMode,
										currentUser: userResult?.user || null
									});
									this._errorHandler.logInfo(`Iterations loaded successfully: ${iterationsResult.count} iterations`, 'WebviewMessageListener');
									if (userResult?.user) {
										this._errorHandler.logInfo(`Current user loaded: ${userResult.user.displayName || userResult.user.userName}`, 'WebviewMessageListener');
									}
								} else {
									webview.postMessage({
										command: 'iterationsError',
										error: 'No iterations found'
									});
									this._errorHandler.logInfo('No iterations found', 'WebviewMessageListener');
								}
							} catch (error) {
								const errorMessage = error instanceof Error ? error.message : String(error);
								this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadIterations');

								// Si és un error de configuració, mostrem un missatge més específic
								if (errorMessage.includes('Rally configuration error')) {
									webview.postMessage({
										command: 'iterationsError',
										error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
										needsConfiguration: true
									});
								} else {
									webview.postMessage({
										command: 'iterationsError',
										error: 'Failed to load iterations'
									});
								}
							}
							break;
						case 'loadUserStories':
							try {
								this._errorHandler.logInfo('Loading user stories from Rally API', 'WebviewMessageListener');

								this._errorHandler.logDebug(`Webview received loadUserStories command ${message.iteration ? `for iteration: ${message.iteration}` : 'for all'}`, 'RobertWebviewProvider');

								const query = message.iteration ? { Iteration: message.iteration } : {};
								const userStoriesResult = await getUserStories(query);

								if (userStoriesResult?.userStories) {
									webview.postMessage({
										command: 'userStoriesLoaded',
										userStories: userStoriesResult.userStories
									});
									this._errorHandler.logInfo(`User stories loaded successfully: ${userStoriesResult.count} user stories`, 'WebviewMessageListener');
								} else {
									webview.postMessage({
										command: 'userStoriesError',
										error: 'No user stories found'
									});
									this._errorHandler.logInfo('No user stories found', 'WebviewMessageListener');
								}
							} catch (error) {
								const errorMessage = error instanceof Error ? error.message : String(error);
								this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStories');

								// Si és un error de configuració, mostrem un missatge més específic
								if (errorMessage.includes('Rally configuration error')) {
									webview.postMessage({
										command: 'userStoriesError',
										error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
										needsConfiguration: true
									});
								} else {
									webview.postMessage({
										command: 'userStoriesError',
										error: 'Failed to load user stories'
									});
								}
							}
							break;
						case 'loadTasks':
							try {
								this._errorHandler.logInfo('Loading tasks from Rally API', 'WebviewMessageListener');

								this._errorHandler.logDebug(`Webview received loadTasks command for user story: ${message.userStoryId}`, 'RobertWebviewProvider');

								const tasksResult = await getTasks(message.userStoryId);

								if (tasksResult?.tasks) {
									webview.postMessage({
										command: 'tasksLoaded',
										tasks: tasksResult.tasks,
										userStoryId: message.userStoryId
									});
									this._errorHandler.logInfo(`Tasks loaded successfully: ${tasksResult.count} tasks for user story ${message.userStoryId}`, 'WebviewMessageListener');
								} else {
									webview.postMessage({
										command: 'tasksError',
										error: 'No tasks found',
										userStoryId: message.userStoryId
									});
									this._errorHandler.logInfo('No tasks found', 'WebviewMessageListener');
								}
							} catch (error) {
								const errorMessage = error instanceof Error ? error.message : String(error);
								this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadTasks');

								// Si és un error de configuració, mostrem un missatge més específic
								if (errorMessage.includes('Rally configuration error')) {
									webview.postMessage({
										command: 'tasksError',
										error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
										needsConfiguration: true,
										userStoryId: message.userStoryId
									});
								} else {
									webview.postMessage({
										command: 'tasksError',
										error: 'Failed to load tasks',
										userStoryId: message.userStoryId
									});
								}
							}
							break;
						case 'loadDefects':
							try {
								this._errorHandler.logInfo('Loading defects from Rally API', 'WebviewMessageListener');

								this._errorHandler.logDebug('Webview received loadDefects command', 'RobertWebviewProvider');

								const defectsResult = await getDefects();

								if (defectsResult?.defects) {
									webview.postMessage({
										command: 'defectsLoaded',
										defects: defectsResult.defects
									});
									this._errorHandler.logInfo(`Defects loaded successfully: ${defectsResult.count} defects`, 'WebviewMessageListener');
								} else {
									webview.postMessage({
										command: 'defectsError',
										error: 'No defects found'
									});
									this._errorHandler.logInfo('No defects found', 'WebviewMessageListener');
								}
							} catch (error) {
								const errorMessage = error instanceof Error ? error.message : String(error);
								this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadDefects');

								if (errorMessage.includes('Rally configuration error')) {
									webview.postMessage({
										command: 'defectsError',
										error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
										needsConfiguration: true
									});
								} else {
									webview.postMessage({
										command: 'defectsError',
										error: 'Failed to load defects'
									});
								}
							}
							break;
						case 'loadUserStoryDefects':
							try {
								this._errorHandler.logInfo('Loading defects for user story from Rally API', 'WebviewMessageListener');

								this._errorHandler.logDebug(`Webview received loadUserStoryDefects command for user story: ${message.userStoryId}`, 'RobertWebviewProvider');

								const defectsResult = await getDefects({
									WorkProduct: `/hierarchicalrequirement/${message.userStoryId}`
								});

								if (defectsResult?.defects) {
									webview.postMessage({
										command: 'userStoryDefectsLoaded',
										defects: defectsResult.defects,
										userStoryId: message.userStoryId
									});
									this._errorHandler.logInfo(`Defects loaded successfully for user story ${message.userStoryId}: ${defectsResult.count} defects`, 'WebviewMessageListener');
								} else {
									webview.postMessage({
										command: 'userStoryDefectsError',
										error: 'No defects found',
										userStoryId: message.userStoryId
									});
									this._errorHandler.logInfo('No defects found for this user story', 'WebviewMessageListener');
								}
							} catch (error) {
								const errorMessage = error instanceof Error ? error.message : String(error);
								this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStoryDefects');

								if (errorMessage.includes('Rally configuration error')) {
									webview.postMessage({
										command: 'userStoryDefectsError',
										error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
										needsConfiguration: true,
										userStoryId: message.userStoryId
									});
								} else {
									webview.postMessage({
										command: 'userStoryDefectsError',
										error: 'Failed to load defects',
										userStoryId: message.userStoryId
									});
								}
							}
							break;
						case 'logDebug':
							if (message.message && message.context) {
								this._errorHandler.logDebug(message.message as string, message.context as string);
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

	/**
	 * Open a tutorial in a new editor window
	 */
	private async _openTutorialInEditor(tutorial: any): Promise<void> {
		const tutorialContent = this._generateTutorialMarkdown(tutorial);

		// Create a new untitled document with the tutorial content
		const document = await vscode.workspace.openTextDocument({
			content: tutorialContent,
			language: 'markdown'
		});

		// Show the document in a new editor
		await vscode.window.showTextDocument(document, {
			viewColumn: vscode.ViewColumn.One,
			preview: false
		});

		// Open the Markdown preview
		await vscode.commands.executeCommand('markdown.showPreviewToSide');
	}

	/**
	 * Generate markdown content for a tutorial
	 */
	private _generateTutorialMarkdown(tutorial: any): string {
		let markdown = `# ${tutorial.title}\n\n`;
		markdown += `> Master ${tutorial.title.toLowerCase()} with hands-on examples and best practices.\n\n`;

		// Add tutorial-specific content based on title
		switch (tutorial.title) {
			case 'Salesforce CRM Fundamentals':
				markdown += `## Understanding Salesforce CRM\n\n`;
				markdown += `Salesforce CRM is the world's leading customer relationship management platform that helps businesses connect with customers, partners, and prospects.\n\n`;
				markdown += `### Key Concepts\n\n`;
				markdown += `- **Leads**: Potential customers\n`;
				markdown += `- **Accounts**: Companies or organizations\n`;
				markdown += `- **Contacts**: Individuals within accounts\n`;
				markdown += `- **Opportunities**: Potential sales\n`;
				markdown += `- **Cases**: Customer support issues\n\n`;
				markdown += `### Getting Started\n\n`;
				markdown += `Begin by familiarizing yourself with the Salesforce interface and basic navigation. Learn how to create and manage records, and understand the relationship between different objects.\n\n`;
				break;

			case 'Lightning Web Components':
				markdown += `## Lightning Web Components (LWC)\n\n`;
				markdown += `LWC is Salesforce's modern programming model for building fast, reusable components on the Lightning Platform.\n\n`;
				markdown += `### Benefits\n\n`;
				markdown += `- Built on web standards\n`;
				markdown += `- Reusable across Salesforce experiences\n`;
				markdown += `- Performance optimized\n`;
				markdown += `- Modern JavaScript features\n\n`;
				break;

			case 'Salesforce Integration APIs':
				markdown += `## Connecting Systems with Salesforce APIs\n\n`;
				markdown += `Salesforce provides powerful APIs to integrate with external systems and build connected experiences.\n\n`;
				markdown += `### Available APIs\n\n`;
				markdown += `- **REST API**: Modern, resource-based API\n`;
				markdown += `- **SOAP API**: Enterprise-grade API\n`;
				markdown += `- **Bulk API**: High-volume data operations\n`;
				markdown += `- **Streaming API**: Real-time data updates\n\n`;
				markdown += `### Authentication\n\n`;
				markdown += `Use OAuth 2.0 for secure authentication. Salesforce supports various OAuth flows including:\n\n`;
				markdown += `- Authorization Code Flow\n`;
				markdown += `- Client Credentials Flow\n`;
				markdown += `- Username-Password Flow\n\n`;
				break;

			case 'Salesforce Einstein AI':
				markdown += `## Leveraging AI in Salesforce\n\n`;
				markdown += `Salesforce Einstein brings artificial intelligence capabilities to your CRM, helping you gain insights and automate processes.\n\n`;
				markdown += `### Einstein Products\n\n`;
				markdown += `- **Salesforce Einstein Sales**: Predictive lead scoring and opportunity insights\n`;
				markdown += `- **Salesforce Einstein Service**: Case classification and automated solutions\n`;
				markdown += `- **Salesforce Einstein Marketing**: Personalized campaigns and recommendations\n`;
				markdown += `- **Salesforce Einstein Relationship Insights**: Contact and account insights\n\n`;
				break;

			case 'Salesforce DevOps & CI/CD':
				markdown += `## Implementing DevOps in Salesforce\n\n`;
				markdown += `DevOps practices help teams deliver Salesforce changes faster and more reliably through automation and collaboration.\n\n`;
				markdown += `### Key Tools\n\n`;
				markdown += `- **Salesforce CLI**: Command-line interface\n`;
				markdown += `- **Git**: Version control\n`;
				markdown += `- **CI/CD Platforms**: GitHub Actions, Jenkins, etc.\n`;
				markdown += `- **Testing Frameworks**: Jest, Selenium\n\n`;
				markdown += `### Best Practices\n\n`;
				markdown += `- Use source control for all metadata\n`;
				markdown += `- Implement automated testing\n`;
				markdown += `- Use deployment pipelines\n`;
				markdown += `- Monitor and measure performance\n\n`;
				break;
		}

		markdown += `---\n\n`;
		markdown += `*Generated by IBM Robert - ${new Date().toLocaleDateString()}*`;

		return markdown;
	}

	public dispose() {
		this._errorHandler.executeWithErrorHandlingSync(() => {
			for (const disposable of this._disposables) {
				disposable.dispose();
			}
		}, 'RobertWebviewProvider.dispose');
	}
}
