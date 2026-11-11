import { describe, expect, it } from 'vitest';
import { MAX_ESTIMATED_HOURS, parseEstimatedHours, validateEstimatedHours } from './estimatedHours';

describe('parseEstimatedHours', () => {
	it.each([
		['8', 8],
		[' 8 ', 8],
		['1.5', 1.5],
		['1,5', 1.5],
		['8h', 8],
		['8 H', 8],
		['.5', 0.5],
		['0', 0],
		[String(MAX_ESTIMATED_HOURS), MAX_ESTIMATED_HOURS]
	])('accepts %j as %d hours', (input, expected) => {
		expect(parseEstimatedHours(input)).toEqual({ ok: true, value: expected });
	});

	it('asks for a value when the input is empty', () => {
		expect(parseEstimatedHours('  ')).toEqual({ ok: false, error: 'Enter a number of hours' });
	});

	it.each(['abc', '1.2.3', '1e3', '8 hours', '1,5,0'])('rejects %j as not a number', input => {
		expect(parseEstimatedHours(input)).toEqual({ ok: false, error: 'Estimated hours must be a number' });
	});

	it('rejects negative values', () => {
		expect(parseEstimatedHours('-2')).toEqual({ ok: false, error: 'Estimated hours cannot be negative' });
	});

	it('rejects values above the maximum', () => {
		expect(parseEstimatedHours(String(MAX_ESTIMATED_HOURS + 1)).ok).toBe(false);
	});
});

describe('validateEstimatedHours', () => {
	it.each([Number.NaN, Number.POSITIVE_INFINITY])('rejects %d', value => {
		expect(validateEstimatedHours(value).ok).toBe(false);
	});

	it('rejects non-numbers coming from an untyped message', () => {
		expect(validateEstimatedHours('8' as unknown as number).ok).toBe(false);
	});
});
