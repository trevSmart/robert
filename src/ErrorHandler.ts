import * as vscode from 'vscode';
import { OutputChannelManager } from './utils/OutputChannelManager';

export class ErrorHandler {
	private static instance: ErrorHandler;
	private outputManager: OutputChannelManager;

	private constructor() {
		this.outputManager = OutputChannelManager.getInstance();
	}

	public static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	public handleError(error: Error | string, context: string = 'Unknown'): void {
		const errorMessage = typeof error === 'string' ? error : error.message;
		const stackTrace = error instanceof Error ? error.stack : '';

		this.outputManager.error(`ERROR in ${context}: ${errorMessage}${stackTrace ? `\n${stackTrace}` : ''}`);

		vscode.window.showErrorMessage(`Robert Extension Error: ${errorMessage}`);
	}

	public logError(message: string, context: string = 'Unknown'): void {
		this.outputManager.error(`[${context}] ${message}`);
	}

	public logWarning(message: string, context: string = 'Unknown'): void {
		this.outputManager.warn(`[${context}] ${message}`);
	}

	public logInfo(message: string, context: string = 'Unknown'): void {
		this.outputManager.info(`[${context}] ${message}`);
	}

	public logDebug(message: string, context: string = 'Unknown'): void {
		this.outputManager.debug(`[${context}] ${message}`);
	}

	public logViewDestruction(viewType: string, context: string = 'Unknown'): void {
		this.outputManager.info(`[${context}] VIEW DESTROYED: ${viewType}`);
	}

	public logViewCreation(viewType: string, context: string = 'Unknown'): void {
		this.outputManager.info(`[${context}] VIEW CREATED: ${viewType}`);
	}

	public async executeWithErrorHandling<T>(fn: () => Promise<T> | T, context: string = 'Unknown', fallback?: T): Promise<T | undefined> {
		try {
			return await fn();
		} catch (error) {
			this.handleError(error instanceof Error ? error : new Error(String(error)), context);
			return fallback;
		}
	}

	public executeWithErrorHandlingSync<T>(fn: () => T, context: string = 'Unknown', fallback?: T): T | undefined {
		try {
			return fn();
		} catch (error) {
			this.handleError(error instanceof Error ? error : new Error(String(error)), context);
			return fallback;
		}
	}
}

export function handleErrors(context?: string) {
	return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: unknown[]) {
			try {
				return await originalMethod.apply(this, args);
			} catch (error) {
				const errorHandler = ErrorHandler.getInstance();
				const methodContext = context || `${(target as { constructor?: { name?: string } }).constructor?.name || 'Unknown'}.${propertyKey}`;
				errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), methodContext);
				throw error;
			}
		};

		return descriptor;
	};
}

export function handleErrorsSync(context?: string) {
	return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = function (...args: unknown[]) {
			try {
				return originalMethod.apply(this, args);
			} catch (error) {
				const errorHandler = ErrorHandler.getInstance();
				const methodContext = context || `${(target as { constructor?: { name?: string } }).constructor?.name || 'Unknown'}.${propertyKey}`;
				errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), methodContext);
				throw error;
			}
		};

		return descriptor;
	};
}
