import { rallyData } from '../../extension.js';
import type { RallyApiObject, RallyApiResult, RallyProject, RallyQuery, RallyQueryBuilder, RallyQueryOptions, RallyQueryParams, RallyUser, RallyUserStory, RallyIteration, RallyDefect, User } from '../../types/rally';
import { getRallyApi, queryUtils, validateRallyConfiguration, getProjectId } from './utils';
import { ErrorHandler } from '../../ErrorHandler';
import { getUserStoriesCacheManager, getProjectsCacheManager, getIterationsCacheManager, clearAllCaches as clearAllCachesService } from './CacheService';

// Error handler singleton instance
const errorHandler = ErrorHandler.getInstance();

// Process data in chunks to avoid blocking the event loop
// With 3500+ user stories, we need small chunks (25) to yield frequently
const CHUNK_SIZE = 25; // Process 25 items at a time, yield after each chunk

/**
 * Yields to the event loop to avoid blocking
 * Allows UI to remain responsive during heavy processing
 */
function yieldToEventLoop(): Promise<void> {
	return new Promise<void>(resolve => setImmediate(() => resolve()));
}

// Cache managers are now managed by CacheService for global persistence

// Constants for pagination
const PAGE_SIZE = 100;

/**
 * Sort function to order items by FormattedID in descending order
 */
function sortByFormattedIdDescending<T extends { formattedId: string }>(items: T[]): T[] {
	return [...items].sort((a, b) => {
		// Extract numeric part from FormattedID (e.g., "US1226070" -> 1226070)
		const aMatch = a.formattedId?.match(/\d+/);
		const bMatch = b.formattedId?.match(/\d+/);
		const aNum = aMatch ? parseInt(aMatch[0], 10) : 0;
		const bNum = bMatch ? parseInt(bMatch[0], 10) : 0;
		return bNum - aNum; // Descending order
	});
}

function escapeHtml(input: string): string {
	return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function getProjects(query: Record<string, unknown> = {}, limit: number | null = null) {
	// Validem la configuració de Rally abans de fer la crida
	const validation = await validateRallyConfiguration();
	if (!validation.isValid) {
		throw new Error(`Rally configuration error: ${validation.errors.join(', ')}`);
	}

	// Generate cache key from query
	const cacheKey = `projects:${JSON.stringify(query)}`;

	// Check TTL cache first
	const projectsCacheMgr = getProjectsCacheManager();
	const cachedProjects = projectsCacheMgr.get(cacheKey);
	if (cachedProjects) {
		errorHandler.logDebug('Projects retrieved from TTL cache', 'rallyServices.getProjects');
		return {
			projects: cachedProjects,
			source: 'ttl-cache',
			count: cachedProjects.length
		};
	}

	// Fall back to in-memory cache for filtered results
	if (Object.keys(query).length && rallyData.projects.length) {
		const filteredProjects = rallyData.projects.filter((project: RallyProject) =>
			Object.keys(query).every(key => {
				if (project[key as keyof RallyProject] === undefined) {
					return false;
				}
				return project[key as keyof RallyProject] === query[key];
			})
		);

		//Si tenim resultats que coincideixen amb els filtres, els retornem
		if (filteredProjects.length) {
			return {
				projects: filteredProjects,
				source: 'cache',
				count: filteredProjects.length
			};
		}
	}

	//Si no hi ha filtres (demandem tots els projectes) o no tenim dades suficients,
	//hem d'anar a l'API per obtenir la llista completa

	const rallyApi = getRallyApi();

	const queryOptions: RallyQueryOptions = {
		type: 'project',
		fetch: ['ObjectID', 'Name', 'Description', 'State', 'CreationDate', 'LastUpdateDate', 'Owner', 'Parent', 'Children']
	};

	if (limit) {
		queryOptions.limit = limit;
	}

	if (Object.keys(query).length) {
		const rallyQueries = Object.keys(query).map(key => {
			//Per al camp Name, utilitzem 'contains' per fer cerca parcial
			if (key === 'Name') {
				return queryUtils.where(key, 'contains', query[key]);
			}
			//Per a altres camps, mantenim la cerca exacta
			return queryUtils.where(key, '=', query[key]);
		});
		if (rallyQueries.length) {
			queryOptions.query = rallyQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.and(b));
		}
	}

	const result = await rallyApi.query(queryOptions);
	const resultData = result as RallyApiResult;

	const results = resultData.Results || resultData.QueryResult?.Results || [];
	if (!results.length) {
		// Cache empty results too
		projectsCacheMgr.set(cacheKey, []);
		return {
			projects: [],
			source: 'api',
			count: 0
		};
	}

	//Formatem la resposta per ser més llegible (de forma assincròna per no bloquejar)
	const projects: RallyProject[] = await formatProjectsAsync(results as RallyApiObject[]);

	//Afegim els nous projectes a rallyData sense duplicats
	for (const newProject of projects) {
		const existingProjectIndex = rallyData.projects.findIndex((existingProject: RallyProject) => existingProject.objectId === newProject.objectId);

		if (existingProjectIndex === -1) {
			//Projecte nou, l'afegim
			rallyData.projects.push(newProject);
		} else {
			//Projecte existent, l'actualitzem
			rallyData.projects[existingProjectIndex] = newProject;
		}
	}

	// Store in TTL cache
	projectsCacheMgr.set(cacheKey, projects);

	return {
		projects: projects,
		source: 'api',
		count: projects.length
	};
}

export async function getCurrentUser() {
	// If we already have the current user from prefetch, return it
	if (rallyData.currentUser) {
		errorHandler.logInfo(`Returning cached current user: ${rallyData.currentUser.displayName || rallyData.currentUser.userName}`, 'getCurrentUser');
		return {
			user: rallyData.currentUser,
			source: 'cache'
		};
	}

	errorHandler.logInfo('No cached current user found, fetching from Rally API', 'getCurrentUser');

	// Validem la configuració de Rally abans de fer la crida
	const validation = await validateRallyConfiguration();
	if (!validation.isValid) {
		errorHandler.logError(`Rally configuration validation failed: ${validation.errors.join(', ')}`, 'getCurrentUser');
		throw new Error(`Rally configuration error: ${validation.errors.join(', ')}`);
	}

	// Get the authenticated user from Rally API
	const rallyApi = getRallyApi();
	errorHandler.logInfo('Executing Rally user query to get authenticated user', 'getCurrentUser');

	try {
		const userResult = await rallyApi.query({
			type: 'user',
			fetch: ['ObjectID', 'UserName', 'DisplayName', 'EmailAddress', 'FirstName', 'LastName', 'Disabled'],
			limit: 1
		});

		errorHandler.logInfo(`Rally user query completed. Result type: ${typeof userResult}`, 'getCurrentUser');

		const resultData = userResult as RallyApiResult;

		const results = resultData.Results || resultData.QueryResult?.Results || [];
		if (results.length > 0) {
			const user = results[0];
			errorHandler.logInfo(`User data retrieved successfully. DisplayName: ${user.DisplayName || user.displayName || 'N/A'}, UserName: ${user.UserName || user.userName || 'N/A'}`, 'getCurrentUser');

			const userData = {
				objectId: String(user.ObjectID ?? user.objectId),
				userName: user.UserName ?? user.userName,
				displayName: user.DisplayName ?? user.displayName,
				emailAddress: user.EmailAddress ?? user.emailAddress,
				firstName: user.FirstName ?? user.firstName,
				lastName: user.LastName ?? user.lastName,
				disabled: Boolean(user.Disabled ?? user.disabled),
				_ref: user._ref
			} as User;

			// Cache the user data
			rallyData.currentUser = userData;

			errorHandler.logInfo(`Processed and cached user data: ${JSON.stringify(userData)}`, 'getCurrentUser');

			return {
				user: userData,
				source: 'api'
			};
		}

		errorHandler.logWarning('Rally user query returned no results', 'getCurrentUser');
		return {
			user: null,
			source: 'api'
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		errorHandler.logError(`Failed to retrieve current user info from Rally API: ${errorMessage}`, 'getCurrentUser');
		return {
			user: null,
			source: 'api'
		};
	}
}

export async function getUsers(query: RallyQueryParams = {}, limit: number | null = null) {
	const rallyApi = getRallyApi();

	//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
	if (Object.keys(query).length && rallyData.users && rallyData.users.length) {
		const filteredUsers = rallyData.users.filter((user: RallyUser) =>
			Object.keys(query).every(key => {
				if (user[key as keyof RallyUser] === undefined) {
					return false;
				}
				return user[key as keyof RallyUser] === query[key];
			})
		);

		//Si tenim resultats que coincideixen amb els filtres, els retornem
		if (filteredUsers.length) {
			return {
				users: filteredUsers,
				source: 'cache',
				count: filteredUsers.length
			};
		}
	}

	//Si no hi ha filtres (demandem tots els usuaris) o no tenim dades suficients,
	//hem d'anar a l'API per obtenir la llista completa

	const queryOptions: RallyQueryOptions = {
		type: 'user',
		fetch: ['ObjectID', 'UserName', 'DisplayName', 'EmailAddress', 'FirstName', 'LastName', 'Disabled']
	};

	if (limit) {
		queryOptions.limit = limit;
	}

	if (Object.keys(query).length) {
		const rallyQueries = Object.keys(query).map(key => {
			//Per al camp DisplayName, utilitzem 'contains' per fer cerca parcial
			if (key === 'DisplayName') {
				return queryUtils.where(key, 'contains', query[key]);
			}
			//Per a altres camps, mantenim la cerca exacta
			return queryUtils.where(key, '=', query[key]);
		});

		if (rallyQueries.length) {
			queryOptions.query = rallyQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.and(b));
		}
	}

	const result = await rallyApi.query(queryOptions);
	const resultData = result as RallyApiResult;

	const results = resultData.Results || resultData.QueryResult?.Results || [];
	if (!results.length) {
		return {
			users: [],
			source: 'api',
			count: 0
		};
	}

	const users: RallyUser[] = await formatUsersAsync(results as RallyApiObject[]);

	//Afegim els nous usuaris a rallyData sense duplicats
	if (!rallyData.users) {
		rallyData.users = [];
	}

	for (const newUser of users) {
		const existingUserIndex = rallyData.users.findIndex((existingUser: RallyUser) => existingUser.objectId === newUser.objectId);

		if (existingUserIndex === -1) {
			//Usuari nou, l'afegim
			rallyData.users.push(newUser);
		} else {
			//Usuari existent, l'actualitzem
			rallyData.users[existingUserIndex] = newUser;
		}
	}

	return {
		users: users,
		source: 'api',
		count: users.length
	};
}

