/**
 * Messages and view model shared by the settings dialog (React webview) and the
 * host (VS Code extension or standalone app). Type-only: imported by both sides.
 *
 * Webview → host: `settingsLoad`, `settingsUpdate`, `settingsSetSecret`,
 * `settingsClearSecret`, `settingsOpenNative`.
 * Host → webview: `settingsState` (full model, also pushed whenever settings or
 * credentials change), `settingsResult` (outcome of one write), `showSettings`
 * (open the dialog, e.g. from the robert.openSettings command).
 */

/** Where a setting can be written. `user` = VS Code user settings / standalone settings file. */
export type SettingsScope = 'user' | 'workspace';

/** Where the effective value of a setting comes from, highest precedence first. */
export type SettingValueSource = 'workspaceFolder' | 'workspace' | 'user' | 'env' | 'default';

export interface SettingFieldModel {
	/** Fully-qualified key, e.g. `robert.jiraEmail`. */
	key: string;
	/** Human-readable name. */
	label: string;
	description: string;
	type: 'string' | 'boolean' | 'number' | 'integer';
	enum?: string[];
	enumDescriptions?: string[];
	minimum?: number;
	maximum?: number;
	defaultValue?: unknown;
	/** Group title the field is shown under. */
	group: string;
	/** Scopes this setting can be written to in the current host (`user` only for application-scoped settings). */
	scopes: SettingsScope[];
	/** Explicit value per scope (undefined = not set at that scope). */
	values: { user?: unknown; workspace?: unknown; workspaceFolder?: unknown };
	/** ROBERT_* environment variable used when no scope sets the value. */
	env: { name: string; isSet: boolean; value?: unknown };
	effectiveValue: unknown;
	effectiveSource: SettingValueSource;
}

/** Where the credential currently used for a connection comes from. */
export type CredentialSource = 'keychain' | 'legacySetting' | 'env' | 'none';

export interface CredentialFieldModel {
	id: 'jira' | 'rally';
	label: string;
	/** Group title the field is shown under (next to the connection settings it belongs to). */
	group: string;
	/** Human-readable connection the credential belongs to, e.g. `https://acme.atlassian.net · me@acme.com`. */
	connectionLabel: string;
	/** False when the connection is incomplete (e.g. no Jira email yet), so no credential can be stored for it. */
	connectionComplete: boolean;
	/** Why the connection is incomplete, when it is. */
	incompleteReason?: string;
	/** Whether a credential is stored in the OS keychain for this connection. */
	stored: boolean;
	/** Credential that applies right now (the value itself is never sent to the webview). */
	source: CredentialSource;
	envVar: string;
}

export interface SettingsHostModel {
	kind: 'vscode' | 'standalone';
	/** A folder or workspace is open, so workspace settings can be written. */
	hasWorkspace: boolean;
	workspaceName?: string;
	/** Scope the dialog selects when it opens. */
	defaultScope: SettingsScope;
	/** Whether the host has its own settings editor the dialog can link to (VS Code Settings). */
	canOpenNativeSettings: boolean;
	/** Where user settings are stored, shown as a hint (standalone settings file path). */
	userSettingsLocation?: string;
}

/** Shown in the About tab of the dialog. */
export interface AboutModel {
	name: string;
	version: string;
	description?: string;
	/** Where Robert runs, e.g. `Visual Studio Code 1.105.0` or `Standalone app · Electron 45.4.1`. */
	host: string;
	links: Array<{ label: string; url: string }>;
}

export interface SettingsStateMessage {
	command: 'settingsState';
	host: SettingsHostModel;
	about: AboutModel;
	fields: SettingFieldModel[];
	credentials: CredentialFieldModel[];
	/** Group titles in display order. */
	groups: string[];
}

export interface SettingsResultMessage {
	command: 'settingsResult';
	/** Echo of the request id sent by the webview. */
	requestId: string;
	ok: boolean;
	error?: string;
}

export interface SettingsUpdateRequest {
	command: 'settingsUpdate';
	requestId: string;
	key: string;
	scope: SettingsScope;
	/** `null` removes the value from that scope. */
	value: unknown;
}

export interface SettingsSetSecretRequest {
	command: 'settingsSetSecret';
	requestId: string;
	id: CredentialFieldModel['id'];
	value: string;
}

export interface SettingsClearSecretRequest {
	command: 'settingsClearSecret';
	requestId: string;
	id: CredentialFieldModel['id'];
}
