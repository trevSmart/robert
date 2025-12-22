import { rallyData } from '../../extension.js';
import type { RallyApiObject, RallyApiResult, RallyProject, RallyQuery, RallyQueryBuilder, RallyQueryOptions, RallyUser, RallyUserStory } from '../../types/rally';
import { getRallyApi, queryUtils, validateRallyConfiguration } from './utils';

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
		objectId: project.objectId,
		name: project.name,
		description: typeof project.description === 'string' ? project.description.replace(/<[^>]*>/g, '') : project.description,
		state: project.state,
		creationDate: project.creationDate,
		lastUpdateDate: project.lastUpdateDate,
		owner: project.owner ? project.owner.refObjectName : 'Sense propietari',
		parent: project.parent ? project.parent.refObjectName : null,
		childrenCount: project.children ? project.children.count : 0
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
		objectId: user?.objectId,
		userName: user?.userName,
		displayName: user?.displayName,
		emailAddress: user?.emailAddress,
		firstName: user?.firstName,
		lastName: user?.lastName,
		disabled: user?.disabled,
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
		objectId: userStory.objectId,
		formattedId: userStory.formattedId,
		name: userStory.name,
		description: sanitizeDescription(userStory.description),
		state: userStory.state,
		planEstimate: userStory.planEstimate,
		toDo: userStory.toDo,
		owner: userStory.owner ? userStory.owner.refObjectName : 'Sense propietari',
		project: userStory.project ? userStory.project.refObjectName : null,
		iteration: userStory.iteration ? userStory.iteration.refObjectName : null,
		blocked: userStory.blocked,
		taskEstimateTotal: userStory.taskEstimateTotal,
		taskStatus: userStory.taskStatus,
		tasksCount: userStory.tasks ? userStory.tasks.count : 0,
		testCasesCount: userStory.testCases ? userStory.testCases.count : 0,
		defectsCount: userStory.defects ? userStory.defects.count : 0,
		discussionCount: userStory.discussion ? userStory.discussion.count : 0,
		appgar: userStory.appgar
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
		fetch: ['FormattedID', 'Name', 'Description', 'Iteration', 'Blocked', 'TaskEstimateTotal', 'ToDo', 'Owner', 'State', 'PlanEstimate', 'TaskStatus', 'Tasks', 'TestCases', 'Defects', 'Discussion', 'ObjectID', 'c_Appgar']
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

export async function getUserStories(query: RallyQuery = {}, limit: number | null = null) {
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