// Helper function to reduce complexity
function buildUserStoryQuery(query: RallyQueryParams) {
	const rallyQueries = Object.keys(query).map(key => {
		//Per al camp Name, utilitzem 'contains' per fer cerca parcial
		if (key === 'Name') {
			return queryUtils.where(key, 'contains', query[key]);
		}
		//Per al camp Owner, afegim el prefix /user/ si no el porta
		if (key === 'Owner' && query[key] !== 'currentuser') {
			let ownerValue = String(query[key]);
			if (!ownerValue.startsWith('/user/')) {
				ownerValue = `/user/${ownerValue}`;
			}
			return queryUtils.where(key, '=', ownerValue);
		}
		//Per a altres camps, mantenim la cerca exacta
		return queryUtils.where(key, '=', query[key]);
	});

	return rallyQueries.length ? rallyQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.and(b)) : null;
}

// Helper function to safely sanitize HTML descriptions
function sanitizeDescription(description: unknown): string | null {
	if (description == null) {
		return null;
	}

	if (typeof description !== 'string') {
		return String(description);
	}

	let sanitized = description;
	let previous: string;
	// Repeatedly remove HTML-like tags to avoid incomplete multi-character sanitization
	do {
		previous = sanitized;
		sanitized = sanitized.replace(/<[^>]*>/g, '');
	} while (sanitized !== previous);

	// Remove any remaining angle brackets to avoid HTML element injection
	sanitized = sanitized.replace(/[<>]/g, '');

	return sanitized;
}

/**
 * Formateia Projects de forma assincròna en chunks
 * Per a molts items, usa yield per mantenir UI responsiva
 */
async function formatProjectsAsync(results: any[]): Promise<RallyProject[]> {
	const formatted: RallyProject[] = [];

	for (let i = 0; i < results.length; i++) {
		const project: any = results[i];

		formatted.push({
			objectId: project.ObjectID ?? project.objectId,
			name: project.Name ?? project.name,
			description: typeof (project.Description ?? project.description) === 'string' ? escapeHtml(String(project.Description ?? project.description)) : (project.Description ?? project.description),
			state: project.State ?? project.state,
			creationDate: project.CreationDate ?? project.creationDate,
			lastUpdateDate: project.LastUpdateDate ?? project.lastUpdateDate,
			owner: project.Owner ? (project.Owner._refObjectName ?? project.Owner.refObjectName) : project.owner ? (project.owner._refObjectName ?? project.owner.refObjectName) : 'Sense propietari',
			parent: project.Parent ? (project.Parent._refObjectName ?? project.Parent.refObjectName) : project.parent ? (project.parent._refObjectName ?? project.parent.refObjectName) : null,
			childrenCount: project.Children?.Count ?? project.children?.count ?? 0
		});

		// Yield to event loop every CHUNK_SIZE items
		if ((i + 1) % CHUNK_SIZE === 0) {
			await yieldToEventLoop();
		}
	}

	return formatted;
}

/**
 * Formateia Users de forma assincròna en chunks
 * Per a molts items, usa yield per mantenir UI responsiva
 */
async function formatUsersAsync(results: any[]): Promise<RallyUser[]> {
	const formatted: RallyUser[] = [];

	for (let i = 0; i < results.length; i++) {
		const user: any = results[i];

		formatted.push({
			objectId: user.ObjectID ?? user.objectId,
			userName: user.UserName ?? user.userName,
			displayName: user.DisplayName ?? user.displayName,
			emailAddress: user.EmailAddress ?? user.emailAddress,
			firstName: user.FirstName ?? user.firstName,
			lastName: user.LastName ?? user.lastName,
			disabled: user.Disabled ?? user.disabled,
			_ref: user._ref
		});

		// Yield to event loop every CHUNK_SIZE items
		if ((i + 1) % CHUNK_SIZE === 0) {
			await yieldToEventLoop();
		}
	}

	return formatted;
}

/**
 * Formateia Iteracions de forma assincròna en chunks
 * Per a molts items, usa yield per mantenir UI responsiva
 */
async function formatIterationsAsync(results: any[]): Promise<RallyIteration[]> {
	const formatted: RallyIteration[] = [];

	for (let i = 0; i < results.length; i++) {
		const iteration: any = results[i];

		formatted.push({
			objectId: iteration.ObjectID ?? iteration.objectId,
			name: iteration.Name ?? iteration.name,
			startDate: iteration.StartDate ?? iteration.startDate,
			endDate: iteration.EndDate ?? iteration.endDate,
			state: iteration.State ?? iteration.state,
			project: iteration.Project ? (iteration.Project._refObjectName ?? iteration.Project.refObjectName) : iteration.project ? (iteration.project._refObjectName ?? iteration.project.refObjectName) : null,
			_ref: iteration._ref
		});

		// Yield to event loop every CHUNK_SIZE items
		if ((i + 1) % CHUNK_SIZE === 0) {
			await yieldToEventLoop();
		}
	}

	return formatted;
}

/**
 * Formateia Tasks de forma assincròna en chunks
 * Per a molts items, usa yield per mantenir UI responsiva
 */
async function formatTasksAsync(results: any[]): Promise<any[]> {
	const formatted: any[] = [];

	for (let i = 0; i < results.length; i++) {
		const task: any = results[i];

		formatted.push({
			objectId: task.ObjectID ?? task.objectId,
			formattedId: task.FormattedID ?? task.formattedId,
			name: task.Name ?? task.name,
			description: sanitizeDescription(task.Description ?? task.description),
			state: task.State ?? task.state,
			owner: task.Owner ? (task.Owner._refObjectName ?? task.Owner.refObjectName) : task.owner ? (task.owner._refObjectName ?? task.owner.refObjectName) : 'Sense propietari',
			estimate: task.Estimate ?? task.estimate ?? 0,
			toDo: task.ToDo ?? task.toDo ?? 0,
			timeSpent: task.TimeSpent ?? task.timeSpent ?? 0,
			workItem: task.WorkProduct ? (task.WorkProduct._refObjectName ?? task.WorkProduct.refObjectName) : task.workProduct ? (task.workProduct._refObjectName ?? task.workProduct.refObjectName) : null,
			rank: task.Rank ?? task.rank ?? 0
		});

		// Yield to event loop every CHUNK_SIZE items
		if ((i + 1) % CHUNK_SIZE === 0) {
			await yieldToEventLoop();
		}
	}

	return formatted;
}

/**
 * Formateia Defects de forma assincròna en chunks
 * Per a molts items, usa yield per mantenir UI responsiva
 */
async function formatDefectsAsync(results: any[]): Promise<RallyDefect[]> {
	const formatted: RallyDefect[] = [];

	for (let i = 0; i < results.length; i++) {
		const defect: any = results[i];

		formatted.push({
			objectId: defect.ObjectID ?? defect.objectId,
			formattedId: defect.FormattedID ?? defect.formattedId,
			name: defect.Name ?? defect.name,
			description: sanitizeDescription(defect.Description ?? defect.description),
			state: defect.State ?? defect.state,
			severity: defect.Severity ?? defect.severity ?? 'Unset',
			priority: defect.Priority ?? defect.priority ?? 'Unset',
			owner: defect.Owner ? (defect.Owner._refObjectName ?? defect.Owner.refObjectName) : defect.owner ? (defect.owner._refObjectName ?? defect.owner.refObjectName) : 'Sense assignat',
			project: defect.Project ? (defect.Project._refObjectName ?? defect.Project.refObjectName) : defect.project ? (defect.project._refObjectName ?? defect.project.refObjectName) : null,
			iteration: defect.Iteration ? (defect.Iteration._refObjectName ?? defect.Iteration.refObjectName) : defect.iteration ? (defect.iteration._refObjectName ?? defect.iteration.refObjectName) : null,
			blocked: defect.Blocked ?? defect.blocked ?? false,
			discussionCount: defect.Discussion?.Count ?? defect.discussion?.count ?? 0,
			scheduleState: defect.ScheduleState ?? defect.scheduleState ?? 'Unknown'
		});

		// Yield to event loop every CHUNK_SIZE items
		if ((i + 1) % CHUNK_SIZE === 0) {
			await yieldToEventLoop();
		}
	}

	return formatted;
}

