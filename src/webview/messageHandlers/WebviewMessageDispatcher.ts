import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import { RallyMessageHandler } from './RallyMessageHandler';
import { SearchMessageHandler } from './SearchMessageHandler';
import { CollaborationMessageHandler } from './CollaborationMessageHandler';
import { CalendarMessageHandler } from './CalendarMessageHandler';
import { RecentlyViewedMessageHandler } from './RecentlyViewedMessageHandler';
import { PinnedItemsMessageHandler } from './PinnedItemsMessageHandler';
import { CollaborationClient } from '../../libs/collaboration/collaborationClient';
import { SettingsManager } from '../../SettingsManager';
import { isTestTabEnabled } from '../../utils/devMode';
import { DEFAULT_CURSOR_AGENT_PROMPT, openCursorAgentWithPrompt } from '../../utils/cursorAgent';
import { CURSOR_CLI_POC_PROMPT, requestCursorCliInsights } from '../../utils/cursorCliAgent';
import { requestLanguageModelInsights } from '../../utils/languageModel';

/** Navigation state synced between webviews within the same extension-host session. */
export type NavigationState = Record<string, unknown>;

const LEGACY_NAVIGATION_STATE_KEY = 'robert.navigationState';

/**
 * Central dispatcher for all webview messages
 * Routes messages to appropriate handlers based on command type
 */
export class WebviewMessageDispatcher {
	private static sessionNavigationState: NavigationState | undefined;

	private rallyHandler: RallyMessageHandler;
	private searchHandler: SearchMessageHandler;
	private collaborationHandler: CollaborationMessageHandler;
	private calendarHandler: CalendarMessageHandler;
	private recentlyViewedHandler: RecentlyViewedMessageHandler;
	private pinnedItemsHandler: PinnedItemsMessageHandler;

	constructor(
		private errorHandler: ErrorHandler,
		private collaborationClient: CollaborationClient,
		private context: vscode.ExtensionContext
	) {
		this.rallyHandler = new RallyMessageHandler(errorHandler);
		this.searchHandler = new SearchMessageHandler(errorHandler);
		this.collaborationHandler = new CollaborationMessageHandler(errorHandler, collaborationClient);
		this.calendarHandler = new CalendarMessageHandler(errorHandler, collaborationClient, context);
		this.recentlyViewedHandler = new RecentlyViewedMessageHandler(errorHandler, context);
		this.pinnedItemsHandler = new PinnedItemsMessageHandler(errorHandler, context);
	}

	/** Clears in-session navigation state (e.g. on extension reload). */
	public static clearSessionNavigationState(): void {
		WebviewMessageDispatcher.sessionNavigationState = undefined;
	}

	/** Removes navigation state persisted across sessions by older versions. */
	public static clearLegacyPersistedNavigationState(context: vscode.ExtensionContext): void {
		void context.globalState.update(LEGACY_NAVIGATION_STATE_KEY, undefined);
	}

