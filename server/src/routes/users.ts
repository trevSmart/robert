import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { getOrCreateUser, findUserByRallyId } from '../services/userService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users/me
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			req.user!.displayName
		);

		res.json({ user });
	} catch (error) {
		const err = error as Error;
		throw createError(err.message, 500);
	}
});

// POST /api/users
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { displayName, email } = req.body;

		const user = await getOrCreateUser(
			req.user!.rallyUserId,
			displayName || req.user!.displayName,
			email
		);

		res.status(201).json({ user });
	} catch (error) {
		const err = error as Error;
		throw createError(err.message, 500);
	}
});

export default router;
