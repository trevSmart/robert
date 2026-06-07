export const MEMBER_COLOR_PALETTE = [
	'#7AB3DE',
	'#93CC94',
	'#F0C84A',
	'#F09090',
	'#6DC8F0',
	'#F0A855',
	'#C17FD4',
	'#F07FAB',
	'#9E82C8',
	'#D4D96A',
	'#7AD4B0',
	'#6DB87E',
	'#E05C5C',
	'#F0A030',
	'#B060C8',
	'#5CA8F0',
	'#42C8D8',
	'#F07850',
	'#E05888',
	'#F0DC6A',
	'#8870C8',
	'#96C868',
	'#F09068',
	'#907868'
];

export function darkenHex(hex: string, percent: number): string {
	const num = parseInt(hex.slice(1), 16);
	const amt = Math.round(2.55 * percent);
	const R = Math.max(0, (num >> 16) - amt);
	const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
	const B = Math.max(0, (num & 0x0000ff) - amt);
	return `#${((0x1000000 + R * 0x10000 + G * 0x100 + B) | 0).toString(16).slice(1)}`;
}

export function isLightVscodeTheme(): boolean {
	const body = document.body;
	return body.classList.contains('vscode-light') || body.getAttribute('data-vscode-theme-kind') === 'light';
}

export function getMemberColor(name: string): string {
	const hash = Math.abs(
		String(name)
			.split('')
			.reduce((a, b) => a + b.charCodeAt(0), 0)
	);
	const base = MEMBER_COLOR_PALETTE[hash % MEMBER_COLOR_PALETTE.length];
	return isLightVscodeTheme() ? darkenHex(base, 2) : darkenHex(base, 7);
}

export interface AssigneeHours {
	name: string;
	value: number;
}

export interface AssigneeUserStories {
	name: string;
	userStories: Array<{
		id: string;
		formattedId: string;
		name: string;
		hours: number;
	}>;
	totalHours: number;
}

export function aggregateHoursByAssignee(userStories: Array<{ assignee: string; taskEstimateTotal: number }>): AssigneeHours[] {
	const aggregated = new Map<string, number>();

	userStories.forEach(story => {
		const assignee = story.assignee || 'Unassigned';
		const hours = story.taskEstimateTotal || 0;
		aggregated.set(assignee, (aggregated.get(assignee) || 0) + hours);
	});

	return Array.from(aggregated.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);
}

export function aggregateUserStoriesByAssignee(userStories: Array<{ objectId: string; formattedId: string; name: string; assignee: string; taskEstimateTotal: number }>): AssigneeUserStories[] {
	const aggregated = new Map<string, Array<{ id: string; formattedId: string; name: string; hours: number }>>();

	userStories.forEach(story => {
		const assignee = story.assignee || 'Unassigned';
		const hours = story.taskEstimateTotal || 0;

		if (!aggregated.has(assignee)) {
			aggregated.set(assignee, []);
		}

		aggregated.get(assignee)!.push({
			id: story.objectId,
			formattedId: story.formattedId,
			name: story.name,
			hours: hours
		});
	});

	return Array.from(aggregated.entries())
		.map(([name, stories]) => ({
			name,
			userStories: stories.sort((a, b) => b.hours - a.hours), // Sort stories by hours descending
			totalHours: stories.reduce((sum, story) => sum + story.hours, 0)
		}))
		.sort((a, b) => b.totalHours - a.totalHours); // Sort assignees by total hours descending
}
