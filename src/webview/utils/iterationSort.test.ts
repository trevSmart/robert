import { describe, it, expect } from 'vitest';
import { compareIterationsByStart, compareObjectIds } from './iterationSort';

describe('compareObjectIds', () => {
	it('compares numeric object IDs as returned by Rally without throwing', () => {
		expect(() => compareObjectIds(73820049569 as unknown as string, 73820049570 as unknown as string)).not.toThrow();
		expect(compareObjectIds(2 as unknown as string, 10 as unknown as string)).toBeLessThan(0);
	});

	it('orders string IDs numerically', () => {
		expect(compareObjectIds('2', '10')).toBeLessThan(0);
		expect(compareObjectIds('10', '2')).toBeGreaterThan(0);
		expect(compareObjectIds('5', '5')).toBe(0);
	});

	it('handles mixed string and number IDs', () => {
		expect(compareObjectIds('5', 5 as unknown as string)).toBe(0);
	});

	it('handles missing IDs', () => {
		expect(() => compareObjectIds(undefined, null)).not.toThrow();
		expect(compareObjectIds(undefined, '1')).toBeLessThan(0);
	});
});

describe('compareIterationsByStart', () => {
	it('sorts iterations sharing a start date when objectId is a number', () => {
		const iterations = [
			{ objectId: 300 as unknown as string, startDate: '2026-11-02' },
			{ objectId: 100 as unknown as string, startDate: '2026-11-02' },
			{ objectId: 200 as unknown as string, startDate: '2026-10-19' }
		];
		const sorted = [...iterations].sort(compareIterationsByStart);
		expect(sorted.map(i => Number(i.objectId))).toEqual([200, 100, 300]);
	});

	it('puts iterations without a start date first', () => {
		const sorted = [
			{ objectId: '1', startDate: '2026-11-02' },
			{ objectId: '2', startDate: undefined }
		].sort(compareIterationsByStart);
		expect(sorted.map(i => i.objectId)).toEqual(['2', '1']);
	});
});
