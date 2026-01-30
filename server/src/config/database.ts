import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

export function getPool(): Pool {
	if (!pool) {
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			throw new Error('DATABASE_URL environment variable is not set');
		}

		pool = new Pool({
			connectionString,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000
		});

		pool.on('error', (err: Error) => {
			console.error('Unexpected error on idle client', err);
		});
	}

	return pool;
}

export async function setupDatabase(): Promise<void> {
	const pool = getPool();
	
	// Test connection
	const client = await pool.connect();
	try {
		await client.query('SELECT NOW()');
		console.log('Database connection successful');
	} finally {
		client.release();
	}

	// Run migrations
	await runMigrations();
}

async function runMigrations(): Promise<void> {
	const pool = getPool();
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// Create users table
		await client.query(`
			CREATE TABLE IF NOT EXISTS users (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				rally_user_id VARCHAR(255) UNIQUE NOT NULL,
				display_name VARCHAR(255) NOT NULL,
				email VARCHAR(255),
				created_at TIMESTAMP DEFAULT NOW(),
				updated_at TIMESTAMP DEFAULT NOW()
			)
		`);

		// Create messages table
		await client.query(`
			CREATE TABLE IF NOT EXISTS messages (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				user_story_id VARCHAR(255) NOT NULL,
				content TEXT NOT NULL,
				status VARCHAR(50) DEFAULT 'open',
				created_at TIMESTAMP DEFAULT NOW(),
				updated_at TIMESTAMP DEFAULT NOW()
			)
		`);

		// Create notifications table
		await client.query(`
			CREATE TABLE IF NOT EXISTS notifications (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
				type VARCHAR(50) NOT NULL,
				read BOOLEAN DEFAULT FALSE,
				created_at TIMESTAMP DEFAULT NOW()
			)
		`);

		// Create message_replies table
		await client.query(`
			CREATE TABLE IF NOT EXISTS message_replies (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
				user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				content TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT NOW()
			)
		`);

		// Create message_attendees table for tracking who is attending to requests
		await client.query(`
			CREATE TABLE IF NOT EXISTS message_attendees (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
				user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				created_at TIMESTAMP DEFAULT NOW(),
				UNIQUE(message_id, user_id)
			)
		`);

		// Create indexes for better performance
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_messages_user_story_id ON messages(user_story_id)
		`);
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)
		`);
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
		`);
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)
		`);
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_message_replies_message_id ON message_replies(message_id)
		`);
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_message_attendees_message_id ON message_attendees(message_id)
		`);
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_message_attendees_user_id ON message_attendees(user_id)
		`);

		await client.query('COMMIT');
		console.log('Database migrations completed successfully');
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Migration error:', error);
		throw error;
	} finally {
		client.release();
	}
}

export async function query(text: string, params?: unknown[]): Promise<any> {
	const pool = getPool();
	return pool.query(text, params);
}

export async function getClient(): Promise<PoolClient> {
	const pool = getPool();
	return pool.connect();
}
