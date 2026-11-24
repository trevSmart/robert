import * as fs from 'node:fs';

/** Description of one setting, as declared in package.json `contributes.configuration`. */
export interface SettingSchema {
	type?: string;
	default?: unknown;
	description?: string;
	markdownDescription?: string;
	enum?: string[];
	enumDescriptions?: string[];
	minimum?: number;
	maximum?: number;
	/** VS Code setting scope; `application` / `machine` settings cannot be set per workspace. */
	scope?: string;
	order?: number;
}

/**
 * Reads the `contributes.configuration.properties` block from a package.json.
 * The manifest is the single source of truth for settings in both hosts: VS Code
 * reads it natively, the standalone app and the settings dialog read it here.
 */
export function readSettingsSchema(manifestPath: string): Record<string, SettingSchema> {
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
		contributes?: { configuration?: { properties?: Record<string, SettingSchema> } | Array<{ properties?: Record<string, SettingSchema> }> };
	};
	const configuration = manifest.contributes?.configuration;
	const blocks = Array.isArray(configuration) ? configuration : configuration ? [configuration] : [];
	return Object.assign({}, ...blocks.map(block => block.properties ?? {}));
}

/** Env var names that don't follow the ROBERT_<SNAKE_CASE_KEY> rule (see SettingsManager / ENVIRONMENT_VARIABLES.md). */
const ENV_VAR_EXCEPTIONS: Record<string, string> = {
	'robert.statusBarShowSprintDaysLeft': 'ROBERT_STATUS_BAR_SPRINT_DAYS'
};

/** ROBERT_* environment variable SettingsManager falls back to for a setting. */
export function envVarForSetting(key: string): string {
	return (
		ENV_VAR_EXCEPTIONS[key] ??
		`ROBERT_${key
			.replace(/^robert\./, '')
			.replace(/\./g, '_')
			.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
			.toUpperCase()}`
	);
}

/** Parses an environment variable the way SettingsManager does for the setting's type. */
export function parseEnvValue(type: string | undefined, raw: string): unknown {
	if (type === 'boolean') {
		return /^(true|1|yes)$/i.test(raw.trim());
	}
	if (type === 'number' || type === 'integer') {
		const n = Number(raw.trim());
		return Number.isFinite(n) ? n : raw.trim();
	}
	return raw.trim();
}

/** Groups of the settings dialog, in display order. A setting belongs to the first group whose key prefix matches ('' matches everything). */
export const SETTING_GROUPS: ReadonlyArray<{ title: string; prefix: string }> = [
	{ title: 'Provider', prefix: 'robert.provider' },
	{ title: 'Jira Cloud', prefix: 'robert.jira' },
	{ title: 'Rally', prefix: 'robert.rally' },
	{ title: 'Collaboration', prefix: 'robert.collaboration.' },
	{ title: 'General', prefix: '' }
];

export function groupForSetting(key: string): string {
	return (SETTING_GROUPS.find(group => key.startsWith(group.prefix)) ?? SETTING_GROUPS[SETTING_GROUPS.length - 1]).title;
}

/** `robert.collaboration.serverUrl` → `Collaboration › Server Url`. */
export function settingLabel(key: string): string {
	return key
		.replace(/^robert\./, '')
		.split('.')
		.map(part => part.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()))
		.join(' › ');
}

/** Settings that change what data Robert shows (provider + its connection): changing them reloads all data. */
export function connectionSettingKeys(schema: Record<string, SettingSchema>): string[] {
	return Object.keys(schema).filter(key => key === 'robert.provider' || key.startsWith('robert.jira') || key.startsWith('robert.rally'));
}
