import * as vscode from 'vscode';

export class ErrorHandler {
	private static instance: ErrorHandler;
	private outputChannel?: vscode.OutputChannel;

	private constructor(outputChannel?: vscode.OutputChannel) {
		this.outputChannel = outputChannel;
		this.setupGlobalErrorHandling();
	}

	public static getInstance(outputChannel?: vscode.OutputChannel): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler(outputChannel);
		}
		return ErrorHandler.instance;
	}

	public setOutputChannel(outputChannel: vscode.OutputChannel): void {
		this.outputChannel = outputChannel;
	}

	/**
	 * Setup global error handling for uncaught errors
	 */
	private setupGlobalErrorHandling(): void {
		// Capture uncaught promise rejections
		globalThis.process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
			this.handleError(new Error(`Unhandled Promise Rejection: ${reason}`), 'Unhandled Promise Rejection');
		});

		// Capture uncaught exceptions
		globalThis.process.on('uncaughtException', (error: Error) => {
			this.handleError(error, 'Uncaught Exception');
		});

		// Capture VS Code errors
		if (vscode.window.onDidChangeWindowState) {
			vscode.window.onDidChangeWindowState(() => {
				// This can help catch some VS Code related errors
			});
		}
	}

	/**
	 * Handle errors and log them to the output channel
	 */
	public handleError(error: Error | string, context: string = 'Unknown'): void {
		const errorMessage = typeof error === 'string' ? error : error.message;
		const stackTrace = error instanceof Error ? error.stack : '';
		const timestamp = new Date().toISOString();

		// Log to output channel
		if (this.outputChannel) {
			this.outputChannel.appendLine(`[Robert] ❌ ERROR in ${context}:`);
			this.outputChannel.appendLine(`[Robert] Time: ${timestamp}`);
			this.outputChannel.appendLine(`[Robert] Message: ${errorMessage}`);
			if (stackTrace) {
				this.outputChannel.appendLine(`[Robert] Stack Trace:`);
				this.outputChannel.appendLine(`[Robert] ${stackTrace}`);
			}
			this.outputChannel.appendLine(`[Robert] ---`);
		}

		// Show error notification to user (optional)
		vscode.window.showErrorMessage(`Robert Extension Error: ${errorMessage}`);
	}

	/**
	 * Log warnings to the output channel
	 */
	public logWarning(message: string, context: string = 'Unknown'): void {
		const timestamp = new Date().toISOString();

		if (this.outputChannel) {
			this.outputChannel.appendLine(`[Robert] ⚠️ WARNING in ${context}:`);
			this.outputChannel.appendLine(`[Robert] Time: ${timestamp}`);
			this.outputChannel.appendLine(`[Robert] Message: ${message}`);
			this.outputChannel.appendLine(`[Robert] ---`);
		}
	}

	/**
	 * Log info messages to the output channel
	 */
	public logInfo(message: string, context: string = 'Unknown'): void {
		const timestamp = new Date().toISOString();

		if (this.outputChannel) {
			this.outputChannel.appendLine(`[Robert] ℹ️ INFO in ${context}:`);
			this.outputChannel.appendLine(`[Robert] Time: ${timestamp}`);
			this.outputChannel.appendLine(`[Robert] Message: ${message}`);
			this.outputChannel.appendLine(`[Robert] ---`);
		}
	}

	/**
	 * Log view destruction events to the output channel with special formatting
	 */
	public logViewDestruction(viewType: string, context: string = 'Unknown'): void {
		const timestamp = new Date().toISOString();

		if (this.outputChannel) {
			this.outputChannel.appendLine(`[Robert] 🗑️ VIEW DESTROYED in ${context}:`);
			this.outputChannel.appendLine(`[Robert] Time: ${timestamp}`);
			this.outputChannel.appendLine(`[Robert] View Type: ${viewType}`);
			this.outputChannel.appendLine(`[Robert] ---`);
		}
	}

	/**
	 * Log view creation/opening events to the output channel with special formatting
	 */
	public logViewCreation(viewType: string, context: string = 'Unknown'): void {
		const timestamp = new Date().toISOString();

		if (this.outputChannel) {
			this.outputChannel.appendLine(`[Robert] 🆕 VIEW CREATED in ${context}:`);
			this.outputChannel.appendLine(`[Robert] Time: ${timestamp}`);
			this.outputChannel.appendLine(`[Robert] View Type: ${viewType}`);
			this.outputChannel.appendLine(`[Robert] ---`);
		}
	}

	/**
	 * Execute a function with error handling
	 */
	public async executeWithErrorHandling<T>(fn: () => Promise<T> | T, context: string = 'Unknown', fallback?: T): Promise<T | undefined> {
		try {
			return await fn();
		} catch (error) {
			this.handleError(error instanceof Error ? error : new Error(String(error)), context);
			return fallback;
		}
	}

	/**
	 * Execute a function with error handling (synchronous version)
	 */
	public executeWithErrorHandlingSync<T>(fn: () => T, context: string = 'Unknown', fallback?: T): T | undefined {
		try {
			return fn();
		} catch (error) {
			this.handleError(error instanceof Error ? error : new Error(String(error)), context);
			return fallback;
		}
	}
}

/**
 * Decorator to automatically handle errors in methods
 */
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
				throw error; // Re-throw to maintain original behavior
			}
		};

		return descriptor;
	};
}

/**
 * Decorator to automatically handle errors in synchronous methods
 */
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
				throw error; // Re-throw to maintain original behavior
			}
		};

		return descriptor;
	};
}
