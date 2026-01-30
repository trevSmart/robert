import { query } from '../config/database';
import { Message, CreateMessageInput, UpdateMessageInput, MessageReply, CreateMessageReplyInput, MessageAttendee } from '../models/Message';
import { findUserById } from './userService';

export async function getMessagesByUserStory(userStoryId: string): Promise<Message[]> {
	const result = await query(
		`SELECT m.*, u.display_name, u.rally_user_id
		 FROM messages m
		 JOIN users u ON m.user_id = u.id
		 WHERE m.user_story_id = $1
		 ORDER BY m.created_at DESC`,
		[userStoryId]
	);

	const messages = result.rows.map(mapRowToMessage);

	// Load replies and attendees for each message
	for (const message of messages) {
		message.replies = await getMessageReplies(message.id);
		message.attendees = await getMessageAttendees(message.id);
	}

	return messages;
}

export async function getAllMessages(): Promise<Message[]> {
	const result = await query(
		`SELECT m.*, u.display_name, u.rally_user_id
		 FROM messages m
		 JOIN users u ON m.user_id = u.id
		 ORDER BY m.created_at DESC`
	);

	const messages = result.rows.map(mapRowToMessage);

	// Load replies and attendees for each message
	for (const message of messages) {
		message.replies = await getMessageReplies(message.id);
		message.attendees = await getMessageAttendees(message.id);
	}

	return messages;
}

export async function getMessageById(id: string): Promise<Message | null> {
	const result = await query(
		`SELECT m.*, u.display_name, u.rally_user_id
		 FROM messages m
		 JOIN users u ON m.user_id = u.id
		 WHERE m.id = $1`,
		[id]
	);

	if (result.rows.length === 0) {
		return null;
	}

	const message = mapRowToMessage(result.rows[0]);
	message.replies = await getMessageReplies(message.id);
	message.attendees = await getMessageAttendees(message.id);
	return message;
}

export async function createMessage(userId: string, input: CreateMessageInput): Promise<Message> {
	const result = await query(
		`INSERT INTO messages (user_id, user_story_id, content, status)
		 VALUES ($1, $2, $3, 'open')
		 RETURNING *`,
		[userId, input.userStoryId, input.content]
	);

	const message = mapRowToMessage(result.rows[0]);
	
	// Load user info
	const user = await findUserById(userId);
	if (user) {
		message.user = {
			displayName: user.displayName,
			rallyUserId: user.rallyUserId
		};
	}

	return message;
}

