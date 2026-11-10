import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import { getProjects, getIterations, getUserStories, getTasks, getDefects, getCurrentUser, getUserStoryDefects, getUserStoryDiscussions, getRecentTeamMembers, getAllTeamMembersProgress, getUsers, getMemberHoursHistory, getUserStoryTests, getProviderLabel } from '../../libs/provider';
import { HolidayService } from '../../libs/holidayService';
import { SettingsManager } from '../../SettingsManager';
import { isTestTabEnabled } from '../../utils/devMode';
import { ttlFor } from '../../libs/cache/ttlConfig';

/** True when a service error comes from missing/invalid provider configuration. */
function isConfigurationError(message: string): boolean {
	return /(Jira|Rally) configuration error/.test(message);
}

/** Configuration hint shown in the webview for the active provider. */
function configurationHelpMessage(): string {
	return getProviderLabel() === 'Rally' ? 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.' : 'Please configure Jira settings first. Go to Settings and configure your Jira email, API token, base URL and project key.';
}

/**
 * Handles all Jira API-related webview messages
 * Manages loading and processing data from Jira (projects, iterations, user stories, tasks, defects, etc.)
 */
export class JiraMessageHandler {
	constructor(private errorHandler: ErrorHandler) {}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'loadProjects':
				await this.handleLoadProjects(webview);
				return true;
			case 'loadIterations':
				await this.handleLoadIterations(webview);
				return true;
			case 'loadHolidaysForYear':
				await this.handleLoadHolidaysForYear(webview, message);
				return true;
			case 'loadUserStories':
				await this.handleLoadUserStories(webview, message);
				return true;
			case 'loadVelocityData':
				await this.handleLoadVelocityData(webview);
				return true;
			case 'loadTasks':
				await this.handleLoadTasks(webview, message);
				return true;
			case 'loadDefects':
				await this.handleLoadDefects(webview, message);
				return true;
			case 'loadUserStoryDefects':
				await this.handleLoadUserStoryDefects(webview, message);
				return true;
			case 'loadUserStoryTests':
				await this.handleLoadUserStoryTests(webview, message);
				return true;
			case 'loadUserStoryDiscussions':
				await this.handleLoadUserStoryDiscussions(webview, message);
				return true;
			case 'loadTeamMembers':
				await this.handleLoadTeamMembers(webview, message);
				return true;
			case 'getTeamMemberInfo':
				await this.handleGetTeamMemberInfo(webview, message);
				return true;
			case 'getMemberHoursHistory':
				await this.handleGetMemberHoursHistory(webview, message);
				return true;
			case 'getJiraCurrentUser':
				await this.handleGetJiraCurrentUser(webview);
				return true;
			default:
				return false;
		}
	}

	private async handleLoadProjects(webview: vscode.Webview): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading projects from data provider', 'JiraMessageHandler');
			const projectsResult = await getProjects();

			if (projectsResult?.projects) {
				webview.postMessage({
					command: 'projectsLoaded',
					projects: projectsResult.projects
				});
				this.errorHandler.logInfo(`Projects loaded successfully: ${projectsResult.count} projects`, 'JiraMessageHandler');
			} else {
				webview.postMessage({
					command: 'projectsError',
					error: 'No projects found'
				});
				this.errorHandler.logInfo('No projects found', 'JiraMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadProjects');

			if (isConfigurationError(errorMessage)) {
				webview.postMessage({
					command: 'projectsError',
					error: configurationHelpMessage(),
					needsConfiguration: true
				});
			} else {
				webview.postMessage({
					command: 'projectsError',
					error: 'Failed to load projects'
				});
			}
		}
	}

	private async handleLoadIterations(webview: vscode.Webview): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading iterations from data provider', 'JiraMessageHandler');
			this.errorHandler.logDebug('Webview received loadIterations command', 'JiraMessageHandler');

			const holidayService = HolidayService.getInstance();
			const currentYear = new Date().getFullYear();
			const [iterationsResult, userResult, holidays] = await Promise.all([getIterations(), getCurrentUser(), holidayService.getHolidays(currentYear, 'ES')]);

			if (iterationsResult?.iterations) {
				const collaborationEnabled = SettingsManager.getInstance().getSetting('collaborationEnabled');
				webview.postMessage({
					command: 'iterationsLoaded',
					iterations: iterationsResult.iterations,
					currentUser: userResult?.user || null,
					holidays: holidays || [],
					collaborationEnabled: collaborationEnabled || false,
					provider: SettingsManager.getInstance().getSetting('provider'),
					devMode: isTestTabEnabled(),
					debugMode: SettingsManager.getInstance().getSetting('debugMode')
				});
				this.errorHandler.logInfo(`Iterations loaded successfully: ${iterationsResult.count} iterations`, 'JiraMessageHandler');
				if (userResult?.user) {
					this.errorHandler.logInfo(`Current user loaded: ${userResult.user.displayName || userResult.user.userName}`, 'JiraMessageHandler');
				}
			} else {
				webview.postMessage({
					command: 'iterationsError',
					error: 'No iterations found'
				});
				this.errorHandler.logInfo('No iterations found', 'JiraMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadIterations');

			if (isConfigurationError(errorMessage)) {
				webview.postMessage({
					command: 'iterationsError',
					error: configurationHelpMessage(),
					needsConfiguration: true
				});
			} else {
				webview.postMessage({
					command: 'iterationsError',
					error: 'Failed to load iterations'
				});
			}
		}
	}

	private async handleGetJiraCurrentUser(webview: vscode.Webview): Promise<void> {
		try {
			const userResult = await getCurrentUser();
			webview.postMessage({
				command: 'jiraCurrentUser',
				user: userResult?.user || null
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'getJiraCurrentUser');
			webview.postMessage({
				command: 'jiraCurrentUser',
				user: null
			});
		}
	}

	private async handleLoadHolidaysForYear(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const year = message.year || new Date().getFullYear();
			const country = message.country || 'ES';
			this.errorHandler.logInfo(`Loading holidays for year ${year} (${country})`, 'JiraMessageHandler');

			const holidayService = HolidayService.getInstance();
			const holidays = await holidayService.getHolidays(year, country);

			webview.postMessage({
				command: 'holidaysLoaded',
				holidays: holidays || [],
				year: year,
				country: country
			});
			this.errorHandler.logDebug(`Holidays loaded for ${year}: ${(holidays || []).length} holidays`, 'JiraMessageHandler');
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadHolidaysForYear');
			webview.postMessage({
				command: 'holidaysError',
				error: 'Failed to load holidays',
				year: message.year
			});
		}
	}

	private async handleLoadUserStories(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading user stories from data provider', 'JiraMessageHandler');
			this.errorHandler.logDebug(`Webview received loadUserStories command ${message.iteration ? `for iteration: ${message.iteration}` : 'for all'}`, 'JiraMessageHandler');

			// Filtre del llistat "All User Stories" (projecte i/o sprint). Es retorna dins
			// `portfolioFilter` perquè el webview el desi a part i no trepitgi les mètriques.
			const portfolioFilter = message.portfolioFilter as { project?: string; sprint?: string } | undefined;
			const query: Record<string, string> = message.iteration ? { Iteration: message.iteration } : {};
			if (portfolioFilter?.project) {
				query.Project = portfolioFilter.project;
			}
			if (portfolioFilter?.sprint) {
				query.Iteration = portfolioFilter.sprint;
			}
			const offset = message.offset || 0;
			const userStoriesResult = await getUserStories(query, offset);

			if (userStoriesResult?.userStories) {
				webview.postMessage({
					command: 'userStoriesLoaded',
					userStories: userStoriesResult.userStories,
					hasMore: userStoriesResult.hasMore,
					offset: userStoriesResult.offset,
					totalCount: userStoriesResult.totalCount,
					iteration: message.iteration || null,
					portfolioFilter: portfolioFilter ?? null
				});
				this.errorHandler.logInfo(`User stories loaded successfully: ${userStoriesResult.count} user stories (offset: ${offset}, hasMore: ${userStoriesResult.hasMore})`, 'JiraMessageHandler');
			} else {
				webview.postMessage({
					command: 'userStoriesError',
					error: 'No user stories found'
				});
				this.errorHandler.logInfo('No user stories found', 'JiraMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStories');

			if (isConfigurationError(errorMessage)) {
				webview.postMessage({
					command: 'userStoriesError',
					error: configurationHelpMessage(),
					needsConfiguration: true
				});
			} else {
				webview.postMessage({
					command: 'userStoriesError',
					error: 'Failed to load user stories'
				});
			}
		}
	}

	private async handleLoadVelocityData(webview: vscode.Webview): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading velocity data (hours per sprint) from data provider', 'JiraMessageHandler');
			// Velocity vol frescor de 24h; força un refetch d'iterations si les cachejades superen aquest límit,
			// encara que la vista normal d'iterations (48h) encara les serviria de cache.
			const iterationsResult = await getIterations({}, null, {
				maxAge: ttlFor('velocity')
			});
			const iterations = iterationsResult?.iterations ?? [];
			const today = new Date();
			today.setHours(23, 59, 59, 999);
			const numberOfSprints = 12;
			const sortedIterations = iterations
				.filter((it: { startDate: string; endDate: string }) => {
					const startDate = new Date(it.startDate);
					const endDate = new Date(it.endDate);
					return endDate <= today || (startDate <= today && endDate > today);
				})
				.sort((a: { endDate: string }, b: { endDate: string }) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
				.slice(0, numberOfSprints)
				.reverse();

			const velocityData: {
				sprintName: string;
				points: number;
				completedStories: number;
			}[] = sortedIterations.map((iteration: { name: string; taskEstimateTotal?: number | null }) => ({
				sprintName: iteration.name,
				points: Math.round((iteration.taskEstimateTotal ?? 0) * 10) / 10,
				completedStories: 0
			}));

			webview.postMessage({
				command: 'velocityDataLoaded',
				velocityData
			});
			this.errorHandler.logInfo(`Velocity data loaded: ${velocityData.length} sprints`, 'JiraMessageHandler');
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadVelocityData');
			webview.postMessage({
				command: 'velocityDataError',
				error: 'Failed to load velocity data'
			});
		}
	}

	private async handleLoadTasks(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading tasks from data provider', 'JiraMessageHandler');
			this.errorHandler.logDebug(`Webview received loadTasks command for user story: ${message.userStoryId}`, 'JiraMessageHandler');

			const tasksResult = await getTasks(message.userStoryId);

			if (tasksResult?.tasks) {
				webview.postMessage({
					command: 'tasksLoaded',
					tasks: tasksResult.tasks,
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo(`Tasks loaded successfully: ${tasksResult.count} tasks for user story ${message.userStoryId}`, 'JiraMessageHandler');
			} else {
				webview.postMessage({
					command: 'tasksError',
					error: 'No tasks found',
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo('No tasks found', 'JiraMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadTasks');

			if (isConfigurationError(errorMessage)) {
				webview.postMessage({
					command: 'tasksError',
					error: configurationHelpMessage(),
					needsConfiguration: true,
					userStoryId: message.userStoryId
				});
			} else {
				webview.postMessage({
					command: 'tasksError',
					error: 'Failed to load tasks',
					userStoryId: message.userStoryId
				});
			}
		}
	}

	private async handleLoadDefects(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading defects from data provider', 'JiraMessageHandler');
			this.errorHandler.logDebug(`Webview received loadDefects command, offset: ${message.offset || 0}`, 'JiraMessageHandler');

			const offset = message.offset || 0;
			const defectsResult = await getDefects({}, offset);

			if (defectsResult?.defects) {
				webview.postMessage({
					command: 'defectsLoaded',
					defects: defectsResult.defects,
					hasMore: defectsResult.hasMore,
					offset: defectsResult.offset,
					totalCount: defectsResult.totalCount
				});
				this.errorHandler.logInfo(`Defects loaded successfully: ${defectsResult.count} defects (offset: ${offset}, hasMore: ${defectsResult.hasMore})`, 'JiraMessageHandler');
			} else {
				webview.postMessage({
					command: 'defectsError',
					error: 'No defects found'
				});
				this.errorHandler.logInfo('No defects found', 'JiraMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadDefects');

			if (isConfigurationError(errorMessage)) {
				webview.postMessage({
					command: 'defectsError',
					error: configurationHelpMessage(),
					needsConfiguration: true
				});
			} else {
				webview.postMessage({
					command: 'defectsError',
					error: 'Failed to load defects'
				});
			}
		}
	}

	private async handleLoadUserStoryDefects(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading defects for user story from data provider', 'JiraMessageHandler');
			this.errorHandler.logDebug(`Webview received loadUserStoryDefects command for user story: ${message.userStoryId}`, 'JiraMessageHandler');

			const defectsResult = await getUserStoryDefects(message.userStoryId);

			if (defectsResult?.defects && defectsResult.defects.length > 0) {
				webview.postMessage({
					command: 'userStoryDefectsLoaded',
					defects: defectsResult.defects,
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo(`Defects loaded successfully for user story ${message.userStoryId}: ${defectsResult.count} defects`, 'JiraMessageHandler');
			} else {
				webview.postMessage({
					command: 'userStoryDefectsLoaded',
					defects: [],
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo('No defects found for this user story', 'JiraMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStoryDefects');

			if (isConfigurationError(errorMessage)) {
				webview.postMessage({
					command: 'userStoryDefectsError',
					error: configurationHelpMessage(),
					needsConfiguration: true,
					userStoryId: message.userStoryId
				});
			} else {
				webview.postMessage({
					command: 'userStoryDefectsError',
					error: 'Failed to load defects',
					userStoryId: message.userStoryId
				});
			}
		}
	}

	private async handleLoadUserStoryTests(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Loading test cases for user story ${message.userStoryId} (${getProviderLabel()})`, 'JiraMessageHandler');
			const testCasesResult = await getUserStoryTests(message.userStoryId);
			const testCases = testCasesResult?.testCases ?? [];
			webview.postMessage({
				command: 'userStoryTestsLoaded',
				testCases,
				userStoryId: message.userStoryId
			});
			this.errorHandler.logInfo(`Test cases loaded for user story ${message.userStoryId}: ${testCases.length}`, 'JiraMessageHandler');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStoryTests');
			webview.postMessage({
				command: 'userStoryTestsError',
				error: isConfigurationError(errorMessage) ? configurationHelpMessage() : 'Failed to load test cases',
				needsConfiguration: isConfigurationError(errorMessage),
				userStoryId: message.userStoryId
			});
		}
	}

	private async handleLoadUserStoryDiscussions(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading discussions for user story from data provider', 'JiraMessageHandler');
			this.errorHandler.logDebug(`Webview received loadUserStoryDiscussions command for user story: ${message.userStoryId}`, 'JiraMessageHandler');

			const discussionsResult = await getUserStoryDiscussions(message.userStoryId);

			if (discussionsResult?.discussions && discussionsResult.discussions.length > 0) {
				webview.postMessage({
					command: 'userStoryDiscussionsLoaded',
					discussions: discussionsResult.discussions,
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo(`Discussions loaded successfully for user story ${message.userStoryId}: ${discussionsResult.count} discussions`, 'JiraMessageHandler');
			} else {
				webview.postMessage({
					command: 'userStoryDiscussionsLoaded',
					discussions: [],
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo('No discussions found for this user story', 'JiraMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStoryDiscussions');

			if (isConfigurationError(errorMessage)) {
				webview.postMessage({
					command: 'userStoryDiscussionsError',
					error: configurationHelpMessage(),
					needsConfiguration: true,
					userStoryId: message.userStoryId
				});
			} else {
				webview.postMessage({
					command: 'userStoryDiscussionsError',
					error: 'Failed to load discussions',
					userStoryId: message.userStoryId
				});
			}
		}
	}

	private async handleGetTeamMemberInfo(webview: vscode.Webview, message: any): Promise<void> {
		const name = message.name as string;
		try {
			// Targeted query by display name (getUsers uses a 'contains' match for DisplayName),
			// so this avoids the pagination limits of fetching the full user list.
			const usersResult = await getUsers({ DisplayName: name }, 10);
			const users =
				(usersResult.users as Array<{
					displayName?: string;
					emailAddress?: string;
					userName?: string;
				}>) || [];

			// Prefer an exact display-name match; fall back to the first result.
			const normalized = (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
			const match = users.find(u => (u.displayName ?? '').trim().replace(/\s+/g, ' ').toLowerCase() === normalized) ?? users[0];

			webview.postMessage({
				type: 'teamMemberInfoLoaded',
				name,
				userName: match?.userName ?? null,
				emailAddress: match?.emailAddress ?? null
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'getTeamMemberInfo');
			webview.postMessage({
				type: 'teamMemberInfoLoaded',
				name,
				userName: null,
				emailAddress: null
			});
		}
	}

	private async handleGetMemberHoursHistory(webview: vscode.Webview, message: any): Promise<void> {
		const name = message.name as string;
		try {
			const { history } = await getMemberHoursHistory(name, 6);
			webview.postMessage({
				type: 'memberHoursHistoryLoaded',
				name,
				history
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'getMemberHoursHistory');
			webview.postMessage({
				type: 'memberHoursHistoryLoaded',
				name,
				history: []
			});
		}
	}

	private async handleLoadTeamMembers(webview: vscode.Webview, message: any): Promise<void> {
		const selectedIterationId = message.iterationId as string | undefined;
		const iterationKey = selectedIterationId ?? 'current';

		// Phase 1 (fast): active members + progress for the selected iteration.
		try {
			this.errorHandler.logDebug('Loading team members — phase 1 (active members)', 'JiraMessageHandler');

			const { progressMap, members: activeMembers } = await getAllTeamMembersProgress(undefined, selectedIterationId);

			const activeWithProgress = activeMembers.map(name => ({
				name,
				progress: progressMap.get(name) || {
					completedHours: 0,
					totalHours: 0,
					percentage: 0,
					source: 'not-found',
					userStoriesCount: 0
				}
			}));

			webview.postMessage({
				command: 'teamMembersLoaded',
				teamMembers: activeWithProgress,
				iterationId: iterationKey
			});
			this.errorHandler.logInfo(`Team members phase 1 loaded: ${activeWithProgress.length} active members`, 'JiraMessageHandler');

			// Phase 2 (deferred): historical roster from the last 6 sprints.
			try {
				const recent = await getRecentTeamMembers(6);
				const otherWithProgress = (recent?.teamMembers || []).map(name => ({
					name,
					progress: progressMap.get(name) || {
						completedHours: 0,
						totalHours: 0,
						percentage: 0,
						source: 'historical',
						userStoriesCount: 0
					}
				}));

				webview.postMessage({
					command: 'teamMembersOtherLoaded',
					teamMembers: otherWithProgress,
					iterationId: iterationKey
				});
				this.errorHandler.logInfo(`Team members phase 2 loaded: ${otherWithProgress.length} historical members`, 'JiraMessageHandler');
			} catch (phase2Error) {
				// The view is already painted; just clear the section spinner.
				const err = phase2Error instanceof Error ? phase2Error : new Error(String(phase2Error));
				this.errorHandler.logWarning(`Team members phase 2 failed: ${err.message}`, 'JiraMessageHandler');
				webview.postMessage({
					command: 'teamMembersOtherLoaded',
					teamMembers: [],
					iterationId: iterationKey
				});
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadTeamMembers');

			if (isConfigurationError(errorMessage)) {
				webview.postMessage({
					command: 'teamMembersError',
					error: configurationHelpMessage(),
					needsConfiguration: true
				});
			} else {
				webview.postMessage({
					command: 'teamMembersError',
					error: 'Failed to load team members'
				});
			}
		}
	}
}
