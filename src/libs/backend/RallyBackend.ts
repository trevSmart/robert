import * as rallyServices from '../rally/rallyServices';
import { validateRallyConfiguration } from '../rally/utils';
import { SettingsManager } from '../../SettingsManager';
import type { IBackend, ConfigValidationResult } from './IBackend';

/**
 * Rally implementation of {@link IBackend}.
 *
 * This is a thin adapter: every method delegates straight to the existing `rallyServices`
 * functions, which already return the canonical internal shapes. Keeping the Rally logic
 * untouched means introducing the abstraction carries no behavioural risk for Rally users.
 */
export class RallyBackend implements IBackend {
	readonly kind = 'rally' as const;
	readonly displayName = 'Rally';

	validateConfiguration(): Promise<ConfigValidationResult> {
		return validateRallyConfiguration();
	}

	buildOpenInUrl(artifactType: string, objectId: string): string | null {
		const rallyInstance = SettingsManager.getInstance().getSetting('rallyInstance');
		if (!rallyInstance || !objectId) {
			return null;
		}
		const type = encodeURIComponent(artifactType || 'userstory');
		return `${rallyInstance.replace(/\/$/, '')}/#/detail/${type}/${encodeURIComponent(objectId)}`;
	}

	getProjects = rallyServices.getProjects;
	getCurrentUser = rallyServices.getCurrentUser;
	getUsers = rallyServices.getUsers;
	getIterations = rallyServices.getIterations;
	getUserStories = rallyServices.getUserStories;
	getTasks = rallyServices.getTasks;
	getDefects = rallyServices.getDefects;

	getUserStoryTests = rallyServices.getUserStoryTests;
	getUserStoryDefects = rallyServices.getUserStoryDefects;
	getUserStoryDiscussions = rallyServices.getUserStoryDiscussions;

	getUserStoryByObjectId = rallyServices.getUserStoryByObjectId;
	getDefectByObjectId = rallyServices.getDefectByObjectId;
	getTaskWithParent = rallyServices.getTaskWithParent;
	getTestCaseWithParent = rallyServices.getTestCaseWithParent;

	getUserStoryRevisionsCount = rallyServices.getUserStoryRevisionsCount;
	getUserStoryRevisions = rallyServices.getUserStoryRevisions;

	globalSearch = rallyServices.globalSearch;

	getRecentTeamMembers = rallyServices.getRecentTeamMembers;
	getUserSprintProgress = rallyServices.getUserSprintProgress;
	getAllTeamMembersProgress = rallyServices.getAllTeamMembersProgress;
	getMemberHoursHistory = rallyServices.getMemberHoursHistory;

	fetchImageAsBase64 = rallyServices.fetchRallyImageAsBase64;

	clearAllCaches = rallyServices.clearAllRallyCaches;

	extractIterationId = rallyServices.extractIterationId;
	checkCacheForFilteredResults = rallyServices.checkCacheForFilteredResults;
}
