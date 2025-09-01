declare module 'rally' {
	interface RallyApi {
		query(queryOptions: unknown): Promise<unknown>;
	}

	interface RallyOptions {
		apiKey: string;
		server: string;
		requestOptions?: {
			headers?: Record<string, string>;
		};
	}

	interface RallyQueryBuilder {
		where(field: string, operator: string, value: unknown): RallyQueryBuilder;
		and(query: RallyQueryBuilder): RallyQueryBuilder;
	}

	interface RallyModule {
		(options: RallyOptions): RallyApi;
		util: {
			query: RallyQueryBuilder;
		};
	}

	const rally: RallyModule;
	export default rally;
}
