import * as fs from 'node:fs';
import * as path from 'node:path';

type Level = 'trace' | 'debug' | 'info' | 'warning' | 'error';

/**
 * Stand-in for VS Code's "Robert" LogOutputChannel: writes timestamped lines to
 * a log file (and stdout), so the standalone app keeps the same logging contract.
 * Debug/trace lines are only written when `isVerbose()` returns true, matching
 * VS Code's default "Info" log level.
 */
export class FileLogChannel {
	public readonly name: string;
	private stream: fs.WriteStream | undefined;

	constructor(
		name: string,
		private readonly filePath: string,
		private readonly isVerbose: () => boolean,
		private readonly onShow?: (filePath: string) => void,
		private readonly mirrorToConsole: boolean = false
	) {
		this.name = name;
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		this.stream = fs.createWriteStream(filePath, { flags: 'a', encoding: 'utf8' });
	}

	public get logLevel(): number {
		return this.isVerbose() ? 2 : 3;
	}

	public getFilePath(): string {
		return this.filePath;
	}

	public trace(message: string): void {
		this.write('trace', message);
	}

	public debug(message: string): void {
		this.write('debug', message);
	}

	public info(message: string): void {
		this.write('info', message);
	}

	public warn(message: string): void {
		this.write('warning', message);
	}

	public error(message: string | Error): void {
		this.write('error', message instanceof Error ? `${message.message}\n${message.stack ?? ''}` : message);
	}

	public append(value: string): void {
		this.write('info', value);
	}

	public appendLine(value: string): void {
		this.write('info', value);
	}

	public replace(value: string): void {
		this.write('info', value);
	}

	public clear(): void {
		// Log files are append-only; nothing to clear.
	}

	public show(): void {
		this.onShow?.(this.filePath);
	}

	public hide(): void {
		// No visible panel in the standalone app.
	}

	public dispose(): void {
		this.stream?.end();
		this.stream = undefined;
	}

	private write(level: Level, message: string): void {
		if ((level === 'trace' || level === 'debug') && !this.isVerbose()) {
			return;
		}
		const line = `${new Date().toISOString()} [${level}] ${message}`;
		this.stream?.write(`${line}\n`);
		if (this.mirrorToConsole) {
			// console (unlike stream.write) swallows EPIPE when no terminal is attached.
			console.error(line);
		}
	}
}
