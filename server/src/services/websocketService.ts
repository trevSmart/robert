import { WebSocketServer, WebSocket } from 'ws';
import { getOrCreateUser } from './userService';
import { getMessageById } from './messageService';
import { createNotification } from './notificationService';
import { query } from '../config/database';

interface WebSocketClient extends WebSocket {
	userId?: string;
	rallyUserId?: string;
	subscribedUserStories?: Set<string>;
	isAlive?: boolean;
}

let globalWss: WebSocketServer | null = null;

export function setupWebSocket(wss: WebSocketServer): void {
	globalWss = wss;
	// Heartbeat to detect dead connections
	const interval = setInterval(() => {
		wss.clients.forEach((ws) => {
			const client = ws as WebSocketClient;
			if (!client.isAlive) {
				client.terminate();
				return;
			}
			client.isAlive = false;
			client.ping();
		});
	}, 30000);

	wss.on('connection', async (ws: WebSocket) => {
		const client = ws as WebSocketClient;
		client.isAlive = true;
		client.subscribedUserStories = new Set();

		client.on('pong', () => {
			client.isAlive = true;
		});

		client.on('message', async (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString());

				await handleWebSocketMessage(client, message);
			} catch (error) {
				console.error('WebSocket message error:', error);
				client.send(JSON.stringify({
					type: 'error',
					message: 'Invalid message format'
				}));
			}
		});

		client.on('close', () => {
			console.log('WebSocket client disconnected');
		});

		client.on('error', (error) => {
			console.error('WebSocket error:', error);
		});
	});

	wss.on('close', () => {
		clearInterval(interval);
	});
}

async function handleWebSocketMessage(client: WebSocketClient, message: any): Promise<void> {
	switch (message.type) {
		case 'authenticate':
			await handleAuthenticate(client, message);
			break;

		case 'subscribe:notifications':
			await handleSubscribeNotifications(client);
			break;

		case 'subscribe:userStory':
			await handleSubscribeUserStory(client, message.userStoryId);
			break;

		case 'unsubscribe:userStory':
			await handleUnsubscribeUserStory(client, message.userStoryId);
			break;

		default:
			client.send(JSON.stringify({
				type: 'error',
				message: `Unknown message type: ${message.type}`
			}));
	}
}

async function handleAuthenticate(client: WebSocketClient, message: any): Promise<void> {
	const { rallyUserId, displayName } = message;

	if (!rallyUserId) {
		client.send(JSON.stringify({
			type: 'error',
			message: 'rallyUserId is required'
		}));
		return;
	}

	try {
		const user = await getOrCreateUser(rallyUserId, displayName || 'Unknown User');
		client.userId = user.id;
		client.rallyUserId = rallyUserId;

		client.send(JSON.stringify({
			type: 'authenticated',
			userId: user.id
		}));
	} catch (error) {
		console.error('Authentication error:', error);
		client.send(JSON.stringify({
			type: 'error',
			message: 'Authentication failed'
		}));
	}
}

async function handleSubscribeNotifications(client: WebSocketClient): Promise<void> {
	if (!client.userId) {
		client.send(JSON.stringify({
			type: 'error',
			message: 'Not authenticated'
		}));
		return;
	}

	client.send(JSON.stringify({
		type: 'subscribed',
		channel: 'notifications'
	}));
}

async function handleSubscribeUserStory(client: WebSocketClient, userStoryId: string): Promise<void> {
	if (!client.userId) {
		client.send(JSON.stringify({
			type: 'error',
			message: 'Not authenticated'
		}));
		return;
	}

	if (!userStoryId) {
		client.send(JSON.stringify({
			type: 'error',
			message: 'userStoryId is required'
		}));
		return;
	}

	client.subscribedUserStories!.add(userStoryId);

	client.send(JSON.stringify({
		type: 'subscribed',
		channel: `userStory:${userStoryId}`
	}));
}

async function handleUnsubscribeUserStory(client: WebSocketClient, userStoryId: string): Promise<void> {
	if (client.subscribedUserStories) {
		client.subscribedUserStories.delete(userStoryId);
	}

	client.send(JSON.stringify({
		type: 'unsubscribed',
		channel: `userStory:${userStoryId}`
	}));
}

// Broadcast functions to be called from other services

export async function broadcastNewMessage(messageId: string, userStoryId: string): Promise<void> {
	const message = await getMessageById(messageId);
	if (!message) return;

	if (!globalWss) return;

	const messageData = {
		type: 'message:new',
		message
	};

	globalWss.clients.forEach((ws) => {
		const client = ws as WebSocketClient;
		if (client.readyState === WebSocket.OPEN && client.subscribedUserStories?.has(userStoryId)) {
			client.send(JSON.stringify(messageData));
		}
	});
}

export async function broadcastMessageUpdate(messageId: string, userStoryId: string): Promise<void> {
	const message = await getMessageById(messageId);
	if (!message) return;

	if (!globalWss) return;

	const messageData = {
		type: 'message:updated',
		message
	};

	globalWss.clients.forEach((ws) => {
		const client = ws as WebSocketClient;
		if (client.readyState === WebSocket.OPEN && client.subscribedUserStories?.has(userStoryId)) {
			client.send(JSON.stringify(messageData));
		}
	});
}

export async function broadcastMessageDelete(messageId: string, userStoryId: string): Promise<void> {
	if (!globalWss) return;

	const messageData = {
		type: 'message:deleted',
		messageId
	};

	globalWss.clients.forEach((ws) => {
		const client = ws as WebSocketClient;
		if (client.readyState === WebSocket.OPEN && client.subscribedUserStories?.has(userStoryId)) {
			client.send(JSON.stringify(messageData));
		}
	});
}

export async function broadcastNotification(userId: string, notification: any): Promise<void> {
	if (!globalWss) return;

	const notificationData = {
		type: 'notification:new',
		notification
	};

	globalWss.clients.forEach((ws) => {
		const client = ws as WebSocketClient;
		if (client.readyState === WebSocket.OPEN && client.userId === userId) {
			client.send(JSON.stringify(notificationData));
		}
	});
}
