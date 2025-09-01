import * as vscode from 'vscode';

/**
 * Centralized output channel manager for the Robert extension
 * Ensures only one output channel is created and reused throughout the extension
 */
export class OutputChannelManager {
	private static instance: OutputChannelManager;
	private outputChannel: vscode.OutputChannel;

	private constructor() {
		this.outputChannel = vscode.window.createOutputChannel('Robert');
	}

	/**
	 * Get the singleton instance of OutputChannelManager
	 */
	public static getInstance(): OutputChannelManager {
		if (!OutputChannelManager.instance) {
			OutputChannelManager.instance = new OutputChannelManager();
		}
		return OutputChannelManager.instance;
	}

	/**
	 * Get the output channel instance
	 */
	public getOutputChannel(): vscode.OutputChannel {
		return this.outputChannel;
	}

	/**
	 * Show the output channel
	 */
	public show(): void {
		this.outputChannel.show(true);
	}

	/**
	 * Append a line to the output channel
	 */
	public appendLine(line: string): void {
		this.outputChannel.appendLine(line);
	}

	/**
	 * Append text to the output channel (without newline)
	 */
	public append(text: string): void {
		this.outputChannel.append(text);
	}

	/**
	 * Clear the output channel
	 */
	public clear(): void {
		this.outputChannel.clear();
	}

	/**
	 * Dispose the output channel
	 */
	public dispose(): void {
		this.outputChannel.dispose();
	}
}
