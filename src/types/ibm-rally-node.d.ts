// Type definitions for ibm-rally-node
declare module 'ibm-rally-node' {
	export interface RallyQueryOptions {
		type: string;
		fetch?: string[];
		query?: unknown;
		limit?: number;
		order?: unknown;
		where?: string;
	}

	export interface RallyApiResult {
		Results: any[];
	}

	export interface RallyApi {
		query(queryOptions: RallyQueryOptions): Promise<RallyApiResult>;
		create(options: { type: string; data: Record<string, unknown> }): Promise<{ Object: any }>;
		update(options: { type: string; ref: string; data: Record<string, unknown> }): Promise<{ Object: any }>;
		del(options: { type: string; ref: string }): Promise<void>;
	}

	export interface RallyOptions {
		apiKey?: string;
		server?: string;
		userName?: string;
		password?: string;
		requestOptions?: {
			headers?: Record<string, string>;
		};
		workspace?: string;
		project?: string;
	}

	export interface RallyQueryBuilder {
		where(field: string, operator: string, value: unknown): RallyQueryBuilder;
		and(query: RallyQueryBuilder): RallyQueryBuilder;
	}

	export declare class RestApi implements RallyApi {
		constructor(options?: RallyOptions);
		query(queryOptions: RallyQueryOptions): Promise<RallyApiResult>;
		create(options: { type: string; data: Record<string, unknown> }): Promise<{ Object: any }>;
		update(options: { type: string; ref: string; data: Record<string, unknown> }): Promise<{ Object: any }>;
		del(options: { type: string; ref: string }): Promise<void>;
	}

	export interface RallyModule {
		(options?: RallyOptions): RallyApi;
		createClient(options?: RallyOptions): RallyApi;
		util: {
			query: RallyQueryBuilder;
		};
	}

	const rallyModule: RallyModule;
	export default rallyModule;
}
