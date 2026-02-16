// Shared types for utility modules (not Rally-specific)

/**
 * Holiday interface for public holidays
 * Used by the Holiday Service to fetch and represent holiday data
 */
export interface Holiday {
	date: string; // ISO 8601 format (YYYY-MM-DD)
	name: string;
	localName?: string;
	countryCode?: string;
	global?: boolean;
	counties?: string[] | null;
	fixed?: boolean;
	launchYear?: number | null;
	types?: string[];
}

/**
 * Generic day event that can be displayed in the calendar
 * Supports holidays, sprint cutoffs, and other event types
 */
export interface DayEvent {
	type: 'holiday' | 'sprintCutoff' | 'other';
	displayText: string;
	tooltip: string;
	color: string; // Hex color code
	opacity: number; // 0-1 transparency level
	data?: Holiday | Record<string, unknown> | unknown; // Original data object (Holiday, Iteration, etc)
}
