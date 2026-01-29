import {getRallyApi, queryUtils} from './utils.js';
import {rallyData} from '../index.js';
import sanitizeHtml from 'sanitize-html';

export async function getProjects(query = {}, limit = null) {
	const rallyApi = getRallyApi();

	try {
		//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
		if (Object.keys(query).length && rallyData.projects.length) {
			const filteredProjects = rallyData.projects.filter(project => Object.keys(query).every(key => {
				if (project[key] === undefined) { return false; }
				return project[key] === query[key];
			}));

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
			const rallyQueries = Object.keys(query).map(key => {
				//Per al camp Name, utilitzem 'contains' per fer cerca parcial
				if (key === 'Name') {
					return queryUtils.where(key, 'contains', query[key]);
				}
				//Per a altres camps, mantenim la cerca exacta
				return queryUtils.where(key, '=', query[key]);
			});
			if (rallyQueries.length === 1) {
				queryOptions.query = rallyQueries[0];
			} else if (rallyQueries.length > 1) {
				queryOptions.query = rallyQueries.reduce((a, b) => a.and(b));
			}
		}

		const result = await rallyApi.query(queryOptions);

		if (!result.Results.length) {
			return {
				projects: [],
				source: 'api',
				count: 0
			};
		}

		//Formatem la resposta per ser més llegible
		const projects = result.Results.map(project => ({
			ObjectID: project.ObjectID,
			Name: project.Name,
			Description: typeof project.Description === 'string' ? sanitizeHtml(project.Description, {allowedTags: [], allowedAttributes: {}}) : project.Description,
			State: project.State,
			CreationDate: project.CreationDate,
			LastUpdateDate: project.LastUpdateDate,
			Owner: project.Owner ? project.Owner._refObjectName : 'Sense propietari',
			Parent: project.Parent ? project.Parent._refObjectName : null,
			ChildrenCount: project.Children ? project.Children.Count : 0
		}));

		//Afegim els nous projectes a rallyData sense duplicats
		projects.forEach(newProject => {
			const existingProjectIndex = rallyData.projects.findIndex(
				existingProject => existingProject.ObjectID === newProject.ObjectID
			);

			if (existingProjectIndex === -1) {
				//Projecte nou, l'afegim
				rallyData.projects.push(newProject);
			} else {
				//Projecte existent, l'actualitzem
				rallyData.projects[existingProjectIndex] = newProject;
			}
		});

		return {
			projects: projects,
			source: 'api',
			count: projects.length
		};

	} catch (error) {
		console.error(`Error en getProjects: ${error.message}`);
		throw error;
	}
}

export async function getUsers(query = {}, limit = null) {
	const rallyApi = getRallyApi();

	try {
		//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
		if (Object.keys(query).length && rallyData.users && rallyData.users.length) {
			const filteredUsers = rallyData.users.filter(user => Object.keys(query).every(key => {
				if (user[key] === undefined) { return false; }
				return user[key] === query[key];
			}));

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
			const rallyQueries = Object.keys(query).map(key => {
				//Per al camp DisplayName, utilitzem 'contains' per fer cerca parcial
				if (key === 'DisplayName') {
					return queryUtils.where(key, 'contains', query[key]);
				}
				//Per a altres camps, mantenim la cerca exacta
				return queryUtils.where(key, '=', query[key]);
			});

			if (rallyQueries.length === 1) {
				queryOptions.query = rallyQueries[0];
			} else if (rallyQueries.length > 1) {
				queryOptions.query = rallyQueries.reduce((a, b) => a.and(b));
			}
		}

		const result = await rallyApi.query(queryOptions);

		if (!result.Results || result.Results.length === 0) {
			return {
				users: [],
				source: 'api',
				count: 0
			};
		}

		const users = result.Results.map(user => ({
			ObjectID: user?.ObjectID,
			UserName: user?.UserName,
			DisplayName: user?.DisplayName,
			EmailAddress: user?.EmailAddress,
			FirstName: user?.FirstName,
			LastName: user?.LastName,
			Disabled: user?.Disabled,
			_ref: user?._ref
		}));

		//Afegim els nous usuaris a rallyData sense duplicats
		if (!rallyData.users) {
			rallyData.users = [];
		}

		users.forEach(newUser => {
			const existingUserIndex = rallyData.users.findIndex(
				existingUser => existingUser.ObjectID === newUser.ObjectID
			);

			if (existingUserIndex === -1) {
				//Usuari nou, l'afegim
				rallyData.users.push(newUser);
			} else {
				//Usuari existent, l'actualitzem
				rallyData.users[existingUserIndex] = newUser;
			}
		});

		return {
			users: users,
			source: 'api',
			count: users.length
		};

	} catch (error) {
		console.error(`Error en getUsers: ${error.message}`);
		throw error;
	}
}

