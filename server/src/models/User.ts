export interface User {
	id: string;
	rallyUserId: string;
	displayName: string;
	email?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateUserInput {
	rallyUserId: string;
	displayName: string;
	email?: string;
}

export interface UpdateUserInput {
	displayName?: string;
	email?: string;
}
