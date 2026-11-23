// Shared types for Jira-related data structures

export interface IterationRef {
	objectId?: string;
	_ref?: string;
	_refObjectName?: string;
}

export interface UserStory {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	planEstimate: number;
	toDo: number;
	owner: string;
	assignee?: string; // Optional - not all contexts have this
	project: string | null;
	iteration: string | IterationRef | null;
	blocked: boolean;
	blockedReason?: string | null; // Jira BlockedReason - motiu del bloqueig quan blocked=true
	taskEstimateTotal: number;
	estimatedHours?: number | null; // Jira: the story's own original estimate (editable, excludes sub-tasks). null = not set. Absent in Rally.
	timeSpent?: number; // Horas registradas (worklogs), incluye subtareas en Jira
	taskStatus?: string; // Deprecated - use scheduleState instead
	tasksCount: number;
	testCasesCount?: number; // Rally only; Jira has no test cases
	defectsCount: number;
	discussionCount: number;
	revisionsCount: number;
	appgar: string;
	scheduleState: string; // PRIMARY: Jira ScheduleState (Defined, In-Progress, Completed, New)
	creationDate?: string; // Optional - ISO date the story was created (timeline zero point)
	revisions?: Revision[]; // Optional - revision history of the user story
	_ref?: string; // Optional - reference field
}

export interface Task {
	objectId: string;
	formattedId: string;
	name: string;
	state: string;
	estimate: number;
	toDo: number;
	blocked: boolean;
	owner: string;
	project: string | null;
	iteration: string | null;
	workProduct?: string | null;
	workItem?: string | null;
	description?: string | null;
	timeSpent?: number;
	_ref?: string;
}

export interface Defect {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	severity: string;
	priority: string;
	owner: string;
	project: string | null;
	iteration: string | null;
	scheduleState: string; // PRIMARY: Jira ScheduleState (Defined, In-Progress, Completed, New)
	blocked: boolean;
	blockedReason?: string | null; // Jira BlockedReason - motiu del bloqueig quan blocked=true
	discussionCount: number;
	_ref?: string;
}

export interface Discussion {
	objectId: string;
	text: string;
	author: string;
	createdDate: string;
	userStoryId?: string;
	_ref?: string;
}

export interface Revision {
	revisionNumber: number;
	description: string;
	author: string;
	createdDate: string;
	_ref?: string;
}

export interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	/** Claves de los proyectos con historias en el sprint (un sprint puede ser compartido). */
	projects?: string[];
	taskEstimateTotal?: number;
	_ref?: string;
}

/** Rally test case. Only populated when robert.provider is "rally". */
export interface TestCase {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	owner: string;
	project: string | null;
	type?: string;
	priority?: string;
	testFolder?: string | null;
	_ref?: string;
}

export interface Project {
	objectId: string;
	name: string;
	state: string;
	_ref?: string;
}

/**
 * Every Jira entity type that can be shown with a type badge. Superset of the narrower
 * unions below (RecentlyViewedItemType, GlobalSearchResultItem['entityType']), which stay
 * as they are — both are assignable to this.
 */
export type JiraEntityType = 'userstory' | 'defect' | 'sprint' | 'task' | 'testcase';

export type RecentlyViewedItemType = 'userstory' | 'defect' | 'sprint';

/** Shared reference shape for the Recently Viewed and Favorites lists. */
export interface JiraItemRef {
	objectId: string;
	formattedId: string; // for sprints: the sprint name, since iterations have no FormattedID
	name: string;
	type: RecentlyViewedItemType;
	/** Jira project key. Optional: entries saved before this field existed don't have it. */
	project?: string | null;
}

export interface RecentlyViewedItem extends JiraItemRef {
	viewedAt: number; // epoch ms, stamped by the extension host
}

export interface FavoriteItem extends JiraItemRef {
	favoritedAt: number; // epoch ms, stamped by the extension host
}

export interface User {
	objectId: string;
	name?: string;
	email?: string;
	disabled: boolean;
	displayName?: string;
	userName?: string;
	emailAddress?: string;
	firstName?: string;
	lastName?: string;
	_ref?: string;
}

export interface JiraData {
	projects: Project[];
	users: User[];
	userStories: UserStory[];
	tasks: Task[];
	defects: Defect[];
	iterations: Iteration[];
	currentUser?: User;
}

export interface JiraProject extends Project {
	description?: string;
	creationDate?: string;
	lastUpdateDate?: string;
	owner?: string;
	parent?: string | null;
	childrenCount?: number;
}

export interface JiraUser extends User {
	userName?: string;
}

export interface JiraUserStory extends UserStory {
	owner: string;
}

export interface JiraIteration extends Iteration {}

export interface JiraDefect extends Defect {}

/** Single item returned by global search (any Jira artifact type) */
export interface GlobalSearchResultItem {
	entityType: 'userstory' | 'defect' | 'task' | 'testcase';
	formattedId: string;
	name: string;
	objectId: string;
	project?: string | null;
	iteration?: string | null;
	_ref?: string;
}

export interface JiraTask extends Task {
	description?: string | null;
	timeSpent?: number;
	workItem?: string | null;
}
