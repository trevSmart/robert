export interface CalendarEvent {
	id: string;
	creatorId: string; // UUID -> users.id
	creatorRallyUserId: string;
	creatorDisplayName: string;
	date: string; // YYYY-MM-DD
	time?: string; // HH:MM
	title: string;
	description?: string;
	color: string; // hex
	createdAt: string;
	updatedAt: string;
}

export interface CreateCalendarEventInput {
	date: string;
	time?: string;
	title: string;
	description?: string;
	color: string;
}

export interface UpdateCalendarEventInput {
	date?: string;
	time?: string;
	title?: string;
	description?: string;
	color?: string;
}
