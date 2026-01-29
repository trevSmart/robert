#!/usr/bin/env node

import dotenv from 'dotenv';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {icons} from './src/mcpUtils.js';

// Read package.json to get version dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

// Ensure any library that relies on console.log/info/debug writes to stderr so MCP JSON stays on stdout
const originalConsoleError = console.error.bind(console);
const redirectStdoutToStderr = (...args) => {
	originalConsoleError(...args);
};

console.log = redirectStdoutToStderr;
console.info = redirectStdoutToStderr;
console.debug = redirectStdoutToStderr;

dotenv.config();

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {InitializeRequestSchema, SetLevelRequestSchema} from '@modelcontextprotocol/sdk/types.js';

//Tools
import {getProjectsToolDefinition, getProjectsTool} from './src/tools/getProjects.js';
import {getIterations, getIterationsTool} from './src/tools/getIterations.js';
import {getUserStoriesToolDefinition, getUserStoriesTool} from './src/tools/getUserStories.js';
import {getTasks, getTasksTool} from './src/tools/getTasks.js';
import {getTestCases, getTestCasesTool} from './src/tools/getTestCases.js';
import {getTypeDefinition, getTypeDefinitionTool} from './src/tools/getTypeDefinition.js';
import {createUserStoryTasks, createUserStoryTasksTool} from './src/tools/createUserStoryTasks.js';
import {getCurrentDate, getCurrentDateTool} from './src/tools/getCurrentDate.js';
import {updateTask, updateTaskTool} from './src/tools/updateTask.js';
import {createUserStory, createUserStoryTool} from './src/tools/createUserStory.js';
import {createDefect, createDefectTool} from './src/tools/createDefect.js';
import {getDefects, getDefectsToolDefinition} from './src/tools/getDefects.js';
import {updateDefect, updateDefectToolDefinition} from './src/tools/updateDefect.js';
import {createTestCase, createTestCaseTool} from './src/tools/createTestCase.js';
import {getUsersToolDefinition, getUsersTool} from './src/tools/getUsers.js';
import {getTestFolders, getTestFoldersTool} from './src/tools/getTestFolders.js';
import {createTestFolder, createTestFolderTool} from './src/tools/createTestFolder.js';
import {getTestCaseSteps, getTestCaseStepsTool} from './src/tools/getTestCaseSteps.js';
import {createTestCaseStep, createTestCaseStepTool} from './src/tools/createTestCaseStep.js';
import {updateTestCaseStep, updateTestCaseStepTool} from './src/tools/updateTestCaseStep.js';
import {rallyMcpServerUtilsToolDefinition, rallyMcpServerUtilsTool} from './src/tools/rallyMcpServerUtils.js';
import {createNewUserStoryPrompt, createNewUserStoryPromptDefinition} from './src/prompts/createNewUserStory.js';
import {viewUserStoriesBySprintPrompt, viewUserStoriesBySprintPromptDefinition} from './src/prompts/viewUserStoriesBySprint.js';

import {getProjects, getUserStories, getUsers} from './src/rallyServices.js';
// Logging functions moved here to avoid circular dependencies
let mcpServerInstance = null;
let clientInstance = null;
let logLevelInstance = 'info';

export async function log(data, level = logLevelInstance) {
	if (typeof data === 'object') {
		data = JSON.stringify(data);
	}
	if (typeof data === 'string') {
		if (data.length > 4000) {
			data = `${data.slice(0, 3997)}...`;
		}
		data = `\n${data}\n`;
	}

	try {
		data = `👁🐝Ⓜ️ ${data}`;
		if (mcpServerInstance?.isConnected() && clientSupportsCapability('logging')) {
			await mcpServerInstance.server.sendLoggingMessage({level, logger: 'MCP server', data});
		}
	} catch (error) {
		log(error, 'error');
	}
}

