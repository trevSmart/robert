import { query } from '../config/database';
import { Notification, CreateNotificationInput } from '../models/Notification';

export async function getNotificationsByUserId(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
	let sql = `
		SELECT n.*, m.user_story_id, m.content as message_content,
		       u.display_name as message_user_display_name
		FROM notifications n
		LEFT JOIN messages m ON n.message_id = m.id
		LEFT JOIN users u ON m.user_id = u.id
		WHERE n.user_id = $1
	`;
	const params: unknown[] = [userId];

	if (unreadOnly) {
		sql += ' AND n.read = FALSE';
	}

	sql += ' ORDER BY n.created_at DESC LIMIT 100';

	const result = await query(sql, params);

	return result.rows.map(mapRowToNotification);
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
	const result = await query(
		`INSERT INTO notifications (user_id, message_id, type, read)
		 VALUES ($1, $2, $3, FALSE)
		 RETURNING *`,
		[input.userId, input.messageId || null, input.type]
	);

	return mapRowToNotification(result.rows[0]);
}

export async function markNotificationAsRead(id: string, userId: string): Promise<Notification> {
	const result = await query(
		`UPDATE notifications
		 SET read = TRUE
		 WHERE id = $1 AND user_id = $2
		 RETURNING *`,
		[id, userId]
	);

	if (result.rows.length === 0) {
		throw new Error('Notification not found');
	}

	return mapRowToNotification(result.rows[0]);
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
	await query(
		`UPDATE notifications
		 SET read = TRUE
		 WHERE user_id = $1 AND read = FALSE`,
		[userId]
	);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
	const result = await query(
		`SELECT COUNT(*) as count
		 FROM notifications
		 WHERE user_id = $1 AND read = FALSE`,
		[userId]
	);

	return parseInt(result.rows[0].count, 10);
}

function mapRowToNotification(row: any): Notification {
	return {
		id: row.id,
		userId: row.user_id,
		messageId: row.message_id,
		type: row.type,
		read: row.read,
		createdAt: row.created_at,
		message: row.message_id ? {
			id: row.message_id,
			userStoryId: row.user_story_id,
			content: row.message_content,
			user: row.message_user_display_name ? {
				displayName: row.message_user_display_name
			} : undefined
		} : undefined
	};
}