/**
 * Formateia User Stories de forma assincròna en chunks
 * Per a 3500+ items, usa yield per mantenir UI responsiva
 */
async function formatUserStoriesAsync(result: RallyApiResult): Promise<RallyUserStory[]> {
	const formatted: RallyUserStory[] = [];

	// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
	const results = result.Results || result.QueryResult?.Results || [];
	for (let i = 0; i < results.length; i++) {
		const userStory: any = results[i];

		formatted.push({
			objectId: userStory.ObjectID ?? userStory.objectId,
			formattedId: userStory.FormattedID ?? userStory.formattedId,
			name: userStory.Name ?? userStory.name,
			owner: userStory.Owner ? (userStory.Owner._refObjectName ?? userStory.Owner.refObjectName) : userStory.owner ? (userStory.owner._refObjectName ?? userStory.owner.refObjectName) : 'Sense propietari',
			description: sanitizeDescription(userStory.Description ?? userStory.description),
			state: userStory.State ?? userStory.state,
			planEstimate: userStory.PlanEstimate ?? userStory.planEstimate,
			toDo: userStory.ToDo ?? userStory.toDo,
			assignee: userStory.c_Assignee ? (userStory.c_Assignee._refObjectName ?? userStory.c_Assignee.refObjectName) : userStory.c_assignee ? (userStory.c_assignee._refObjectName ?? userStory.c_assignee.refObjectName) : 'Unassigned',
			project: userStory.Project ? (userStory.Project._refObjectName ?? userStory.Project.refObjectName) : userStory.project ? (userStory.project._refObjectName ?? userStory.project.refObjectName) : null,
			iteration: userStory.Iteration ? (userStory.Iteration._refObjectName ?? userStory.Iteration.refObjectName) : userStory.iteration ? (userStory.iteration._refObjectName ?? userStory.iteration.refObjectName) : null,
			blocked: userStory.Blocked ?? userStory.blocked,
			taskEstimateTotal: userStory.TaskEstimateTotal ?? userStory.taskEstimateTotal,
			taskStatus: userStory.TaskStatus ?? userStory.taskStatus,
			scheduleState: userStory.ScheduleState ?? userStory.scheduleState ?? 'Unknown',
			tasksCount: userStory.Tasks?.Count ?? userStory.tasks?.count ?? 0,
			testCasesCount: userStory.TestCases?.Count ?? userStory.testCases?.count ?? 0,
			defectsCount: userStory.Defects?.Count ?? userStory.defects?.count ?? 0,
			discussionCount: userStory.Discussion?.Count ?? userStory.discussion?.count ?? 0,
			appgar: userStory.c_Appgar ?? userStory.appgar
		});

		// Yield to event loop every CHUNK_SIZE items to keep UI responsive
		if ((i + 1) % CHUNK_SIZE === 0) {
			await yieldToEventLoop();
		}
	}

	return formatted;
}

// Helper function to check cache for filtered results
function checkCacheForFilteredResults(query: RallyQuery, dataArray: RallyUserStory[]) {
	if (Object.keys(query).length && dataArray && dataArray.length) {
		const filteredResults = dataArray.filter(item =>
			Object.keys(query).every(key => {
				if (item[key as keyof RallyUserStory] === undefined) {
					return false;
				}
				return item[key as keyof RallyUserStory] === query[key];
			})
		);

		if (filteredResults.length) {
			return {
				results: filteredResults,
				source: 'cache',
				count: filteredResults.length
			};
		}
	}
	return null;
}

// Helper function to add items to cache without duplicates
function addToCache(newItems: RallyUserStory[], cacheArray: RallyUserStory[], idField: string) {
	if (!cacheArray) {
		cacheArray = [];
	}

	for (const newItem of newItems) {
		const existingIndex = cacheArray.findIndex(existingItem => existingItem.objectId === newItem[idField as keyof RallyUserStory]);

		if (existingIndex === -1) {
			//Item nou, l'afegim
			cacheArray.push(newItem);
		} else {
			//Item existent, l'actualitzem
			cacheArray[existingIndex] = newItem;
		}
	}
}

// Helper function to build query options
function buildUserStoryQueryOptions(query: RallyQueryParams, offset: number = 0) {
	const queryOptions: RallyQueryOptions = {
		type: 'hierarchicalrequirement',
		fetch: ['FormattedID', 'Name', 'Description', 'Iteration', 'Blocked', 'TaskEstimateTotal', 'ToDo', 'c_Assignee', 'Owner', 'State', 'PlanEstimate', 'TaskStatus', 'Tasks', 'TestCases', 'Defects', 'Discussion', 'ObjectID', 'c_Appgar', 'ScheduleState', 'Project'],
		order: 'FormattedID desc' // Order by FormattedID descending to get proper pagination
	};

	// Always limit to PAGE_SIZE (100) for pagination
	queryOptions.limit = PAGE_SIZE;

	// Set start index for pagination (Rally uses 1-based indexing, so add 1)
	if (offset > 0) {
		queryOptions.start = offset + 1;
	}

	if (Object.keys(query).length) {
		const queryQuery = buildUserStoryQuery(query);
		if (queryQuery) {
			queryOptions.query = queryQuery;
		}
	}

	return queryOptions;
}

export async function getIterations(query: RallyQueryParams = {}, limit: number | null = null) {
	errorHandler.logDebug(`getIterations called with query: ${JSON.stringify(query)}, limit: ${limit}`, 'rallyServices.getIterations');

	// Generate cache key from query
	const cacheKey = `iterations:${JSON.stringify(query)}`;

	// Check TTL cache first
	const iterationsCacheMgr = getIterationsCacheManager();
	const cachedIterations = iterationsCacheMgr.get(cacheKey);
	if (cachedIterations) {
		errorHandler.logDebug('Iterations retrieved from TTL cache', 'rallyServices.getIterations');
		return {
			iterations: cachedIterations,
			source: 'ttl-cache',
			count: cachedIterations.length
		};
	}

	// Fall back to in-memory cache for filtered results
	if (Object.keys(query).length && rallyData.iterations && rallyData.iterations.length) {
		const filteredIterations = rallyData.iterations.filter((iteration: any) =>
			Object.keys(query).every(key => {
				if (iteration[key as keyof any] === undefined) {
					return false;
				}
				return iteration[key as keyof any] === query[key];
			})
		);

		if (filteredIterations.length) {
			return {
				iterations: filteredIterations,
				source: 'cache',
				count: filteredIterations.length
			};
		}
	}

	const rallyApi = getRallyApi();

	//Si no hi ha filtres o no tenim dades suficients, anem a l'API
	const queryOptions: RallyQueryOptions = {
		type: 'iteration',
		fetch: ['ObjectID', 'Name', 'StartDate', 'EndDate', 'State', 'Project', 'CreationDate', 'LastUpdateDate', 'PlannedVelocity', 'Theme', 'Notes', 'RevisionHistory']
	};

	if (limit) {
		queryOptions.limit = limit;
	}

	// Sempre filtrem per projecte
	const projectId = await getProjectId();
	queryOptions.query = queryUtils.where('Project', '=', `/project/${projectId}`);

	if (Object.keys(query).length) {
		const iterationQueries = Object.keys(query).map(key => {
			if (key === 'Name') {
				return queryUtils.where(key, 'contains', query[key]);
			}
			return queryUtils.where(key, '=', query[key]);
		});

		if (iterationQueries.length) {
			if (queryOptions.query) {
				// @ts-expect-error - Rally query builder has and method
				queryOptions.query = queryOptions.query.and(iterationQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.and(b)));
			} else {
				queryOptions.query = iterationQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.and(b));
			}
		}
	}

	const result = await rallyApi.query(queryOptions);
	const resultData = result as RallyApiResult;

	const results = resultData.Results || resultData.QueryResult?.Results || [];
	if (!results.length) {
		// Cache empty results too
		const iterationsCacheMgr = getIterationsCacheManager();
		iterationsCacheMgr.set(cacheKey, []);
		return {
			iterations: [],
			source: 'api',
			count: 0
		};
	}

	// DEBUG: Show all available fields for the first iteration
	if (results.length > 0) {
		const firstIteration = results[0];
		errorHandler.logDebug(`All available fields for iteration: ${JSON.stringify(firstIteration, null, 2)}`, 'rallyServices.getIterations');

		// Check for date-related fields
		const dateFields = Object.keys(firstIteration).filter(key => key.toLowerCase().includes('date') || key.toLowerCase().includes('time') || key.toLowerCase().includes('created') || key.toLowerCase().includes('updated'));
		errorHandler.logDebug(`Date-related fields found: ${JSON.stringify(dateFields)}`, 'rallyServices.getIterations');
		dateFields.forEach(field => {
			errorHandler.logDebug(`  ${field}: ${(firstIteration as any)[field]}`, 'rallyServices.getIterations');
		});
	}

	//Formatem la resposta (de forma assincròna per no bloquejar)
	const iterations = await formatIterationsAsync(results);

	//Afegim les noves iterations a rallyData sense duplicats
	if (!rallyData.iterations) {
		rallyData.iterations = [];
	}

	for (const newIteration of iterations) {
		const existingIterationIndex = rallyData.iterations.findIndex((existingIteration: any) => existingIteration.objectId === newIteration.objectId);

		if (existingIterationIndex === -1) {
			rallyData.iterations.push(newIteration);
		} else {
			rallyData.iterations[existingIterationIndex] = newIteration;
		}
	}

	// Store in TTL cache
	iterationsCacheMgr.set(cacheKey, iterations);

	return {
		iterations: iterations,
		source: 'api',
		count: iterations.length
	};
}

