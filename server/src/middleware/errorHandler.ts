import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
	statusCode?: number;
}

export function errorHandler(
	err: AppError,
	_req: Request,
	res: Response,
	_next: NextFunction
): void {
	const statusCode = err.statusCode || 500;
	const message = err.message || 'Internal Server Error';

	console.error(`Error ${statusCode}: ${message}`, err.stack);

	res.status(statusCode).json({
		error: {
			message,
			statusCode,
			timestamp: new Date().toISOString()
		}
	});
}

export function createError(message: string, statusCode: number = 500): AppError {
	const error = new Error(message) as AppError;
	error.statusCode = statusCode;
	return error;
}
