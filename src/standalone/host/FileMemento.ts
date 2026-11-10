import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * JSON-file-backed implementation of `vscode.Memento`, used as the
 * extension context's `globalState` in the standalone app (favorites,
 * recently viewed items, custom calendar events, ...).
 */
export class FileMemento {
	private data: Record<string, unknown> = {};

	constructor(private readonly filePath: string) {
		try {
			const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
			this.data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
		} catch {
			this.data = {};
		}
	}

	public keys(): readonly string[] {
		return Object.keys(this.data);
	}

	public get<T>(key: string): T | undefined;
	public get<T>(key: string, defaultValue: T): T;
	public get<T>(key: string, defaultValue?: T): T | undefined {
		return key in this.data ? (this.data[key] as T) : defaultValue;
	}

	public async update(key: string, value: unknown): Promise<void> {
		if (value === undefined) {
			delete this.data[key];
		} else {
			// Round-trip through JSON, like VS Code does, so callers can't keep live references.
			this.data[key] = JSON.parse(JSON.stringify(value));
		}
		fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
		const tmp = `${this.filePath}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(this.data), 'utf8');
		fs.renameSync(tmp, this.filePath);
	}

	public setKeysForSync(_keys: readonly string[]): void {
		// Settings Sync does not exist outside VS Code.
	}
}
