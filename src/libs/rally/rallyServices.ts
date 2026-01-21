import { rallyData } from '../../extension.js';
import type { RallyApiObject, RallyApiResult, RallyProject, RallyQuery, RallyQueryBuilder, RallyQueryOptions, RallyUser, RallyUserStory, RallyIteration } from '../../types/rally';
import { getRallyApi, queryUtils, validateRallyConfiguration, getProjectId } from './utils';
import { ErrorHandler } from '../../ErrorHandler';
import { SettingsManager } from '../../SettingsManager';

function escapeHtml(input: string): string {
	return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function getProjects(query: Record<string, unknown> = {}, limit: number | null = null) {
	// Validem la configuració de Rally abans de fer la crida
	const validation = await validateRallyConfiguration();
	if (!validation.isValid) {
		throw new Error(`Rally configuration error: ${validation.errors.join(', ')}`);
	}

	const rallyApi = getRallyApi();

	//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
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

	if (!resultData.Results.length) {
		return {
			projects: [],
			source: 'api',
			count: 0
		};
	}

	//Formatem la resposta per ser més llegible
	const projects: RallyProject[] = resultData.Results.map((project: RallyApiObject) => ({
		objectId: project.ObjectID ?? project.objectId,
		name: project.Name ?? project.name,
		description: typeof (project.Description ?? project.description) === 'string' ? escapeHtml(String(project.Description ?? project.description)) : (project.Description ?? project.description),
		state: project.State ?? project.state,
		creationDate: project.CreationDate ?? project.creationDate,
		lastUpdateDate: project.LastUpdateDate ?? project.lastUpdateDate,
		owner: project.Owner ? (project.Owner._refObjectName ?? project.Owner.refObjectName) : project.owner ? (project.owner._refObjectName ?? project.owner.refObjectName) : 'Sense propietari',
		parent: project.Parent ? (project.Parent._refObjectName ?? project.Parent.refObjectName) : project.parent ? (project.parent._refObjectName ?? project.parent.refObjectName) : null,
		childrenCount: project.Children?.Count ?? project.children?.count ?? 0
	}));

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

	return {
		projects: projects,
		source: 'api',
		count: projects.length
	};
}

export async function getCurrentUser() {
	const errorHandler = ErrorHandler.getInstance();

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

		if (resultData.Results && resultData.Results.length > 0) {
			const user = resultData.Results[0];
			errorHandler.logInfo(`User data retrieved successfully. DisplayName: ${user.DisplayName || user.displayName || 'N/A'}, UserName: ${user.UserName || user.userName || 'N/A'}`, 'getCurrentUser');

			const userData = {
				objectId: user.ObjectID ?? user.objectId,
				userName: user.UserName ?? user.userName,
				displayName: user.DisplayName ?? user.displayName,
				emailAddress: user.EmailAddress ?? user.emailAddress,
				firstName: user.FirstName ?? user.firstName,
				lastName: user.LastName ?? user.lastName,
				disabled: user.Disabled ?? user.disabled,
				_ref: user._ref
			};

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

export async function getUsers(query: RallyQuery = {}, limit: number | null = null) {
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

	if (!resultData.Results || resultData.Results.length === 0) {
		return {
			users: [],
			source: 'api',
			count: 0
		};
	}

	const users: RallyUser[] = resultData.Results.map((user: RallyApiObject) => ({
		objectId: user?.ObjectID ?? user?.objectId,
		userName: user?.UserName ?? user?.userName,
		displayName: user?.DisplayName ?? user?.displayName,
		emailAddress: user?.EmailAddress ?? user?.emailAddress,
		firstName: user?.FirstName ?? user?.firstName,
		lastName: user?.LastName ?? user?.lastName,
		disabled: user?.Disabled ?? user?.disabled,
		_ref: user?._ref
	}));

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
function buildUserStoryQuery(query: RallyQuery) {
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

// Helper function to format user stories
function formatUserStories(result: RallyApiResult): RallyUserStory[] {
	// biome-ignore lint/suspicious/noExplicitAny: Rally API has dynamic structure
	return result.Results.map((userStory: any) => ({
		objectId: userStory.ObjectID ?? userStory.objectId,
		formattedId: userStory.FormattedID ?? userStory.formattedId,
		name: userStory.Name ?? userStory.name,
		description: sanitizeDescription(userStory.Description ?? userStory.description),
		state: userStory.State ?? userStory.state,
		planEstimate: userStory.PlanEstimate ?? userStory.planEstimate,
		toDo: userStory.ToDo ?? userStory.toDo,
		assignee: userStory.c_Assignee ? (userStory.c_Assignee._refObjectName ?? userStory.c_Assignee.refObjectName) : userStory.c_assignee ? (userStory.c_assignee._refObjectName ?? userStory.c_assignee.refObjectName) : 'Sense assignat',
		project: userStory.Project ? (userStory.Project._refObjectName ?? userStory.Project.refObjectName) : userStory.project ? (userStory.project._refObjectName ?? userStory.project.refObjectName) : null,
		iteration: userStory.Iteration ? (userStory.Iteration._refObjectName ?? userStory.Iteration.refObjectName) : userStory.iteration ? (userStory.iteration._refObjectName ?? userStory.iteration.refObjectName) : null,
		blocked: userStory.Blocked ?? userStory.blocked,
		taskEstimateTotal: userStory.TaskEstimateTotal ?? userStory.taskEstimateTotal,
		taskStatus: userStory.TaskStatus ?? userStory.taskStatus,
		tasksCount: userStory.Tasks?.Count ?? userStory.tasks?.count ?? 0,
		testCasesCount: userStory.TestCases?.Count ?? userStory.testCases?.count ?? 0,
		defectsCount: userStory.Defects?.Count ?? userStory.defects?.count ?? 0,
		discussionCount: userStory.Discussion?.Count ?? userStory.discussion?.count ?? 0,
		appgar: userStory.c_Appgar ?? userStory.appgar,
		scheduleState: userStory.ScheduleState ?? userStory.scheduleState
	}));
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
function buildUserStoryQueryOptions(query: RallyQuery, limit: number | null) {
	const queryOptions: RallyQueryOptions = {
		type: 'hierarchicalrequirement',
		fetch: ['FormattedID', 'Name', 'Description', 'Iteration', 'Blocked', 'TaskEstimateTotal', 'ToDo', 'c_Assignee', 'State', 'PlanEstimate', 'TaskStatus', 'Tasks', 'TestCases', 'Defects', 'Discussion', 'ObjectID', 'c_Appgar', 'ScheduleState']
	};

	if (limit) {
		queryOptions.limit = limit;
	}

	if (Object.keys(query).length) {
		const queryQuery = buildUserStoryQuery(query);
		if (queryQuery) {
			queryOptions.query = queryQuery;
		}
	}

	return queryOptions;
}

// Helper function to handle default project logic
function handleDefaultProject(query: RallyQuery, queryOptions: RallyQueryOptions) {
	if (!query?.Project) {
		if (rallyData.defaultProject?.objectId) {
			const defaultProjectQuery = queryUtils.where('Project', '=', `/project/${rallyData.defaultProject.objectId}`);

			if (queryOptions.query) {
				// biome-ignore lint/suspicious/noExplicitAny: Rally query builder method
				(queryOptions.query as any).and(defaultProjectQuery);
			} else {
				queryOptions.query = defaultProjectQuery;
			}
		}
	}
}

export async function getIterations(query: RallyQuery = {}, limit: number | null = null) {
	// eslint-disable-next-line no-console
	console.log('[Robert] 📅 getIterations called with query:', query, 'limit:', limit);

	const rallyApi = getRallyApi();

	//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
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

	if (!resultData.Results || resultData.Results.length === 0) {
		return {
			iterations: [],
			source: 'api',
			count: 0
		};
	}

	// DEBUG: Show all available fields for the first iteration
	if (resultData.Results && resultData.Results.length > 0) {
		const firstIteration = resultData.Results[0];
		console.log('[Robert] 🔍 All available fields for iteration:', JSON.stringify(firstIteration, null, 2));

		// Check for date-related fields
		const dateFields = Object.keys(firstIteration).filter(key => key.toLowerCase().includes('date') || key.toLowerCase().includes('time') || key.toLowerCase().includes('created') || key.toLowerCase().includes('updated'));
		console.log('[Robert] 📅 Date-related fields found:', dateFields);
		dateFields.forEach(field => {
			console.log(`[Robert]   ${field}: ${(firstIteration as any)[field]}`);
		});
	}

	//Formatem la resposta
	const iterations = resultData.Results.map((iteration: any) => ({
		objectId: iteration.ObjectID ?? iteration.objectId,
		name: iteration.Name ?? iteration.name,
		startDate: iteration.StartDate ?? iteration.startDate,
		endDate: iteration.EndDate ?? iteration.endDate,
		state: iteration.State ?? iteration.state,
		project: iteration.Project ? (iteration.Project._refObjectName ?? iteration.Project.refObjectName) : iteration.project ? (iteration.project._refObjectName ?? iteration.project.refObjectName) : null,
		_ref: iteration._ref
	}));

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

	return {
		iterations: iterations,
		source: 'api',
		count: iterations.length
	};
}

export async function getUserStories(query: RallyQuery = {}, limit: number | null = null) {
	// eslint-disable-next-line no-console
	console.log('[Robert] 📋 getUserStories called with query:', query, 'limit:', limit);

	const rallyApi = getRallyApi();

	//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
	const cacheResult = checkCacheForFilteredResults(query, rallyData.userStories);
	if (cacheResult) {
		return {
			userStories: cacheResult.results,
			source: cacheResult.source,
			count: cacheResult.count
		};
	}

	//Si no hi ha filtres (demandem totes les user stories) o no tenim dades suficients,
	//hem d'anar a l'API per obtenir la llista completa

	const queryOptions = buildUserStoryQueryOptions(query, limit);
	handleDefaultProject(query, queryOptions);

	const result = await rallyApi.query(queryOptions);
	const resultData = result as RallyApiResult;

	if (!resultData.Results.length) {
		return {
			userStories: [],
			source: 'api',
			count: 0
		};
	}

	//Formatem la resposta per ser més llegible
	const userStories = formatUserStories(resultData);

	//Afegim les noves user stories a rallyData sense duplicats
	addToCache(userStories, rallyData.userStories, 'objectId');

	return {
		userStories: userStories,
		source: 'api',
		count: userStories.length
	};
}

export async function getTasks(userStoryId: string, query: RallyQuery = {}, limit: number | null = null) {
	// eslint-disable-next-line no-console
	console.log('[Robert] 📋 getTasks called for user story:', userStoryId, 'with query:', query, 'limit:', limit);

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

	// Query per trobar tasks d'aquesta user story
	const rallyQueries = [queryUtils.where('WorkProduct', '=', `/hierarchicalrequirement/${userStoryId}`)];

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

	if (!resultData.Results.length) {
		return {
			tasks: [],
			source: 'api',
			count: 0
		};
	}

	//Formatem la resposta per ser més llegible
	const tasks = resultData.Results.map((task: any) => ({
		objectId: task.ObjectID ?? task.objectId,
		formattedId: task.FormattedID ?? task.formattedId,
		name: task.Name ?? task.name,
		description: sanitizeDescription(task.Description ?? task.description),
		state: task.State ?? task.state,
		owner: task.Owner ? (task.Owner._refObjectName ?? task.Owner.refObjectName) : task.owner ? (task.owner._refObjectName ?? task.owner.refObjectName) : 'Sense propietari',
		estimate: task.Estimate ?? task.estimate,
		toDo: task.ToDo ?? task.toDo,
		timeSpent: task.TimeSpent ?? task.timeSpent,
		workItem: task.WorkProduct ? (task.WorkProduct._refObjectName ?? task.WorkProduct.refObjectName) : task.workProduct ? (task.workProduct._refObjectName ?? task.workProduct.refObjectName) : null,
		rank: task.Rank ?? task.rank ?? 0
	}));

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
