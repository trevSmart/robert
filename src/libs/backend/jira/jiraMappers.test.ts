import { describe, it, expect } from 'vitest';
import { statusToScheduleState, formatUserStories, formatDefects, formatTasks, formatComments, formatChangelog, formatSprints } from './jiraMappers';
import type { JiraIssue } from './jiraApi';

const ctx = { storyPointsField: 'customfield_10016', projectName: 'ROB' };

const issue = (fields: Record<string, any>, id = '10001', key = 'ROB-1'): JiraIssue => ({ id, key, self: `https://site.atlassian.net/rest/api/3/issue/${id}`, fields });

const status = (name: string, category: string) => ({ name, statusCategory: { key: category } });

describe('statusToScheduleState', () => {
	it('maps Jira status categories onto the Rally ScheduleState vocabulary', () => {
		expect(statusToScheduleState({ status: status('To Do', 'new') })).toBe('Defined');
		expect(statusToScheduleState({ status: status('In Progress', 'indeterminate') })).toBe('In-Progress');
		expect(statusToScheduleState({ status: status('Done', 'done') })).toBe('Completed');
	});

	it('falls back to the raw status name when the category is unknown', () => {
		expect(statusToScheduleState({ status: { name: 'Weird' } })).toBe('Weird');
	});

	it('defaults to Defined when there is no status at all', () => {
		expect(statusToScheduleState({})).toBe('Defined');
	});
});

describe('formatUserStories', () => {
	it('maps the core issue fields onto the internal user story shape', async () => {
		const [story] = await formatUserStories(
			[
				issue({
					summary: 'Add login',
					status: status('In Progress', 'indeterminate'),
					assignee: { displayName: 'Ada Lovelace' },
					project: { name: 'Robert' },
					customfield_10016: 5,
					subtasks: [{ id: '1' }, { id: '2' }],
					comment: { total: 3 },
					created: '2026-01-02T10:00:00.000Z'
				})
			],
			ctx
		);

		expect(story.objectId).toBe('10001');
		// Jira issue keys stand in for Rally FormattedIDs.
		expect(story.formattedId).toBe('ROB-1');
		expect(story.name).toBe('Add login');
		expect(story.scheduleState).toBe('In-Progress');
		expect(story.owner).toBe('Ada Lovelace');
		expect(story.planEstimate).toBe(5);
		expect(story.tasksCount).toBe(2);
		expect(story.discussionCount).toBe(3);
		expect(story.project).toBe('Robert');
		expect(story.creationDate).toBe('2026-01-02T10:00:00.000Z');
	});

	it('reads estimates as 0 when the site has no story points field', async () => {
		const [story] = await formatUserStories([issue({ summary: 'x', customfield_10016: 8 })], { storyPointsField: null });
		expect(story.planEstimate).toBe(0);
	});

	it('converts time tracking seconds into hours', async () => {
		const [story] = await formatUserStories([issue({ summary: 'x', timetracking: { originalEstimateSeconds: 7200, remainingEstimateSeconds: 3600 } })], ctx);
		expect(story.taskEstimateTotal).toBe(2);
		expect(story.toDo).toBe(1);
	});

	it('picks the active sprint when an issue spans several', async () => {
		const [story] = await formatUserStories(
			[
				issue({
					summary: 'x',
					sprint: [
						{ id: 1, name: 'Sprint 1', state: 'closed' },
						{ id: 2, name: 'Sprint 2', state: 'active' }
					]
				})
			],
			ctx
		);

		expect(story.iteration).toEqual({ objectId: '2', _refObjectName: 'Sprint 2' });
	});

	it('parses the legacy serialised sprint format', async () => {
		const [story] = await formatUserStories([issue({ summary: 'x', sprint: ['com.atlassian.greenhopper.service.sprint.Sprint@1[id=42,state=ACTIVE,name=Sprint 42,startDate=...]'] })], ctx);
		expect(story.iteration).toEqual({ objectId: '42', _refObjectName: 'Sprint 42' });
	});

	it('reports no iteration when the issue is not in a sprint', async () => {
		const [story] = await formatUserStories([issue({ summary: 'x' })], ctx);
		expect(story.iteration).toBeNull();
	});

	it('treats a blocked label or an Impediment flag as blocked', async () => {
		const [labelled] = await formatUserStories([issue({ summary: 'x', labels: ['Blocked'] })], ctx);
		const [flagged] = await formatUserStories([issue({ summary: 'x', customfield_10021: [{ value: 'Impediment' }] })], ctx);
		const [plain] = await formatUserStories([issue({ summary: 'x', labels: ['frontend'] })], ctx);

		expect(labelled.blocked).toBe(true);
		expect(flagged.blocked).toBe(true);
		expect(plain.blocked).toBe(false);
	});

	it('handles a large batch without dropping items (chunked mapping)', async () => {
		const issues = Array.from({ length: 120 }, (_, i) => issue({ summary: `S${i}` }, String(i), `ROB-${i}`));
		const stories = await formatUserStories(issues, ctx);

		expect(stories).toHaveLength(120);
		expect(stories[119].formattedId).toBe('ROB-119');
	});
});

