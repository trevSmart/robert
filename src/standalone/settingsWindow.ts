import { randomBytes } from 'node:crypto';
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { AppProtocol } from './appProtocol';
import { type ConfigurationStore, SECRET_SETTING_KEYS } from './host/ConfigurationStore';
import { injectTheme, getThemeBackground, type ThemeKind } from './host/theme';
import { IPC_SETTINGS_GET, IPC_SETTINGS_SAVE } from './ipcChannels';

export interface SettingField {
	key: string;
	type: string;
	description: string;
	enum?: string[];
	enumDescriptions?: string[];
	secret: boolean;
	/** Whether the user explicitly configured this setting (secrets: whether one is stored). */
	isSet: boolean;
	/** Effective value (explicit value or manifest default); never sent for secrets. */
	value?: unknown;
	/** Manifest default; never sent for secrets. */
	defaultValue?: unknown;
	/** ROBERT_* environment variable used as fallback for this setting. */
	envVar: string;
	/** Whether that environment variable is set (its value is only sent for non-secrets). */
	envIsSet: boolean;
	/** Parsed value of the environment variable; never sent for secrets. */
	envValue?: unknown;
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

function parseEnvValue(type: string, raw: string): unknown {
	if (type === 'boolean') {
		return /^(true|1|yes)$/i.test(raw.trim());
	}
	return raw.trim();
}

/** Turns the manifest schema + stored values into the form model sent to the settings page. */
export function buildSettingFields(config: ConfigurationStore, env: NodeJS.ProcessEnv = process.env): SettingField[] {
	return Object.entries(config.getSchema()).map(([key, schema]) => {
		const secret = SECRET_SETTING_KEYS.has(key);
		const userValue = config.getUserValue(key);
		const envVar = envVarForSetting(key);
		const rawEnv = env[envVar];
		const envIsSet = rawEnv !== undefined && rawEnv.trim() !== '';
		const field: SettingField = {
			envVar,
			envIsSet,
			key,
			type: schema.type ?? 'string',
			description: schema.description ?? '',
			enum: schema.enum,
			enumDescriptions: schema.enumDescriptions,
			secret,
			isSet: secret ? Boolean(userValue) : userValue !== undefined
		};
		if (!secret) {
			field.value = config.getValue(key);
			field.defaultValue = schema.default;
			if (envIsSet) {
				field.envValue = parseEnvValue(field.type, rawEnv);
			}
		}
		return field;
	});
}

/**
 * Validates and normalizes the fields the settings page submitted (only the
 * ones the user edited or reset) against the schema. Unknown keys are dropped.
 *
 * - `null` resets the setting: the explicit value is removed, so ROBERT_*
 *   environment variables and then the manifest default apply again (for
 *   secrets this clears the stored credential).
 * - Any other value is stored explicitly, even when it equals the manifest
 *   default, because an explicit choice must win over environment variables.
 * - An empty string means "not configured" (unset), matching SettingsManager,
 *   which treats empty values as missing. Empty secrets keep the stored value.
 */
export function sanitizeSettingValues(config: ConfigurationStore, submitted: unknown): Record<string, unknown> {
	if (!submitted || typeof submitted !== 'object') {
		return {};
	}
	const schema = config.getSchema();
	const result: Record<string, unknown> = {};
	for (const [key, raw] of Object.entries(submitted as Record<string, unknown>)) {
		const entry = schema[key];
		if (!entry) {
			continue;
		}
		if (raw === null) {
			result[key] = undefined;
			continue;
		}
		if (SECRET_SETTING_KEYS.has(key) && (raw === '' || raw === undefined)) {
			continue;
		}
		switch (entry.type) {
			case 'boolean':
				result[key] = Boolean(raw);
				break;
			case 'number':
			case 'integer': {
				const n = Number(raw);
				if (Number.isFinite(n)) {
					result[key] = n;
				}
				break;
			}
			default: {
				const value = typeof raw === 'string' ? raw.trim() : String(raw ?? '');
				if (value === '') {
					result[key] = undefined;
				} else if (!entry.enum || entry.enum.includes(value)) {
					result[key] = value;
				}
			}
		}
	}
	return result;
}

export class SettingsWindowController {
	private window: BrowserWindow | undefined;

	constructor(
		private readonly config: ConfigurationStore,
		private readonly appProtocol: AppProtocol,
		private readonly preloadPath: string,
		private readonly iconPath: string,
		private readonly getTheme: () => ThemeKind,
		private readonly onSaved: (changedKeys: string[]) => void
	) {
		ipcMain.handle(IPC_SETTINGS_GET, event => {
			this.assertSender(event);
			return { fields: buildSettingFields(this.config), filePath: this.config.getFilePath() };
		});
		ipcMain.handle(IPC_SETTINGS_SAVE, (event, values: unknown) => {
			this.assertSender(event);
			const changed = this.config.update(sanitizeSettingValues(this.config, values));
			this.onSaved(changed);
			return { changed };
		});
	}

