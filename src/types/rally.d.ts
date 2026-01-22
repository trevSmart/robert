// Shared types for Rally-related data structures

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
	iteration: string | null;
	blocked: boolean;
	taskEstimateTotal: number;
	taskStatus: string;
	tasksCount: number;
	testCasesCount: number;
	defectsCount: number;
	discussionCount: number;
	appgar: string;
	scheduleState?: string; // Optional - not always present
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
	scheduledState?: string;
	blocked: boolean;
	discussionCount: number;
	_ref?: string;
}

export interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref?: string;
}

export interface Project {
	objectId: string;
	name: string;
	state: string;
	_ref?: string;
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

// Rally API specific types
export interface RallyApiObject {
	_ref: string;
	ObjectID: number;
	_refObjectName: string;
	ObjectUUID?: string;
	VersionId?: string;
	Subscription?: string;
	Workspace?: string;
	CreationDate?: string;
	[ key: string ]: unknown;
}

export interface RallyApiResult {
	QueryResult: {
		Results: RallyApiObject[];
		TotalResultCount: number;
		StartIndex: number;
		PageSize: number;
	};
	Results?: RallyApiObject[];
}

export interface RallyData {
	projects: Project[];
	users: User[];
	userStories: UserStory[];
	tasks: Task[];
	defects: Defect[];
	iterations: Iteration[];
	currentUser?: User;
	defaultProject?: Project;
}

export interface RallyQuery {
	type: string;
	fetch?: string[];
	query?: string;
	limit?: number;
	order?: string;
	[key: string]: unknown;
}

export interface RallyQueryParams {
	type?: string;
	fetch?: string[];
	query?: string;
	limit?: number;
	order?: string;
	[key: string]: unknown;
}

export interface RallyQueryBuilder {
	where(field: string, operator: string, value: unknown): RallyQueryBuilder;
	and(query: RallyQueryBuilder): RallyQueryBuilder;
}

export interface RallyQueryOptions {
	type: string;
	fetch?: string[];
	query?: unknown;
	limit?: number;
	order?: unknown;
	where?: string;
}

export interface RallyProject extends Project {
	description?: string;
	creationDate?: string;
	lastUpdateDate?: string;
	owner?: string;
	parent?: string | null;
	childrenCount?: number;
}

export interface RallyUser extends User {
	userName?: string;
}

export interface RallyUserStory extends UserStory {
	owner: string;
}

export interface RallyIteration extends Iteration {}

export interface RallyDefect extends Defect {
}

export interface RallyTask extends Task {
	description?: string | null;
	timeSpent?: number;
	workItem?: string | null;
}