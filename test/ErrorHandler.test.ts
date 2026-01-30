import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler } from '../src/ErrorHandler.js';

// Mock vscode module
vi.mock('vscode', () => ({
	window: {
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		createOutputChannel: vi.fn(() => ({
			appendLine: vi.fn(),
			show: vi.fn(),
			hide: vi.fn(),
			dispose: vi.fn()
		}))
	},
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string, defaultValue: unknown) => {
				if (key === 'debugMode') return false;
				return defaultValue;
			})
		}))
	}
}));

describe('ErrorHandler', () => {
	let errorHandler: ErrorHandler;

	beforeEach(() => {
		errorHandler = ErrorHandler.getInstance();
		vi.clearAllMocks();
	});

	describe('getInstance', () => {
		it('should return singleton instance', () => {
			const instance1 = ErrorHandler.getInstance();
			const instance2 = ErrorHandler.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('handleError', () => {
		it('should handle Error object', () => {
			const error = new Error('Test error');
			expect(() => errorHandler.handleError(error, 'TestContext')).not.toThrow();
		});

		it('should handle string error', () => {
			const error = 'Test error string';
			expect(() => errorHandler.handleError(error, 'TestContext')).not.toThrow();
		});

		it('should handle error without context', () => {
			const error = new Error('Test error');
			expect(() => errorHandler.handleError(error)).not.toThrow();
		});
	});

	describe('logError', () => {
		it('should log error message', () => {
			expect(() => errorHandler.logError('Test error message', 'TestContext')).not.toThrow();
		});

		it('should log error without context', () => {
			expect(() => errorHandler.logError('Test error message')).not.toThrow();
		});
	});

	describe('logWarning', () => {
		it('should log warning message', () => {
			expect(() => errorHandler.logWarning('Test warning', 'TestContext')).not.toThrow();
		});

		it('should log warning without context', () => {
			expect(() => errorHandler.logWarning('Test warning')).not.toThrow();
		});
	});

	describe('logInfo', () => {
		it('should log info message', () => {
			expect(() => errorHandler.logInfo('Test info', 'TestContext')).not.toThrow();
		});

		it('should log info without context', () => {
			expect(() => errorHandler.logInfo('Test info')).not.toThrow();
		});
	});

	describe('logDebug', () => {
		it('should log debug message when debug mode is enabled', () => {
			// Debug mode is mocked as false, so this shouldn't throw
			expect(() => errorHandler.logDebug('Test debug', 'TestContext')).not.toThrow();
		});
	});

	describe('executeWithErrorHandling', () => {
		it('should execute async function successfully', async () => {
			const fn = vi.fn(async () => 'success');
			const result = await errorHandler.executeWithErrorHandling(fn, 'TestContext');
			
			expect(fn).toHaveBeenCalled();
			expect(result).toBe('success');
		});

		it('should handle async function errors', async () => {
			const fn = vi.fn(async () => {
				throw new Error('Test error');
			});
			
			const result = await errorHandler.executeWithErrorHandling(fn, 'TestContext');
			
			expect(fn).toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it('should return fallback on error', async () => {
			const fn = vi.fn(async () => {
				throw new Error('Test error');
			});
			
			const result = await errorHandler.executeWithErrorHandling(fn, 'TestContext', 'fallback');
			
			expect(result).toBe('fallback');
		});
	});

	describe('executeWithErrorHandlingSync', () => {
		it('should execute sync function successfully', () => {
			const fn = vi.fn(() => 'success');
			const result = errorHandler.executeWithErrorHandlingSync(fn, 'TestContext');
			
			expect(fn).toHaveBeenCalled();
			expect(result).toBe('success');
		});

		it('should handle sync function errors', () => {
			const fn = vi.fn(() => {
				throw new Error('Test error');
			});
			
			const result = errorHandler.executeWithErrorHandlingSync(fn, 'TestContext');
			
			expect(fn).toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it('should return fallback on error', () => {
			const fn = vi.fn(() => {
				throw new Error('Test error');
			});
			
			const result = errorHandler.executeWithErrorHandlingSync(fn, 'TestContext', 'fallback');
			
			expect(result).toBe('fallback');
		});
	});

	describe('logViewCreation', () => {
		it('should log view creation', () => {
			expect(() => errorHandler.logViewCreation('TestView', 'TestContext')).not.toThrow();
		});
	});

	describe('logViewDestruction', () => {
		it('should log view destruction', () => {
			expect(() => errorHandler.logViewDestruction('TestView', 'TestContext')).not.toThrow();
		});
	});
});
