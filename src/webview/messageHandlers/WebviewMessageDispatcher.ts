import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import { RallyMessageHandler } from './RallyMessageHandler';
import { SearchMessageHandler } from './SearchMessageHandler';
import { CollaborationMessageHandler } from './CollaborationMessageHandler';
import { CalendarMessageHandler } from './CalendarMessageHandler';
import { CollaborationClient } from '../../libs/collaboration/collaborationClient';

/**
 * Central dispatcher for all webview messages
 * Routes messages to appropriate handlers based on command type
 */
export class WebviewMessageDispatcher {
	private rallyHandler: RallyMessageHandler;
	private searchHandler: SearchMessageHandler;
	private collaborationHandler: CollaborationMessageHandler;
	private calendarHandler: CalendarMessageHandler;

	constructor(
		private errorHandler: ErrorHandler,
		private collaborationClient: CollaborationClient,
		private context: vscode.ExtensionContext
	) {
		this.rallyHandler = new RallyMessageHandler(errorHandler);
		this.searchHandler = new SearchMessageHandler(errorHandler);
		this.collaborationHandler = new CollaborationMessageHandler(errorHandler, collaborationClient);
		this.calendarHandler = new CalendarMessageHandler(errorHandler, collaborationClient, context);
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
					this.context.globalState.update('robert.navigationState', message.state);
				}
				return true;

			case 'getState':
				const savedState = this.context.globalState.get('robert.navigationState');
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
