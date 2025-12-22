import { rallyData } from '../../extension.js';
import { getRallyApi, queryUtils } from './utils.js';
import striptags from 'striptags';

export async function getProjects(query = {}, limit = null) {
	const rallyApi = getRallyApi();

	//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
	if (Object.keys(query).length && rallyData.projects.length) {
		const filteredProjects = rallyData.projects.filter((project) =>
			Object.keys(query).every((key) => {
				if (project[key] === undefined) {
					return false;
				}
				return project[key] === query[key];
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

	const queryOptions = {
		type: 'project',
		fetch: ['ObjectID', 'Name', 'Description', 'State', 'CreationDate', 'LastUpdateDate', 'Owner', 'Parent', 'Children']
	};

	if (limit) {
		queryOptions.limit = limit;
	}

	if (Object.keys(query).length) {
		const rallyQueries = Object.keys(query).map((key) => {
			//Per al camp Name, utilitzem 'contains' per fer cerca parcial
			if (key === 'Name') {
				return queryUtils.where(key, 'contains', query[key]);
			}
			//Per a altres camps, mantenim la cerca exacta
			return queryUtils.where(key, '=', query[key]);
		});
		if (rallyQueries.length) {
			queryOptions.query = rallyQueries.reduce((a, b) => a.and(b));
		}
	}

	const result = await rallyApi.query(queryOptions);

	if (!result.results.length) {
		return {
			projects: [],
			source: 'api',
			count: 0
		};
	}

	//Formatem la resposta per ser més llegible
	const projects = result.results.map((project) => ({
		objectId: project.objectId,
		name: project.name,
		description: typeof project.description === 'string' ? striptags(project.description) : project.description,
		state: project.state,
		creationDate: project.creationDate,
		lastUpdateDate: project.lastUpdateDate,
		owner: project.owner ? project.owner.refObjectName : 'Sense propietari',
		parent: project.parent ? project.parent.refObjectName : null,
		childrenCount: project.children ? project.children.count : 0
	}));

	//Afegim els nous projectes a rallyData sense duplicats
	for (const newProject of projects) {
		const existingProjectIndex = rallyData.projects.findIndex((existingProject) => existingProject.objectId === newProject.objectId);

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

export async function getUsers(query = {}, limit = null) {
	const rallyApi = getRallyApi();

	//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
	if (Object.keys(query).length && rallyData.users && rallyData.users.length) {
		const filteredUsers = rallyData.users.filter((user) =>
			Object.keys(query).every((key) => {
				if (user[key] === undefined) {
					return false;
				}
				return user[key] === query[key];
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

	const queryOptions = {
		type: 'user',
		fetch: ['ObjectID', 'UserName', 'DisplayName', 'EmailAddress', 'FirstName', 'LastName', 'Disabled']
	};

	if (limit) {
		queryOptions.limit = limit;
	}

	if (Object.keys(query).length) {
		const rallyQueries = Object.keys(query).map((key) => {
			//Per al camp DisplayName, utilitzem 'contains' per fer cerca parcial
			if (key === 'DisplayName') {
				return queryUtils.where(key, 'contains', query[key]);
			}
			//Per a altres camps, mantenim la cerca exacta
			return queryUtils.where(key, '=', query[key]);
		});

		if (rallyQueries.length) {
			queryOptions.query = rallyQueries.reduce((a, b) => a.and(b));
		}
	}

	const result = await rallyApi.query(queryOptions);

	if (!result.results || result.results.length === 0) {
		return {
			users: [],
			source: 'api',
			count: 0
		};
	}

	const users = result.results.map((user) => ({
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
		const existingUserIndex = rallyData.users.findIndex((existingUser) => existingUser.objectId === newUser.objectId);

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
function buildUserStoryQuery(query) {
	const rallyQueries = Object.keys(query).map((key) => {
		//Per al camp Name, utilitzem 'contains' per fer cerca parcial
		if (key === 'Name') {
			return queryUtils.where(key, 'contains', query[key]);
		}
		//Per al camp Owner, afegim el prefix /user/ si no el porta
		if (key === 'Owner' && query[key] !== 'currentuser') {
			let ownerValue = query[key];
			if (!ownerValue.startsWith('/user/')) {
				ownerValue = `/user/${ownerValue}`;
			}
			return queryUtils.where(key, '=', ownerValue);
		}
		//Per a altres camps, mantenim la cerca exacta
		return queryUtils.where(key, '=', query[key]);
	});

	return rallyQueries.length ? rallyQueries.reduce((a, b) => a.and(b)) : null;
}

// Helper function to format user stories
function formatUserStories(result) {
	return result.results.map((userStory) => ({
		objectId: userStory.objectId,
		formattedId: userStory.formattedId,
		name: userStory.name,
		description: typeof userStory.description === 'string' ? striptags(userStory.description) : userStory.description,
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
function checkCacheForFilteredResults(query, dataArray) {
	if (Object.keys(query).length && dataArray && dataArray.length) {
		const filteredResults = dataArray.filter((item) =>
			Object.keys(query).every((key) => {
				if (item[key] === undefined) {
					return false;
				}
				return item[key] === query[key];
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
function addToCache(newItems, cacheArray, idField) {
	if (!cacheArray) {
		cacheArray = [];
	}

	for (const newItem of newItems) {
		const existingIndex = cacheArray.findIndex((existingItem) => existingItem.ObjectID === newItem[idField]);

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
function buildUserStoryQueryOptions(query, limit) {
	const queryOptions = {
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
function handleDefaultProject(query, queryOptions) {
	if (!query?.Project) {
		if (rallyData.defaultProject?.ObjectID) {
			const defaultProjectQuery = queryUtils.where('Project', '=', `/project/${rallyData.defaultProject.ObjectID}`);

			if (queryOptions.query) {
				queryOptions.query = queryOptions.query.and(defaultProjectQuery);
			} else {
				queryOptions.query = defaultProjectQuery;
			}
		}
	}
}

export async function getUserStories(query = {}, limit = null) {
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

	if (!result.results.length) {
		return {
			userStories: [],
			source: 'api',
			count: 0
		};
	}

	//Formatem la resposta per ser més llegible
	const userStories = formatUserStories(result);

	//Afegim les noves user stories a rallyData sense duplicats
	addToCache(userStories, rallyData.userStories, 'objectId');

	return {
		userStories: userStories,
		source: 'api',
		count: userStories.length
	};
}
