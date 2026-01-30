export type MessageStatus = 'open' | 'resolved' | 'archived';

export interface MessageAttendee {
	id: string;
	messageId: string;
	userId: string;
	displayName: string;
	rallyUserId: string;
	createdAt: Date;
}

export interface Message {
	id: string;
	userId: string;
	userStoryId: string;
	content: string;
	status: MessageStatus;
	createdAt: Date;
	updatedAt: Date;
	user?: {
		displayName: string;
		rallyUserId: string;
	};
	replies?: MessageReply[];
	attendees?: MessageAttendee[];
}

export interface CreateMessageInput {
	userStoryId: string;
	content: string;
}

export interface UpdateMessageInput {
	content?: string;
	status?: MessageStatus;
}

export interface MessageReply {
	id: string;
	messageId: string;
	userId: string;
	content: string;
	createdAt: Date;
	user?: {
		displayName: string;
		rallyUserId: string;
	};
}

export interface CreateMessageReplyInput {
	messageId: string;
	content: string;
}
