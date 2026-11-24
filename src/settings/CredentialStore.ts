/**
 * API tokens / keys live in the OS keychain, never in settings files:
 * - VS Code extension: `context.secrets` (SecretStorage).
 * - Standalone app: a file encrypted with Electron `safeStorage` (see standalone/host/SecretStore.ts).
 *
 * Credentials are keyed by connection (Jira site + account, Rally instance), not by
 * workspace: workspaces that point at the same Jira site share its token, and a
 * workspace pointing at another site looks up a different one.
 *
 * SecretStorage is asynchronous but SettingsManager.getSetting() is synchronous and
 * used everywhere, so all of Robert's credentials are loaded into memory once
 * (initialize) and kept in sync through the storage's change event.
 */

/** Subset of `vscode.SecretStorage` used by Robert (also implemented by the standalone host). */
export interface SecretStorageLike {
	get(key: string): Thenable<string | undefined>;
	store(key: string, value: string): Thenable<void>;
	delete(key: string): Thenable<void>;
	keys?(): Thenable<string[]>;
	onDidChange?: (listener: (event: { key: string }) => unknown) => { dispose(): unknown };
}

const KEY_PREFIX = 'robert.credential.';

/** Normalizes a URL so that `https://Acme.atlassian.net/` and `https://acme.atlassian.net` map to the same credential. */
function normalizeUrl(url: string): string {
	return url.trim().toLowerCase().replace(/\/+$/, '');
}

/** Secret key of the Jira API token for a site + account. */
export function jiraCredentialKey(baseUrl: string, email: string): string {
	return `${KEY_PREFIX}jira:${normalizeUrl(baseUrl)}|${email.trim().toLowerCase()}`;
}

/** Secret key of the Rally API key for an instance. */
export function rallyCredentialKey(instance: string): string {
	return `${KEY_PREFIX}rally:${normalizeUrl(instance)}`;
}

export class CredentialStore {
	private static instance: CredentialStore | undefined;

	private storage: SecretStorageLike | undefined;
	private readonly cache = new Map<string, string>();
	private readonly listeners = new Set<(key: string) => void>();
	private subscription: { dispose(): unknown } | undefined;
	private readyPromise: Promise<void> = Promise.resolve();

	public static getInstance(): CredentialStore {
		if (!CredentialStore.instance) {
			CredentialStore.instance = new CredentialStore();
		}
		return CredentialStore.instance;
	}

	/**
	 * Binds the store to the host's secret storage and loads Robert's credentials
	 * into memory. Errors (e.g. no keychain) leave the store empty: Robert then
	 * falls back to ROBERT_* environment variables.
	 */
	public initialize(storage: SecretStorageLike, onError?: (error: Error) => void): Promise<void> {
		this.subscription?.dispose();
		this.storage = storage;
		this.cache.clear();
		this.subscription = storage.onDidChange?.(event => {
			if (event.key.startsWith(KEY_PREFIX)) {
				void this.reload(event.key);
			}
		});
		this.readyPromise = (async () => {
			try {
				const keys = storage.keys ? await storage.keys() : [];
				for (const key of keys.filter(k => k.startsWith(KEY_PREFIX))) {
					const value = await storage.get(key);
					if (value) {
						this.cache.set(key, value);
					}
				}
			} catch (error) {
				onError?.(error instanceof Error ? error : new Error(String(error)));
			}
		})();
		return this.readyPromise;
	}

	/** Resolves once the initial load has finished (immediately when never initialized). */
	public whenReady(): Promise<void> {
		return this.readyPromise;
	}

	public isAvailable(): boolean {
		return this.storage !== undefined;
	}

	/** Credential stored for a key, from memory (synchronous). */
	public get(key: string): string | undefined {
		return this.cache.get(key);
	}

	public has(key: string): boolean {
		return this.cache.has(key);
	}

	public async set(key: string, value: string): Promise<void> {
		const storage = this.requireStorage();
		await storage.store(key, value);
		this.cache.set(key, value);
		this.notify(key);
	}

	public async delete(key: string): Promise<void> {
		const storage = this.requireStorage();
		await storage.delete(key);
		this.cache.delete(key);
		this.notify(key);
	}

	/** Called with the secret key whenever a credential is stored or deleted (here or elsewhere). */
	public onDidChange(listener: (key: string) => void): { dispose(): void } {
		this.listeners.add(listener);
		return { dispose: () => this.listeners.delete(listener) };
	}

	private async reload(key: string): Promise<void> {
		if (!this.storage) {
			return;
		}
		const previous = this.cache.get(key);
		const value = await this.storage.get(key);
		if (value) {
			this.cache.set(key, value);
		} else {
			this.cache.delete(key);
		}
		if (previous !== value) {
			this.notify(key);
		}
	}

	private notify(key: string): void {
		for (const listener of [...this.listeners]) {
			listener(key);
		}
	}

	private requireStorage(): SecretStorageLike {
		if (!this.storage) {
			throw new Error('Secure credential storage is not available.');
		}
		return this.storage;
	}
}