export async function getUserStories(query: RallyQueryParams = {}, offset: number = 0) {
	errorHandler.logDebug(`getUserStories called with query: ${JSON.stringify(query)}, offset: ${offset}`, 'rallyServices.getUserStories');

	// For filtered queries (e.g., by iteration), use cache if available
	const hasFilters = Object.keys(query).length > 0;
	if (hasFilters) {
		// Fall back to in-memory cache for filtered results
		const cacheResult = checkCacheForFilteredResults(query as RallyQuery, rallyData.userStories);
		if (cacheResult) {
			const sorted = sortByFormattedIdDescending(cacheResult.results);
			const paginated = sorted.slice(offset, offset + PAGE_SIZE);
			const hasMore = offset + PAGE_SIZE < sorted.length;
			return {
				userStories: paginated,
				source: cacheResult.source,
				count: paginated.length,
				totalCount: sorted.length,
				hasMore: hasMore,
				offset: offset
			};
		}
	}

	// For non-filtered queries (all user stories), only use cache if it's complete
	// Check if cache has enough data for this offset
	if (!hasFilters && offset > 0 && rallyData.userStories && rallyData.userStories.length > 0) {
		const sorted = sortByFormattedIdDescending(rallyData.userStories);
		// Only use cache if it has data at the requested offset
		if (sorted.length > offset) {
			errorHandler.logDebug(`Using existing cached user stories for pagination (offset: ${offset})`, 'rallyServices.getUserStories');
			const paginated = sorted.slice(offset, offset + PAGE_SIZE);
			const hasMore = offset + PAGE_SIZE < sorted.length;
			// Only return from cache if we have data or if we've reached the end
			if (paginated.length > 0 || !hasMore) {
				return {
					userStories: paginated,
					source: 'cache',
					count: paginated.length,
					totalCount: sorted.length,
					hasMore: hasMore,
					offset: offset
				};
			}
		}
	}

	// For non-filtered queries (all user stories), always fetch from Rally for proper pagination
	// This ensures each "Load more" fetches the next page from Rally
	const rallyApi = getRallyApi();
	const queryOptions = buildUserStoryQueryOptions(query, offset);

	// Always filter by project (unless Project is already specified in the query)
	if (!query?.Project) {
		const projectId = await getProjectId();
		const projectQuery = queryUtils.where('Project', '=', `/project/${projectId}`);

		if (queryOptions.query) {
			// @ts-expect-error - Rally query builder has and method
			queryOptions.query = queryOptions.query.and(projectQuery);
		} else {
			queryOptions.query = projectQuery;
		}
	}

	const result = await rallyApi.query(queryOptions);
	const resultData = result as RallyApiResult;

	const results = resultData.Results || resultData.QueryResult?.Results || [];
	if (!results.length) {
		return {
			userStories: [],
			source: 'api',
			count: 0,
			totalCount: 0,
			hasMore: false,
			offset: offset
		};
	}

	// Format the response
	const userStories = await formatUserStoriesAsync({ ...resultData, Results: results });

	// Add new user stories to rallyData progressively without duplicates
	addToCache(userStories, rallyData.userStories, 'objectId');

	// Results are already ordered by Rally (FormattedID desc), no need to sort locally
	// Determine if there are more results
	// Rally API typically returns pageSize items, and if we got exactly PAGE_SIZE items, there might be more
	const hasMore = results.length === PAGE_SIZE;

	return {
		userStories: userStories,
		source: 'api',
		count: userStories.length,
		totalCount: 0, // We don't know the total until we've fetched all pages
		hasMore: hasMore,
		offset: offset
	};
}

export async function getTasks(userStoryId: string, query: RallyQueryParams = {}, limit: number | null = null) {
	errorHandler.logDebug(`getTasks called for user story: ${userStoryId}, with query: ${JSON.stringify(query)}, limit: ${limit}`, 'rallyServices.getTasks');

	const rallyApi = getRallyApi();

	// Validem la configuració de Rally abans de fer la crida
	const validation = await validateRallyConfiguration();
	if (!validation.isValid) {
		throw new Error(`Rally configuration error: ${validation.errors.join(', ')}`);
	}

	//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
	if (Object.keys(query).length && rallyData.tasks && rallyData.tasks.length) {
		const filteredTasks = rallyData.tasks.filter((task: any) =>
			Object.keys(query).every(key => {
				if (task[key as keyof any] === undefined) {
					return false;
				}
				return task[key as keyof any] === query[key];
			})
		);

		if (filteredTasks.length) {
			return {
				tasks: filteredTasks,
				source: 'cache',
				count: filteredTasks.length
			};
		}
	}

	//Si no hi ha filtres o no tenim dades suficients, anem a l'API
	const queryOptions: RallyQueryOptions = {
		type: 'task',
		fetch: ['FormattedID', 'Name', 'Description', 'State', 'Owner', 'Estimate', 'ToDo', 'TimeSpent', 'WorkProduct', 'ObjectID', 'Rank'],
		order: 'Rank'
	};

	if (limit) {
		queryOptions.limit = limit;
	}

	// Always filter by project for better query performance
	const projectId = await getProjectId();
	const rallyQueries = [queryUtils.where('WorkProduct', '=', `/hierarchicalrequirement/${userStoryId}`), queryUtils.where('Project', '=', `/project/${projectId}`)];

	if (Object.keys(query).length) {
		const additionalQueries = Object.keys(query).map(key => {
			if (key === 'Name') {
				return queryUtils.where(key, 'contains', query[key]);
			}
			return queryUtils.where(key, '=', query[key]);
		});
		rallyQueries.push(...additionalQueries);
	}

	if (rallyQueries.length) {
		queryOptions.query = rallyQueries.length > 1 ? rallyQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.and(b)) : rallyQueries[0];
	}

	const result = await rallyApi.query(queryOptions);
	const resultData = result as RallyApiResult;

	const results = resultData.Results || resultData.QueryResult?.Results || [];
	if (!results.length) {
		return {
			tasks: [],
			source: 'api',
			count: 0
		};
	}

	//Formatem la resposta per ser més llegible (de forma assincròna per no bloquejar)
	const tasks = await formatTasksAsync(results);

	//Afegim les noves tasks a rallyData sense duplicats
	if (!rallyData.tasks) {
		rallyData.tasks = [];
	}

	for (const newTask of tasks) {
		const existingTaskIndex = rallyData.tasks.findIndex((existingTask: any) => existingTask.objectId === newTask.objectId);

		if (existingTaskIndex === -1) {
			//Task nova, l'afegim
			rallyData.tasks.push(newTask);
		} else {
			//Task existent, l'actualitzem
			rallyData.tasks[existingTaskIndex] = newTask;
		}
	}

	return {
		tasks: tasks,
		source: 'api',
		count: tasks.length
	};
}

