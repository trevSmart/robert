import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import { CollaborationClient } from '../../libs/collaboration/collaborationClient';

/**
 * Handles collaboration and messaging-related webview messages
 * Manages messages, notifications, and team interactions
 */
export class CollaborationMessageHandler {
	constructor(
		private errorHandler: ErrorHandler,
		private collaborationClient: CollaborationClient
	) {}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'loadCollaborationMessages':
				await this.handleLoadCollaborationMessages(webview, message);
				return true;
			case 'createCollaborationMessage':
				await this.handleCreateCollaborationMessage(webview, message);
				return true;
			case 'createCollaborationMessageReply':
				await this.handleCreateCollaborationMessageReply(webview, message);
				return true;
			case 'loadCollaborationNotifications':
				await this.handleLoadCollaborationNotifications(webview, message);
				return true;
			case 'markCollaborationNotificationAsRead':
				await this.handleMarkCollaborationNotificationAsRead(webview, message);
				return true;
			case 'markAllCollaborationNotificationsAsRead':
				await this.handleMarkAllCollaborationNotificationsAsRead(webview);
				return true;
			case 'attendCollaborationMessage':
				await this.handleAttendCollaborationMessage(webview, message);
				return true;
			case 'unattendCollaborationMessage':
				await this.handleUnattendCollaborationMessage(webview, message);
				return true;
			case 'markCollaborationMessageAsRead':
				await this.handleMarkCollaborationMessageAsRead(webview, message);
				return true;
			case 'markCollaborationMessageAsUnread':
				await this.handleMarkCollaborationMessageAsUnread(webview, message);
				return true;
			case 'deleteCollaborationMessage':
				await this.handleDeleteCollaborationMessage(webview, message);
				return true;
			case 'requestUserStorySupport':
				await this.handleRequestUserStorySupport(webview, message);
				return true;
			default:
				return false;
		}
	}

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

	private async handleLoadCollaborationMessages(webview: vscode.Webview, message: any): Promise<void> {
		try {
			if (message.userStoryId) {
				this.errorHandler.logInfo(`Loading collaboration messages for user story: ${message.userStoryId}`, 'CollaborationMessageHandler');
				const messages = await this.collaborationClient.getMessages(message.userStoryId);
				webview.postMessage({
					command: 'collaborationMessagesLoaded',
					messages
				});
			} else {
				this.errorHandler.logInfo('Loading all collaboration messages', 'CollaborationMessageHandler');
				const messages = await this.collaborationClient.getAllMessages();
				webview.postMessage({
					command: 'collaborationMessagesLoaded',
					messages
				});
			}
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadCollaborationMessages');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleCreateCollaborationMessage(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo('Creating collaboration message', 'CollaborationMessageHandler');
			const newMessage = await this.collaborationClient.createMessage({
				userStoryId: message.userStoryId,
				content: message.content
			});
			webview.postMessage({
				command: 'collaborationMessageCreated',
				message: newMessage
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'createCollaborationMessage');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleCreateCollaborationMessageReply(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Creating reply for message: ${message.messageId}`, 'CollaborationMessageHandler');
			const reply = await this.collaborationClient.createMessageReply({
				messageId: message.messageId,
				content: message.content
			});
			webview.postMessage({
				command: 'collaborationMessageReplyCreated',
				reply
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'createCollaborationMessageReply');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleLoadCollaborationNotifications(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading collaboration notifications', 'CollaborationMessageHandler');
			const result = await this.collaborationClient.getNotifications(message.unreadOnly || false);
			webview.postMessage({
				command: 'collaborationNotificationsLoaded',
				notifications: result.notifications,
				unreadCount: result.unreadCount
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadCollaborationNotifications');
			webview.postMessage({
				command: 'collaborationNotificationsError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleMarkCollaborationNotificationAsRead(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Marking notification as read: ${message.notificationId}`, 'CollaborationMessageHandler');
			await this.collaborationClient.markNotificationAsRead(message.notificationId);
			webview.postMessage({
				command: 'collaborationNotificationMarkedAsRead',
				notificationId: message.notificationId
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'markCollaborationNotificationAsRead');
			webview.postMessage({
				command: 'collaborationNotificationsError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleMarkAllCollaborationNotificationsAsRead(webview: vscode.Webview): Promise<void> {
		try {
			this.errorHandler.logInfo('Marking all notifications as read', 'CollaborationMessageHandler');
			await this.collaborationClient.markAllNotificationsAsRead();
			webview.postMessage({
				command: 'collaborationNotificationsMarkedAsRead'
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'markAllCollaborationNotificationsAsRead');
			webview.postMessage({
				command: 'collaborationNotificationsError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleAttendCollaborationMessage(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Attending message: ${message.messageId}`, 'CollaborationMessageHandler');
			const attendee = await this.collaborationClient.attendMessage(message.messageId);
			webview.postMessage({
				command: 'collaborationMessageAttended',
				messageId: message.messageId,
				attendee
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'attendCollaborationMessage');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleUnattendCollaborationMessage(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Unattending message: ${message.messageId}`, 'CollaborationMessageHandler');
			await this.collaborationClient.unattendMessage(message.messageId);
			webview.postMessage({
				command: 'collaborationMessageUnattended',
				messageId: message.messageId
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'unattendCollaborationMessage');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleMarkCollaborationMessageAsRead(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Marking message as read: ${message.messageId}`, 'CollaborationMessageHandler');
			await this.collaborationClient.markMessageAsRead(message.messageId);
			webview.postMessage({
				command: 'collaborationMessageMarkedAsRead',
				messageId: message.messageId
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'markCollaborationMessageAsRead');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleMarkCollaborationMessageAsUnread(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Marking message as unread: ${message.messageId}`, 'CollaborationMessageHandler');
			await this.collaborationClient.markMessageAsUnread(message.messageId);
			webview.postMessage({
				command: 'collaborationMessageMarkedAsUnread',
				messageId: message.messageId
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'markCollaborationMessageAsUnread');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleDeleteCollaborationMessage(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Deleting message: ${message.messageId}`, 'CollaborationMessageHandler');
			await this.collaborationClient.deleteMessage(message.messageId);
			webview.postMessage({
				command: 'collaborationMessageDeleted',
				messageId: message.messageId
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'deleteCollaborationMessage');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleRequestUserStorySupport(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Requesting support for user story: ${message.userStoryId}`, 'CollaborationMessageHandler');

			const description = message.description ? message.description.substring(0, 200) : 'No description available';
			const completedTasks = message.tasksCount > 0 ? `${message.tasksCount} task(s) defined` : 'No tasks yet';
			const estimateInfo = message.planEstimate ? `${message.planEstimate} points` : 'Not estimated';
			const hoursInfo = message.taskEstimateTotal ? `${message.taskEstimateTotal}h estimated` : '';

			let messageContent = `🆘 **Support Request**\n\n`;
			messageContent += `**User Story:** ${message.userStoryId} - ${message.userStoryName}\n`;
			messageContent += `**Project:** ${message.project || 'N/A'}\n`;
			messageContent += `**Sprint:** ${message.iteration || 'Unscheduled'}\n`;
			messageContent += `**State:** ${message.scheduleState || 'New'}\n`;
			messageContent += `**Estimate:** ${estimateInfo}${hoursInfo ? ` (${hoursInfo})` : ''}\n`;
			messageContent += `**Tasks:** ${completedTasks}\n`;
			messageContent += `**Description:** ${description}${message.description && message.description.length > 200 ? '...' : ''}\n\n`;
			messageContent += `I need help with this user story. Can someone provide assistance or guidance?`;

			const supportMessage = await this.collaborationClient.createMessage({
				userStoryId: message.userStoryId,
				content: messageContent
			});

			webview.postMessage({
				command: 'supportRequestCreated',
				message: supportMessage
			});
			vscode.window.showInformationMessage(`Support request sent for ${message.userStoryId}`);
		} catch (error) {
			const friendlyMessage = this.getCollaborationErrorMessage(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'requestUserStorySupport');
			webview.postMessage({
				command: 'supportRequestError',
				error: friendlyMessage
			});
			vscode.window.showErrorMessage(`Failed to send support request: ${friendlyMessage}`);
		}
	}
}
