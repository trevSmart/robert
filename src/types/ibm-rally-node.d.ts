// Type definitions for ibm-rally-node
declare module 'ibm-rally-node' {
	// Import the RallyApiObject type from local definitions to ensure consistency
	import type { RallyApiObject, RallyApiResult } from '../rally';

	export interface RallyQueryOptions {
		type: string;
		fetch?: string[];
		query?: unknown;
		limit?: number;
		start?: number;
		order?: unknown;
		where?: string;
	}

	export interface RallyApi {
		query(queryOptions: RallyQueryOptions): Promise<RallyApiResult>;
		get(options: { type: string; fetch?: string[]; ref?: string }): Promise<{ Object: RallyApiObject }>;
		create(options: { type: string; data: Record<string, unknown> }): Promise<{ Object: RallyApiObject }>;
		update(options: { type: string; ref: string; data: Record<string, unknown> }): Promise<{ Object: RallyApiObject }>;
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
		get(options: { type: string; fetch?: string[]; ref?: string }): Promise<{ Object: RallyApiObject }>;
		create(options: { type: string; data: Record<string, unknown> }): Promise<{ Object: RallyApiObject }>;
		update(options: { type: string; ref: string; data: Record<string, unknown> }): Promise<{ Object: RallyApiObject }>;
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
