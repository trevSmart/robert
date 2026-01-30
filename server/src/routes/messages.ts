import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import {
	getMessagesByUserStory,
	getAllMessages,
	getMessageById,
	createMessage,
	updateMessage,
	deleteMessage,
	createMessageReply,
	addAttendee,
	removeAttendee,
	markMessageAsRead,
	markMessageAsUnread,
	getMessagesWithReadStatus
} from '../services/messageService';
import { getOrCreateUser } from '../services/userService';
import { createNotification } from '../services/notificationService';
import { broadcastNewMessage, broadcastMessageUpdate, broadcastMessageDelete, broadcastNotification } from '../services/websocketService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/messages?userStoryId={id}
// GET /api/messages (all messages with read status)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userStoryId = req.query.userStoryId as string;
		const userId = req.user!.userId;

		if (userStoryId) {
			// Get messages for specific user story with read status for current user
			const allMessages = await getMessagesWithReadStatus(userId);
			const messages = (allMessages as any[]).filter(
				(message: any) => message.userStoryId === userStoryId
			);
			res.json({ messages });
		} else {
			// Get all messages with read status for current user
			const messages = await getMessagesWithReadStatus(userId);
			res.json({ messages });
		}
	} catch (error) {
		const err = error as Error;
		throw createError(err.message, 500);
	}
});

// GET /api/messages/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const message = await getMessageById(req.params.id);

		if (!message) {
			throw createError('Message not found', 404);
		}

		res.json({ message });
	} catch (error) {
		const err = error as Error;
		if (err.message === 'Message not found') {
			throw createError(err.message, 404);
		}
		throw createError(err.message, 500);
	}
});

// POST /api/messages
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userStoryId, content } = req.body;

		if (!userStoryId || !content) {
			throw createError('userStoryId and content are required', 400);
		}

		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		// Create message
		const message = await createMessage(user.id, {
			userStoryId,
			content: content.trim()
		});

		// Create notifications for other users who have messages on this user story
		const existingMessages = await getMessagesByUserStory(userStoryId);
		const notifiedUserIds = new Set<string>();

		for (const existingMessage of existingMessages) {
			if (existingMessage.userId !== user.id && !notifiedUserIds.has(existingMessage.userId)) {
				const notification = await createNotification({
					userId: existingMessage.userId,
					messageId: message.id,
					type: 'new_message'
				});
				notifiedUserIds.add(existingMessage.userId);
				
				// Broadcast notification via WebSocket
				await broadcastNotification(existingMessage.userId, notification);
			}
		}

		// Broadcast new message to subscribed clients
		await broadcastNewMessage(message.id, userStoryId);

		res.status(201).json({ message });
	} catch (error) {
		const err = error as Error;
		throw createError(err.message, 500);
	}
});

// PUT /api/messages/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const message = await getMessageById(req.params.id);

		if (!message) {
			throw createError('Message not found', 404);
		}

		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		// Only the author can update their message
		if (message.userId !== user.id) {
			throw createError('Unauthorized: You can only update your own messages', 403);
		}

		const updatedMessage = await updateMessage(req.params.id, {
			content: req.body.content,
			status: req.body.status
		});

		// Broadcast message update to subscribed clients
		await broadcastMessageUpdate(updatedMessage.id, updatedMessage.userStoryId);

		res.json({ message: updatedMessage });
	} catch (error) {
		const err = error as Error;
		if (err.message === 'Message not found') {
			throw createError(err.message, 404);
		}
		if (err.message.includes('Unauthorized')) {
			throw createError(err.message, 403);
		}
		throw createError(err.message, 500);
	}
});

// DELETE /api/messages/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const message = await getMessageById(req.params.id);

		if (!message) {
			throw createError('Message not found', 404);
		}

		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		// Only the author can delete their message
		if (message.userId !== user.id) {
			throw createError('Unauthorized: You can only delete your own messages', 403);
		}

		await deleteMessage(req.params.id);

		// Broadcast message deletion to subscribed clients
		await broadcastMessageDelete(req.params.id, message.userStoryId);

		res.status(204).send();
	} catch (error) {
		const err = error as Error;
		if (err.message === 'Message not found') {
			throw createError(err.message, 404);
		}
		if (err.message.includes('Unauthorized')) {
			throw createError(err.message, 403);
		}
		throw createError(err.message, 500);
	}
});

// POST /api/messages/:id/replies
router.post('/:id/replies', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const message = await getMessageById(req.params.id);

		if (!message) {
			throw createError('Message not found', 404);
		}

		const { content } = req.body;

		if (!content) {
			throw createError('content is required', 400);
		}

		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		// Create reply
		const reply = await createMessageReply(user.id, {
			messageId: req.params.id,
			content: content.trim()
		});

		// Create notification for message author (if not the same user)
		if (message.userId !== user.id) {
			const notification = await createNotification({
				userId: message.userId,
				messageId: message.id,
				type: 'reply'
			});
			
			// Broadcast notification via WebSocket
			await broadcastNotification(message.userId, notification);
		}

		// Broadcast message update (with new reply) to subscribed clients
		await broadcastMessageUpdate(message.id, message.userStoryId);

		res.status(201).json({ reply });
	} catch (error) {
		const err = error as Error;
		if (err.message === 'Message not found') {
			throw createError(err.message, 404);
		}
		throw createError(err.message, 500);
	}
});

// POST /api/messages/:id/attend
router.post('/:id/attend', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const message = await getMessageById(req.params.id);

		if (!message) {
			throw createError('Message not found', 404);
		}

		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		// Add user as attendee
		const attendee = await addAttendee(req.params.id, user.id);

		// Broadcast message update to subscribed clients
		await broadcastMessageUpdate(message.id, message.userStoryId);

		res.status(201).json({ attendee });
	} catch (error) {
		const err = error as Error;
		if (err.message === 'Message not found') {
			throw createError(err.message, 404);
		}
		throw createError(err.message, 500);
	}
});

// DELETE /api/messages/:id/attend
router.delete('/:id/attend', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const message = await getMessageById(req.params.id);

		if (!message) {
			throw createError('Message not found', 404);
		}

		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		// Remove user as attendee
		await removeAttendee(req.params.id, user.id);

		// Broadcast message update to subscribed clients
		await broadcastMessageUpdate(message.id, message.userStoryId);

		res.status(204).send();
	} catch (error) {
		const err = error as Error;
		if (err.message === 'Message not found') {
			throw createError(err.message, 404);
		}
		throw createError(err.message, 500);
	}
});

// POST /api/messages/:id/read
router.post('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const message = await getMessageById(req.params.id);

		if (!message) {
			throw createError('Message not found', 404);
		}

		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		// Mark message as read
		await markMessageAsRead(req.params.id, user.id);

		res.status(204).send();
	} catch (error) {
		const err = error as Error;
		if (err.message === 'Message not found') {
			throw createError(err.message, 404);
		}
		throw createError(err.message, 500);
	}
});

// DELETE /api/messages/:id/read
router.delete('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const message = await getMessageById(req.params.id);

		if (!message) {
			throw createError('Message not found', 404);
		}

		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		// Mark message as unread
		await markMessageAsUnread(req.params.id, user.id);

		res.status(204).send();
	} catch (error) {
		const err = error as Error;
		if (err.message === 'Message not found') {
			throw createError(err.message, 404);
		}
		throw createError(err.message, 500);
	}
});

export default router;
