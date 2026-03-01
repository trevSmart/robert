import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import { CollaborationClient } from '../../libs/collaboration/collaborationClient';
import { CustomCalendarEvent } from '../../types/utils';

/**
 * Handles calendar event management for webview messages
 * Manages both custom calendar events and shared public calendar events
 */
export class CalendarMessageHandler {
	constructor(
		private errorHandler: ErrorHandler,
		private collaborationClient: CollaborationClient,
		private context: vscode.ExtensionContext
	) {}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'loadCustomEvents':
				await this.handleLoadCustomEvents(webview);
				return true;
			case 'saveCustomEvent':
				await this.handleSaveCustomEvent(webview, message);
				return true;
			case 'deleteCustomEvent':
				await this.handleDeleteCustomEvent(webview, message);
				return true;
			case 'loadPublicCalendarEvents':
				await this.handleLoadPublicCalendarEvents(webview);
				return true;
			case 'savePublicCalendarEvent':
				await this.handleSavePublicCalendarEvent(webview, message);
				return true;
			case 'deletePublicCalendarEvent':
				await this.handleDeletePublicCalendarEvent(webview, message);
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

	private async handleLoadCustomEvents(webview: vscode.Webview): Promise<void> {
		const events = (this.context.globalState.get<CustomCalendarEvent[]>('robert.customCalendarEvents', []) ?? []).filter(Boolean);
		webview.postMessage({ command: 'customEventsLoaded', events });
	}

	private async handleSaveCustomEvent(webview: vscode.Webview, message: any): Promise<void> {
		const allEvents = (this.context.globalState.get<CustomCalendarEvent[]>('robert.customCalendarEvents', []) ?? []).filter(Boolean);
		const incoming = (message.data?.event ?? message.event) as CustomCalendarEvent;
		const existingIndex = allEvents.findIndex(e => e.id === incoming.id);

		if (existingIndex >= 0) {
			allEvents[existingIndex] = incoming;
		} else {
			allEvents.push(incoming);
		}

		await this.context.globalState.update('robert.customCalendarEvents', allEvents);
		webview.postMessage({ command: 'customEventSaved', allEvents });
	}

	private async handleDeleteCustomEvent(webview: vscode.Webview, message: any): Promise<void> {
		const allEvents = (this.context.globalState.get<CustomCalendarEvent[]>('robert.customCalendarEvents', []) ?? []).filter(Boolean);
		const eventId = message.data?.eventId ?? message.eventId;
		const filtered = allEvents.filter(e => e.id !== eventId);
		await this.context.globalState.update('robert.customCalendarEvents', filtered);
		webview.postMessage({ command: 'customEventDeleted', allEvents: filtered });
	}

	private async handleLoadPublicCalendarEvents(webview: vscode.Webview): Promise<void> {
		try {
			const events = (await this.collaborationClient.getCalendarEvents()).map(e => ({ ...e, isPublic: true }));
			webview.postMessage({ command: 'publicCalendarEventsLoaded', events });
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadPublicCalendarEvents');
			webview.postMessage({ command: 'publicCalendarEventsLoaded', events: [] });
		}
	}

	private async handleSavePublicCalendarEvent(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const incoming = (message.data?.event ?? message.event) as CustomCalendarEvent;
			const saved = incoming.creatorRallyUserId
				? await this.collaborationClient.updateCalendarEvent(incoming.id, {
						date: incoming.date,
						time: incoming.time,
						title: incoming.title,
						description: incoming.description,
						color: incoming.color
					})
				: await this.collaborationClient.createCalendarEvent(incoming);

			if (saved) {
				webview.postMessage({ command: 'publicCalendarEventSaved', event: { ...saved, isPublic: true } });
			}
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'savePublicCalendarEvent');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}

	private async handleDeletePublicCalendarEvent(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const eventId = message.data?.eventId ?? message.eventId;
			await this.collaborationClient.deleteCalendarEvent(eventId);
			webview.postMessage({ command: 'publicCalendarEventDeleted', eventId });
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'deletePublicCalendarEvent');
			webview.postMessage({
				command: 'collaborationMessagesError',
				error: this.getCollaborationErrorMessage(error)
			});
		}
	}
}
