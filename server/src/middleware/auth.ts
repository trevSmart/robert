import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
	user?: {
		rallyUserId: string;
		userId: string;
		displayName: string;
	};
}

/**
 * Simple authentication middleware using Rally User ID from headers
 * In production, this should be replaced with proper JWT or OAuth
 */
export function authenticate(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): void {
	const rallyUserId = req.headers['x-rally-user-id'] as string;
	const displayName = req.headers['x-display-name'] as string;

	if (!rallyUserId) {
		throw createError('Missing Rally User ID in headers', 401);
	}

	// Attach user info to request
	req.user = {
		rallyUserId,
		userId: '', // Will be resolved from database
		displayName: displayName || 'Unknown User'
	};

	next();
}
