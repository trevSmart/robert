import { describe, it, expect } from 'vitest';
import { resolveStartupSection, STARTUP_SECTIONS } from './startupSection';

describe('resolveStartupSection', () => {
	it('returns the configured section', () => {
		expect(resolveStartupSection('portfolio')).toBe('portfolio');
		expect(resolveStartupSection('team')).toBe('team');
		expect(resolveStartupSection('metrics')).toBe('metrics');
	});

	it('accepts every section offered by the setting', () => {
		for (const section of STARTUP_SECTIONS) {
			expect(resolveStartupSection(section)).toBe(section);
		}
	});

	it('is case- and whitespace-insensitive (values can also come from an environment variable)', () => {
		expect(resolveStartupSection('  Portfolio ')).toBe('portfolio');
	});

	it('falls back to home for missing, unknown or non-startup sections', () => {
		expect(resolveStartupSection(undefined)).toBe('home');
		expect(resolveStartupSection('')).toBe('home');
		expect(resolveStartupSection('unknown')).toBe('home');
		// Dev-only / feature-flagged tabs are not valid startup tabs.
		expect(resolveStartupSection('test')).toBe('home');
		expect(resolveStartupSection('collaboration')).toBe('home');
		// The unreplaced template placeholder when the HTML is served without injection.
		expect(resolveStartupSection('__STARTUP_TAB__')).toBe('home');
	});
});
