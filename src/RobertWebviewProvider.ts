import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';
import { getCurrentUser, getProjects, getIterations } from './libs/rally/rallyServices';
import { setRallyBroadcaster } from './libs/rally/rallyCall';
import { validateRallyConfiguration } from './libs/rally/utils';
import { SettingsManager } from './SettingsManager';
import { CollaborationClient } from './libs/collaboration/collaborationClient';
import { WebSocketClient } from './libs/collaboration/websocketClient';
import { WebviewContentManager } from './webview/WebviewContentManager';
import { WebviewMessageDispatcher } from './webview/messageHandlers/WebviewMessageDispatcher';

export class RobertWebviewProvider implements vscode.WebviewViewProvider, vscode.CustomTextEditorProvider {
	public static readonly viewType = 'robert.mainView';
	public static readonly editorType = 'robert.editor';

	private _disposables: vscode.Disposable[] = [];
	private _currentPanel: vscode.WebviewPanel | undefined;
	private _currentView?: vscode.WebviewView;
	private _errorHandler: ErrorHandler;
	private _settingsManager: SettingsManager;
	private _collaborationClient: CollaborationClient;
	private _websocketClient: WebSocketClient;
	private _contentManager: WebviewContentManager;
	private _messageDispatcher: WebviewMessageDispatcher;