export async function updateMessage(id: string, input: UpdateMessageInput): Promise<Message> {
	const updates: string[] = [];
	const values: unknown[] = [];
	let paramCount = 1;

	if (input.content !== undefined) {
		updates.push(`content = $${paramCount++}`);
		values.push(input.content);
	}

	if (input.status !== undefined) {
		updates.push(`status = $${paramCount++}`);
		values.push(input.status);
	}

	if (updates.length === 0) {
		const message = await getMessageById(id);
		if (!message) {
			throw new Error('Message not found');
		}
		return message;
	}

	updates.push(`updated_at = NOW()`);
	values.push(id);

	const result = await query(
		`UPDATE messages SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
		values
	);

	const message = mapRowToMessage(result.rows[0]);
	
	// Load user info
	const user = await findUserById(message.userId);
	if (user) {
		message.user = {
			displayName: user.displayName,
			rallyUserId: user.rallyUserId
		};
	}

	message.replies = await getMessageReplies(message.id);
	message.attendees = await getMessageAttendees(message.id);
	return message;
}

export async function deleteMessage(id: string): Promise<void> {
	await query('DELETE FROM messages WHERE id = $1', [id]);
}

export async function getMessageReplies(messageId: string): Promise<MessageReply[]> {
	const result = await query(
		`SELECT mr.*, u.display_name, u.rally_user_id
		 FROM message_replies mr
		 JOIN users u ON mr.user_id = u.id
		 WHERE mr.message_id = $1
		 ORDER BY mr.created_at ASC`,
		[messageId]
	);

	return result.rows.map(mapRowToReply);
}

export async function createMessageReply(userId: string, input: CreateMessageReplyInput): Promise<MessageReply> {
	const result = await query(
		`INSERT INTO message_replies (message_id, user_id, content)
		 VALUES ($1, $2, $3)
		 RETURNING *`,
		[input.messageId, userId, input.content]
	);

	const reply = mapRowToReply(result.rows[0]);
	
	// Load user info
	const user = await findUserById(userId);
	if (user) {
		reply.user = {
			displayName: user.displayName,
			rallyUserId: user.rallyUserId
		};
	}

	return reply;
}

export async function getMessageAttendees(messageId: string): Promise<MessageAttendee[]> {
	const result = await query(
		`SELECT ma.*, u.display_name, u.rally_user_id
		 FROM message_attendees ma
		 JOIN users u ON ma.user_id = u.id
		 WHERE ma.message_id = $1
		 ORDER BY ma.created_at ASC`,
		[messageId]
	);

	return result.rows.map(mapRowToAttendee);
}

export async function addAttendee(messageId: string, userId: string): Promise<MessageAttendee> {
	const result = await query(
		`INSERT INTO message_attendees (message_id, user_id)
		 VALUES ($1, $2)
		 ON CONFLICT (message_id, user_id) DO NOTHING
		 RETURNING *`,
		[messageId, userId]
	);

	if (result.rows.length === 0) {
		// Already exists, fetch it
		const existing = await query(
			`SELECT ma.*, u.display_name, u.rally_user_id
			 FROM message_attendees ma
			 JOIN users u ON ma.user_id = u.id
			 WHERE ma.message_id = $1 AND ma.user_id = $2`,
			[messageId, userId]
		);
		return mapRowToAttendee(existing.rows[0]);
	}

	const attendee = mapRowToAttendee(result.rows[0]);
	
	// Load user info
	const user = await findUserById(userId);
	if (user) {
		attendee.displayName = user.displayName;
		attendee.rallyUserId = user.rallyUserId;
	}

	return attendee;
}

export async function removeAttendee(messageId: string, userId: string): Promise<void> {
	await query(
		`DELETE FROM message_attendees WHERE message_id = $1 AND user_id = $2`,
		[messageId, userId]
	);
}

// Mark message as read by a user
export async function markMessageAsRead(messageId: string, userId: string): Promise<void> {
	await query(
		`INSERT INTO message_reads (message_id, user_id)
		 VALUES ($1, $2)
		 ON CONFLICT (message_id, user_id) DO NOTHING`,
		[messageId, userId]
	);
}

// Mark message as unread by a user
export async function markMessageAsUnread(messageId: string, userId: string): Promise<void> {
	await query(
		`DELETE FROM message_reads WHERE message_id = $1 AND user_id = $2`,
		[messageId, userId]
	);
}

// Check if a message is read by a user
export async function isMessageReadByUser(messageId: string, userId: string): Promise<boolean> {
	const result = await query(
		`SELECT EXISTS(SELECT 1 FROM message_reads WHERE message_id = $1 AND user_id = $2) as is_read`,
		[messageId, userId]
	);
	return result.rows[0].is_read;
}

// Get all messages with read status for a specific user
export async function getMessagesWithReadStatus(userId: string): Promise<Message[]> {
	const result = await query(
		`SELECT m.*, u.display_name, u.rally_user_id,
		        EXISTS(SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.user_id = $1) as is_read
		 FROM messages m
		 JOIN users u ON m.user_id = u.id
		 ORDER BY m.created_at DESC`,
		[userId]
	);

	const messages = result.rows.map((row: any) => ({
		...mapRowToMessage(row),
		isRead: row.is_read
	}));

	// Load replies and attendees for each message
	for (const message of messages) {
		message.replies = await getMessageReplies(message.id);
		message.attendees = await getMessageAttendees(message.id);
	}

	return messages;
}

function mapRowToMessage(row: any): Message {
	return {
		id: row.id,
		userId: row.user_id,
		userStoryId: row.user_story_id,
		content: row.content,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		user: row.display_name ? {
			displayName: row.display_name,
			rallyUserId: row.rally_user_id
		} : undefined
	};
}

function mapRowToReply(row: any): MessageReply {
	return {
		id: row.id,
		messageId: row.message_id,
		userId: row.user_id,
		content: row.content,
		createdAt: row.created_at,
		user: row.display_name ? {
			displayName: row.display_name,
			rallyUserId: row.rally_user_id
		} : undefined
	};
}

function mapRowToAttendee(row: any): MessageAttendee {
	return {
		id: row.id,
		messageId: row.message_id,
		userId: row.user_id,
		displayName: row.display_name || '',
		rallyUserId: row.rally_user_id || '',
		createdAt: row.created_at
	};
}