	public open(parent?: BrowserWindow): void {
		if (this.window && !this.window.isDestroyed()) {
			this.window.focus();
			return;
		}
		const theme = this.getTheme();
		this.window = new BrowserWindow({
			width: 720,
			height: 760,
			title: 'Robert — Settings',
			parent,
			icon: this.iconPath,
			backgroundColor: getThemeBackground(theme),
			autoHideMenuBar: true,
			webPreferences: {
				preload: this.preloadPath,
				contextIsolation: true,
				sandbox: true,
				nodeIntegration: false
			}
		});
		this.window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
		this.window.webContents.on('will-navigate', event => event.preventDefault());
		this.window.on('closed', () => {
			this.appProtocol.releaseDocuments('settings');
			this.window = undefined;
		});
		const nonce = randomBytes(16).toString('base64');
		void this.window.loadURL(this.appProtocol.putDocument('settings', injectTheme(buildSettingsHtml(nonce), theme)));
	}

	private assertSender(event: IpcMainInvokeEvent): void {
		if (!this.window || this.window.isDestroyed() || event.sender !== this.window.webContents) {
			throw new Error('Settings IPC is only available to the settings window');
		}
	}
}

/** Groups used to lay out the generated form, in display order. A setting belongs to the first group with a matching key prefix ('' matches everything). */
const GROUPS: Array<{ title: string; prefix: string }> = [
	{ title: 'Provider', prefix: 'robert.provider' },
	{ title: 'Jira Cloud', prefix: 'robert.jira' },
	{ title: 'Rally', prefix: 'robert.rally' },
	{ title: 'Collaboration', prefix: 'robert.collaboration.' },
	{ title: 'General', prefix: '' }
];

function buildSettingsHtml(nonce: string): string {
	const groups = JSON.stringify(GROUPS).replace(/</g, '\\u003c');
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'">
<title>Robert — Settings</title>
<style>
	body { padding: 24px 32px 96px; max-width: 760px; }
	h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
	.hint { color: var(--vscode-descriptionForeground); margin: 0 0 24px; font-size: 12px; word-break: break-all; }
	h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--vscode-descriptionForeground); margin: 28px 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--vscode-panel-border); }
	.field { margin: 14px 0; }
	.field label.name { display: block; font-weight: 600; margin-bottom: 2px; }
	.field .desc { color: var(--vscode-descriptionForeground); font-size: 12px; margin-bottom: 6px; }
	input[type=text], input[type=password], input[type=number], select {
		width: 100%; box-sizing: border-box; padding: 5px 8px; font: inherit;
		background: var(--vscode-input-background); color: var(--vscode-input-foreground);
		border: 1px solid var(--vscode-input-border); border-radius: 2px;
	}
	input:focus, select:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
	.checkbox { display: flex; gap: 8px; align-items: flex-start; }
	.checkbox input { margin-top: 2px; }
	footer { position: fixed; left: 0; right: 0; bottom: 0; padding: 12px 32px; display: flex; gap: 12px; align-items: center;
		background: var(--vscode-editor-background); border-top: 1px solid var(--vscode-panel-border); }
	button { font: inherit; padding: 6px 14px; border: none; border-radius: 2px; cursor: pointer;
		background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
	button:hover { background: var(--vscode-button-hoverBackground); }
	#status { color: var(--vscode-descriptionForeground); font-size: 12px; }
	#status.error { color: var(--vscode-errorForeground); }
	.field .head { display: flex; align-items: baseline; gap: 8px; }
	.field .state { color: var(--vscode-descriptionForeground); font-size: 11px; }
	button.reset { background: none; color: var(--vscode-textLink-foreground); padding: 0; font-size: 12px; margin-left: auto; }
	button.reset:hover { background: none; text-decoration: underline; }
</style>
</head>
<body>
<h1>Settings</h1>
<p class="hint" id="file"></p>
<form id="form"></form>
<footer><button type="submit" form="form">Save</button><span id="status" role="status"></span></footer>
<script nonce="${nonce}">
(async () => {
	const groups = ${groups};
	const form = document.getElementById('form');
	const status = document.getElementById('status');
	const humanize = key => key.replace(/^robert\\./, '').replace(/\\./g, ' › ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());

	// Puts a value into an input without marking it as edited.
	const setInputValue = (input, field, value) => {
		if (input.type === 'checkbox') input.checked = Boolean(value);
		else if (field.enum) input.value = value ?? field.enum[0];
		else if (!field.secret) input.value = value ?? '';
	};

	const render = (fields, filePath) => {
		document.getElementById('file').textContent = 'Stored in ' + filePath + '. Settings that are not set fall back to ROBERT_* environment variables, then to their defaults.';
		form.replaceChildren();
		const sections = groups.map(group => ({ title: group.title, fields: [] }));
		for (const field of fields) {
			sections[groups.findIndex(group => field.key.startsWith(group.prefix))].fields.push(field);
		}
		for (const section of sections) {
			if (!section.fields.length) continue;
			const h2 = document.createElement('h2');
			h2.textContent = section.title;
			form.appendChild(h2);
			for (const field of section.fields) form.appendChild(renderField(field));
		}
	};

	const renderField = field => {
		const wrapper = document.createElement('div');
		wrapper.className = 'field';
		const id = 'f_' + field.key.replace(/[^a-z0-9]/gi, '_');
		const head = '<div class="head"><label class="name"></label><span class="state"></span><button type="button" class="reset"></button></div><div class="desc"></div>';
		let input;
		if (field.type === 'boolean') {
			wrapper.innerHTML = '<div class="checkbox"><input type="checkbox"><div style="flex:1">' + head + '</div></div>';
			input = wrapper.querySelector('input');
		} else {
			wrapper.innerHTML = head;
			if (field.enum) {
				input = document.createElement('select');
				field.enum.forEach((value, i) => {
					const option = document.createElement('option');
					option.value = value;
					option.textContent = field.enumDescriptions && field.enumDescriptions[i] ? value + ' — ' + field.enumDescriptions[i] : value;
					input.appendChild(option);
				});
			} else {
				input = document.createElement('input');
				input.type = field.secret ? 'password' : (field.type === 'number' || field.type === 'integer') ? 'number' : 'text';
				input.autocomplete = 'off';
				input.spellcheck = false;
				if (field.secret) input.placeholder = field.isSet ? '•••••••• (stored — leave empty to keep)' : 'Not set';
			}
			wrapper.appendChild(input);
		}
		// What applies when the setting is not set: the environment variable, else the default.
		const fallbackValue = field.envIsSet && !field.secret ? field.envValue : field.defaultValue;
		const fallbackLabel = field.envIsSet ? '(not set — using ' + field.envVar + ' from environment)' : '(not set — using default)';
		setInputValue(input, field, field.isSet ? field.value : fallbackValue);
		if (field.secret && !field.isSet && field.envIsSet) input.placeholder = 'Not set — using ' + field.envVar + ' from environment';
		input.id = id;
		input.dataset.key = field.key;

		const label = wrapper.querySelector('label.name');
		label.textContent = humanize(field.key);
		label.htmlFor = id;
		wrapper.querySelector('.desc').textContent = field.description;
		const state = wrapper.querySelector('.state');
		state.textContent = field.isSet ? '' : fallbackLabel;

		// Reset: drop the explicit value so env vars / the default apply again.
		const reset = wrapper.querySelector('button.reset');
		reset.textContent = field.secret ? 'Clear' : 'Reset';
		reset.title = field.secret ? 'Remove the stored value' : 'Remove the explicit value (use ROBERT_* environment variable or default)';
		reset.hidden = !field.isSet;
		reset.addEventListener('click', () => {
			input.dataset.reset = '1';
			delete input.dataset.dirty;
			if (field.secret) { input.value = ''; input.placeholder = 'Will be cleared on save'; }
			else setInputValue(input, field, fallbackValue);
			state.textContent = '(will be reset on save)';
			reset.hidden = true;
		});
		const markDirty = () => {
			input.dataset.dirty = '1';
			delete input.dataset.reset;
			state.textContent = '(modified)';
		};
		input.addEventListener('input', markDirty);
		input.addEventListener('change', markDirty);
		return wrapper;
	};

	const load = async () => {
		const { fields, filePath } = await window.robertSettings.get();
		render(fields, filePath);
	};

	form.addEventListener('submit', async event => {
		event.preventDefault();
		// Only send what the user touched, so untouched settings stay unset and
		// keep following environment variables / defaults.
		const values = {};
		for (const input of form.querySelectorAll('[data-key]')) {
			if (input.dataset.reset) values[input.dataset.key] = null;
			else if (input.dataset.dirty) values[input.dataset.key] = input.type === 'checkbox' ? input.checked : input.value;
		}
		status.className = '';
		status.textContent = 'Saving…';
		try {
			const { changed } = await window.robertSettings.save(values);
			await load();
			status.textContent = changed.length ? 'Saved.' : 'No changes.';
		} catch (error) {
			status.className = 'error';
			const message = String(error && error.message ? error.message : error).replace(/^Error invoking remote method '[^']+': (\\w*Error: )?/, '');
			status.textContent = 'Could not save settings: ' + message;
		}
	});

	await load();
})();
</script>
</body>
</html>`;
}
