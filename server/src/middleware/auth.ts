import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
	user?: {
		jiraUserId: string;
		userId: string;
		displayName: string;
	};
}

/**
 * Simple authentication middleware using Jira account ID from headers
 * In production, this should be replaced with proper JWT or OAuth
 */
export function authenticate(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): void {
	const jiraUserId = req.headers['x-jira-user-id'] as string;
	const displayName = req.headers['x-display-name'] as string;

	if (!jiraUserId) {
		throw createError('Missing Jira account ID in headers', 401);
	}

	// Attach user info to request
	req.user = {
		jiraUserId,
		userId: '', // Will be resolved from database
		displayName: displayName || 'Unknown User'
	};

	next();
}