export function clientSupportsCapability(capabilityName) {
	if (!clientInstance) { return false; }

	switch (capabilityName) {
		case 'logging':
			return clientInstance.capabilities.logging || clientInstance.clientInfo.name.toLowerCase().includes('visual studio code');

		case 'resources':
			return clientInstance.capabilities.resources;

		case 'embeddedResources':
			return clientInstance.capabilities.embeddedResources;

		case 'resourceLinks':
			return false;

		default:
			return Boolean(clientInstance.capabilities[capabilityName]);
	}
}

const serverConfig = {
	protocolVersion: '2025-11-25',
	serverInfo: {
		name: 'IBM Rally MCP server',
		version: packageJson.version,
		icons: [{src: 'src/assets/icon.png', sizes: ['64x64'], mimeType: 'image/png'}]
	},
	capabilities: {
		logging: {},
		resources: {listChanged: true},
		prompts: {listChanged: true},
		tools: {},
		completions: {}
	},
	icons: icons,
	debouncedNotificationMethods: ['notifications/tools/list_changed', 'notifications/resources/list_changed', 'notifications/prompts/list_changed']

};

export let logLevel = 'info';

export const mcpServer = new McpServer(serverConfig.serverInfo, {
	capabilities: {...serverConfig.capabilities},
	instructions: 'This is a MCP server for working with Broadcom Rally. Always respond in the same language as the user.',
	debouncedNotificationMethods: ['notifications/tools/list_changed', 'notifications/resources/list_changed', 'notifications/prompts/list_changed']
}
);

export let client = {clientInfo: {name: 'unknown'}, capabilities: {}};

export async function sendElicitRequest(elicitationProperties) {
	if ('elicitation' in client.capabilities) {
		const elicitationResult = await mcpServer.server.elicitInput({
			message: elicitationProperties.description,
			requestedSchema: {
				type: 'object',
				properties: elicitationProperties,
				required: ['confirmation']
			}
		});
		return elicitationResult;
	}
}

export const rallyData = {
	defaultProject: null,
	projects: [],
	iterations: [],
	userStories: [],
	tasks: [],
	testCases: [],
	users: [],
	testFolders: []
};

mcpServer.server.setRequestHandler(InitializeRequestSchema, async request => {
	try {
		logLevel = process.env.LOG_LEVEL || 'info';
		logLevelInstance = logLevel;

		client = request.params;
		clientInstance = client;
		log(`Client capabilities: ${JSON.stringify(client.capabilities, null, 3)}`, 'debug');

		if (clientSupportsCapability('logging')) {
			mcpServer.server.setRequestHandler(SetLevelRequestSchema, async ({params}) => {
				logLevel = params.level;
				logLevelInstance = logLevel;
				return {};
			});
		}

		return {
			protocolVersion: serverConfig.protocolVersion,
			serverInfo: serverConfig.serverInfo,
			capabilities: mcpServer.server.getCapabilities()
		};

	} catch (error) {
		log(`Error initializing server: ${error.message}`, 'error');
		throw error;
	}
});
mcpServer.registerPrompt('createNewUserStory', createNewUserStoryPromptDefinition, createNewUserStoryPrompt);
mcpServer.registerPrompt('viewUserStoriesBySprint', viewUserStoriesBySprintPromptDefinition, viewUserStoriesBySprintPrompt);
mcpServer.registerTool('getProjects', getProjectsToolDefinition, getProjectsTool);
mcpServer.registerTool('getIterations', getIterationsTool, getIterations);
mcpServer.registerTool('getUserStories', getUserStoriesToolDefinition, getUserStoriesTool);
mcpServer.registerTool('getTasks', getTasksTool, getTasks);
mcpServer.registerTool('getTestCases', getTestCasesTool, getTestCases);
mcpServer.registerTool('getTypeDefinition', getTypeDefinitionTool, getTypeDefinition);
mcpServer.registerTool('createUserStoryTasks', createUserStoryTasksTool, createUserStoryTasks);
mcpServer.registerTool('getCurrentDate', getCurrentDateTool, getCurrentDate);
mcpServer.registerTool('updateTask', updateTaskTool, updateTask);
mcpServer.registerTool('createUserStory', createUserStoryTool, createUserStory);
mcpServer.registerTool('createDefect', createDefectTool, createDefect);
mcpServer.registerTool('getDefects', getDefectsToolDefinition, getDefects);
mcpServer.registerTool('updateDefect', updateDefectToolDefinition, updateDefect);
mcpServer.registerTool('createTestCase', createTestCaseTool, createTestCase);
mcpServer.registerTool('getUsers', getUsersToolDefinition, getUsersTool);
mcpServer.registerTool('getTestFolders', getTestFoldersTool, getTestFolders);
mcpServer.registerTool('createTestFolder', createTestFolderTool, createTestFolder);
mcpServer.registerTool('getTestCaseSteps', getTestCaseStepsTool, getTestCaseSteps);
mcpServer.registerTool('createTestCaseStep', createTestCaseStepTool, createTestCaseStep);
mcpServer.registerTool('updateTestCaseStep', updateTestCaseStepTool, updateTestCaseStep);
mcpServer.registerTool('rallyMcpServerUtils', rallyMcpServerUtilsToolDefinition, rallyMcpServerUtilsTool);

