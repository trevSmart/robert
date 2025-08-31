import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';

/**
 * Exemple d'ús del sistema de gestió d'errors
 */
export class ExampleUsage {
	private errorHandler: ErrorHandler;

	constructor(outputChannel?: vscode.OutputChannel) {
		this.errorHandler = ErrorHandler.getInstance(outputChannel);
	}

	/**
	 * Exemple d'ús del ErrorHandler per mètodes asíncrons
	 */
	public async asyncMethod(): Promise<string> {
		return (
			(await this.errorHandler.executeWithErrorHandling(async () => {
				// Simulem una operació asíncrona que pot fallar
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Generem un error aleatori per demostrar
				if (Math.random() > 0.5) {
					throw new Error('Error aleatori en mètode asíncron');
				}

				return 'Operació asíncrona completada amb èxit';
			}, 'ExampleUsage.asyncMethod')) || 'Fallback per error asíncron'
		);
	}

	/**
	 * Exemple d'ús del ErrorHandler per mètodes síncrons
	 */
	public syncMethod(): string {
		return (
			this.errorHandler.executeWithErrorHandlingSync(() => {
				// Generem un error aleatori per demostrar
				if (Math.random() > 0.5) {
					throw new Error('Error aleatori en mètode síncron');
				}

				return 'Operació síncrona completada amb èxit';
			}, 'ExampleUsage.syncMethod') || 'Fallback per error síncron'
		);
	}

	/**
	 * Exemple d'ús directe del ErrorHandler
	 */
	public async methodWithManualErrorHandling(): Promise<string> {
		return (
			(await this.errorHandler.executeWithErrorHandling(
				async () => {
					// Simulem una operació que pot fallar
					await new Promise((resolve) => setTimeout(resolve, 50));

					if (Math.random() > 0.7) {
						throw new Error('Error en mètode amb gestió manual');
					}

					return 'Operació amb gestió manual completada';
				},
				'ExampleUsage.methodWithManualErrorHandling',
				'Fallback value'
			)) || 'Fallback per error manual'
		);
	}

	/**
	 * Exemple d'ús de logging
	 */
	public demonstrateLogging(): void {
		this.errorHandler.logInfo('Això és un missatge informatiu', 'ExampleUsage.demonstrateLogging');
		this.errorHandler.logWarning('Això és un warning', 'ExampleUsage.demonstrateLogging');

		// També podem generar errors intencionadament
		try {
			throw new Error('Error de demostració per logging');
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'ExampleUsage.demonstrateLogging');
		}
	}

	/**
	 * Exemple d'ús amb fallbacks
	 */
	public async methodWithFallback(): Promise<string> {
		return (
			(await this.errorHandler.executeWithErrorHandling(
				async () => {
					// Simulem una operació que falla
					throw new Error('Aquesta operació sempre falla');
				},
				'ExampleUsage.methodWithFallback',
				'Valor de fallback quan hi ha error'
			)) || 'Fallback per error sempre falla'
		);
	}
}

/**
 * Comanda d'exemple per demostrar el sistema
 */
export function registerExampleCommands(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
	const exampleUsage = new ExampleUsage(outputChannel);

	// Comanda per provar mètodes asíncrons
	context.subscriptions.push(
		vscode.commands.registerCommand('robert.example.async', async () => {
			const result = await exampleUsage.asyncMethod();
			vscode.window.showInformationMessage(`Resultat: ${result}`);
		})
	);

	// Comanda per provar mètodes síncrons
	context.subscriptions.push(
		vscode.commands.registerCommand('robert.example.sync', () => {
			const result = exampleUsage.syncMethod();
			vscode.window.showInformationMessage(`Resultat: ${result}`);
		})
	);

	// Comanda per provar gestió manual
	context.subscriptions.push(
		vscode.commands.registerCommand('robert.example.manual', async () => {
			const result = await exampleUsage.methodWithManualErrorHandling();
			vscode.window.showInformationMessage(`Resultat: ${result}`);
		})
	);

	// Comanda per provar logging
	context.subscriptions.push(
		vscode.commands.registerCommand('robert.example.logging', () => {
			exampleUsage.demonstrateLogging();
			vscode.window.showInformationMessage('Logging demostrat - revisa el canal Output');
		})
	);

	// Comanda per provar fallbacks
	context.subscriptions.push(
		vscode.commands.registerCommand('robert.example.fallback', async () => {
			const result = await exampleUsage.methodWithFallback();
			vscode.window.showInformationMessage(`Resultat: ${result}`);
		})
	);
}
