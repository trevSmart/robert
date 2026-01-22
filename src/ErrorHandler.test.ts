/**
 * Unit tests for ErrorHandler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler } from './ErrorHandler';
import * as vscode from 'vscode';

describe('ErrorHandler', () => {
	let errorHandler: ErrorHandler;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset singleton instance
		(ErrorHandler as any).instance = undefined;
		errorHandler = ErrorHandler.getInstance();
	});

	describe('getInstance', () => {
		it('should return a singleton instance', () => {
			const instance1 = ErrorHandler.getInstance();
			const instance2 = ErrorHandler.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('handleError', () => {
		it('should handle string errors', () => {
			const errorMessage = 'Test error message';
			errorHandler.handleError(errorMessage, 'TestContext');

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
		});

		it('should handle Error objects', () => {
			const error = new Error('Test error');
			errorHandler.handleError(error, 'TestContext');

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Test error'));
		});

		it('should use default context when not provided', () => {
			errorHandler.handleError('Test error');

			expect(vscode.window.showErrorMessage).toHaveBeenCalled();
		});
	});

	describe('logError', () => {
		it('should log errors without showing notifications', () => {
			const errorMessage = 'Silent error';
			errorHandler.logError(errorMessage, 'TestContext');

			expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
		});
	});

	describe('logWarning', () => {
		it('should log warning messages', () => {
			const warningMessage = 'Test warning';
			errorHandler.logWarning(warningMessage, 'TestContext');

			// No notification should be shown for warnings
			expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
		});
	});

	describe('logInfo', () => {
		it('should log info messages', () => {
			const infoMessage = 'Test info';
			errorHandler.logInfo(infoMessage, 'TestContext');

			// No notification should be shown for info
			expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
		});
	});

	describe('executeWithErrorHandling', () => {
		it('should execute async function successfully', async () => {
			const mockFn = vi.fn().mockResolvedValue('success');
			const result = await errorHandler.executeWithErrorHandling(mockFn, 'TestContext');

			expect(mockFn).toHaveBeenCalled();
			expect(result).toBe('success');
		});

		it('should handle async function errors', async () => {
			const mockFn = vi.fn().mockRejectedValue(new Error('Async error'));
			const result = await errorHandler.executeWithErrorHandling(mockFn, 'TestContext');

			expect(mockFn).toHaveBeenCalled();
			expect(result).toBeUndefined();
			expect(vscode.window.showErrorMessage).toHaveBeenCalled();
		});

		it('should return fallback value on error', async () => {
			const mockFn = vi.fn().mockRejectedValue(new Error('Error'));
			const fallback = 'fallback-value';
			const result = await errorHandler.executeWithErrorHandling(mockFn, 'TestContext', fallback);

			expect(result).toBe(fallback);
		});
	});

	describe('executeWithErrorHandlingSync', () => {
		it('should execute sync function successfully', () => {
			const mockFn = vi.fn().mockReturnValue('success');
			const result = errorHandler.executeWithErrorHandlingSync(mockFn, 'TestContext');

			expect(mockFn).toHaveBeenCalled();
			expect(result).toBe('success');
		});

		it('should handle sync function errors', () => {
			const mockFn = vi.fn().mockImplementation(() => {
				throw new Error('Sync error');
			});
			const result = errorHandler.executeWithErrorHandlingSync(mockFn, 'TestContext');

			expect(mockFn).toHaveBeenCalled();
			expect(result).toBeUndefined();
			expect(vscode.window.showErrorMessage).toHaveBeenCalled();
		});

		it('should return fallback value on error', () => {
			const mockFn = vi.fn().mockImplementation(() => {
				throw new Error('Error');
			});
			const fallback = 'fallback-value';
			const result = errorHandler.executeWithErrorHandlingSync(mockFn, 'TestContext', fallback);

			expect(result).toBe(fallback);
		});
	});


});