export async function getUserStories(query = {}, limit = null) {
	const rallyApi = getRallyApi();

	try {
		//Si hi ha filtres específics, comprovem si podem satisfer-los amb la cache
		if (Object.keys(query).length && rallyData.userStories && rallyData.userStories.length) {
			const filteredUserStories = rallyData.userStories.filter(userStory => Object.keys(query).every(key => {
				if (userStory[key] === undefined) { return false; }
				return userStory[key] === query[key];
			}));

			//Si tenim resultats que coincideixen amb els filtres, els retornem
			if (filteredUserStories.length) {
				return {
					userStories: filteredUserStories,
					source: 'cache',
					count: filteredUserStories.length
				};
			}
		}

		//Si no hi ha filtres (demandem totes les user stories) o no tenim dades suficients,
		//hem d'anar a l'API per obtenir la llista completa

		const queryOptions = {
			type: 'hierarchicalrequirement',
			fetch: ['FormattedID', 'Name', 'Description', 'Notes', 'Iteration', 'Blocked', 'TaskEstimateTotal', 'ToDo', 'Owner', 'State', 'PlanEstimate', 'TaskStatus', 'Tasks', 'TestCases', 'Defects', 'Discussion', 'ObjectID', 'c_Appgar'],
		};

		// Normalització i fast-path per identificadors únics
		const hasFormattedId = query && typeof query.FormattedID === 'string' && query.FormattedID.trim().length > 0;
		const hasObjectId = query && typeof query.ObjectID !== 'undefined' && String(query.ObjectID).trim().length > 0;

		if (hasFormattedId) {
			// Assegurem format net i en majúscules (p. ex. US12345)
			query.FormattedID = query.FormattedID.trim().toUpperCase();
			// Quan cerquem per identificador únic, limitem a 1 resultat
			queryOptions.limit = 1;
		} else if (hasObjectId) {
			// Assegurem que l'ObjectID sigui numèric per a una comparació exacta fiable
			const numericId = Number(query.ObjectID);
			if (!Number.isNaN(numericId)) {
				query.ObjectID = numericId;
				// Igualment, en aquest cas només cal 1 resultat
				queryOptions.limit = 1;
			}
		} else if (limit) {
			queryOptions.limit = limit;
		}

		if (Object.keys(query).length) {
			const rallyQueries = Object.keys(query).map(key => {
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
			if (rallyQueries.length === 1) {
				queryOptions.query = rallyQueries[0];
			} else if (rallyQueries.length > 1) {
				queryOptions.query = rallyQueries.reduce((a, b) => a.and(b));
			}
		}

		// Si NO fem cerca per identificador únic (FormattedID/ObjectID), apliquem projecte per defecte
		if (!(hasFormattedId || hasObjectId) && (!query || !query.Project)) {
			if (rallyData.defaultProject && rallyData.defaultProject.ObjectID) {
				const defaultProjectQuery = queryUtils.where('Project', '=', `/project/${rallyData.defaultProject.ObjectID}`);

				if (queryOptions.query) {
					queryOptions.query = queryOptions.query.and(defaultProjectQuery);
				} else {
					queryOptions.query = defaultProjectQuery;
				}
			} else {
				console.error('No s\'ha configurat el projecte per defecte a rallyData');
			}
		}

		const result = await rallyApi.query(queryOptions);

		if (!result.Results.length) {
			return {
				userStories: [],
				source: 'api',
				count: 0
			};
		}

		//Formatem la resposta per ser més llegible
		const userStories = result.Results.map(userStory => ({
			ObjectID: userStory.ObjectID,
			FormattedID: userStory.FormattedID,
			Name: userStory.Name,
			Description: typeof userStory.Description === 'string' ? sanitizeHtml(userStory.Description, {allowedTags: [], allowedAttributes: {}}) : userStory.Description,
			Notes: typeof userStory.Notes === 'string' ? sanitizeHtml(userStory.Notes, {allowedTags: [], allowedAttributes: {}}) : userStory.Notes,
			State: userStory.State,
			PlanEstimate: userStory.PlanEstimate,
			ToDo: userStory.ToDo,
			Owner: userStory.Owner ? userStory.Owner._refObjectName : 'Sense propietari',
			Project: userStory.Project ? userStory.Project._refObjectName : null,
			Iteration: userStory.Iteration ? userStory.Iteration._refObjectName : null,
			Blocked: userStory.Blocked,
			TaskEstimateTotal: userStory.TaskEstimateTotal,
			TaskStatus: userStory.TaskStatus,
			TasksCount: userStory.Tasks ? userStory.Tasks.Count : 0,
			TestCasesCount: userStory.TestCases ? userStory.TestCases.Count : 0,
			DefectsCount: userStory.Defects ? userStory.Defects.Count : 0,
			DiscussionCount: userStory.Discussion ? userStory.Discussion.Count : 0,
			c_Appgar: userStory.c_Appgar
		}));

		//Afegim les noves user stories a rallyData sense duplicats
		if (!rallyData.userStories) {
			rallyData.userStories = [];
		}

		userStories.forEach(newUserStory => {
			const existingUserStoryIndex = rallyData.userStories.findIndex(
				existingUserStory => existingUserStory.ObjectID === newUserStory.ObjectID
			);

			if (existingUserStoryIndex === -1) {
				//User story nova, l'afegim
				rallyData.userStories.push(newUserStory);
			} else {
				//User story existent, l'actualitzem
				rallyData.userStories[existingUserStoryIndex] = newUserStory;
			}
		});

		return {
			userStories: userStories,
			source: 'api',
			count: userStories.length
		};

	} catch (error) {
		console.error(`Error en getUserStories: ${error.message}`);
		throw error;
	}
}