describe('formatDefects', () => {
	it('maps priority onto both severity and priority, which Rally keeps separate', async () => {
		const [defect] = await formatDefects([issue({ summary: 'Crash', status: status('Done', 'done'), priority: { name: 'High' } })], ctx);

		expect(defect.formattedId).toBe('ROB-1');
		expect(defect.scheduleState).toBe('Completed');
		expect(defect.severity).toBe('High');
		expect(defect.priority).toBe('High');
	});
});

describe('formatTasks', () => {
	it('maps a subtask and links it to its parent', async () => {
		const [task] = await formatTasks([issue({ summary: 'Sub', parent: { key: 'ROB-9' }, timetracking: { timeSpentSeconds: 1800 } })], ctx);

		expect(task.name).toBe('Sub');
		expect(task.workProduct).toBe('ROB-9');
		expect(task.timeSpent).toBe(0.5);
	});
});

describe('formatComments', () => {
	it('renders comment bodies from ADF to HTML', async () => {
		const [comment] = await formatComments([{ id: 55, author: { displayName: 'Ada' }, created: '2026-01-01T00:00:00.000Z', body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Looks good' }] }] } }], '10001');

		expect(comment.objectId).toBe('55');
		expect(comment.text).toBe('<p>Looks good</p>');
		expect(comment.author).toBe('Ada');
		expect(comment.userStoryId).toBe('10001');
	});
});

describe('formatChangelog', () => {
	it('summarises changed fields and orders newest first', async () => {
		const revisions = await formatChangelog([
			{ id: '1', created: '2026-01-01T00:00:00.000Z', author: { displayName: 'Ada' }, items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }] },
			{ id: '2', created: '2026-02-01T00:00:00.000Z', author: { displayName: 'Grace' }, items: [{ field: 'assignee', fromString: '', toString: 'Ada' }] }
		]);

		expect(revisions[0].author).toBe('Grace');
		expect(revisions[0].description).toBe('assignee changed from "" to "Ada"');
		expect(revisions[1].description).toBe('status changed from "To Do" to "In Progress"');
	});

	it('falls back to a generic description when no items are present', async () => {
		const [revision] = await formatChangelog([{ id: '1', created: '2026-01-01T00:00:00.000Z', author: {}, items: [] }]);
		expect(revision.description).toBe('Issue updated');
	});
});

describe('formatSprints', () => {
	it('maps Jira sprint states onto Rally iteration states', async () => {
		const iterations = await formatSprints(
			[
				{ id: 1, name: 'S1', state: 'closed', startDate: 'a', completeDate: 'b' },
				{ id: 2, name: 'S2', state: 'active', startDate: 'c', endDate: 'd' },
				{ id: 3, name: 'S3', state: 'future' }
			],
			'ROB'
		);

		expect(iterations.map(i => i.state)).toEqual(['Accepted', 'Committed', 'Planning']);
		expect(iterations[0].endDate).toBe('b');
		expect(iterations[1].objectId).toBe('2');
		expect(iterations[2].startDate).toBe('');
	});
});
