import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import {
	getNotificationsByUserId,
	markNotificationAsRead,
	markAllNotificationsAsRead,
	getUnreadNotificationCount
} from '../services/notificationService';
import { getOrCreateUser } from '../services/userService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const unreadOnly = req.query.unreadOnly === 'true';
		
		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		const notifications = await getNotificationsByUserId(user.id, unreadOnly);
		const unreadCount = await getUnreadNotificationCount(user.id);

		res.json({
			notifications,
			unreadCount
		});
	} catch (error) {
		const err = error as Error;
		throw createError(err.message, 500);
	}
});

// GET /api/notifications/count
router.get('/count', async (req: AuthenticatedRequest, res: Response) => {
	try {
		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		const unreadCount = await getUnreadNotificationCount(user.id);

		res.json({ unreadCount });
	} catch (error) {
		const err = error as Error;
		throw createError(err.message, 500);
	}
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
	try {
		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		const notification = await markNotificationAsRead(req.params.id, user.id);

		res.json({ notification });
	} catch (error) {
		const err = error as Error;
		if (err.message === 'Notification not found') {
			throw createError(err.message, 404);
		}
		throw createError(err.message, 500);
	}
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req: AuthenticatedRequest, res: Response) => {
	try {
		// Get or create user
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		await markAllNotificationsAsRead(user.id);

		res.json({ success: true });
	} catch (error) {
		const err = error as Error;
		throw createError(err.message, 500);
	}
});

export default router;
