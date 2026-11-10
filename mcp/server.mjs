import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as jira from './jira.mjs';

const server = new McpServer({ name: 'robert-jira', version: '0.1.0' });

const readOnly = { readOnlyHint: true, openWorldHint: true };

function tool(name, description, inputSchema, handler) {
	server.registerTool(name, { description, inputSchema, annotations: readOnly }, async args => {
		try {
			const data = await handler(args);
			return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
		} catch (error) {
			return {
				isError: true,
				content: [
					{
						type: 'text',
						text: error instanceof Error ? error.message : String(error)
					}
				]
			};
		}
	});
}

const limit = (max, def) => z.number().int().min(1).max(max).default(def).describe(`Max results (default ${def})`);

const filters = {
	sprintId: z.string().optional().describe('Numeric sprint id, as returned by jira_list_sprints'),
	assignee: z.string().optional().describe('Assignee display name, or "currentuser" for the authenticated user'),
	text: z.string().optional().describe('Text that must appear in the summary'),
	limit: limit(1000, 50)
};

tool('jira_current_user', 'Authenticated Jira user (also checks credentials).', {}, () => jira.getCurrentUser());

tool('jira_list_projects', 'List Jira projects visible to the user.', { limit: limit(500, 100) }, ({ limit }) => jira.listProjects(limit));

tool(
	'jira_list_users',
	'List users assignable in the configured project.',
	{
		query: z.string().default('').describe('Name or email fragment'),
		limit: limit(1000, 100)
	},
	args => jira.listUsers(args)
);

tool(
	'jira_list_sprints',
	'List sprints of the configured project (newest first) with their story estimate hours.',
	{
		state: z.enum(['Active', 'Closed', 'Future']).optional(),
		limit: limit(200, 20)
	},
	args => jira.listSprints(args)
);

tool('jira_list_user_stories', 'List user stories (Historia, Cambios Evolutivos, Entrega, Epic) of the configured project, optionally filtered by sprint, assignee or summary text.', filters, args => jira.listUserStories(args));

tool('jira_list_defects', 'List defects (Incidencias) of the configured project, optionally filtered by sprint, assignee or summary text.', filters, args => jira.listDefects(args));

tool(
	'jira_list_tasks',
	'List the subtasks (Subtarea) of a user story, with estimate, remaining and spent hours.',
	{
		parentKey: z.string().describe('Parent issue key or id, e.g. DSS-273'),
		limit: limit(1000, 200)
	},
	({ parentKey, limit }) => jira.listTasks(parentKey, limit)
);

tool(
	'jira_search',
	'Full-text search over user stories, defects and tasks of the configured project. An issue key (e.g. DSS-273) also matches by key.',
	{
		term: z.string().min(1),
		type: z.enum(['all', 'user-stories', 'defects', 'tasks']).default('all'),
		limit: limit(100, 15).describe('Max results per type (default 15)')
	},
	({ term, type, limit }) => jira.searchWorkItems(term, { type, limit })
);

tool('jira_get_issue', 'Get one issue (story, defect or task) by key or numeric id.', { key: z.string().describe('Issue key (DSS-273) or numeric id') }, async ({ key }) => (await jira.getIssue(key)) ?? { error: `Issue ${key} not found` });

tool('jira_get_comments', 'Comments (discussion) of an issue.', { key: z.string() }, ({ key }) => jira.getComments(key));

tool('jira_get_linked_defects', 'Defects linked to a user story through issue links.', { key: z.string() }, ({ key }) => jira.getLinkedDefects(key));

tool('jira_get_changelog', 'Change history of an issue (field transitions).', { key: z.string(), limit: limit(1000, 100) }, ({ key, limit }) => jira.getChangelog(key, limit));

await server.connect(new StdioServerTransport());