export async function getDefects(query: RallyQueryParams = {}, offset: number = 0) {
	errorHandler.logDebug(`getDefects called with query: ${JSON.stringify(query)}, offset: ${offset}`, 'rallyServices.getDefects');

	const rallyApi = getRallyApi();

	// Check if this is a filtered query (e.g., defects for a specific user story)
	// If filtered, skip pagination
	const isFiltered = Object.keys(query).length > 0;

	//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
	if (isFiltered && rallyData.defects && rallyData.defects.length) {
		const filteredDefects = rallyData.defects.filter((defect: RallyDefect) =>
			Object.keys(query).every(key => {
				if (defect[key as keyof RallyDefect] === undefined) {
					return false;
				}
				return defect[key as keyof RallyDefect] === query[key];
			})
		);

		if (filteredDefects.length) {
			return {
				defects: filteredDefects,
				source: 'cache',
				count: filteredDefects.length,
				hasMore: false // No pagination for filtered results
			};
		}
	}

	// If offset > 0 and we have no filters, check if cache has enough data
	// Only use cache if it contains data at the requested offset
	if (offset > 0 && !isFiltered && rallyData.defects && rallyData.defects.length > 0) {
		const sorted = sortByFormattedIdDescending(rallyData.defects);
		// Only use cache if it has data at the requested offset
		if (sorted.length > offset) {
			errorHandler.logDebug(`Using existing cached defects for pagination (offset: ${offset})`, 'rallyServices.getDefects');
			const paginated = sorted.slice(offset, offset + PAGE_SIZE);
			const hasMore = offset + PAGE_SIZE < sorted.length;
			// Only return from cache if we have data or if we've reached the end
			if (paginated.length > 0 || !hasMore) {
				return {
					defects: paginated,
					source: 'cache',
					count: paginated.length,
					totalCount: sorted.length,
					hasMore: hasMore,
					offset: offset
				};
			}
		}
	}

	//Si no hi ha filtres o no tenim dades suficients, anem a l'API
	const queryOptions: RallyQueryOptions = {
		type: 'defect',
		fetch: ['FormattedID', 'Name', 'Description', 'State', 'Severity', 'Priority', 'Owner', 'Project', 'Iteration', 'Blocked', 'Discussion', 'ObjectID', 'ScheduleState'],
		order: 'FormattedID desc' // Order by FormattedID descending for pagination
	};

	// For non-filtered queries (all defects), limit to PAGE_SIZE for pagination
	// For filtered queries (e.g., defects of a user story), fetch all matching results
	if (!isFiltered) {
		queryOptions.limit = PAGE_SIZE;
		if (offset > 0) {
			queryOptions.start = offset + 1;
		}
	}

	// Sempre filtrem per projecte (unless it's a filtered query for specific user story)
	const projectId = await getProjectId();
	queryOptions.query = queryUtils.where('Project', '=', `/project/${projectId}`);

	if (Object.keys(query).length) {
		const defectQueries = Object.keys(query).map(key => {
			if (key === 'Name') {
				return queryUtils.where(key, 'contains', query[key]);
			}
			return queryUtils.where(key, '=', query[key]);
		});

		if (defectQueries.length) {
			if (queryOptions.query) {
				// @ts-expect-error - Rally query builder has and method
				queryOptions.query = queryOptions.query.and(defectQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.and(b)));
			} else {
				queryOptions.query = defectQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.and(b));
			}
		}
	}

	const result = await rallyApi.query(queryOptions);
	const resultData = result as RallyApiResult;

	const results = resultData.Results || resultData.QueryResult?.Results || [];
	if (!results.length) {
		return {
			defects: [],
			source: 'api',
			count: 0,
			hasMore: false
		};
	}

	//Formatem la resposta per ser més llegible (de forma assincròna per no bloquejar)
	const defects: RallyDefect[] = await formatDefectsAsync(results);

	//Afegim els nous defects a rallyData sense duplicats
	if (!rallyData.defects) {
		rallyData.defects = [];
	}

	for (const newDefect of defects) {
		const existingDefectIndex = rallyData.defects.findIndex((existingDefect: RallyDefect) => existingDefect.objectId === newDefect.objectId);

		if (existingDefectIndex === -1) {
			//Defect nou, l'afegim
			rallyData.defects.push(newDefect);
		} else {
			//Defect existent, l'actualitzem
			rallyData.defects[existingDefectIndex] = newDefect;
		}
	}

	// If filtered query (e.g., defects of a user story), return all without pagination
	if (isFiltered) {
		return {
			defects: defects,
			source: 'api',
			count: defects.length,
			hasMore: false
		};
	}

	// Results are already ordered by Rally (FormattedID desc), no need to sort locally for non-filtered queries
	// Determine if there are more results
	// Rally API typically returns pageSize items, and if we got exactly PAGE_SIZE items, there might be more
	const hasMore = results.length === PAGE_SIZE;

	return {
		defects: defects,
		source: 'api',
		count: defects.length,
		totalCount: 0, // We don't know the total until we've fetched all pages
		hasMore: hasMore,
		offset: offset
	};
}

/**
 * Formateia TestCases de forma assincròna en chunks
 * Per a molts items, usa yield per mantenir UI responsiva
 */
async function formatTestCasesAsync(results: any[]): Promise<any[]> {
	const formatted: any[] = [];

	for (let i = 0; i < results.length; i++) {
		const testCase: any = results[i];

		formatted.push({
			objectId: testCase.ObjectID ?? testCase.objectId,
			formattedId: testCase.FormattedID ?? testCase.formattedId,
			name: testCase.Name ?? testCase.name,
			description: sanitizeDescription(testCase.Description ?? testCase.description),
			state: testCase.State ?? testCase.state ?? 'Draft',
			owner: testCase.Owner ? (testCase.Owner._refObjectName ?? testCase.Owner.refObjectName) : testCase.owner ? (testCase.owner._refObjectName ?? testCase.owner.refObjectName) : 'Sense assignat',
			project: testCase.Project ? (testCase.Project._refObjectName ?? testCase.Project.refObjectName) : testCase.project ? (testCase.project._refObjectName ?? testCase.project.refObjectName) : null,
			type: testCase.Type ?? testCase.type ?? 'Functional',
			priority: testCase.Priority ?? testCase.priority ?? 'Unset',
			testFolder: testCase.TestFolder ? (testCase.TestFolder._refObjectName ?? testCase.TestFolder.refObjectName) : testCase.testFolder ? (testCase.testFolder._refObjectName ?? testCase.testFolder.refObjectName) : null
		});

		// Yield to event loop every CHUNK_SIZE items
		if ((i + 1) % CHUNK_SIZE === 0) {
			await yieldToEventLoop();
		}
	}

	return formatted;
}

/**
 * Get test cases for a specific user story
 * Obtains a user story by ID and extracts its related test cases
 */
