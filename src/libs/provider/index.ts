/**
 * Provider facade - routes every data-service call to Jira or Rally depending on
 * the global `robert.provider` setting. Callers (extension host, webview provider,
 * message handlers) import from here and stay provider-agnostic.
 *
 * The setting is read on every call, so switching provider only requires clearing
 * caches and reloading data (see extension.ts).
 */
import * as jira from '../jira/jiraServices';
import * as rally from '../rally/rallyServices';
import { setJiraBroadcaster } from '../jira/jiraCall';
import { setRallyBroadcaster } from '../rally/rallyCall';
import { validateJiraConfiguration } from '../jira/utils';
import { ensureJiraMetadata } from '../jira/jiraMetadata';
import { validateRallyConfiguration } from '../rally/utils';
import { SettingsManager } from '../../SettingsManager';

export type ProviderId = 'jira' | 'rally';

export function getActiveProvider(): ProviderId {
	return SettingsManager.getInstance().getSetting('provider') === 'rally' ? 'rally' : 'jira';
}

export function isRally(): boolean {
	return getActiveProvider() === 'rally';
}

/** Human-readable name of the active provider, for log and error messages. */
export function getProviderLabel(): string {
	return isRally() ? 'Rally' : 'Jira';
}

type Fn = (...args: any[]) => any;

/**
 * Picks the implementation of the active provider at call time. Jira calls
 * first make sure the site's field / issue-type metadata is loaded (cached per
 * site, see jiraMetadata.ts), since custom-field IDs differ between tenants.
 */
function route<J extends Fn, R extends Fn>(jiraFn: J, rallyFn: R): J {
	return ((...args: Parameters<J>) => (isRally() ? rallyFn(...args) : ensureJiraMetadata().then(() => jiraFn(...args)))) as J;
}

export const getProjects = route(jira.getProjects, rally.getProjects);
export const getCurrentUser = route(jira.getCurrentUser, rally.getCurrentUser);
export const getUsers = route(jira.getUsers, rally.getUsers);
export const getIterations = route(jira.getIterations, rally.getIterations);
export const getUserStories = route(jira.getUserStories, rally.getUserStories);
export const getTasks = route(jira.getTasks, rally.getTasks);
export const getDefects = route(jira.getDefects, rally.getDefects);
export const getUserStoryDefects = route(jira.getUserStoryDefects, rally.getUserStoryDefects);
export const getUserStoryDiscussions = route(jira.getUserStoryDiscussions, rally.getUserStoryDiscussions);
export const getRecentTeamMembers = route(jira.getRecentTeamMembers, rally.getRecentTeamMembers);
export const getUserSprintProgress = route(jira.getUserSprintProgress, rally.getUserSprintProgress);
export const getAllTeamMembersProgress = route(jira.getAllTeamMembersProgress, rally.getAllTeamMembersProgress);
export const getMemberHoursHistory = route(jira.getMemberHoursHistory, rally.getMemberHoursHistory);
export const globalSearch = route(jira.globalSearch, rally.globalSearch);
export const getUserStoryByObjectId = route(jira.getUserStoryByObjectId, rally.getUserStoryByObjectId);
export const getDefectByObjectId = route(jira.getDefectByObjectId, rally.getDefectByObjectId);
export const getTaskWithParent = route(jira.getTaskWithParent, rally.getTaskWithParent);
export const getUserStoryRevisions = route(jira.getUserStoryRevisions, rally.getUserStoryRevisions);
export const getUserStoryRevisionsCount = route(jira.getUserStoryRevisionsCount, rally.getUserStoryRevisionsCount);
export const fetchImageAsBase64 = route(jira.fetchJiraImageAsBase64, rally.fetchRallyImageAsBase64);
// Validation must not trigger metadata requests (credentials may be missing).
export const validateConfiguration: typeof validateJiraConfiguration = (...args) => (isRally() ? validateRallyConfiguration(...args) : validateJiraConfiguration(...args));

/** Rally-only: test cases linked to a user story. Jira has no test cases. */
export async function getUserStoryTests(userStoryId: string) {
	if (!isRally()) {
		return { testCases: [], count: 0, hasMore: false };
	}
	return rally.getUserStoryTests(userStoryId);
}

/** Rally-only: a test case plus the object id of its parent user story. */
export async function getTestCaseWithParent(objectId: string) {
	if (!isRally()) {
		return { testCase: null, userStoryObjectId: null };
	}
	return rally.getTestCaseWithParent(objectId);
}

/** Registers the webview broadcaster on both providers (call-in-progress indicator). */
export function setProviderBroadcaster(fn: ((message: { command: string; label?: string; callId?: string }) => void) | null): void {
	setJiraBroadcaster(fn);
	// The webview listens for jiraCall* events; map Rally's names onto them.
	setRallyBroadcaster(
		fn
			? message =>
					fn({
						...message,
						command: message.command.replace(/^rallyCall/, 'jiraCall')
					})
			: null
	);
}

/** Clears caches of both providers, so a provider switch never serves stale data. */
export function clearAllProviderCaches(): void {
	jira.clearAllJiraCaches();
	rally.clearAllRallyCaches();
}

/**
 * Browser URL for an item in the active provider.
 * Jira: /browse/KEY (or a sprint JQL for iterations). Rally: /#/detail/<type>/<oid>.
 */
export async function getItemUrl(objectId: string, artifactType: string = 'userstory'): Promise<string | null> {
	const settings = SettingsManager.getInstance();
	if (isRally()) {
		const instance = settings.getSetting('rallyInstance');
		if (!instance) {
			return null;
		}
		return `${instance.replace(/\/$/, '')}/#/detail/${encodeURIComponent(artifactType)}/${encodeURIComponent(objectId)}`;
	}
	const baseUrl = settings.getSetting('jiraBaseUrl');
	if (!baseUrl) {
		return null;
	}
	const root = baseUrl.replace(/\/$/, '');
	if (artifactType === 'iteration') {
		return `${root}/issues/?jql=${encodeURIComponent(`sprint = ${objectId}`)}`;
	}
	const key = await jira.resolveIssueKey(objectId);
	return key ? `${root}/browse/${encodeURIComponent(key)}` : null;
}
