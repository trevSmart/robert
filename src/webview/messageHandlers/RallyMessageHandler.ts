import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import { getProjects, getIterations, getUserStories, getTasks, getDefects, getCurrentUser, getUserStoryDefects, getUserStoryTests, getUserStoryDiscussions, getRecentTeamMembers, getAllTeamMembersProgress } from '../../libs/rally/rallyServices';
import { HolidayService } from '../../libs/holidayService';
import { SettingsManager } from '../../SettingsManager';

/**
 * Handles all Rally API-related webview messages
 * Manages loading and processing data from Rally (projects, iterations, user stories, tasks, defects, etc.)
 */
export class RallyMessageHandler {
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
			default:
				return false;
		}
	}

	private async handleLoadProjects(webview: vscode.Webview): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading projects from Rally API', 'RallyMessageHandler');
			const projectsResult = await getProjects();

			if (projectsResult?.projects) {
				webview.postMessage({
					command: 'projectsLoaded',
					projects: projectsResult.projects
				});
				this.errorHandler.logInfo(`Projects loaded successfully: ${projectsResult.count} projects`, 'RallyMessageHandler');
			} else {
				webview.postMessage({
					command: 'projectsError',
					error: 'No projects found'
				});
				this.errorHandler.logInfo('No projects found', 'RallyMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadProjects');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'projectsError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
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
			this.errorHandler.logInfo('Loading iterations from Rally API', 'RallyMessageHandler');
			this.errorHandler.logDebug('Webview received loadIterations command', 'RallyMessageHandler');

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
					collaborationEnabled: collaborationEnabled || false
				});
				this.errorHandler.logInfo(`Iterations loaded successfully: ${iterationsResult.count} iterations`, 'RallyMessageHandler');
				if (userResult?.user) {
					this.errorHandler.logInfo(`Current user loaded: ${userResult.user.displayName || userResult.user.userName}`, 'RallyMessageHandler');
				}
			} else {
				webview.postMessage({
					command: 'iterationsError',
					error: 'No iterations found'
				});
				this.errorHandler.logInfo('No iterations found', 'RallyMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadIterations');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'iterationsError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
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

	private async handleLoadHolidaysForYear(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const year = message.year || new Date().getFullYear();
			const country = message.country || 'ES';
			this.errorHandler.logInfo(`Loading holidays for year ${year} (${country})`, 'RallyMessageHandler');

			const holidayService = HolidayService.getInstance();
			const holidays = await holidayService.getHolidays(year, country);

			webview.postMessage({
				command: 'holidaysLoaded',
				holidays: holidays || [],
				year: year,
				country: country
			});
			this.errorHandler.logDebug(`Holidays loaded for ${year}: ${(holidays || []).length} holidays`, 'RallyMessageHandler');
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
			this.errorHandler.logInfo('Loading user stories from Rally API', 'RallyMessageHandler');
			this.errorHandler.logDebug(`Webview received loadUserStories command ${message.iteration ? `for iteration: ${message.iteration}` : 'for all'}`, 'RallyMessageHandler');

			const query = message.iteration ? { Iteration: message.iteration } : {};
			const offset = message.offset || 0;
			const userStoriesResult = await getUserStories(query, offset);

			if (userStoriesResult?.userStories) {
				webview.postMessage({
					command: 'userStoriesLoaded',
					userStories: userStoriesResult.userStories,
					hasMore: userStoriesResult.hasMore,
					offset: userStoriesResult.offset,
					totalCount: userStoriesResult.totalCount,
					iteration: message.iteration || null
				});
				this.errorHandler.logInfo(`User stories loaded successfully: ${userStoriesResult.count} user stories (offset: ${offset}, hasMore: ${userStoriesResult.hasMore})`, 'RallyMessageHandler');
			} else {
				webview.postMessage({
					command: 'userStoriesError',
					error: 'No user stories found'
				});
				this.errorHandler.logInfo('No user stories found', 'RallyMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStories');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'userStoriesError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
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
			this.errorHandler.logInfo('Loading velocity data (hours per sprint) from Rally API', 'RallyMessageHandler');
			const iterationsResult = await getIterations();
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

			const velocityData: { sprintName: string; points: number; completedStories: number }[] = sortedIterations.map((iteration: { name: string; taskEstimateTotal?: number | null }) => ({
				sprintName: iteration.name,
				points: Math.round((iteration.taskEstimateTotal ?? 0) * 10) / 10,
				completedStories: 0
			}));

			webview.postMessage({
				command: 'velocityDataLoaded',
				velocityData
			});
			this.errorHandler.logInfo(`Velocity data loaded: ${velocityData.length} sprints`, 'RallyMessageHandler');
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
			this.errorHandler.logInfo('Loading tasks from Rally API', 'RallyMessageHandler');
			this.errorHandler.logDebug(`Webview received loadTasks command for user story: ${message.userStoryId}`, 'RallyMessageHandler');

			const tasksResult = await getTasks(message.userStoryId);

			if (tasksResult?.tasks) {
				webview.postMessage({
					command: 'tasksLoaded',
					tasks: tasksResult.tasks,
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo(`Tasks loaded successfully: ${tasksResult.count} tasks for user story ${message.userStoryId}`, 'RallyMessageHandler');
			} else {
				webview.postMessage({
					command: 'tasksError',
					error: 'No tasks found',
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo('No tasks found', 'RallyMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadTasks');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'tasksError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
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
			this.errorHandler.logInfo('Loading defects from Rally API', 'RallyMessageHandler');
			this.errorHandler.logDebug(`Webview received loadDefects command, offset: ${message.offset || 0}`, 'RallyMessageHandler');

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
				this.errorHandler.logInfo(`Defects loaded successfully: ${defectsResult.count} defects (offset: ${offset}, hasMore: ${defectsResult.hasMore})`, 'RallyMessageHandler');
			} else {
				webview.postMessage({
					command: 'defectsError',
					error: 'No defects found'
				});
				this.errorHandler.logInfo('No defects found', 'RallyMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadDefects');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'defectsError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
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
			this.errorHandler.logInfo('Loading defects for user story from Rally API', 'RallyMessageHandler');
			this.errorHandler.logDebug(`Webview received loadUserStoryDefects command for user story: ${message.userStoryId}`, 'RallyMessageHandler');

			const defectsResult = await getUserStoryDefects(message.userStoryId);

			if (defectsResult?.defects && defectsResult.defects.length > 0) {
				webview.postMessage({
					command: 'userStoryDefectsLoaded',
					defects: defectsResult.defects,
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo(`Defects loaded successfully for user story ${message.userStoryId}: ${defectsResult.count} defects`, 'RallyMessageHandler');
			} else {
				webview.postMessage({
					command: 'userStoryDefectsLoaded',
					defects: [],
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo('No defects found for this user story', 'RallyMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStoryDefects');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'userStoryDefectsError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
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
			this.errorHandler.logInfo('Loading test cases for user story from Rally API', 'RallyMessageHandler');
			this.errorHandler.logDebug(`Webview received loadUserStoryTests command for user story: ${message.userStoryId}`, 'RallyMessageHandler');

			const testCasesResult = await getUserStoryTests(message.userStoryId);

			if (testCasesResult?.testCases && testCasesResult.testCases.length > 0) {
				webview.postMessage({
					command: 'userStoryTestsLoaded',
					testCases: testCasesResult.testCases,
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo(`Test cases loaded successfully for user story ${message.userStoryId}: ${testCasesResult.count} test cases`, 'RallyMessageHandler');
			} else {
				webview.postMessage({
					command: 'userStoryTestsLoaded',
					testCases: [],
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo('No test cases found for this user story', 'RallyMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStoryTests');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'userStoryTestsError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
					needsConfiguration: true,
					userStoryId: message.userStoryId
				});
			} else {
				webview.postMessage({
					command: 'userStoryTestsError',
					error: 'Failed to load test cases',
					userStoryId: message.userStoryId
				});
			}
		}
	}

	private async handleLoadUserStoryDiscussions(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading discussions for user story from Rally API', 'RallyMessageHandler');
			this.errorHandler.logDebug(`Webview received loadUserStoryDiscussions command for user story: ${message.userStoryId}`, 'RallyMessageHandler');

			const discussionsResult = await getUserStoryDiscussions(message.userStoryId);

			if (discussionsResult?.discussions && discussionsResult.discussions.length > 0) {
				webview.postMessage({
					command: 'userStoryDiscussionsLoaded',
					discussions: discussionsResult.discussions,
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo(`Discussions loaded successfully for user story ${message.userStoryId}: ${discussionsResult.count} discussions`, 'RallyMessageHandler');
			} else {
				webview.postMessage({
					command: 'userStoryDiscussionsLoaded',
					discussions: [],
					userStoryId: message.userStoryId
				});
				this.errorHandler.logInfo('No discussions found for this user story', 'RallyMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStoryDiscussions');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'userStoryDiscussionsError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
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

	private async handleLoadTeamMembers(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo('Loading team members from last 6 sprints', 'RallyMessageHandler');
			this.errorHandler.logDebug('Webview received loadTeamMembers command', 'RallyMessageHandler');

			const teamMembersResult = await getRecentTeamMembers(6);

			if (teamMembersResult?.teamMembers) {
				const selectedIterationId = message.iterationId as string | undefined;
				const progressMap = await getAllTeamMembersProgress(teamMembersResult.teamMembers, selectedIterationId);

				const teamMembersWithProgress = teamMembersResult.teamMembers.map(memberName => ({
					name: memberName,
					progress: progressMap.get(memberName) || {
						completedHours: 0,
						totalHours: 0,
						percentage: 0,
						source: 'not-found'
					}
				}));

				webview.postMessage({
					command: 'teamMembersLoaded',
					teamMembers: teamMembersWithProgress
				});
				this.errorHandler.logInfo(`Team members loaded successfully: ${teamMembersWithProgress.length} members with progress`, 'RallyMessageHandler');
			} else {
				webview.postMessage({
					command: 'teamMembersLoaded',
					teamMembers: []
				});
				this.errorHandler.logInfo('No team members found', 'RallyMessageHandler');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadTeamMembers');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'teamMembersError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
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
