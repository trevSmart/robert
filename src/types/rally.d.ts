// Rally API types
export interface RallyApiObject {
	objectId: string;
	name?: string;
	description?: string;
	state?: string;
	creationDate?: string;
	lastUpdateDate?: string;
	owner?: {
		refObjectName: string;
		_refObjectName?: string;
	};
	parent?: {
		refObjectName: string;
		_refObjectName?: string;
	};
	children?: {
		count: number;
		Count?: number;
	};
	userName?: string;
	displayName?: string;
	emailAddress?: string;
	firstName?: string;
	lastName?: string;
	disabled?: boolean;
	_ref?: string;
	formattedId?: string;
	planEstimate?: number;
	toDo?: number;
	project?: {
		refObjectName: string;
		_refObjectName?: string;
	};
	iteration?: {
		refObjectName: string;
		_refObjectName?: string;
	};
	blocked?: boolean;
	taskEstimateTotal?: number;
	taskStatus?: string;
	tasks?: {
		count: number;
		Count?: number;
	};
	testCases?: {
		count: number;
		Count?: number;
	};
	defects?: {
		count: number;
		Count?: number;
	};
	discussion?: {
		count: number;
		Count?: number;
	};
	appgar?: string;
	ObjectID?: string;
	Name?: string;
	Description?: string;
	State?: string;
	CreationDate?: string;
	LastUpdateDate?: string;
	Owner?: {
		_refObjectName: string;
		refObjectName?: string;
	};
	Parent?: {
		_refObjectName: string;
		refObjectName?: string;
	};
	Children?: {
		Count: number;
		count?: number;
	};
	UserName?: string;
	DisplayName?: string;
	EmailAddress?: string;
	FirstName?: string;
	LastName?: string;
	Disabled?: boolean;
	FormattedID?: string;
	PlanEstimate?: number;
	ToDo?: number;
	Project?: {
		_refObjectName: string;
		refObjectName?: string;
	};
	Iteration?: {
		_refObjectName: string;
		refObjectName?: string;
	};
	Blocked?: boolean;
	TaskEstimateTotal?: number;
	TaskStatus?: string;
	Tasks?: {
		Count: number;
		count?: number;
	};
	TestCases?: {
		Count: number;
		count?: number;
	};
	Defects?: {
		Count: number;
		count?: number;
	};
	Discussion?: {
		Count: number;
		count?: number;
	};
	c_Appgar?: string;
	StartDate?: string;
	EndDate?: string;
}

export interface RallyApiResult {
	Results: RallyApiObject[];
}

export interface RallyProject {
	objectId: string;
	name: string | undefined;
	description: string | null | undefined;
	state: string | undefined;
	creationDate: string | undefined;
	lastUpdateDate: string | undefined;
	owner: string;
	parent: string | null;
	childrenCount: number;
}

export interface RallyUser {
	objectId: string;
	userName: string | undefined;
	displayName: string | undefined;
	emailAddress: string | undefined;
	firstName: string | undefined;
	lastName: string | undefined;
	disabled: boolean | undefined;
	_ref: string | undefined;
}

export interface RallyIteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref: string;
}

export interface RallyUserStory {
	objectId: string;
	formattedId: string;
	name: string;
	description: string | null;
	state: string;
	planEstimate: number;
	toDo: number;
	owner: string;
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
}

export interface RallyQuery {
	[key: string]: unknown;
}

export interface RallyQueryOptions {
	type: string;
	fetch: string[];
	limit?: number;
	query?: unknown;
	order?: unknown;
}

// Rally module types
export interface RallyApi {
	query(queryOptions: RallyQueryOptions): Promise<RallyApiResult>;
	create(options: { type: string; data: Record<string, unknown> }): Promise<{ Object: RallyApiObject }>;
	update(options: { type: string; ref: string; data: Record<string, unknown> }): Promise<{ Object: RallyApiObject }>;
	del(options: { type: string; ref: string }): Promise<void>;
}

export interface RallyOptions {
	apiKey: string;
	server: string;
	requestOptions?: {
		headers?: Record<string, string>;
	};
}

export interface RallyQueryBuilder {
	where(field: string, operator: string, value: unknown): RallyQueryBuilder;
	and(query: RallyQueryBuilder): RallyQueryBuilder;
}

export interface RallyModule {
	(options: RallyOptions): RallyApi;
	createClient(options: RallyOptions): RallyApi;
	util: {
		query: RallyQueryBuilder;
	};
}

export declare class RestApi implements RallyApi {
	constructor(options: RallyOptions);
	query(queryOptions: RallyQueryOptions): Promise<RallyApiResult>;
	create(options: { type: string; data: Record<string, unknown> }): Promise<{ Object: RallyApiObject }>;
	update(options: { type: string; ref: string; data: Record<string, unknown> }): Promise<{ Object: RallyApiObject }>;
	del(options: { type: string; ref: string }): Promise<void>;
}

// Data structure for managing Rally data in the extension
export interface RallyData {
	projects: RallyProject[];
	users: RallyUser[];
	iterations: RallyIteration[];
	userStories: RallyUserStory[];
	defaultProject: RallyProject | null;
}