	/**
	 * Dispatch a message to the appropriate handler
	 * Returns true if message was handled, false otherwise
	 */
	public async dispatch(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		try {
			// Try each handler in sequence
			if (await this.rallyHandler.handle(command, webview, message)) {
				return true;
			}
			if (await this.searchHandler.handle(command, webview, message)) {
				return true;
			}
			if (await this.collaborationHandler.handle(command, webview, message)) {
				return true;
			}
			if (await this.calendarHandler.handle(command, webview, message)) {
				return true;
			}
			if (await this.recentlyViewedHandler.handle(command, webview, message)) {
				return true;
			}
			if (await this.pinnedItemsHandler.handle(command, webview, message)) {
				return true;
			}

			// Handle remaining misc commands
			return await this.handleMiscCommands(command, webview, message);
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), `dispatch.${command}`);
			return true;
		}
	}

	/**
	 * Handle miscellaneous webview commands that don't fit in the main categories
	 */
	private async handleMiscCommands(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'webviewReady':
				this.errorHandler.logInfo(`Webview ready: context=${message.context}`, 'WebviewMessageDispatcher');
				await webview.postMessage({
					command: 'devModeInit',
					devMode: isTestTabEnabled(),
					debugMode: SettingsManager.getInstance().getSetting('debugMode')
				});
				return true;

			case 'hello':
				vscode.window.showInformationMessage(`Hello from ${message.context}!`);
				this.errorHandler.logInfo(`Message received: hello — context=${message.context}`, 'WebviewMessageDispatcher');
				return true;

			case 'info':
				vscode.window.showInformationMessage(`Context: ${message.context}, Time: ${message.timestamp}`);
				this.errorHandler.logInfo(`Message received: info — context=${message.context} time=${message.timestamp}`, 'WebviewMessageDispatcher');
				return true;

			case 'showDemo':
				vscode.window.showInformationMessage(`Demo for ${message.demoType} not implemented yet. Try adding Chart.js, D3.js, or other libraries!`);
				this.errorHandler.logInfo(`Message received: showDemo — demoType=${message.demoType}`, 'WebviewMessageDispatcher');
				return true;

			case 'saveState':
				if (message.state) {
					WebviewMessageDispatcher.sessionNavigationState = message.state as NavigationState;
				}
				return true;

			case 'getState':
				const savedState = WebviewMessageDispatcher.sessionNavigationState;
				if (savedState) {
					webview.postMessage({
						command: 'restoreState',
						state: savedState
					});
					this.errorHandler.logInfo(`Shared navigation state restored`, 'WebviewMessageDispatcher');
				}
				return true;

			case 'openTutorialInEditor':
				if (message.tutorial) {
					try {
						await this.openTutorialInEditor(message.tutorial);
						this.errorHandler.logInfo(`Tutorial opened in editor: ${message.tutorial.title}`, 'WebviewMessageDispatcher');
					} catch (error) {
						this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'openTutorialInEditor');
					}
				}
				return true;

			case 'webviewError':
				this.errorHandler.logWarning(`Frontend error (${message.type ?? message.source ?? 'unknown'}) from ${message.webviewId ?? 'unknown webview'}: ${message.errorMessage ?? message.message ?? 'No message provided'}`, 'WebviewMessageDispatcher.webviewError');
				if (message.errorStack || message.stack) {
					this.errorHandler.logInfo(String(message.errorStack ?? message.stack), 'WebviewMessageDispatcher.webviewErrorStack');
				}
				return true;

			case 'subscribeCollaborationUserStory':
				// WebSocket subscription handled by caller
				return true;

			case 'unsubscribeCollaborationUserStory':
				// WebSocket unsubscription handled by caller
				return true;

			case 'logDebug':
				if (message.message && message.context) {
					this.errorHandler.logDebug(message.message as string, message.context as string);
				}
				return true;

			case 'openCursorAgentPrompt':
				if (!isTestTabEnabled()) {
					return true;
				}
				try {
					const prompt = typeof message.prompt === 'string' && message.prompt.trim() ? message.prompt : DEFAULT_CURSOR_AGENT_PROMPT;
					const target = await openCursorAgentWithPrompt(prompt);
					const label = target === 'cursor' ? 'Cursor agent' : 'VS Code chat';
					vscode.window.showInformationMessage(`Prompt prepared in ${label}. Review and submit when ready.`);
					this.errorHandler.logInfo(`Opened ${label} with prepared prompt`, 'WebviewMessageDispatcher.openCursorAgentPrompt');
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.errorHandler.handleError(err, 'WebviewMessageDispatcher.openCursorAgentPrompt');
					vscode.window.showErrorMessage(`Could not open agent chat: ${err.message}`);
				}
				return true;

			case 'requestLanguageModelInsights':
				if (!isTestTabEnabled()) {
					return true;
				}
				try {
					const prompt = typeof message.prompt === 'string' && message.prompt.trim() ? message.prompt : DEFAULT_CURSOR_AGENT_PROMPT;
					const result = await requestLanguageModelInsights(prompt);
					await webview.postMessage({
						command: 'languageModelInsightsResult',
						text: result.text,
						modelName: result.modelName
					});
					this.errorHandler.logInfo(`Language model insights received (${result.modelName})`, 'WebviewMessageDispatcher.requestLanguageModelInsights');
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.errorHandler.handleError(err, 'WebviewMessageDispatcher.requestLanguageModelInsights');
					await webview.postMessage({
						command: 'languageModelInsightsError',
						error: err.message
					});
				}
				return true;

			case 'requestCursorCliInsights':
				if (!isTestTabEnabled()) {
					await webview.postMessage({
						command: 'cursorCliInsightsError',
						error: 'Test tab handlers are disabled. Enable robert.debugMode or run the extension from F5 (Extension Development Host).'
					});
					return true;
				}
				try {
					const prompt = typeof message.prompt === 'string' && message.prompt.trim() ? message.prompt : CURSOR_CLI_POC_PROMPT;
					await webview.postMessage({ command: 'cursorCliInsightsStarted' });
					this.errorHandler.logInfo('Cursor CLI insights request started', 'WebviewMessageDispatcher.requestCursorCliInsights');
					const result = await requestCursorCliInsights(prompt);
					await webview.postMessage({
						command: 'cursorCliInsightsResult',
						text: result.text,
						agentPath: result.agentPath,
						model: result.model
					});
					this.errorHandler.logInfo(`Cursor CLI insights received (${result.agentPath})`, 'WebviewMessageDispatcher.requestCursorCliInsights');
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					this.errorHandler.handleError(err, 'WebviewMessageDispatcher.requestCursorCliInsights');
					await webview.postMessage({
						command: 'cursorCliInsightsError',
						error: err.message
					});
				}
				return true;

			default:
				return false;
		}
	}

	/**
	 * Open a tutorial in a new editor window with markdown preview
	 */
	private async openTutorialInEditor(tutorial: any): Promise<void> {
		const tutorialContent = this.generateTutorialMarkdown(tutorial);

		const document = await vscode.workspace.openTextDocument({
			content: tutorialContent,
			language: 'markdown'
		});

		await vscode.window.showTextDocument(document, {
			viewColumn: vscode.ViewColumn.One,
			preview: false
		});

		await vscode.commands.executeCommand('markdown.showPreviewToSide');
	}

	/**
	 * Generate markdown content for a tutorial
	 */
	private generateTutorialMarkdown(tutorial: any): string {
		let markdown = `# ${tutorial.title}\n\n`;
		markdown += `> Master ${tutorial.title.toLowerCase()} with hands-on examples and best practices.\n\n`;

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
}
