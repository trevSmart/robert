export interface User {
	id: string;
	jiraUserId: string;
	displayName: string;
	email?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateUserInput {
	jiraUserId: string;
	displayName: string;
	email?: string;
}

export interface UpdateUserInput {
	displayName?: string;
	email?: string;
}
