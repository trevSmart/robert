export interface AssigneeHours {
	name: string;
	value: number;
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
