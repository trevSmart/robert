/**
 * Pure helpers behind the custom Select component: keyboard navigation, type-ahead and
 * where to place the floating option list. Kept free of React/DOM so they can be unit tested.
 */

export type NavigationAction = 'next' | 'previous' | 'first' | 'last';

/** New active option index after a keyboard action. No wrapping; -1 for an empty list. */
export function moveActiveIndex(current: number, action: NavigationAction, count: number): number {
	if (count <= 0) return -1;
	switch (action) {
		case 'first':
			return 0;
		case 'last':
			return count - 1;
		case 'next':
			return current < 0 ? 0 : Math.min(current + 1, count - 1);
		case 'previous':
			return current < 0 ? count - 1 : Math.max(current - 1, 0);
	}
}

/**
 * Index of the option matching the typed prefix (case-insensitive), or -1.
 * A single character cycles through matches starting after the current option; a longer
 * prefix (the user keeps typing) starts at the current option so it stays put while it matches.
 */
export function typeaheadIndex(labels: string[], query: string, current: number): number {
	const needle = query.toLocaleLowerCase();
	if (!needle || !labels.length) return -1;
	const start = needle.length === 1 ? current + 1 : Math.max(current, 0);
	for (let offset = 0; offset < labels.length; offset += 1) {
		const index = (((start + offset) % labels.length) + labels.length) % labels.length;
		if (labels[index].toLocaleLowerCase().startsWith(needle)) {
			return index;
		}
	}
	return -1;
}

export interface TriggerRect {
	top: number;
	bottom: number;
	left: number;
	width: number;
}

export interface MenuPlacement {
	/** Viewport-relative top of the option list (for `position: fixed`). */
	top: number;
	left: number;
	maxHeight: number;
	openUpwards: boolean;
}

const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;
export const MENU_MAX_HEIGHT = 320;

/**
 * Places the option list below the trigger, or above it when it does not fit below and fits
 * above. When neither side fits, it uses the roomier side and shrinks. Horizontally it is kept
 * inside the viewport.
 */
export function menuPlacement(trigger: TriggerRect, contentHeight: number, viewport: { width: number; height: number }, menuWidth: number = trigger.width): MenuPlacement {
	const desired = Math.min(contentHeight, MENU_MAX_HEIGHT);
	const spaceBelow = viewport.height - trigger.bottom - MENU_GAP - VIEWPORT_MARGIN;
	const spaceAbove = trigger.top - MENU_GAP - VIEWPORT_MARGIN;
	const openUpwards = desired > spaceBelow && (desired <= spaceAbove || spaceAbove > spaceBelow);
	const maxHeight = Math.max(0, Math.min(MENU_MAX_HEIGHT, openUpwards ? spaceAbove : spaceBelow));
	const top = openUpwards ? trigger.top - MENU_GAP - Math.min(desired, maxHeight) : trigger.bottom + MENU_GAP;
	const width = Math.max(trigger.width, menuWidth);
	const left = Math.max(VIEWPORT_MARGIN, Math.min(trigger.left, viewport.width - width - VIEWPORT_MARGIN));
	return { top, left, maxHeight, openUpwards };
}
