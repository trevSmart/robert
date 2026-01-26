import type { UserStory, RallyDefect, Iteration } from '../../types/rally';

/**
 * Interface per mètriques de velocitat per sprint
 */
export interface VelocityData {
	sprintName: string;
	points: number;
	completedStories: number;
}

/**
 * Interface per distribució d'estats
 */
export interface StateDistribution {
	state: string;
	count: number;
	percentage: number;
}

/**
 * Interface per defects agregats per severitat
 */
export interface DefectsBySeverity {
	sprint: string;
	severity: string;
	open: number;
	closed: number;
}

/**
 * Calcula la velocitat (story points completats) per cada sprint
 * @param userStories - Llista de user stories
 * @param iterations - Llista d'iteracions
 * @param numberOfSprints - Nombre de sprints a incloure (per defecte 6)
 * @returns Array de VelocityData ordenat per sprint (més antic primer)
 */
export function calculateVelocity(userStories: UserStory[], iterations: Iteration[], numberOfSprints: number = 6): VelocityData[] {
	// Filtrar només sprints passats o actuals
	const today = new Date();
	today.setHours(23, 59, 59, 999);

	const pastIterations = iterations
		.filter(iteration => {
			const endDate = new Date(iteration.endDate);
			return endDate <= today;
		})
		.sort((a, b) => {
			const dateA = new Date(a.endDate).getTime();
			const dateB = new Date(b.endDate).getTime();
			return dateB - dateA; // Més recent primer
		})
		.slice(0, numberOfSprints)
		.reverse(); // Invertir per tenir més antic primer

	// Calcular punts completats per cada sprint
	const velocityData: VelocityData[] = pastIterations.map(iteration => {
		const completedStories = userStories.filter(story => story.iteration === iteration.name && (story.scheduleState === 'Completed' || story.scheduleState === 'Accepted'));

		const points = completedStories.reduce((sum, story) => sum + (story.planEstimate || 0), 0);

		return {
			sprintName: iteration.name,
			points: points,
			completedStories: completedStories.length
		};
	});

	return velocityData;
}

/**
 * Calcula la mitjana de velocitat dels últims sprints
 * @param velocityData - Dades de velocitat per sprint
 * @returns Mitjana de story points per sprint
 */
export function calculateAverageVelocity(velocityData: VelocityData[]): number {
	if (velocityData.length === 0) return 0;
	const totalPoints = velocityData.reduce((sum, sprint) => sum + sprint.points, 0);
	return Math.round(totalPoints / velocityData.length);
}

/**
 * Calcula Work In Progress (WIP) - nombre de stories actives
 * @param userStories - Llista de user stories
 * @returns Nombre de stories en In-Progress
 */
export function calculateWIP(userStories: UserStory[]): number {
	return userStories.filter(story => story.scheduleState === 'In-Progress').length;
}

/**
 * Calcula el nombre d'items bloquejats
 * @param userStories - Llista de user stories
 * @param defects - Llista de defects (opcional)
 * @returns Nombre total d'items bloquejats
 */
export function calculateBlockedItems(userStories: UserStory[], defects: RallyDefect[] = []): number {
	const blockedStories = userStories.filter(story => story.blocked === true).length;
	const blockedDefects = defects.filter(defect => defect.blocked === true).length;
	return blockedStories + blockedDefects;
}

/**
 * Agrupa user stories per scheduleState
 * @param userStories - Llista de user stories
 * @param iterationName - Nom del sprint (opcional, per filtrar)
 * @returns Array de StateDistribution amb counts i percentatges
 */
export function groupByState(userStories: UserStory[], iterationName?: string): StateDistribution[] {
	// Filtrar per iteració si s'especifica
	let filteredStories = userStories;
	if (iterationName) {
		filteredStories = userStories.filter(story => story.iteration === iterationName);
	}

	const total = filteredStories.length;
	if (total === 0) {
		return [];
	}

	// Agrupar per estat
	const stateCounts = new Map<string, number>();
	filteredStories.forEach(story => {
		const state = story.scheduleState || 'Unknown';
		stateCounts.set(state, (stateCounts.get(state) || 0) + 1);
	});

	// Convertir a array amb percentatges
	const distribution: StateDistribution[] = [];
	stateCounts.forEach((count, state) => {
		distribution.push({
			state: state,
			count: count,
			percentage: Math.round((count / total) * 100)
		});
	});

	// Ordenar per nombre de stories (descendent)
	return distribution.sort((a, b) => b.count - a.count);
}

/**
 * Agrupa defects per severitat i estat
 * @param defects - Llista de defects
 * @param iterations - Llista d'iteracions per agrupar per sprint
 * @param numberOfSprints - Nombre de sprints a incloure
 * @returns Array de DefectsBySeverity
 */
export function aggregateDefectsBySeverity(defects: RallyDefect[], iterations: Iteration[], numberOfSprints: number = 6): DefectsBySeverity[] {
	// Filtrar només sprints passats o actuals
	const today = new Date();
	today.setHours(23, 59, 59, 999);

	const pastIterations = iterations
		.filter(iteration => {
			const endDate = new Date(iteration.endDate);
			return endDate <= today;
		})
		.sort((a, b) => {
			const dateA = new Date(a.endDate).getTime();
			const dateB = new Date(b.endDate).getTime();
			return dateB - dateA;
		})
		.slice(0, numberOfSprints)
		.reverse();

	const result: DefectsBySeverity[] = [];

	// Per cada sprint i severitat, comptar open vs closed
	pastIterations.forEach(iteration => {
		const sprintDefects = defects.filter(defect => defect.iteration === iteration.name);

		// Agrupar per severitat
		const severities = ['Critical', 'Major', 'Minor', 'Cosmetic'];
		severities.forEach(severity => {
			const defectsWithSeverity = sprintDefects.filter(defect => (defect.severity || 'Minor') === severity);

			const open = defectsWithSeverity.filter(defect => defect.state !== 'Closed' && defect.state !== 'Fixed').length;

			const closed = defectsWithSeverity.filter(defect => defect.state === 'Closed' || defect.state === 'Fixed').length;

			// Només afegir si hi ha defects d'aquesta severitat
			if (open > 0 || closed > 0) {
				result.push({
					sprint: iteration.name,
					severity: severity,
					open: open,
					closed: closed
				});
			}
		});
	});

	return result;
}

/**
 * Calcula story points completats del sprint actual
 * @param userStories - Llista de user stories
 * @param currentIterationName - Nom del sprint actual
 * @returns Nombre de story points completats
 */
export function calculateCompletedPoints(userStories: UserStory[], currentIterationName?: string): number {
	let filteredStories = userStories;

	if (currentIterationName) {
		filteredStories = userStories.filter(story => story.iteration === currentIterationName);
	}

	const completedStories = filteredStories.filter(story => story.scheduleState === 'Completed' || story.scheduleState === 'Accepted');

	return completedStories.reduce((sum, story) => sum + (story.planEstimate || 0), 0);
}
