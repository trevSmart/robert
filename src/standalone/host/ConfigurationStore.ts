import * as fs from 'node:fs';
import * as path from 'node:path';
import { readSettingsSchema, type SettingSchema } from '../../settings/settingsSchema';

export type { SettingSchema };

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

/**
 * Encrypted value. Older versions stored API credentials as settings this way;
 * credentials now live in SecretStore, and these are only read once, to migrate them.
 */
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
 * API credentials are not settings: they live in SecretStore.
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
		return readSettingsSchema(manifestPath);
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
	 * Returns the keys whose explicit user value changed. Explicit values are
	 * compared (not effective ones): choosing a value equal to the manifest
	 * default, or removing it, still matters because an explicit value takes
	 * precedence over ROBERT_* environment variables.
	 */
	public update(changes: Record<string, unknown>): string[] {
		const changed: string[] = [];
		for (const [fullKey, value] of Object.entries(changes)) {
			if (JSON.stringify(this.getUserValue(fullKey)) === JSON.stringify(value)) {
				continue;
			}
			if (value === undefined) {
				delete this.values[fullKey];
			} else {
				this.values[fullKey] = value;
			}
			changed.push(fullKey);
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
