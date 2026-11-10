// Settings for the local web version. Independent from src/SettingsManager.ts (VS Code):
// everything comes from ROBERT_* environment variables, there is no VS Code configuration.

export interface RobertSettings {
	autoRefresh: boolean;
	debugMode: boolean;
	provider: 'jira' | 'rally';
	rallyInstance: string;
	rallyApiKey: string;
	rallyProjectName: string;
	jiraBaseUrl: string;
	jiraEmail: string;
	jiraApiToken: string;
	/** Jira project key. Empty means "all projects". */
	jiraProjectKey: string;
	collaborationServerUrl: string;
	collaborationEnabled: boolean;
	collaborationAutoConnect: boolean;
	statusBarShowSprintDaysLeft: boolean;
	showWelcomeAnimation: boolean;
}

function envString(name: string, fallback: string): string {
	const value = process.env[name];
	return value !== undefined && value.trim() !== '' ? value : fallback;
}

function envBoolean(name: string, fallback: boolean): boolean {
	const value = process.env[name];
	if (value === undefined || value.trim() === '') {
		return fallback;
	}
	const normalized = value.trim().toLowerCase();
	return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export class SettingsManager {
	private static instance: SettingsManager;

	private constructor() {}

	public static getInstance(): SettingsManager {
		if (!SettingsManager.instance) {
			SettingsManager.instance = new SettingsManager();
		}
		return SettingsManager.instance;
	}

	public getSettings(): RobertSettings {
		return {
			autoRefresh: envBoolean('ROBERT_AUTO_REFRESH', true),
			debugMode: envBoolean('ROBERT_DEBUG_MODE', false),
			provider: envString('ROBERT_PROVIDER', 'jira').toLowerCase() === 'rally' ? 'rally' : 'jira',
			rallyInstance: envString('ROBERT_RALLY_INSTANCE', 'https://rally1.rallydev.com'),
			rallyApiKey: envString('ROBERT_RALLY_API_KEY', ''),
			rallyProjectName: envString('ROBERT_RALLY_PROJECT_NAME', ''),
			jiraBaseUrl: envString('ROBERT_JIRA_BASE_URL', 'https://jiracloudab.atlassian.net'),
			jiraEmail: envString('ROBERT_JIRA_EMAIL', ''),
			jiraApiToken: envString('ROBERT_JIRA_API_TOKEN', ''),
			jiraProjectKey: (process.env.ROBERT_JIRA_PROJECT_KEY ?? '').trim(),
			collaborationServerUrl: envString('ROBERT_COLLABORATION_SERVER_URL', 'https://robert-8vdt.onrender.com'),
			collaborationEnabled: envBoolean('ROBERT_COLLABORATION_ENABLED', false),
			collaborationAutoConnect: envBoolean('ROBERT_COLLABORATION_AUTO_CONNECT', true),
			statusBarShowSprintDaysLeft: envBoolean('ROBERT_STATUS_BAR_SPRINT_DAYS', true),
			showWelcomeAnimation: envBoolean('ROBERT_SHOW_WELCOME_ANIMATION', true)
		};
	}

	public getSetting<K extends keyof RobertSettings>(key: K): RobertSettings[K] {
		return this.getSettings()[key];
	}
}
