import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import {
	getAllCalendarEvents,
	getCalendarEventById,
	createCalendarEvent,
	updateCalendarEvent,
	deleteCalendarEvent
} from '../services/calendarEventService';
import { getOrCreateUser } from '../services/userService';
import {
	broadcastCalendarEventNew,
	broadcastCalendarEventUpdated,
	broadcastCalendarEventDeleted
} from '../services/websocketService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/calendar-events
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const events = await getAllCalendarEvents();
		res.json({ events });
	} catch (error) {
		const err = error as Error;
		return next(createError(err.message, 500));
	}
});

// GET /api/calendar-events/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const event = await getCalendarEventById(req.params.id);

		if (!event) {
			return next(createError('Event not found', 404));
		}

		res.json({ event });
	} catch (error) {
		const err = error as Error;
		return next(createError(err.message, 500));
	}
});

// POST /api/calendar-events
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const { date, time, title, description, color } = req.body;

		if (!date || !title || !color) {
			return next(createError('date, title, and color are required', 400));
		}

		// Get or create user
		const user = await getOrCreateUser(req.user!.rallyUserId, req.user!.displayName);

		// Create event
		const event = await createCalendarEvent(user.id, req.user!.rallyUserId, req.user!.displayName, {
			date,
			time: time || undefined,
			title: title.trim(),
			description: description ? description.trim() : undefined,
			color
		});

		// Broadcast to all connected clients
		broadcastCalendarEventNew(event);

		res.status(201).json({ event });
	} catch (error) {
		const err = error as { message?: string; statusCode?: number };

		// If this is an application error with an existing statusCode (e.g., from createError),
		// forward it as-is so the global error handler can use the original status.
		if (err.statusCode) {
			return next(error);
		}

		// For unexpected errors without a statusCode, wrap as 500.
		return next(createError(err.message || 'Internal server error', 500));
	}
});

// PUT /api/calendar-events/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const { date, time, title, description, color } = req.body;

		// Get existing event to verify ownership
		const existingEvent = await getCalendarEventById(req.params.id);
		if (!existingEvent) {
			return next(createError('Event not found', 404));
		}

		// Resolve DB user id
		const user = await getOrCreateUser(req.user!.rallyUserId, req.user!.displayName);

		if (existingEvent.creatorId !== user.id) {
			return next(createError('Forbidden: You can only edit your own events', 403));
		}

		// Update event
		const event = await updateCalendarEvent(req.params.id, user.id, {
			date: date !== undefined ? date : undefined,
			time: time !== undefined ? time : undefined,
			title: title !== undefined ? title.trim() : undefined,
			description:
				description === null || description === ''
					? null
					: description !== undefined
						? description.trim()
						: undefined,
			color: color !== undefined ? color : undefined
		});

		if (!event) {
			return next(createError('Event not found', 404));
		}

		// Broadcast update to all connected clients
		broadcastCalendarEventUpdated(event);

		res.json({ event });
	} catch (error) {
		const err = error as Error;
		return next(createError(err.message, 500));
	}
});

// DELETE /api/calendar-events/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		// Get existing event to verify ownership
		const existingEvent = await getCalendarEventById(req.params.id);
		if (!existingEvent) {
			return next(createError('Event not found', 404));
		}

		// Resolve DB user id
		const user = await getOrCreateUser(req.user!.rallyUserId, req.user!.displayName);

		if (existingEvent.creatorId !== user.id) {
			return next(createError('Forbidden: You can only delete your own events', 403));
		}

		// Delete event
		const deleted = await deleteCalendarEvent(req.params.id, user.id);

		if (!deleted) {
			return next(createError('Event not found', 404));
		}

		// Broadcast deletion to all connected clients
		broadcastCalendarEventDeleted(req.params.id);

		res.json({ success: true });
	} catch (error) {
		const err = error as Error;
		return next(createError(err.message, 500));
	}
});

export default router;
