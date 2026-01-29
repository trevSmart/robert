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