	// Debug mode state
	private _isDebugMode: boolean = false;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext
	) {
		this._errorHandler = ErrorHandler.getInstance();
		this._settingsManager = SettingsManager.getInstance();
		this._collaborationClient = CollaborationClient.getInstance();
		this._websocketClient = WebSocketClient.getInstance();
		this._contentManager = new WebviewContentManager(this._extensionUri, this._errorHandler);
		this._messageDispatcher = new WebviewMessageDispatcher(this._errorHandler, this._collaborationClient, this._context);

		this.initializeCollaboration();
	}

	/**
	 * Maps technical collaboration/HTTP errors to user-friendly messages for the UI.
	 */
	private getCollaborationErrorMessage(error: unknown): string {
		const raw = error instanceof Error ? error.message : String(error);
		if (/HTTP 502|502 Bad Gateway/i.test(raw)) {
			return 'The collaboration server is not available. Check that the server is running and the URL is correct.';
		}
		if (/HTTP 503|503 Service Unavailable/i.test(raw)) {
			return 'The collaboration service is temporarily unavailable. Try again later.';
		}
		if (/HTTP 504|504 Gateway Timeout/i.test(raw)) {
			return 'The collaboration server took too long to respond. Try again later.';
		}
		if (/HTTP 404|404 Not Found/i.test(raw)) {
			return 'The collaboration service was not found. Check the server URL.';
		}
		if (/fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(raw)) {
			return 'Could not connect to the collaboration server. Check the URL and your network.';
		}
		if (/Collaboration server URL not configured/i.test(raw)) {
			return 'Collaboration server URL is not set. Configure it in extension settings.';
		}
		if (/Rally User ID is required/i.test(raw)) {
			return 'Rally user is required for collaboration. Ensure you are signed in to Rally.';
		}
		return raw || 'Something went wrong with the collaboration service.';
	}

	private async initializeCollaboration(): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			const settings = this._settingsManager.getSettings();

			// Always set server URL and user info, even if collaboration is disabled
			// This ensures they're available if the user enables collaboration later
			this._collaborationClient.setServerUrl(settings.collaborationServerUrl);
			this._websocketClient.setServerUrl(settings.collaborationServerUrl);

			// Get current user from Rally
			let rallyUserId = '';
			let displayName = 'Unknown User';

			try {
				const userResult = await getCurrentUser();
				if (userResult?.user) {
					rallyUserId = userResult.user.objectId || userResult.user.userName || '';
					displayName = userResult.user.displayName || userResult.user.userName || 'Unknown User';
					this._errorHandler.logInfo(`Rally user retrieved: ${displayName} (${rallyUserId})`, 'RobertWebviewProvider.initializeCollaboration');
				}
			} catch (error) {
				this._errorHandler.logWarning(`Failed to get Rally user: ${error instanceof Error ? error.message : String(error)}`, 'RobertWebviewProvider.initializeCollaboration');
			}

			// Fallback: Use machine username if Rally user not available
			if (!rallyUserId) {
				const os = await import('os');
				const fallbackUserId = `local-${os.userInfo().username}`;
				const fallbackDisplayName = os.userInfo().username || 'Local User';

				this._errorHandler.logWarning(`Rally user not available, using fallback: ${fallbackDisplayName} (${fallbackUserId})`, 'RobertWebviewProvider.initializeCollaboration');

				rallyUserId = fallbackUserId;
				displayName = fallbackDisplayName;
			}

			// Set user info for collaboration clients
			this._collaborationClient.setUserInfo(rallyUserId, displayName);
			this._websocketClient.setUserInfo(rallyUserId, displayName);

			// Only connect WebSocket if collaboration is enabled
			if (!settings.collaborationEnabled) {
				this._errorHandler.logInfo('Collaboration features disabled, user info configured but not connecting', 'RobertWebviewProvider.initializeCollaboration');
				return;
			}

			// Connect WebSocket if auto-connect is enabled
			if (settings.collaborationAutoConnect) {
				try {
					await this._websocketClient.connect();
					this._websocketClient.subscribeNotifications();

					// Setup WebSocket event handlers
					this._websocketClient.on('notification:new', (data: any) => {
						this.broadcastToWebviews({
							command: 'collaborationNewNotification',
							notification: data.notification
						});
					});

					this._websocketClient.on('message:new', (data: any) => {
						this.broadcastToWebviews({
							command: 'collaborationNewMessage',
							message: data.message
						});
					});

					this._websocketClient.on('message:updated', (data: any) => {
						this.broadcastToWebviews({
							command: 'collaborationMessageUpdated',
							message: data.message
						});
					});

					this._errorHandler.logInfo('Collaboration WebSocket connected successfully', 'RobertWebviewProvider.initializeCollaboration');
				} catch (wsError) {
					this._errorHandler.logWarning(`Failed to connect WebSocket: ${wsError instanceof Error ? wsError.message : String(wsError)}`, 'RobertWebviewProvider.initializeCollaboration');
				}
			}
		}, 'RobertWebviewProvider.initializeCollaboration');
	}

	private broadcastToWebviews(message: Record<string, unknown>): void {
		if (this._currentView) {
			Promise.resolve(this._currentView.webview.postMessage(message)).catch((err: unknown) => {
				this._errorHandler.logWarning(`Failed to post message to view: ${err}`, 'RobertWebviewProvider.broadcastToWebviews');
			});
		}
		if (this._currentPanel) {
			Promise.resolve(this._currentPanel.webview.postMessage(message)).catch((err: unknown) => {
				this._errorHandler.logWarning(`Failed to post message to panel: ${err}`, 'RobertWebviewProvider.broadcastToWebviews');
			});
		}
	}

	/**
	 * Set debug mode state
	 */
	public setDebugMode(_isDebug: boolean): void {
		this._isDebugMode = _isDebug;
	}

	/**
	 * Implement CustomTextEditorProvider interface (required but not used)
	 */
	public async resolveCustomTextEditor(document: vscode.TextDocument, _webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
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
				return;
			}

			this._errorHandler.logDebug(`Prefetching Rally data (${trigger})`, 'RobertWebviewProvider.prefetchRallyData');

			this._errorHandler.logDebug('Starting Rally configuration validation...', 'RobertWebviewProvider.prefetchRallyData');
			const validation = await validateRallyConfiguration();

			if (!validation.isValid) {
				this._errorHandler.logWarning(`Skipping Rally prefetch: ${validation.errors.join(', ')}`, 'RobertWebviewProvider.prefetchRallyData');
				return;
			}

			const [projectsResult, iterationsResult, userResult] = await Promise.all([getProjects(), getIterations(), getCurrentUser()]);
			this._errorHandler.logDebug(`Prefetch completed: ${projectsResult?.count ?? 0} projects, ${iterationsResult?.count ?? 0} iterations`, 'RobertWebviewProvider.prefetchRallyData');
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
			setRallyBroadcaster(msg => this.broadcastToWebviews(msg));
			this._errorHandler.logViewCreation('Activity Bar View', 'RobertWebviewProvider.resolveWebviewView');

			// Generate unique ID for this webview instance
			const webviewId = this._generateWebviewId('activity-bar');
			webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview, 'activity-bar', webviewId);

			// Handle messages from webview
			this._setWebviewMessageListener(webviewView.webview, webviewId);

			// Handle view disposal
			webviewView.onDidDispose(
				() => {
					this._currentView = undefined;
					// Deregister broadcaster when all webviews are closed
					if (!this._currentView && !this._currentPanel) {
						setRallyBroadcaster(null);
					}
				},
				undefined,
				this._disposables
			);
		}, 'RobertWebviewProvider.resolveWebviewView');
	}

	public async createWebviewPanel(): Promise<vscode.WebviewPanel> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				// If panel already exists and is visible, reveal it
				if (this._currentPanel) {
					this._errorHandler.logInfo('Webview panel already exists, revealing it', 'RobertWebviewProvider.createWebviewPanel');
					this._currentPanel.reveal(vscode.ViewColumn.One);
					return this._currentPanel;
				}

				// Close any other Robert editor tabs that might be open from previous sessions
				await this._closeOtherRobertEditors();

				const panelTitle = this._isDebugMode ? 'Robert — 🐞' : 'Robert';
				const panel = vscode.window.createWebviewPanel('robert.mainPanel', panelTitle, vscode.ViewColumn.One, {
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [this._extensionUri]
				});

				this._currentPanel = panel;
				setRallyBroadcaster(msg => this.broadcastToWebviews(msg));
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
						// Deregister broadcaster when all webviews are closed
						if (!this._currentView && !this._currentPanel) {
							setRallyBroadcaster(null);
						}
					},
					undefined,
					this._disposables
				);

				// Hide Robert from activity bar and show File Explorer instead
				await this._switchFromActivityBarToFileExplorer();

				return panel;
			}, 'createWebviewPanel')) ||
			vscode.window.createWebviewPanel('robert.mainPanel', this._isDebugMode ? 'Robert — 🐞' : 'Robert', vscode.ViewColumn.One, {
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [this._extensionUri]
			})
		);
	}

	/**
	 * Hide the Robert activity bar view and switch to the File Explorer
	 * This provides a cleaner UX when opening the editor in a separate panel
	 */
	private async _switchFromActivityBarToFileExplorer(): Promise<void> {
		try {
			// Hide the Robert activity bar by switching to File Explorer
			this._errorHandler.logInfo('Switching from Robert Activity Bar to File Explorer', 'RobertWebviewProvider._switchFromActivityBarToFileExplorer');

			// Focus on the File Explorer view
			await vscode.commands.executeCommand('workbench.view.explorer');
			this._errorHandler.logInfo('✅ File Explorer is now visible in the activity bar', 'RobertWebviewProvider._switchFromActivityBarToFileExplorer');
		} catch (error) {
			// Log warning but don't fail the operation
			this._errorHandler.logWarning(`Failed to switch to File Explorer: ${error instanceof Error ? error.message : String(error)}`, 'RobertWebviewProvider._switchFromActivityBarToFileExplorer');
		}
	}

	/**
	 * Close any other Robert editor tabs that might be open (excluding the current panel)
	 * This prevents accumulation of editor tabs when the extension reloads
	 */
	private async _closeOtherRobertEditors(): Promise<void> {
		try {
			// Get all open editor tabs from all tab groups
			const allTabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);

			// Filter for Robert editor tabs that are not the current panel
			const robertEditorTabs = allTabs.filter(tab => {
				// Check if it's a Robert panel/editor by checking the tab label
				const isRobertEditor = tab.label && (tab.label.includes('Robert') || tab.label === 'robert');
				const isDifferentFromCurrent = !(tab.input === this._currentPanel?.webview);

				return isRobertEditor && isDifferentFromCurrent;
			});

			if (robertEditorTabs.length > 0) {
				this._errorHandler.logInfo(`Found ${robertEditorTabs.length} other Robert editor tab(s). Closing them...`, 'RobertWebviewProvider._closeOtherRobertEditors');

				// Close each tab
				for (const tab of robertEditorTabs) {
					const result = await vscode.window.tabGroups.close(tab);
					if (result) {
						this._errorHandler.logInfo(`Closed editor tab: ${tab.label}`, 'RobertWebviewProvider._closeOtherRobertEditors');
					}
				}
			}
		} catch (error) {
			// Log warning but don't fail the operation
			this._errorHandler.logWarning(`Error closing other Robert editors: ${error instanceof Error ? error.message : String(error)}`, 'RobertWebviewProvider._closeOtherRobertEditors');
		}
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

	public async createLoadingPanel(): Promise<vscode.WebviewPanel> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				// If panel already exists and is visible, reveal it
				if (this._currentPanel) {
					this._currentPanel.reveal(vscode.ViewColumn.One);
					return this._currentPanel;
				}

				const loadingTitle = this._isDebugMode ? 'Robert — Loading — 🐞' : 'Robert — Loading';
				const panel = vscode.window.createWebviewPanel('robert.loading', loadingTitle, vscode.ViewColumn.One, {
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [this._extensionUri]
				});

				this._currentPanel = panel;
				this._errorHandler.logViewCreation('Loading Panel', 'RobertWebviewProvider.createLoadingPanel');

				const loadingHtml = await this._getHtmlForLoading(panel.webview);
				panel.webview.html = loadingHtml;

				// Handle messages from loading screen
				this._setLoadingScreenMessageListener(panel.webview);

				panel.onDidDispose(
					() => {
						this._errorHandler.logViewDestruction('Loading Panel', 'RobertWebviewProvider.createLoadingPanel');
						this._currentPanel = undefined;
					},
					undefined,
					this._disposables
				);

				return panel;
			}, 'createLoadingPanel')) ||
			vscode.window.createWebviewPanel('robert.loading', this._isDebugMode ? 'Robert — Loading — 🐞' : 'Robert — Loading', vscode.ViewColumn.One, {
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [this._extensionUri]
			})
		);
	}

	public async createLogoPanel(): Promise<vscode.WebviewPanel> {
		return (
			(await this._errorHandler.executeWithErrorHandling(async () => {
				// If panel already exists and is visible, reveal it
				if (this._currentPanel) {
					this._currentPanel.reveal(vscode.ViewColumn.One);
					return this._currentPanel;
				}

				const logoTtitle = this._isDebugMode ? 'Robert — Logo — 🐞' : 'Robert — Logo';
				const panel = vscode.window.createWebviewPanel('robert.logo', logoTtitle, vscode.ViewColumn.One, {
					enableScripts: false,
					retainContextWhenHidden: true,
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
			vscode.window.createWebviewPanel('robert.logo', this._isDebugMode ? 'Robert — Logo — 🐞' : 'Robert — Logo', vscode.ViewColumn.One, {
				enableScripts: false,
				retainContextWhenHidden: true,
				localResourceRoots: [this._extensionUri]
			})
		);
	}

	private async _getHtmlForLoading(webview: vscode.Webview): Promise<string> {
		return this._contentManager.getHtmlForLoading(webview);
	}

	private async _getHtmlForLogo(webview: vscode.Webview): Promise<string> {
		return this._contentManager.getHtmlForLogo(webview, this._getRobertThemeClass());
	}

	private async _getHtmlForWebview(webview: vscode.Webview, context: string, webviewId?: string): Promise<string> {
		return this._contentManager.getHtmlForWebview(webview, context, webviewId, this._getRobertThemeClass());
	}

	/**
	 * Returns the theme class for the webview body based on VS Code active color theme.
	 * Used so Robert UI follows light/dark from the editor while using Radix Colors.
	 */
	private _getRobertThemeClass(): string {
		const kind = vscode.window.activeColorTheme.kind;
		const isLight = kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
		return isLight ? 'robert-light-theme' : 'robert-dark-theme dark';
	}

	private _setLoadingScreenMessageListener(webview: vscode.Webview) {
		this._errorHandler.logInfo('Setting up message listener for loading screen', 'LoadingScreenMessageListener');
		webview.onDidReceiveMessage(
			async message => {
				await this._errorHandler.executeWithErrorHandling(async () => {
					this._errorHandler.logDebug(`Loading screen message received: ${message.command}`, 'LoadingScreenMessageListener');

					switch (message.command) {
						case 'loadingScreenReady':
							this._errorHandler.logInfo('Loading screen is ready', 'LoadingScreenMessageListener');
							break;
						case 'videoLoadingComplete':
							this._errorHandler.logInfo('Video playback completed - dismissing loading screen', 'LoadingScreenMessageListener');
							if (this._currentPanel) {
								this._currentPanel.dispose();
								this._currentPanel = undefined;
							}
							await this.showMainPanelIfHidden();
							break;
						case 'videoLoadingError':
						case 'videoPlaybackError':
							this._errorHandler.logWarning(`Video playback failed: ${message.error || message.message}`, 'LoadingScreenMessageListener');
							if (this._currentPanel) {
								this._currentPanel.dispose();
								this._currentPanel = undefined;
							}
							await this.showMainPanelIfHidden();
							break;
						default:
							this._errorHandler.logWarning(`Unknown loading screen message: ${message.command}`, 'LoadingScreenMessageListener');
							break;
					}
				}, 'LoadingScreenMessageListener');
			},
			undefined,
			this._disposables
		);
	}

	private _setWebviewMessageListener(webview: vscode.Webview, webviewId?: string) {
		this._errorHandler.logInfo(`Setting up message listener for webview: ${webviewId || 'unknown'}`, 'WebviewMessageListener');
		webview.onDidReceiveMessage(
			async message => {
				await this._errorHandler.executeWithErrorHandling(async () => {
					const handled = await this._messageDispatcher.dispatch(message.command, webview, message);

					// Handle WebSocket subscriptions separately since they need WebSocket client
					if (message.command === 'subscribeCollaborationUserStory' && this._websocketClient.isConnected()) {
						this._websocketClient.subscribeUserStory(message.userStoryId);
					} else if (message.command === 'unsubscribeCollaborationUserStory' && this._websocketClient.isConnected()) {
						this._websocketClient.unsubscribeUserStory(message.userStoryId);
					}

					if (!handled) {
						this._errorHandler.logWarning(`Unknown message command: ${message.command}`, 'WebviewMessageListener');
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
		this._context.globalState.update(`robert.webview.${webviewId}`, state);
		this._errorHandler.logInfo(`State saved for webview: ${webviewId}`, 'RobertWebviewProvider._saveWebviewState');
	}

	/**
	 * Get state for a specific webview
	 */
	private _getWebviewState(webviewId: string): unknown {
		return this._context.globalState.get(`robert.webview.${webviewId}`);
	}

	/**
	 * Generate a unique ID for a webview
	 */
	private _generateWebviewId(context: string): string {
		return `${context}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Reset and refresh all webviews after extension reload
	 * Sends a refresh message to all active webviews to reload their data
	 */
	public async resetAndRefreshWebviews(): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			this._errorHandler.logInfo('Refreshing all webviews after extension reload', 'RobertWebviewProvider.resetAndRefreshWebviews');

			// Send refresh message to activity bar view
			if (this._currentView) {
				try {
					this._errorHandler.logInfo('Refreshing activity bar webview...', 'RobertWebviewProvider.resetAndRefreshWebviews');
					await this._currentView.webview.postMessage({
						command: 'refresh',
						timestamp: new Date().toISOString()
					});
				} catch (error) {
					this._errorHandler.logWarning(`Failed to refresh activity bar view: ${error instanceof Error ? error.message : String(error)}`, 'RobertWebviewProvider.resetAndRefreshWebviews');
				}
			}

			// Send refresh message to panel view
			if (this._currentPanel) {
				try {
					this._errorHandler.logInfo('Refreshing panel webview...', 'RobertWebviewProvider.resetAndRefreshWebviews');
					await this._currentPanel.webview.postMessage({
						command: 'refresh',
						timestamp: new Date().toISOString()
					});
				} catch (error) {
					this._errorHandler.logWarning(`Failed to refresh panel view: ${error instanceof Error ? error.message : String(error)}`, 'RobertWebviewProvider.resetAndRefreshWebviews');
				}
			}

			this._errorHandler.logInfo('Webview refresh messages sent successfully', 'RobertWebviewProvider.resetAndRefreshWebviews');
		}, 'RobertWebviewProvider.resetAndRefreshWebviews');
	}

	public dispose() {
		this._errorHandler.executeWithErrorHandlingSync(() => {
			// Disconnect WebSocket
			this._websocketClient.disconnect();

			for (const disposable of this._disposables) {
				disposable.dispose();
			}
		}, 'RobertWebviewProvider.dispose');
	}
}
