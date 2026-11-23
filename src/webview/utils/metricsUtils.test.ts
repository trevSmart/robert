import { describe, it, expect } from 'vitest';
import { resolveReadinessTarget } from './metricsUtils';

const sprint = (name: string, endDate = '2026-12-15T22:59:59.000Z') => ({ name, endDate });

describe('resolveReadinessTarget', () => {
	const current = sprint('Sprint 55 - IOP enero 2027');
	const next = sprint('Sprint 56', '2027-01-20T22:59:59.000Z');
	const older = sprint('Sprint 54 - IOP noviembre', '2026-10-28T22:59:59.000Z');
	const iterations = [current, next, older];

	it('uses the next sprint when it exists', () => {
		const result = resolveReadinessTarget('next', iterations, next, current);
		expect(result.target).toBe(next);
		expect(result.notice).toBeNull();
		expect(result.emptyMessage).toBe('No user stories in Sprint 56.');
	});

	it('falls back to the current sprint, with a notice, when no next sprint has been created yet', () => {
		const result = resolveReadinessTarget('next', [current, older], null, current);
		expect(result.target).toBe(current);
		expect(result.notice).toMatch(/^No upcoming sprint has been created yet\. Showing the current sprint \(ends .+\)\.$/);
		expect(result.emptyMessage).toBe('No user stories in Sprint 55 - IOP enero 2027.');
	});

	it('explains how to proceed when there is neither a next nor a current sprint', () => {
		const result = resolveReadinessTarget('next', [older], null, null);
		expect(result.target).toBeNull();
		expect(result.notice).toBeNull();
		expect(result.emptyMessage).toBe('No current or upcoming sprint found. Pick a sprint above.');
	});

	it('uses the explicitly selected sprint by name', () => {
		const result = resolveReadinessTarget('Sprint 54 - IOP noviembre', iterations, next, current);
		expect(result.target).toBe(older);
		expect(result.notice).toBeNull();
	});

	it('reports a selected sprint that no longer exists', () => {
		const result = resolveReadinessTarget('Sprint 1', iterations, next, current);
		expect(result.target).toBeNull();
		expect(result.emptyMessage).toBe('Sprint "Sprint 1" not found. Pick a sprint above.');
	});
});
