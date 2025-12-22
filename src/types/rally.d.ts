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
	};
	parent?: {
		refObjectName: string;
	};
	children?: {
		count: number;
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
	};
	iteration?: {
		refObjectName: string;
	};
	blocked?: boolean;
	taskEstimateTotal?: number;
	taskStatus?: string;
	tasks?: {
		count: number;
	};
	testCases?: {
		count: number;
	};
	defects?: {
		count: number;
	};
	discussion?: {
		count: number;
	};
	appgar?: string;
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
	userStories: RallyUserStory[];
	defaultProject: RallyProject | null;
}
