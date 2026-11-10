import * as fs from 'node:fs';
import * as path from 'node:path';

/** JSON-schema-ish description of one setting, as declared in package.json `contributes.configuration`. */
export interface SettingSchema {
	type?: string;
	default?: unknown;
	description?: string;
	enum?: string[];
	enumDescriptions?: string[];
}

/** Encrypts/decrypts secret values at rest (backed by Electron `safeStorage` in the app). */
export interface SecretCodec {
	isAvailable(): boolean;
	encrypt(plain: string): string;
	decrypt(encoded: string): string;
}

export interface ConfigurationChangeEvent {
	affectsConfiguration(section: string): boolean;
}

/** Subset of `vscode.WorkspaceConfiguration` that Robert uses. */
export interface WorkspaceConfiguration {
	get<T>(key: string): T | undefined;
	get<T>(key: string, defaultValue: T): T;
	has(key: string): boolean;
	update(key: string, value: unknown, target?: unknown): Promise<void>;
	inspect<T>(key: string): { key: string; defaultValue?: T; globalValue?: T } | undefined;
}

/** Settings whose values are stored encrypted when a {@link SecretCodec} is available. */
export const SECRET_SETTING_KEYS: ReadonlySet<string> = new Set(['robert.jiraApiToken', 'robert.rallyApiKey']);

type EncryptedValue = { __encrypted: string };

function isEncryptedValue(value: unknown): value is EncryptedValue {
	return typeof value === 'object' && value !== null && typeof (value as EncryptedValue).__encrypted === 'string';
}

/**
 * File-backed replacement for VS Code's user settings in the standalone app.
 *
 * Values live in a flat JSON object keyed by fully-qualified setting id
 * (e.g. `robert.jiraEmail`), mirroring VS Code's `settings.json`. Defaults come
 * from the extension manifest so both hosts share a single source of truth.
 */
export class ConfigurationStore {
	private values: Record<string, unknown> = {};
	private readonly listeners = new Set<(event: ConfigurationChangeEvent) => void>();

	constructor(
		private readonly filePath: string,
		private readonly schema: Record<string, SettingSchema>,
		private readonly secretCodec?: SecretCodec
	) {
		this.load();
	}

	/** Reads the `contributes.configuration.properties` block from a package.json. */
	public static readSchemaFromManifest(manifestPath: string): Record<string, SettingSchema> {
		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
			contributes?: { configuration?: { properties?: Record<string, SettingSchema> } | Array<{ properties?: Record<string, SettingSchema> }> };
		};
		const configuration = manifest.contributes?.configuration;
		const blocks = Array.isArray(configuration) ? configuration : configuration ? [configuration] : [];
		return Object.assign({}, ...blocks.map(block => block.properties ?? {}));
	}

	public getSchema(): Record<string, SettingSchema> {
		return this.schema;
	}

	public getFilePath(): string {
		return this.filePath;
	}

	/** Explicit user value for a fully-qualified key, or undefined when unset. */
	public getUserValue(fullKey: string): unknown {
		const raw = this.values[fullKey];
		if (isEncryptedValue(raw)) {
			if (!this.secretCodec?.isAvailable()) {
				return undefined;
			}
			try {
				return this.secretCodec.decrypt(raw.__encrypted);
			} catch {
				return undefined;
			}
		}
		return raw;
	}

	/** Effective value: user value, then manifest default. */
	public getValue(fullKey: string): unknown {
		const user = this.getUserValue(fullKey);
		return user !== undefined ? user : this.schema[fullKey]?.default;
	}

	public getConfiguration(section?: string): WorkspaceConfiguration {
		const qualify = (key: string) => (section ? `${section}.${key}` : key);
		const get = <T>(key: string, defaultValue?: T): T | undefined => {
			const value = this.getValue(qualify(key));
			return (value !== undefined ? value : defaultValue) as T | undefined;
		};
		return {
			get,
			has: (key: string) => this.getValue(qualify(key)) !== undefined,
			update: async (key: string, value: unknown) => {
				this.update({ [qualify(key)]: value });
			},
			inspect: <T>(key: string) => {
				const fullKey = qualify(key);
				return {
					key: fullKey,
					defaultValue: this.schema[fullKey]?.default as T | undefined,
					globalValue: this.getUserValue(fullKey) as T | undefined
				};
			}
		} as WorkspaceConfiguration;
	}

	/**
	 * Applies several changes at once, persists them and fires a single change
	 * event. Setting a key to `undefined` removes the user value (back to default).
	 * Returns the keys whose effective value actually changed.
	 */
	public update(changes: Record<string, unknown>): string[] {
		const changed: string[] = [];
		for (const [fullKey, value] of Object.entries(changes)) {
			const before = this.getValue(fullKey);
			if (value === undefined) {
				delete this.values[fullKey];
			} else if (SECRET_SETTING_KEYS.has(fullKey) && typeof value === 'string' && value !== '' && this.secretCodec?.isAvailable()) {
				this.values[fullKey] = { __encrypted: this.secretCodec.encrypt(value) } satisfies EncryptedValue;
			} else {
				this.values[fullKey] = value;
			}
			if (JSON.stringify(before) !== JSON.stringify(this.getValue(fullKey))) {
				changed.push(fullKey);
			}
		}

		if (changed.length === 0) {
			return changed;
		}

		this.save();
		const event: ConfigurationChangeEvent = {
			affectsConfiguration: (sectionKey: string) => changed.some(key => key === sectionKey || key.startsWith(`${sectionKey}.`))
		};
		for (const listener of this.listeners) {
			listener(event);
		}
		return changed;
	}

	public onDidChange(listener: (event: ConfigurationChangeEvent) => void): { dispose(): void } {
		this.listeners.add(listener);
		return { dispose: () => this.listeners.delete(listener) };
	}

	private load(): void {
		try {
			const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
			this.values = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
		} catch {
			this.values = {};
		}
	}

	private save(): void {
		fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
		const tmp = `${this.filePath}.tmp`;
		fs.writeFileSync(tmp, `${JSON.stringify(this.values, null, '\t')}\n`, { encoding: 'utf8', mode: 0o600 });
		fs.renameSync(tmp, this.filePath);
	}
}
