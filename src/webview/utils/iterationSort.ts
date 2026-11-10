/**
 * Compares Rally object IDs regardless of their runtime type.
 *
 * Rally returns `ObjectID` as a number, even though our types declare `objectId: string`.
 * Calling `String.prototype.localeCompare` directly on it throws
 * "objectId.localeCompare is not a function", so we normalise to string first and compare
 * numerically to keep a stable, meaningful order.
 */
export function compareObjectIds(a: string | number | null | undefined, b: string | number | null | undefined): number {
	return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
}

interface SortableIteration {
	objectId?: string | number | null;
	startDate?: string | null;
}

/** Sorts iterations by start date, breaking ties deterministically by objectId. */
export function compareIterationsByStart(a: SortableIteration, b: SortableIteration): number {
	const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
	const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
	if (aStart !== bStart) return aStart - bStart;
	return compareObjectIds(a.objectId, b.objectId);
}