async function startServer() {
	try {
		//Obtenim l'ID del projecte abans d'iniciar el servidor
		const getProjectsResult = await getProjects({Name: process.env.RALLY_PROJECT_NAME});
		if (!getProjectsResult.projects || getProjectsResult.projects.length === 0) {
			throw new Error(`Error obtenint projecte per defecte: No s'han trobat projectes amb el nom ${process.env.RALLY_PROJECT_NAME}`);
		}
		const defaultProject = getProjectsResult.projects[0];
		log(`Projecte per defecte: ${JSON.stringify(defaultProject, null, 3)}`, 'info');

		// Preload iterations for the default project so prompts/completions
		// that depend on rallyData.iterations have data available immediately.
		try {
			await getIterations({query: {Project: String(defaultProject.ObjectID)}});
		} catch (error) {
			log(`Error preloading iterations for default project: ${error.message}`, 'warn');
		}

		const getUserStoriesResult = await getUserStories({Project: `/project/${defaultProject.ObjectID}`, Owner: 'currentuser'}, 1);
		log(`User stories: ${JSON.stringify(getUserStoriesResult, null, 3)}`, 'debug');
		const owner = getUserStoriesResult.userStories[0].Owner;
		log(`Owner: ${owner}`, 'log');
		const getUsersResult = await getUsers({DisplayName: owner}, 1);
		log(`Users: ${JSON.stringify(getUsersResult, null, 3)}`, 'log');
		rallyData.currentUser = getUsersResult.users[0];

		mcpServer.registerResource('rallyData', 'mcp://data/all.json', {
			title: 'All Rally Data',
			description: 'All data from Rally',
			mimeType: 'application/json',
			annotations: {audience: ['user', 'assistant'], lastModified: new Date().toISOString()}
		}, async uri => ({contents: [{uri: uri, text: JSON.stringify(rallyData, null, 3)}]}));

		mcpServer.registerResource('defaultProject', 'mcp://projects/default.json', {
			title: defaultProject.Name,
			description: defaultProject.Description,
			mimeType: 'application/json',
			annotations: {audience: ['user', 'assistant'], lastModified: new Date().toISOString()}
		}, async uri => ({contents: [{uri: uri, text: JSON.stringify(defaultProject, null, 3)}]}));
		mcpServer.sendResourceListChanged();

		rallyData.defaultProject = defaultProject;

		await mcpServer.connect(new StdioServerTransport());
		mcpServerInstance = mcpServer;
		await new Promise(r => setTimeout(r, 400));
		log(`${serverConfig.serverInfo.name} v${serverConfig.serverInfo.version} started successfully`, 'info');

	} catch (error) {
		log(`Error starting IBM MCP Rally server: ${error}`, 'error');
		process.exit(1);
	}
}

// Only start server if not running tests
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
	startServer();
}
