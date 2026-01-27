export type NotificationType = 'new_message' | 'reply' | 'resolved';

export interface Notification {
	id: string;
	userId: string;
	messageId?: string;
	type: NotificationType;
	read: boolean;
	createdAt: Date;
	message?: {
		id: string;
		userStoryId: string;
		content: string;
		user?: {
			displayName: string;
		};
	};
}

export interface CreateNotificationInput {
	userId: string;
	messageId?: string;
	type: NotificationType;
}
