import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
	key: keyof T;
	direction: SortDirection;
}

/**
 * Generic hook for managing table sorting
 * @param items Array of items to sort
 * @param defaultSort Optional default sort configuration
 * @returns { sortedItems, sortConfig, requestSort } sorted items and functions to manage sorting
 */
export function useTableSort<T extends object>(items: T[], defaultSort?: SortConfig<T>) {
	const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(defaultSort ?? null);

	const sortedItems = useMemo(() => {
		if (!sortConfig) return items;

		const sorted = [...items].sort((a, b) => {
			const aVal = a[sortConfig.key];
			const bVal = b[sortConfig.key];

			// Handle null/undefined values
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return 1;
			if (bVal == null) return -1;

			// Handle 'Unassigned' string - always goes to the end
			const isAUnassigned = aVal === 'Unassigned';
			const isBUnassigned = bVal === 'Unassigned';
			if (isAUnassigned && !isBUnassigned) return 1;
			if (!isAUnassigned && isBUnassigned) return -1;
			if (isAUnassigned && isBUnassigned) return 0;

			let result = 0;

			// String comparison
			if (typeof aVal === 'string' && typeof bVal === 'string') {
				result = aVal.localeCompare(bVal);
			}
			// Numeric comparison (including extraction from FormattedID)
			else if (typeof aVal === 'number' && typeof bVal === 'number') {
				result = aVal - bVal;
			}
			// Fallback comparison
			else if (aVal > bVal) {
				result = 1;
			} else if (aVal < bVal) {
				result = -1;
			}

			return sortConfig.direction === 'asc' ? result : -result;
		});

		return sorted;
	}, [items, sortConfig]);

	const requestSort = (key: keyof T) => {
		setSortConfig(prev => {
			// If clicking the same column, toggle direction. Otherwise, set to ascending
			if (prev?.key === key) {
				return prev.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' };
			}
			return { key, direction: 'asc' };
		});
	};

	return { sortedItems, sortConfig, requestSort };
}
