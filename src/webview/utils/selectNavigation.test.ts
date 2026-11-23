import { describe, it, expect } from 'vitest';
import { moveActiveIndex, typeaheadIndex, menuPlacement } from './selectNavigation';

const labels = ['All projects', 'Backlog.Salesforce CSBD', 'Backend', 'Team Alpha', 'team beta'];

describe('moveActiveIndex', () => {
	it('moves down and up without wrapping', () => {
		expect(moveActiveIndex(0, 'next', 5)).toBe(1);
		expect(moveActiveIndex(4, 'next', 5)).toBe(4);
		expect(moveActiveIndex(1, 'previous', 5)).toBe(0);
		expect(moveActiveIndex(0, 'previous', 5)).toBe(0);
	});

	it('jumps to the first and last option', () => {
		expect(moveActiveIndex(2, 'first', 5)).toBe(0);
		expect(moveActiveIndex(2, 'last', 5)).toBe(4);
	});

	it('starts from the edges when nothing is active yet', () => {
		expect(moveActiveIndex(-1, 'next', 5)).toBe(0);
		expect(moveActiveIndex(-1, 'previous', 5)).toBe(4);
	});

	it('returns -1 for an empty list', () => {
		expect(moveActiveIndex(0, 'next', 0)).toBe(-1);
	});
});

describe('typeaheadIndex', () => {
	it('finds the next option starting with the typed text, case-insensitively', () => {
		expect(typeaheadIndex(labels, 't', 0)).toBe(3);
		expect(typeaheadIndex(labels, 'T', 3)).toBe(4);
	});

	it('wraps around to the start of the list', () => {
		expect(typeaheadIndex(labels, 'b', 2)).toBe(1);
	});

	it('matches multi-character prefixes from the current option', () => {
		expect(typeaheadIndex(labels, 'back', 0)).toBe(1);
		expect(typeaheadIndex(labels, 'backe', 1)).toBe(2);
	});

	it('returns -1 when nothing matches', () => {
		expect(typeaheadIndex(labels, 'zz', 0)).toBe(-1);
	});
});

describe('menuPlacement', () => {
	const trigger = { top: 100, bottom: 128, left: 40, width: 200 };

	it('opens below the trigger when there is room', () => {
		expect(menuPlacement(trigger, 240, { width: 1000, height: 800 })).toEqual({ top: 132, left: 40, maxHeight: 320, openUpwards: false });
	});

	it('opens above the trigger near the bottom edge', () => {
		const low = { top: 700, bottom: 728, left: 40, width: 200 };
		expect(menuPlacement(low, 240, { width: 1000, height: 800 })).toEqual({ top: 456, left: 40, maxHeight: 320, openUpwards: true });
	});

	it('keeps the menu inside the viewport horizontally', () => {
		const right = { top: 100, bottom: 128, left: 900, width: 80 };
		expect(menuPlacement(right, 240, { width: 1000, height: 800 }, 200).left).toBe(792);
	});

	it('shrinks the menu when neither side has room for it', () => {
		const mid = { top: 120, bottom: 148, left: 40, width: 200 };
		const placement = menuPlacement(mid, 600, { width: 1000, height: 400 });
		expect(placement.openUpwards).toBe(false);
		// 400 viewport − 148 trigger bottom − 4 gap − 8 margin
		expect(placement.maxHeight).toBe(240);
	});
});
