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
	/** Current value; never sent for secrets. */
	value?: unknown;
	/** For secrets: whether a value is stored. */
	hasValue?: boolean;
}

/** Turns the manifest schema + stored values into the form model sent to the settings page. */
export function buildSettingFields(config: ConfigurationStore): SettingField[] {
	return Object.entries(config.getSchema()).map(([key, schema]) => {
		const secret = SECRET_SETTING_KEYS.has(key);
		const field: SettingField = {
			key,
			type: schema.type ?? 'string',
			description: schema.description ?? '',
			enum: schema.enum,
			enumDescriptions: schema.enumDescriptions,
			secret
		};
		if (secret) {
			field.hasValue = Boolean(config.getUserValue(key));
		} else {
			field.value = config.getValue(key);
		}
		return field;
	});
}

/**
 * Validates and normalizes values submitted by the settings page against the
 * schema. Unknown keys are dropped; empty secrets mean "keep the stored value".
 */
export function sanitizeSettingValues(config: ConfigurationStore, submitted: unknown): Record<string, unknown> {
	if (!submitted || typeof submitted !== 'object') {
		return {};
	}
	const schema = config.getSchema();
	// Values equal to the manifest default are stored as "unset" (undefined), so
	// future default changes still apply, as with VS Code's settings.json.
	const result: Record<string, unknown> = {};
	for (const [key, raw] of Object.entries(submitted as Record<string, unknown>)) {
		const entry = schema[key];
		if (!entry) {
			continue;
		}
		if (SECRET_SETTING_KEYS.has(key) && (raw === '' || raw === undefined || raw === null)) {
			continue;
		}
		switch (entry.type) {
			case 'boolean': {
				const value = Boolean(raw);
				result[key] = value === entry.default ? undefined : value;
				break;
			}
			case 'number':
			case 'integer': {
				const n = Number(raw);
				if (Number.isFinite(n)) {
					result[key] = n === entry.default ? undefined : n;
				}
				break;
			}
			default: {
				const value = typeof raw === 'string' ? raw.trim() : String(raw ?? '');
				if (entry.enum && !entry.enum.includes(value)) {
					continue;
				}
				result[key] = value === entry.default ? undefined : value;
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
			title: 'IBM Robert — Settings',
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

/** Groups used to lay out the generated form, in display order. */
/** A setting belongs to the first group with a matching key prefix ('' matches everything). */
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
<title>IBM Robert — Settings</title>
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
	const { fields, filePath } = await window.robertSettings.get();
	document.getElementById('file').textContent = 'Stored in ' + filePath + ' — environment variables (ROBERT_*) are used as fallback when a value is empty.';

	const humanize = key => key.replace(/^robert\\./, '').replace(/\\./g, ' › ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
	const sections = groups.map(group => ({ title: group.title, fields: [] }));
	for (const field of fields) {
		sections[groups.findIndex(group => field.key.startsWith(group.prefix))].fields.push(field);
	}

	for (const section of sections) {
		if (!section.fields.length) continue;
		const h2 = document.createElement('h2');
		h2.textContent = section.title;
		form.appendChild(h2);
		for (const field of section.fields) {
			const wrapper = document.createElement('div');
			wrapper.className = 'field';
			const id = 'f_' + field.key.replace(/[^a-z0-9]/gi, '_');
			let input;
			if (field.type === 'boolean') {
				wrapper.innerHTML = '<div class="checkbox"><input type="checkbox"><div><label class="name"></label><div class="desc"></div></div></div>';
				input = wrapper.querySelector('input');
				input.checked = Boolean(field.value);
			} else {
				wrapper.innerHTML = '<label class="name"></label><div class="desc"></div>';
				if (field.enum) {
					input = document.createElement('select');
					field.enum.forEach((value, i) => {
						const option = document.createElement('option');
						option.value = value;
						option.textContent = field.enumDescriptions && field.enumDescriptions[i] ? value + ' — ' + field.enumDescriptions[i] : value;
						input.appendChild(option);
					});
					input.value = field.value ?? field.enum[0];
				} else {
					input = document.createElement('input');
					input.type = field.secret ? 'password' : (field.type === 'number' || field.type === 'integer') ? 'number' : 'text';
					input.autocomplete = 'off';
					input.spellcheck = false;
					if (field.secret) {
						input.placeholder = field.hasValue ? '•••••••• (stored — leave empty to keep)' : 'Not set';
					} else {
						input.value = field.value ?? '';
					}
				}
				wrapper.appendChild(input);
			}
			input.id = id;
			input.dataset.key = field.key;
			input.dataset.type = field.type;
			const label = wrapper.querySelector('label.name');
			label.textContent = humanize(field.key);
			label.htmlFor = id;
			wrapper.querySelector('.desc').textContent = field.description;
			form.appendChild(wrapper);
		}
	}

	form.addEventListener('submit', async event => {
		event.preventDefault();
		const values = {};
		for (const input of form.querySelectorAll('[data-key]')) {
			values[input.dataset.key] = input.type === 'checkbox' ? input.checked : input.value;
		}
		status.className = '';
		status.textContent = 'Saving…';
		try {
			const { changed } = await window.robertSettings.save(values);
			status.textContent = changed.length ? 'Saved.' : 'No changes.';
			for (const input of form.querySelectorAll('input[type=password]')) {
				if (input.value) { input.value = ''; input.placeholder = '•••••••• (stored — leave empty to keep)'; }
			}
		} catch (error) {
			status.className = 'error';
			const message = String(error && error.message ? error.message : error).replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '');
			status.textContent = 'Could not save settings: ' + message;
		}
	});
})();
</script>
</body>
</html>`;
}