export async function getUserStoryTests(userStoryId: string) {
	try {
		errorHandler.logDebug(`Getting test cases for user story: ${userStoryId}`, 'rallyServices.getUserStoryTests');

		const rallyApi = getRallyApi();
		const projectId = await getProjectId();

		// Query to get the user story with its test cases expanded
		const queryOptions: RallyQueryOptions = {
			type: 'hierarchicalrequirement',
			fetch: ['ObjectID', 'FormattedID', 'Name', 'TestCases'],
			query: queryUtils.where('ObjectID', '=', userStoryId)
		};

		const result = await rallyApi.query(queryOptions);
		const resultData = result as RallyApiResult;

		const results = resultData.Results || resultData.QueryResult?.Results || [];
		if (!results.length) {
			return {
				testCases: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
		const userStory: any = results[0];

		errorHandler.logDebug(`User story TestCases field: ${JSON.stringify(userStory.TestCases)}`, 'rallyServices.getUserStoryTests');

		if (!userStory.TestCases) {
			return {
				testCases: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// Check if TestCases is just a count object
		// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
		if (userStory.TestCases && typeof userStory.TestCases === 'object' && !Array.isArray(userStory.TestCases) && userStory.TestCases.Count !== undefined && !userStory.TestCases.Results) {
			errorHandler.logDebug(`TestCases is a count object (${userStory.TestCases.Count}), need to query separately`, 'rallyServices.getUserStoryTests');
			// If it's just a count, we need to query test cases directly by WorkProduct
			const testCaseQueryOptions: RallyQueryOptions = {
				type: 'testcase',
				fetch: ['FormattedID', 'Name', 'Description', 'State', 'Owner', 'Project', 'Type', 'Priority', 'TestFolder', 'ObjectID'],
				query: queryUtils.where('WorkProduct.ObjectID', '=', userStoryId)
			};

			const testCaseResult = await rallyApi.query(testCaseQueryOptions);
			const testCaseResultData = testCaseResult as RallyApiResult;
			const testCaseResults = testCaseResultData.Results || testCaseResultData.QueryResult?.Results || [];

			if (!testCaseResults.length) {
				return {
					testCases: [],
					source: 'api',
					count: 0,
					hasMore: false
				};
			}

			const testCases: any[] = await formatTestCasesAsync(testCaseResults);
			return {
				testCases: testCases,
				source: 'api',
				count: testCases.length,
				hasMore: false
			};
		}

		// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
		const testCaseRefs: any[] = (userStory.TestCases as any)?.Results || userStory.TestCases || [];

		if (!Array.isArray(testCaseRefs) || testCaseRefs.length === 0) {
			return {
				testCases: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// Extract test case IDs from the test case references
		const testCaseIds = testCaseRefs
			.map((testCaseRef: any) => {
				// Handle both full objects and references
				if (typeof testCaseRef === 'string') {
					return testCaseRef;
				}
				if (testCaseRef.ObjectID) {
					return testCaseRef.ObjectID;
				}
				if (testCaseRef._ref) {
					// Extract ID from reference like "/testcase/12345"
					const match = testCaseRef._ref.match(/\/testcase\/(.+)/);
					return match ? match[1] : testCaseRef._ref;
				}
				return null;
			})
			.filter(Boolean);

		if (testCaseIds.length === 0) {
			return {
				testCases: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// Build a query to get all the test case details
		// Query each test case by ID
		const testCaseQueries = testCaseIds.map((testCaseId: string) => queryUtils.where('ObjectID', '=', testCaseId));

		const testCaseQueryOptions: RallyQueryOptions = {
			type: 'testcase',
			fetch: ['FormattedID', 'Name', 'Description', 'State', 'Owner', 'Project', 'Type', 'Priority', 'TestFolder', 'ObjectID']
		};

		if (testCaseQueries.length === 1) {
			testCaseQueryOptions.query = testCaseQueries[0];
		} else if (testCaseQueries.length > 1) {
			// @ts-expect-error - Rally query builder has or method
			testCaseQueryOptions.query = testCaseQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.or(b));
		}

		const testCaseResult = await rallyApi.query(testCaseQueryOptions);
		const testCaseResultData = testCaseResult as RallyApiResult;

		const testCaseResults = testCaseResultData.Results || testCaseResultData.QueryResult?.Results || [];
		if (!testCaseResults.length) {
			return {
				testCases: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		//Formatem la resposta per ser més llegible
		const testCases: any[] = await formatTestCasesAsync(testCaseResults);

		return {
			testCases: testCases,
			source: 'api',
			count: testCases.length,
			hasMore: false
		};
	} catch (error) {
		errorHandler.logDebug(`Error getting test cases for user story: ${error instanceof Error ? error.message : String(error)}`, 'rallyServices.getUserStoryTests');
		throw error;
	}
}

/**
 * Get defects for a specific user story
 * Obtains a user story by ID and extracts its related defects
 */
export async function getUserStoryDefects(userStoryId: string) {
	try {
		errorHandler.logDebug(`Getting defects for user story: ${userStoryId}`, 'rallyServices.getUserStoryDefects');

		const rallyApi = getRallyApi();
		const projectId = await getProjectId();

		// Query to get the user story with its defects expanded
		const queryOptions: RallyQueryOptions = {
			type: 'hierarchicalrequirement',
			fetch: ['ObjectID', 'FormattedID', 'Name', 'Defects'],
			query: queryUtils.where('ObjectID', '=', userStoryId)
		};

		const result = await rallyApi.query(queryOptions);
		const resultData = result as RallyApiResult;

		const results = resultData.Results || resultData.QueryResult?.Results || [];
		if (!results.length) {
			return {
				defects: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
		const userStory: any = results[0];

		errorHandler.logDebug(`User story Defects field: ${JSON.stringify(userStory.Defects)}`, 'rallyServices.getUserStoryDefects');

		if (!userStory.Defects) {
			return {
				defects: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// Check if Defects is just a count object
		// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
		if (userStory.Defects && typeof userStory.Defects === 'object' && !Array.isArray(userStory.Defects) && userStory.Defects.Count !== undefined && !userStory.Defects.Results) {
			errorHandler.logDebug(`Defects is a count object (${userStory.Defects.Count}), need to query separately`, 'rallyServices.getUserStoryDefects');
			// If it's just a count, we need to query defects directly by Requirement
			const defectQueryOptions: RallyQueryOptions = {
				type: 'defect',
				fetch: ['FormattedID', 'Name', 'Description', 'State', 'Severity', 'Priority', 'Owner', 'Project', 'Iteration', 'Blocked', 'Discussion', 'ObjectID', 'ScheduleState'],
				query: queryUtils.where('Requirement.ObjectID', '=', userStoryId)
			};

			const defectResult = await rallyApi.query(defectQueryOptions);
			const defectResultData = defectResult as RallyApiResult;
			const defectResults = defectResultData.Results || defectResultData.QueryResult?.Results || [];

			if (!defectResults.length) {
				return {
					defects: [],
					source: 'api',
					count: 0,
					hasMore: false
				};
			}

			const defects: RallyDefect[] = await formatDefectsAsync(defectResults);
			return {
				defects: defects,
				source: 'api',
				count: defects.length,
				hasMore: false
			};
		}

		// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
		const defectRefs: any[] = (userStory.Defects as any)?.Results || userStory.Defects || [];

		if (!Array.isArray(defectRefs) || defectRefs.length === 0) {
			return {
				defects: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// Extract defect IDs from the defect references
		const defectIds = defectRefs
			.map((defectRef: any) => {
				// Handle both full objects and references
				if (typeof defectRef === 'string') {
					return defectRef;
				}
				if (defectRef.ObjectID) {
					return defectRef.ObjectID;
				}
				if (defectRef._ref) {
					// Extract ID from reference like "/defect/12345"
					const match = defectRef._ref.match(/\/defect\/(.+)/);
					return match ? match[1] : defectRef._ref;
				}
				return null;
			})
			.filter(Boolean);

		if (defectIds.length === 0) {
			return {
				defects: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// Build a query to get all the defect details
		// Query each defect by ID
		const defectQueries = defectIds.map((defectId: string) => queryUtils.where('ObjectID', '=', defectId));

		const defectQueryOptions: RallyQueryOptions = {
			type: 'defect',
			fetch: ['FormattedID', 'Name', 'Description', 'State', 'Severity', 'Priority', 'Owner', 'Project', 'Iteration', 'Blocked', 'Discussion', 'ObjectID', 'ScheduleState']
		};

		if (defectQueries.length === 1) {
			defectQueryOptions.query = defectQueries[0];
		} else if (defectQueries.length > 1) {
			// @ts-expect-error - Rally query builder has or method
			defectQueryOptions.query = defectQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.or(b));
		}

		const defectResult = await rallyApi.query(defectQueryOptions);
		const defectResultData = defectResult as RallyApiResult;

		const defectResults = defectResultData.Results || defectResultData.QueryResult?.Results || [];
		if (!defectResults.length) {
			return {
				defects: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		//Formatem la resposta per ser més llegible
		const defects: RallyDefect[] = await formatDefectsAsync(defectResults);

		return {
			defects: defects,
			source: 'api',
			count: defects.length,
			hasMore: false
		};
	} catch (error) {
		errorHandler.logDebug(`Error getting defects for user story: ${error instanceof Error ? error.message : String(error)}`, 'rallyServices.getUserStoryDefects');
		throw error;
	}
}

/**
 * Formateia Discussions de forma assincròna en chunks
 * Per a molts items, usa yield per mantenir UI responsiva
 */
async function formatDiscussionsAsync(results: any[], userStoryId: string): Promise<any[]> {
	const formatted: any[] = [];

	for (let i = 0; i < results.length; i++) {
		const discussion: any = results[i];

		// DEBUG: Log the entire discussion object
		errorHandler.logDebug(`Discussion ${i} raw data: ${JSON.stringify(discussion, null, 2)}`, 'formatDiscussionsAsync');

		// Extract author name from various possible fields
		let authorName = 'Unknown';
		const author = discussion.Author ?? discussion.author;
		errorHandler.logDebug(`Author object: ${JSON.stringify(author, null, 2)}`, 'formatDiscussionsAsync');
		if (author) {
			authorName = author.DisplayName ?? author.displayName ?? author.Name ?? author.name ?? author.UserName ?? author.userName ?? author._refObjectName ?? author.refObjectName ?? 'Unknown';
		}
		errorHandler.logDebug(`Extracted author name: ${authorName}`, 'formatDiscussionsAsync');

		formatted.push({
			objectId: discussion.ObjectID ?? discussion.objectId,
			text: sanitizeDescription(discussion.Text ?? discussion.text ?? ''),
			author: authorName,
			createdDate: discussion.CreationDate ?? discussion.creationDate ?? discussion.CreatedDate ?? discussion.createdDate ?? '',
			userStoryId: userStoryId
		});

		// Yield to event loop every CHUNK_SIZE items
		if ((i + 1) % CHUNK_SIZE === 0) {
			await yieldToEventLoop();
		}
	}

	return formatted;
}

/**
 * Get discussions for a specific user story
 * Obtains a user story by ID and extracts its related discussions
 */
export async function getUserStoryDiscussions(userStoryId: string) {
	try {
		errorHandler.logDebug(`Getting discussions for user story: ${userStoryId}`, 'rallyServices.getUserStoryDiscussions');

		const rallyApi = getRallyApi();
		const projectId = await getProjectId();

		// Query to get the user story with its discussions expanded
		const queryOptions: RallyQueryOptions = {
			type: 'hierarchicalrequirement',
			fetch: ['ObjectID', 'FormattedID', 'Name', 'Discussion'],
			query: queryUtils.where('ObjectID', '=', userStoryId)
		};

		const result = await rallyApi.query(queryOptions);
		const resultData = result as RallyApiResult;

		const results = resultData.Results || resultData.QueryResult?.Results || [];
		if (!results.length) {
			return {
				discussions: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
		const userStory: any = results[0];

		errorHandler.logDebug(`User story Discussion field: ${JSON.stringify(userStory.Discussion)}`, 'rallyServices.getUserStoryDiscussions');

		// Check if Discussion is just a count object or if we need to query separately
		// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
		if (!userStory.Discussion || (userStory.Discussion && typeof userStory.Discussion === 'object' && !Array.isArray(userStory.Discussion) && userStory.Discussion.Count !== undefined && !userStory.Discussion.Results)) {
			errorHandler.logDebug(`Discussion is a count object or missing, querying ConversationPost directly`, 'rallyServices.getUserStoryDiscussions');
			// If it's just a count or missing, we need to query conversation posts directly by Artifact
			const discussionQueryOptions: RallyQueryOptions = {
				type: 'conversationpost',
				fetch: ['ObjectID', 'Text', 'Author', 'Author.DisplayName', 'Author.Name', 'Author.UserName', 'CreationDate', 'CreatedDate'],
				query: queryUtils.where('Artifact.ObjectID', '=', userStoryId)
			};

			const discussionResult = await rallyApi.query(discussionQueryOptions);
			const discussionResultData = discussionResult as RallyApiResult;
			const discussionResults = discussionResultData.Results || discussionResultData.QueryResult?.Results || [];

			if (!discussionResults.length) {
				return {
					discussions: [],
					source: 'api',
					count: 0,
					hasMore: false
				};
			}

			const discussions: any[] = await formatDiscussionsAsync(discussionResults, userStoryId);
			return {
				discussions: discussions,
				source: 'api',
				count: discussions.length,
				hasMore: false
			};
		}

		// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
		const discussionRefs: any[] = (userStory.Discussion as any)?.Results || userStory.Discussion || [];

		if (!Array.isArray(discussionRefs) || discussionRefs.length === 0) {
			return {
				discussions: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// Extract discussion IDs from the discussion references
		const discussionIds = discussionRefs
			.map((discussionRef: any) => {
				// Handle both full objects and references
				if (typeof discussionRef === 'string') {
					return discussionRef;
				}
				if (discussionRef.ObjectID) {
					return discussionRef.ObjectID;
				}
				if (discussionRef._ref) {
					// Extract ID from reference like "/conversationpost/12345"
					const match = discussionRef._ref.match(/\/(conversationpost|discussion)\/(.+)/);
					return match ? match[2] : discussionRef._ref;
				}
				return null;
			})
			.filter(Boolean);

		if (discussionIds.length === 0) {
			return {
				discussions: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// Build a query to get all the discussion details
		// Query each discussion by ID
		const discussionQueries = discussionIds.map((discussionId: string) => queryUtils.where('ObjectID', '=', discussionId));

		const discussionQueryOptions: RallyQueryOptions = {
			type: 'conversationpost',
			fetch: ['ObjectID', 'Text', 'Author', 'Author.DisplayName', 'Author.Name', 'Author.UserName', 'CreationDate', 'CreatedDate']
		};

		if (discussionQueries.length === 1) {
			discussionQueryOptions.query = discussionQueries[0];
		} else if (discussionQueries.length > 1) {
			// @ts-expect-error - Rally query builder has or method
			discussionQueryOptions.query = discussionQueries.reduce((a: RallyQueryBuilder, b: RallyQueryBuilder) => a.or(b));
		}

		const discussionResult = await rallyApi.query(discussionQueryOptions);
		const discussionResultData = discussionResult as RallyApiResult;

		const discussionResults = discussionResultData.Results || discussionResultData.QueryResult?.Results || [];
		if (!discussionResults.length) {
			return {
				discussions: [],
				source: 'api',
				count: 0,
				hasMore: false
			};
		}

		// Formatem la resposta per ser més llegible
		const discussions: any[] = await formatDiscussionsAsync(discussionResults, userStoryId);

		return {
			discussions: discussions,
			source: 'api',
			count: discussions.length,
			hasMore: false
		};
	} catch (error) {
		errorHandler.logDebug(`Error getting discussions for user story: ${error instanceof Error ? error.message : String(error)}`, 'rallyServices.getUserStoryDiscussions');
		throw error;
	}
}

/**
 * Get unique team members from the last N iterations
 * Returns a list of unique assignees from user stories in recent sprints
 */
export async function getRecentTeamMembers(numberOfIterations: number = 6) {
	try {
		errorHandler.logInfo(`Getting team members from last ${numberOfIterations} iterations`, 'rallyServices.getRecentTeamMembers');

		// Get all iterations for the project
		const iterationsResult = await getIterations();
		const iterations = iterationsResult.iterations;

		if (!iterations || iterations.length === 0) {
			errorHandler.logInfo('No iterations found', 'rallyServices.getRecentTeamMembers');
			return {
				teamMembers: [],
				source: 'api',
				count: 0
			};
		}

		errorHandler.logInfo(`Total iterations available: ${iterations.length}`, 'rallyServices.getRecentTeamMembers');

		// Filter only past or current iterations (endDate <= today)
		const today = new Date();
		today.setHours(23, 59, 59, 999); // End of today

		const pastIterations = iterations.filter(iteration => {
			const endDate = new Date(iteration.endDate);
			return endDate <= today;
		});

		errorHandler.logInfo(`Past/current iterations: ${pastIterations.length}`, 'rallyServices.getRecentTeamMembers');

		// Sort iterations by end date (most recent first) and take the last N
		const sortedIterations = [...pastIterations].sort((a, b) => {
			const dateA = new Date(a.endDate).getTime();
			const dateB = new Date(b.endDate).getTime();
			return dateB - dateA; // Descending order (most recent first)
		});

		const recentIterations = sortedIterations.slice(0, numberOfIterations);
		errorHandler.logInfo(`Found ${recentIterations.length} recent iterations: ${recentIterations.map(i => i.name).join(', ')}`, 'rallyServices.getRecentTeamMembers');

		// Collect unique assignees from user stories in these iterations
		const assigneeSet = new Set<string>();

		for (const iteration of recentIterations) {
			errorHandler.logInfo(`Processing iteration: ${iteration.name} (${iteration.objectId})`, 'rallyServices.getRecentTeamMembers');

			// Get user stories for this iteration using the iteration reference
			const iterationRef = `/iteration/${iteration.objectId}`;
			errorHandler.logInfo(`Querying user stories with iteration ref: ${iterationRef}`, 'rallyServices.getRecentTeamMembers');

			const userStoriesResult = await getUserStories({ Iteration: iterationRef });
			const userStories = userStoriesResult.userStories;

			errorHandler.logInfo(`Found ${userStories?.length || 0} user stories in iteration ${iteration.name}`, 'rallyServices.getRecentTeamMembers');

			if (userStories && userStories.length > 0) {
				// Log first user story as sample
				if (userStories.length > 0) {
					const sample = userStories[0];
					errorHandler.logInfo(`Sample user story: ${sample.formattedId}, assignee="${sample.assignee}"`, 'rallyServices.getRecentTeamMembers');
				}

				for (const userStory of userStories) {
					// Add assignee if it exists and is not "Unassigned"
					if (userStory.assignee && userStory.assignee !== 'Unassigned') {
						assigneeSet.add(userStory.assignee);
						errorHandler.logInfo(`Added assignee: ${userStory.assignee} (from ${userStory.formattedId})`, 'rallyServices.getRecentTeamMembers');
					}
				}
			}
		}

		// Convert Set to Array
		const teamMembers = Array.from(assigneeSet).sort();

		errorHandler.logInfo(`Found ${teamMembers.length} unique team members: ${teamMembers.join(', ') || 'none'}`, 'rallyServices.getRecentTeamMembers');

		return {
			teamMembers: teamMembers,
			source: 'api',
			count: teamMembers.length
		};
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'rallyServices.getRecentTeamMembers');
		return {
			teamMembers: [],
			source: 'api',
			count: 0
		};
	}
}

/**
 * Get progress information for a specific user in the current sprint
 * @param userName - The name of the user (assignee)
 * @param iterationId - Optional iteration objectId. If not provided, uses current iteration
 * @returns Object with completedHours, totalHours, and percentage
 */
export async function getUserSprintProgress(userName: string, iterationId?: string) {
	try {
		errorHandler.logInfo(`Getting sprint progress for user: ${userName}${iterationId ? ` in iteration ${iterationId}` : ' in current iteration'}`, 'rallyServices.getUserSprintProgress');

		// Get all iterations
		const iterationsResult = await getIterations();
		const iterations = iterationsResult.iterations;

		if (!iterations || iterations.length === 0) {
			errorHandler.logInfo('No iterations found', 'rallyServices.getUserSprintProgress');
			return {
				completedHours: 0,
				totalHours: 0,
				percentage: 0,
				source: 'api'
			};
		}

		let targetIteration;

		if (iterationId && iterationId !== 'current') {
			// Find specific iteration by objectId
			targetIteration = iterations.find(iteration => iteration.objectId === iterationId);
		} else {
			// Find current iteration (today is between startDate and endDate)
			const today = new Date();
			targetIteration = iterations.find(iteration => {
				const startDate = new Date(iteration.startDate);
				const endDate = new Date(iteration.endDate);
				return today >= startDate && today <= endDate;
			});
		}

		if (!targetIteration) {
			errorHandler.logInfo('No target iteration found', 'rallyServices.getUserSprintProgress');
			return {
				completedHours: 0,
				totalHours: 0,
				percentage: 0,
				source: 'api'
			};
		}

		errorHandler.logInfo(`Target iteration: ${targetIteration.name} (${targetIteration.objectId})`, 'rallyServices.getUserSprintProgress');

		// Get user stories for target iteration assigned to this user
		const iterationRef = `/iteration/${targetIteration.objectId}`;
		const userStoriesResult = await getUserStories({ Iteration: iterationRef });
		const allUserStories = userStoriesResult.userStories;

		// Filter by assignee
		const userStories = allUserStories.filter(story => story.assignee === userName);

		errorHandler.logInfo(`Found ${userStories.length} user stories assigned to ${userName} in ${targetIteration.name}`, 'rallyServices.getUserSprintProgress');

		if (userStories.length === 0) {
			return {
				completedHours: 0,
				totalHours: 0,
				percentage: 0,
				source: 'api'
			};
		}

		let completedHours = 0;
		let totalHours = 0;

		// Process each user story
		for (const story of userStories) {
			const storyHours = story.taskEstimateTotal || 0;
			totalHours += storyHours;

			// Check if story is completed
			const isCompleted = story.scheduleState === 'Completed' || story.scheduleState === 'Accepted';

			if (isCompleted) {
				// All hours count as completed
				completedHours += storyHours;
				errorHandler.logDebug(`Story ${story.formattedId} is completed, adding ${storyHours} hours`, 'rallyServices.getUserSprintProgress');
			} else {
				// Check tasks to see which hours are completed
				const tasksResult = await getTasks(story.objectId);
				const tasks = tasksResult.tasks;

				if (tasks && tasks.length > 0) {
					for (const task of tasks) {
						// Task is completed if state is 'Completed'
						if (task.state === 'Completed') {
							const taskHours = task.estimate || 0;
							completedHours += taskHours;
							errorHandler.logDebug(`Task ${task.formattedId} is completed, adding ${taskHours} hours`, 'rallyServices.getUserSprintProgress');
						}
					}
				}
			}
		}

		const percentage = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

		errorHandler.logInfo(`User ${userName} progress: ${completedHours}/${totalHours} hours (${percentage}%)`, 'rallyServices.getUserSprintProgress');

		return {
			completedHours,
			totalHours,
			percentage,
			source: 'api'
		};
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'rallyServices.getUserSprintProgress');
		return {
			completedHours: 0,
			totalHours: 0,
			percentage: 0,
			source: 'error'
		};
	}
}

/**
 * Get progress for all team members in a sprint efficiently
 * Optimized to fetch all data in minimal queries and process in memory
 * 
 * @param teamMembers Array of team member names
 * @param iterationId Optional iteration ID (uses current if not provided)
 * @returns Map of member name to progress data
 */
export async function getAllTeamMembersProgress(
	teamMembers: string[],
	iterationId?: string
): Promise<Map<string, { completedHours: number; totalHours: number; percentage: number; source: string }>> {
	const progressMap = new Map<string, { completedHours: number; totalHours: number; percentage: number; source: string }>();

	try {
		errorHandler.logInfo(`Getting progress for ${teamMembers.length} team members in sprint`, 'rallyServices.getAllTeamMembersProgress');

		// Step 1: Get iterations
		const iterationsResult = await getIterations();
		const iterations = iterationsResult.iterations;

		if (!iterations || iterations.length === 0) {
			errorHandler.logInfo('No iterations found', 'rallyServices.getAllTeamMembersProgress');
			// Return empty progress for all members
			for (const member of teamMembers) {
				progressMap.set(member, { completedHours: 0, totalHours: 0, percentage: 0, source: 'no-iterations' });
			}
			return progressMap;
		}

		// Step 2: Find target iteration
		let targetIteration;
		if (iterationId && iterationId !== 'current') {
			targetIteration = iterations.find(iteration => iteration.objectId === iterationId);
		} else {
			const today = new Date();
			targetIteration = iterations.find(iteration => {
				const startDate = new Date(iteration.startDate);
				const endDate = new Date(iteration.endDate);
				return today >= startDate && today <= endDate;
			});
		}

		if (!targetIteration) {
			errorHandler.logInfo('No target iteration found', 'rallyServices.getAllTeamMembersProgress');
			// Return empty progress for all members
			for (const member of teamMembers) {
				progressMap.set(member, { completedHours: 0, totalHours: 0, percentage: 0, source: 'no-iteration' });
			}
			return progressMap;
		}

		errorHandler.logInfo(`Target iteration: ${targetIteration.name}`, 'rallyServices.getAllTeamMembersProgress');

		// Step 3: Get ALL user stories for the iteration in ONE query
		const iterationRef = `/iteration/${targetIteration.objectId}`;
		const userStoriesResult = await getUserStories({ Iteration: iterationRef });
		const allUserStories = userStoriesResult.userStories;

		errorHandler.logInfo(`Found ${allUserStories.length} total user stories in iteration`, 'rallyServices.getAllTeamMembersProgress');

		// Step 4: Group user stories by assignee
		const storiesByUser = new Map<string, typeof allUserStories>();
		for (const story of allUserStories) {
			if (story.assignee) {
				if (!storiesByUser.has(story.assignee)) {
					storiesByUser.set(story.assignee, []);
				}
				storiesByUser.get(story.assignee)!.push(story);
			}
		}

		// Step 5: Get all incomplete story IDs for batch task fetching
		const incompleteStoryIds: string[] = [];
		for (const story of allUserStories) {
			const isCompleted = story.scheduleState === 'Completed' || story.scheduleState === 'Accepted';
			if (!isCompleted && story.assignee && teamMembers.includes(story.assignee)) {
				incompleteStoryIds.push(story.objectId);
			}
		}

		errorHandler.logInfo(`Found ${incompleteStoryIds.length} incomplete stories needing task data`, 'rallyServices.getAllTeamMembersProgress');

		// Step 6: Fetch all tasks for incomplete stories in ONE optimized query
		// Group tasks by user story
		const tasksByStory = new Map<string, any[]>();
		
		if (incompleteStoryIds.length > 0) {
			// Rally API: fetch tasks where WorkProduct is in the list of story IDs
			// We'll batch this into smaller chunks to avoid query length limits
			const BATCH_SIZE = 50;
			for (let i = 0; i < incompleteStoryIds.length; i += BATCH_SIZE) {
				const batch = incompleteStoryIds.slice(i, i + BATCH_SIZE);
				for (const storyId of batch) {
					const tasksResult = await getTasks(storyId);
					if (tasksResult.tasks && tasksResult.tasks.length > 0) {
						tasksByStory.set(storyId, tasksResult.tasks);
					}
				}
			}
			errorHandler.logInfo(`Fetched tasks for ${tasksByStory.size} stories`, 'rallyServices.getAllTeamMembersProgress');
		}

		// Step 7: Calculate progress for each team member in memory
		for (const memberName of teamMembers) {
			const userStories = storiesByUser.get(memberName) || [];
			
			if (userStories.length === 0) {
				progressMap.set(memberName, { completedHours: 0, totalHours: 0, percentage: 0, source: 'no-stories' });
				continue;
			}

			let completedHours = 0;
			let totalHours = 0;

			for (const story of userStories) {
				const storyHours = story.taskEstimateTotal || 0;
				totalHours += storyHours;

				const isCompleted = story.scheduleState === 'Completed' || story.scheduleState === 'Accepted';

				if (isCompleted) {
					// All hours count as completed
					completedHours += storyHours;
				} else {
					// Check tasks for this story
					const tasks = tasksByStory.get(story.objectId) || [];
					for (const task of tasks) {
						if (task.state === 'Completed') {
							completedHours += task.estimate || 0;
						}
					}
				}
			}

			const percentage = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
			progressMap.set(memberName, {
				completedHours,
				totalHours,
				percentage,
				source: 'api'
			});

			errorHandler.logDebug(`${memberName}: ${completedHours}/${totalHours}h (${percentage}%)`, 'rallyServices.getAllTeamMembersProgress');
		}

		errorHandler.logInfo(`Successfully calculated progress for ${progressMap.size} team members`, 'rallyServices.getAllTeamMembersProgress');
		return progressMap;

	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'rallyServices.getAllTeamMembersProgress');
		// Return empty progress for all members on error
		for (const member of teamMembers) {
			progressMap.set(member, { completedHours: 0, totalHours: 0, percentage: 0, source: 'error' });
		}
		return progressMap;
	}
}

/**
 * Clear all Rally service caches
 * Called when extension needs to reload/reset all data
 */
export function clearAllRallyCaches(): void {
	try {
		getUserStoriesCacheManager().clear();
		getProjectsCacheManager().clear();
		getIterationsCacheManager().clear();
		errorHandler.logInfo('All Rally caches cleared', 'rallyServices.clearAllRallyCaches');
	} catch (error) {
		errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'rallyServices.clearAllRallyCaches');
	}
}
