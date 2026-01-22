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
