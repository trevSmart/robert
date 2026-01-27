import { ErrorHandler } from '../../ErrorHandler';
import { SettingsManager } from '../../SettingsManager';

export interface Message {
	id: string;
	userId: string;
	userStoryId: string;
	content: string;
	status: 'open' | 'resolved' | 'archived';
	createdAt: string;
	updatedAt: string;
	user?: {
		displayName: string;
		rallyUserId: string;
	};
	replies?: MessageReply[];
}

export interface MessageReply {
	id: string;
	messageId: string;
	userId: string;
	content: string;
	createdAt: string;
	user?: {
		displayName: string;
		rallyUserId: string;
	};
}

export interface Notification {
	id: string;
	userId: string;
	messageId?: string;
	type: 'new_message' | 'reply' | 'resolved';
	read: boolean;
	createdAt: string;
	message?: {
		id: string;
		userStoryId: string;
		content: string;
		user?: {
			displayName: string;
		};
	};
}

export interface CreateMessageInput {
	userStoryId: string;
	content: string;
}

export interface CreateMessageReplyInput {
	messageId: string;
	content: string;
}

export interface UpdateMessageInput {
	content?: string;
	status?: 'open' | 'resolved' | 'archived';
}

export class CollaborationClient {
	private static instance: CollaborationClient;
	private _errorHandler: ErrorHandler;
	private _settingsManager: SettingsManager;
	private _serverUrl: string | null = null;
	private _rallyUserId: string | null = null;
	private _displayName: string | null = null;

	private constructor() {
		this._errorHandler = ErrorHandler.getInstance();
		this._settingsManager = SettingsManager.getInstance();
	}

	public static getInstance(): CollaborationClient {
		if (!CollaborationClient.instance) {
			CollaborationClient.instance = new CollaborationClient();
		}
		return CollaborationClient.instance;
	}

	public setServerUrl(url: string): void {
		this._serverUrl = url;
		this._errorHandler.logInfo(`Collaboration server URL set to: ${url}`, 'CollaborationClient');
	}

	public setUserInfo(rallyUserId: string, displayName: string): void {
		this._rallyUserId = rallyUserId;
		this._displayName = displayName;
		this._errorHandler.logInfo(`User info set: ${rallyUserId} (${displayName})`, 'CollaborationClient');
	}

	private getServerUrl(): string {
		if (!this._serverUrl) {
			const url = this._settingsManager.getSetting('collaborationServerUrl');
			if (!url) {
				throw new Error('Collaboration server URL not configured');
			}
			this._serverUrl = url;
		}
		return this._serverUrl;
	}

	private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const serverUrl = this.getServerUrl();
		const url = `${serverUrl}${endpoint}`;

		// Check if Rally User ID is set before making any requests
		// The collaboration server requires this header for all API calls
		if (!this._rallyUserId) {
			throw new Error('Missing Rally User ID in headers');
		}

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'X-Rally-User-Id': this._rallyUserId,
			...((options.headers as Record<string, string>) || {})
		};

		if (this._displayName) {
			headers['X-Display-Name'] = this._displayName;
		}

		try {
			const response = await fetch(url, {
				...options,
				headers
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			this._errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), `CollaborationClient.${endpoint}`);
			throw error;
		}
	}

	// Messages API
	public async getMessages(userStoryId: string): Promise<Message[]> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			const response = await this.makeRequest<{ messages: Message[] }>(`/api/messages?userStoryId=${encodeURIComponent(userStoryId)}`);
			return response.messages;
		}, 'CollaborationClient.getMessages');
		return result ?? [];
	}

	public async getMessage(messageId: string): Promise<Message | null> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			const response = await this.makeRequest<{ message: Message }>(`/api/messages/${messageId}`);
			return response.message;
		}, 'CollaborationClient.getMessage');
		return result ?? null;
	}

	public async createMessage(input: CreateMessageInput): Promise<Message | null> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			const response = await this.makeRequest<{ message: Message }>('/api/messages', {
				method: 'POST',
				body: JSON.stringify(input)
			});
			return response.message;
		}, 'CollaborationClient.createMessage');
		return result ?? null;
	}

	public async updateMessage(messageId: string, input: UpdateMessageInput): Promise<Message | null> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			const response = await this.makeRequest<{ message: Message }>(`/api/messages/${messageId}`, {
				method: 'PUT',
				body: JSON.stringify(input)
			});
			return response.message;
		}, 'CollaborationClient.updateMessage');
		return result ?? null;
	}

	public async deleteMessage(messageId: string): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			await this.makeRequest(`/api/messages/${messageId}`, {
				method: 'DELETE'
			});
		}, 'CollaborationClient.deleteMessage');
	}

	public async createMessageReply(input: CreateMessageReplyInput): Promise<MessageReply | null> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			const response = await this.makeRequest<{ reply: MessageReply }>(`/api/messages/${input.messageId}/replies`, {
				method: 'POST',
				body: JSON.stringify({ content: input.content })
			});
			return response.reply;
		}, 'CollaborationClient.createMessageReply');
		return result ?? null;
	}

	// Notifications API
	public async getNotifications(unreadOnly: boolean = false): Promise<{ notifications: Notification[]; unreadCount: number }> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			return this.makeRequest<{ notifications: Notification[]; unreadCount: number }>(`/api/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
		}, 'CollaborationClient.getNotifications');
		return result ?? { notifications: [], unreadCount: 0 };
	}

	public async getUnreadNotificationCount(): Promise<number> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			const response = await this.makeRequest<{ unreadCount: number }>('/api/notifications/count');
			return response.unreadCount;
		}, 'CollaborationClient.getUnreadNotificationCount');
		return result ?? 0;
	}

	public async markNotificationAsRead(notificationId: string): Promise<Notification | null> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			const response = await this.makeRequest<{ notification: Notification }>(`/api/notifications/${notificationId}/read`, {
				method: 'PUT'
			});
			return response.notification;
		}, 'CollaborationClient.markNotificationAsRead');
		return result ?? null;
	}

	public async markAllNotificationsAsRead(): Promise<void> {
		await this._errorHandler.executeWithErrorHandling(async () => {
			await this.makeRequest('/api/notifications/read-all', {
				method: 'PUT'
			});
		}, 'CollaborationClient.markAllNotificationsAsRead');
	}

	// Users API
	public async getCurrentUser(): Promise<{ id: string; rallyUserId: string; displayName: string; email?: string } | null> {
		const result = await this._errorHandler.executeWithErrorHandling(async () => {
			const response = await this.makeRequest<{ user: { id: string; rallyUserId: string; displayName: string; email?: string } }>('/api/users/me');
			return response.user;
		}, 'CollaborationClient.getCurrentUser');
		return result ?? null;
	}

	public async checkServerHealth(): Promise<boolean> {
		try {
			const serverUrl = this.getServerUrl();
			const response = await fetch(`${serverUrl}/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(5000)
			});
			return response.ok;
		} catch (error) {
			this._errorHandler.logWarning(`Server health check failed: ${error instanceof Error ? error.message : String(error)}`, 'CollaborationClient.checkServerHealth');
			return false;
		}
	}
}
