/**
 * Test script for global search.
 * 1) Finds one User Story from the current sprint of the project.
 * 2) Runs global search for that FormattedID and verifies it is found.
 * Config: .env in project root, or RALLY_* env vars, or tmp/.env.rally, or VS Code/Cursor settings.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function parseEnvLine(line) {
	const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
	if (!m) return null;
	const val = m[2].trim().replace(/^["']|["']$/g, '');
	return [m[1], val];
}

function loadRallyConfig() {
	let env = {
		rallyInstance: process.env.RALLY_INSTANCE,
		rallyApiKey: process.env.RALLY_API_KEY,
		rallyProjectName: process.env.RALLY_PROJECT_NAME
	};
	if (env.rallyInstance && env.rallyApiKey && env.rallyProjectName) {
		return env;
	}

	// Project root .env
	const rootEnv = path.join(__dirname, '..', '.env');
	if (fs.existsSync(rootEnv)) {
		fs.readFileSync(rootEnv, 'utf-8').split('\n').forEach((line) => {
			const kv = parseEnvLine(line);
			if (kv) {
				if (kv[0] === 'RALLY_INSTANCE') env.rallyInstance = kv[1];
				if (kv[0] === 'RALLY_API_KEY') env.rallyApiKey = kv[1];
				if (kv[0] === 'RALLY_PROJECT_NAME') env.rallyProjectName = kv[1];
			}
		});
		if (env.rallyInstance && env.rallyApiKey && env.rallyProjectName) return env;
	}

	// tmp/.env.rally
	const envRallyPath = path.join(__dirname, '.env.rally');
	if (fs.existsSync(envRallyPath)) {
		fs.readFileSync(envRallyPath, 'utf-8').split('\n').forEach((line) => {
			const kv = parseEnvLine(line);
			if (kv) {
				if (kv[0] === 'RALLY_INSTANCE') env.rallyInstance = kv[1];
				if (kv[0] === 'RALLY_API_KEY') env.rallyApiKey = kv[1];
				if (kv[0] === 'RALLY_PROJECT_NAME') env.rallyProjectName = kv[1];
			}
		});
		if (env.rallyInstance && env.rallyApiKey && env.rallyProjectName) return env;
	}

	const possiblePaths = [
		path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
		path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
		path.join(os.homedir(), '.config', 'Code', 'User', 'settings.json'),
		path.join(os.homedir(), '.config', 'Cursor', 'User', 'settings.json')
	];

	for (const configPath of possiblePaths) {
		try {
			if (fs.existsSync(configPath)) {
				const raw = fs.readFileSync(configPath, 'utf-8');
				const full = JSON.parse(raw);
				const instance = full['robert.rallyInstance'] ?? full.robert?.rallyInstance;
				const apiKey = full['robert.rallyApiKey'] ?? full.robert?.rallyApiKey;
				const projectName = full['robert.rallyProjectName'] ?? full.robert?.rallyProjectName;
				if (instance && apiKey && projectName) {
					return {
						rallyInstance: instance,
						rallyApiKey: apiKey,
						rallyProjectName: projectName
					};
				}
			}
		} catch (_) {
			// skip
		}
	}

	return null;
}

async function main() {
	const config = loadRallyConfig();
	if (!config) {
		console.error('Missing Rally config.');
		console.error('  Option 1: Set env vars RALLY_INSTANCE, RALLY_API_KEY, RALLY_PROJECT_NAME');
		console.error('  Option 2: Copy tmp/.env.rally.example to tmp/.env.rally and fill in values');
		console.error('  Option 3: Configure robert.rallyInstance, robert.rallyApiKey, robert.rallyProjectName in VS Code/Cursor settings.');
		process.exit(1);
	}

	let rally;
	try {
		rally = require('ibm-rally-node').default || require('ibm-rally-node');
	} catch (e) {
		console.error('Failed to load ibm-rally-node. Run from project root after: npm install');
		process.exit(1);
	}

	const queryUtils = rally.util?.query;
	if (!queryUtils || typeof queryUtils.where !== 'function') {
		console.error('Rally query util not found');
		process.exit(1);
	}

	const rallyApi = rally({
		apiKey: config.rallyApiKey,
		server: config.rallyInstance,
		requestOptions: {
			headers: {
				'X-RallyIntegrationName': 'Robert Global Search Test',
				'X-RallyIntegrationVendor': 'IBM'
			}
		}
	});

	console.log('Rally instance:', config.rallyInstance);
	console.log('Project name:', config.rallyProjectName);
	console.log('');

	function unwrapResults(res) {
		const data = res?.QueryResult ?? res;
		return data?.Results ?? (Array.isArray(res) ? res : []);
	}

	// Resolve project ID
	const projectResult = await rallyApi.query({
		type: 'project',
		fetch: ['ObjectID', 'Name'],
		query: queryUtils.where('Name', '=', config.rallyProjectName)
	});
	const projectResults = unwrapResults(projectResult);
	if (!projectResults.length) {
		console.error('Project not found:', config.rallyProjectName);
		process.exit(1);
	}
	const projectId = projectResults[0].ObjectID ?? projectResults[0].objectId;
	const projectRef = `/project/${projectId}`;
	console.log('Project ID:', projectId);

	// Step 1: Get iterations for project, find current sprint (today between StartDate and EndDate)
	const iterResult = await rallyApi.query({
		type: 'iteration',
		fetch: ['ObjectID', 'Name', 'StartDate', 'EndDate', 'State'],
		query: queryUtils.where('Project', '=', projectRef),
		limit: 100
	});
	const iterations = unwrapResults(iterResult);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const currentIteration = iterations.find((it) => {
		const start = it.StartDate ? new Date(it.StartDate) : null;
		const end = it.EndDate ? new Date(it.EndDate) : null;
		if (!start || !end) return false;
		start.setHours(0, 0, 0, 0);
		end.setHours(23, 59, 59, 999);
		return today >= start && today <= end;
	});

	if (!currentIteration) {
		console.error('No current sprint found (today not in any iteration StartDate..EndDate).');
		console.log('Available iterations (first 5):');
		iterations.slice(0, 5).forEach((it) => {
			console.log('  ', it.Name, it.StartDate, '-', it.EndDate);
		});
		process.exit(1);
	}
	console.log('Current sprint:', currentIteration.Name);
	console.log('  ', currentIteration.StartDate, '-', currentIteration.EndDate);
	console.log('');

	// Get one user story from current sprint
	const iterationRef = `/iteration/${currentIteration.ObjectID ?? currentIteration.objectId}`;
	const usResult = await rallyApi.query({
		type: 'hierarchicalrequirement',
		fetch: ['FormattedID', 'Name', 'ObjectID'],
		query: queryUtils.where('Iteration', '=', iterationRef),
		limit: 10
	});
	const userStories = unwrapResults(usResult);
	if (!userStories.length) {
		console.error('No user stories in current sprint.');
		process.exit(1);
	}
	const targetUS = userStories[0];
	const term = targetUS.FormattedID ?? targetUS.formattedId ?? '?';
	console.log('Picked US from current sprint:', term, '-', (targetUS.Name ?? targetUS.name ?? '').slice(0, 50));
	console.log('');

	// Step 2: Global search for that FormattedID
	const formIdExact = queryUtils.where('FormattedID', '=', term);
	const formIdContains = queryUtils.where('FormattedID', 'contains', term);
	const nameContains = queryUtils.where('Name', 'contains', term);
	const searchOr = formIdExact.or(formIdContains).or(nameContains);
	const projectFilter = queryUtils.where('Project', '=', projectRef);
	const fullQuery = searchOr.and(projectFilter);

	const result = await rallyApi.query({
		type: 'hierarchicalrequirement',
		fetch: ['FormattedID', 'Name', 'ObjectID', 'Project', 'Iteration', '_ref'],
		query: fullQuery,
		limit: 20
	});
	const results = unwrapResults(result);

	console.log('Global search for', term, '->', results.length, 'result(s)');
	console.log('');

	if (results.length === 0) {
		console.log('FAIL: Global search did not find', term);
		process.exit(1);
	}

	const found = results.some((r) => (r.FormattedID || r.formattedId || '') === term);
	if (found) {
		console.log('SUCCESS: Global search found', term);
	} else {
		console.log('WARNING: Expected', term, 'in results. Got:', results.map((r) => r.FormattedID ?? r.formattedId).join(', '));
	}

	results.forEach((r, i) => {
		const fid = r.FormattedID ?? r.formattedId ?? '?';
		const name = (r.Name ?? r.name ?? '').slice(0, 60);
		console.log('  ', i + 1 + '.', fid, name);
	});

	process.exit(found ? 0 : 1);
}

main().catch(err => {
	console.error('Error:', err.message);
	if (process.env.DEBUG) console.error(err.stack);
	process.exit(1);
});
