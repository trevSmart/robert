import { query } from '../config/database';
import { User, CreateUserInput, UpdateUserInput } from '../models/User';

export async function findUserByRallyId(rallyUserId: string): Promise<User | null> {
	const result = await query(
		'SELECT * FROM users WHERE rally_user_id = $1',
		[rallyUserId]
	);

	if (result.rows.length === 0) {
		return null;
	}

	return mapRowToUser(result.rows[0]);
}

export async function findUserById(id: string): Promise<User | null> {
	const result = await query(
		'SELECT * FROM users WHERE id = $1',
		[id]
	);

	if (result.rows.length === 0) {
		return null;
	}

	return mapRowToUser(result.rows[0]);
}

export async function createUser(input: CreateUserInput): Promise<User> {
	const result = await query(
		`INSERT INTO users (rally_user_id, display_name, email)
		 VALUES ($1, $2, $3)
		 RETURNING *`,
		[input.rallyUserId, input.displayName, input.email || null]
	);

	return mapRowToUser(result.rows[0]);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
	const updates: string[] = [];
	const values: unknown[] = [];
	let paramCount = 1;

	if (input.displayName !== undefined) {
		updates.push(`display_name = $${paramCount++}`);
		values.push(input.displayName);
	}

	if (input.email !== undefined) {
		updates.push(`email = $${paramCount++}`);
		values.push(input.email);
	}

	if (updates.length === 0) {
		const user = await findUserById(id);
		if (!user) {
			throw new Error('User not found');
		}
		return user;
	}

	updates.push(`updated_at = NOW()`);
	values.push(id);

	const result = await query(
		`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
		values
	);

	return mapRowToUser(result.rows[0]);
}

export async function getOrCreateUser(rallyUserId: string, displayName: string, email?: string): Promise<User> {
	let user = await findUserByRallyId(rallyUserId);

	if (!user) {
		user = await createUser({
			rallyUserId,
			displayName,
			email
		});
	} else if (displayName !== user.displayName || email !== user.email) {
		user = await updateUser(user.id, {
			displayName,
			email
		});
	}

	return user;
}

function mapRowToUser(row: any): User {
	return {
		id: row.id,
		rallyUserId: row.rally_user_id,
		displayName: row.display_name,
		email: row.email,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}
