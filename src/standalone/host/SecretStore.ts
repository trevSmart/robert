import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SecretCodec } from './ConfigurationStore';

type Listener = (event: { key: string }) => unknown;

/** Environment variables that provide each credential when the OS keychain is not available. */
const CREDENTIAL_ENV_VARS = 'ROBERT_JIRA_API_TOKEN, ROBERT_RALLY_API_KEY';

export class SecureStorageUnavailableError extends Error {
	constructor() {
		super(`Secure storage (OS keychain) is not available, so credentials cannot be saved encrypted. Set them through environment variables instead (${CREDENTIAL_ENV_VARS}).`);
		this.name = 'SecureStorageUnavailableError';
	}
}

/**
 * Standalone counterpart of VS Code's `SecretStorage` (`context.secrets`).
 *
 * Every value is encrypted with Electron `safeStorage` (OS keychain) before it
 * is written to `<userData>/secrets.json`; nothing is stored when no real
 * keychain is available (e.g. Linux falling back to `basic_text`).
 */
export class SecretStore {
	private values: Record<string, string> = {};
	private readonly listeners = new Set<Listener>();

	constructor(
		private readonly filePath: string,
		private readonly codec: SecretCodec
	) {
		this.load();
	}

	public isAvailable(): boolean {
		return this.codec.isAvailable();
	}

	public async keys(): Promise<string[]> {
		return Object.keys(this.values);
	}

	public async get(key: string): Promise<string | undefined> {
		const encoded = this.values[key];
		if (encoded === undefined || !this.codec.isAvailable()) {
			return undefined;
		}
		try {
			return this.codec.decrypt(encoded);
		} catch {
			// Encrypted with another key (profile copied from another machine/user): unusable.
			return undefined;
		}
	}

	public async store(key: string, value: string): Promise<void> {
		if (!this.codec.isAvailable()) {
			throw new SecureStorageUnavailableError();
		}
		this.commit({ ...this.values, [key]: this.codec.encrypt(value) });
		this.fire(key);
	}

	public async delete(key: string): Promise<void> {
		if (!(key in this.values)) {
			return;
		}
		const { [key]: _removed, ...rest } = this.values;
		this.commit(rest);
		this.fire(key);
	}

	public readonly onDidChange = (listener: Listener): { dispose(): void } => {
		this.listeners.add(listener);
		return { dispose: () => void this.listeners.delete(listener) };
	};

	private fire(key: string): void {
		for (const listener of [...this.listeners]) {
			listener({ key });
		}
	}

	private load(): void {
		try {
			const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				this.values = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
			}
		} catch {
			this.values = {};
		}
	}

	/**
	 * Writes the new contents to disk and only then adopts them in memory, so a
	 * failed write leaves memory matching the file (a retried delete really retries).
	 */
	private commit(next: Record<string, string>): void {
		fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
		const tmp = `${this.filePath}.tmp`;
		fs.writeFileSync(tmp, `${JSON.stringify(next, null, '\t')}\n`, { encoding: 'utf8', mode: 0o600 });
		fs.renameSync(tmp, this.filePath);
		this.values = next;
	}
}
