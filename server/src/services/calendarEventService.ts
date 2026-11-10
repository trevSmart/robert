import { query } from '../config/database';
import { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from '../models/CalendarEvent';

export async function getAllCalendarEvents(): Promise<CalendarEvent[]> {
	const result = await query(
		`SELECT *
		 FROM calendar_events
		 ORDER BY date DESC, created_at DESC`
	);

	return result.rows.map(mapRowToCalendarEvent);
}

export async function getCalendarEventById(id: string): Promise<CalendarEvent | null> {
	const result = await query(
		`SELECT *
		 FROM calendar_events
		 WHERE id = $1`,
		[id]
	);

	if (result.rows.length === 0) {
		return null;
	}

	return mapRowToCalendarEvent(result.rows[0]);
}

export async function createCalendarEvent(
	userId: string,
	rallyUserId: string,
	displayName: string,
	input: CreateCalendarEventInput
): Promise<CalendarEvent> {
	const result = await query(
		`INSERT INTO calendar_events (creator_id, creator_rally_user_id, creator_display_name, date, time, title, description, color)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING *`,
		[userId, rallyUserId, displayName, input.date, input.time || null, input.title, input.description || null, input.color]
	);

	return mapRowToCalendarEvent(result.rows[0]);
}

export async function updateCalendarEvent(
	id: string,
	creatorId: string,
	input: UpdateCalendarEventInput
): Promise<CalendarEvent | null> {
	// Build update query dynamically
	const updates: string[] = [];
	const values: unknown[] = [];
	let paramCount = 1;

	if (input.date !== undefined) {
		updates.push(`date = $${paramCount++}`);
		values.push(input.date);
	}
	if (input.time !== undefined) {
		updates.push(`time = $${paramCount++}`);
		values.push(input.time || null);
	}
	if (input.title !== undefined) {
		updates.push(`title = $${paramCount++}`);
		values.push(input.title);
	}
	if (input.description !== undefined) {
		updates.push(`description = $${paramCount++}`);
		values.push(input.description || null);
	}
	if (input.color !== undefined) {
		updates.push(`color = $${paramCount++}`);
		values.push(input.color);
	}

	if (updates.length === 0) {
		// No updates provided, return existing event only if owned by creator
		const existing = await query(
			`SELECT * FROM calendar_events WHERE id = $1 AND creator_id = $2`,
			[id, creatorId]
		);
		return existing.rows.length > 0 ? mapRowToCalendarEvent(existing.rows[0]) : null;
	}

	updates.push(`updated_at = NOW()`);
	// id and creator_id come after the SET values
	values.push(id, creatorId);

	const result = await query(
		`UPDATE calendar_events
		 SET ${updates.join(', ')}
		 WHERE id = $${paramCount} AND creator_id = $${paramCount + 1}
		 RETURNING *`,
		values
	);

	if (result.rows.length === 0) {
		return null;
	}

	return mapRowToCalendarEvent(result.rows[0]);
}

export async function deleteCalendarEvent(id: string, creatorId: string): Promise<boolean> {
	const result = await query(
		`DELETE FROM calendar_events WHERE id = $1 AND creator_id = $2`,
		[id, creatorId]
	);

	return result.rowCount > 0;
}

function mapRowToCalendarEvent(row: any): CalendarEvent {
	return {
		id: row.id,
		creatorId: row.creator_id,
		creatorRallyUserId: row.creator_rally_user_id,
		creatorDisplayName: row.creator_display_name,
		date: row.date,
		time: row.time || undefined,
		title: row.title,
		description: row.description || undefined,
		color: row.color,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}
