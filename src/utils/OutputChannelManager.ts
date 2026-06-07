import * as vscode from 'vscode';

export class OutputChannelManager {
	private static instance: OutputChannelManager;
	private outputChannel: vscode.LogOutputChannel;

	private constructor() {
		this.outputChannel = vscode.window.createOutputChannel('Robert', { log: true });
	}

	public static getInstance(): OutputChannelManager {
		if (!OutputChannelManager.instance) {
			OutputChannelManager.instance = new OutputChannelManager();
		}
		return OutputChannelManager.instance;
	}

	public getOutputChannel(): vscode.LogOutputChannel {
		return this.outputChannel;
	}

	public show(): void {
		this.outputChannel.show(true);
	}

	public trace(message: string): void {
		this.outputChannel.trace(message);
	}

	public debug(message: string): void {
		this.outputChannel.debug(message);
	}

	public info(message: string): void {
		this.outputChannel.info(message);
	}

	public warn(message: string): void {
		this.outputChannel.warn(message);
	}

	public error(message: string | Error): void {
		this.outputChannel.error(message);
	}

	public appendLine(line: string): void {
		this.outputChannel.info(line);
	}

	public append(text: string): void {
		this.outputChannel.info(text);
	}

	public clear(): void {
		this.outputChannel.clear();
	}

	public dispose(): void {
		this.outputChannel.dispose();
	}
}
