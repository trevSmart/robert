import { describe, it, expect } from 'vitest';
import { htmlToPlainText, parseRevisionDescription } from './revisionDescription';

describe('parseRevisionDescription', () => {
	it('parses a simple from/to change', () => {
		const result = parseRevisionDescription('ITERATION changed from [Sprint 91] to [Sprint 92]');
		expect(result.structured).toBe(true);
		expect(result.changes).toEqual([{ field: 'ITERATION', kind: 'changed', from: 'Sprint 91', to: 'Sprint 92' }]);
	});

	it('parses multi-word field names', () => {
		const result = parseRevisionDescription('TASK ESTIMATE TOTAL changed from [118.0] to [88.0]');
		expect(result.structured).toBe(true);
		expect(result.changes[0]).toEqual({ field: 'TASK ESTIMATE TOTAL', kind: 'changed', from: '118.0', to: '88.0' });
	});

	it('parses several changes in one description', () => {
		const result = parseRevisionDescription('RELEASE added [2026-Q3], MILESTONES added [MI43737: (2026-09-22) IOP Salesforce]');
		expect(result.structured).toBe(true);
		expect(result.changes).toEqual([
			{ field: 'RELEASE', kind: 'added', from: null, to: '2026-Q3' },
			{ field: 'MILESTONES', kind: 'added', from: null, to: 'MI43737: (2026-09-22) IOP Salesforce' }
		]);
	});

	it('keeps commas that live inside a bracketed value', () => {
		const result = parseRevisionDescription('MILESTONES added [MI1: Salesforce, Billing, Core]');
		expect(result.structured).toBe(true);
		expect(result.changes).toHaveLength(1);
		expect(result.changes[0].to).toBe('MI1: Salesforce, Billing, Core');
	});

	it('keeps brackets nested inside a value', () => {
		const result = parseRevisionDescription('TAGS added [[US Quality] 28/100 - KO]');
		expect(result.structured).toBe(true);
		expect(result.changes[0]).toEqual({ field: 'TAGS', kind: 'added', from: null, to: '[US Quality] 28/100 - KO' });
	});

	it('keeps nested brackets when another clause follows', () => {
		const result = parseRevisionDescription('TASK STATUS changed from [NONE] to [DEFINED], TASKS added [TA1110817: [AGENTQA] Evaluation 28/100]');
		expect(result.structured).toBe(true);
		expect(result.changes).toEqual([
			{ field: 'TASK STATUS', kind: 'changed', from: 'NONE', to: 'DEFINED' },
			{ field: 'TASKS', kind: 'added', from: null, to: 'TA1110817: [AGENTQA] Evaluation 28/100' }
		]);
	});

	it('reports no previous value for "changed to"', () => {
		const result = parseRevisionDescription('BLOCKED REASON changed to [waiting for API]');
		expect(result.structured).toBe(true);
		expect(result.changes[0]).toEqual({ field: 'BLOCKED REASON', kind: 'changed', from: null, to: 'waiting for API' });
	});

	it('parses removals', () => {
		const result = parseRevisionDescription('MILESTONES removed [MI43737: IOP Salesforce]');
		expect(result.structured).toBe(true);
		expect(result.changes[0]).toMatchObject({ kind: 'removed', to: 'MI43737: IOP Salesforce' });
	});

	it('mixes verbs within one description', () => {
		const result = parseRevisionDescription('BLOCKED changed from [false] to [true], BLOCKED REASON changed to [waiting], TAGS removed [urgent]');
		expect(result.structured).toBe(true);
		expect(result.changes.map(change => change.kind)).toEqual(['changed', 'changed', 'removed']);
		expect(result.changes.map(change => change.field)).toEqual(['BLOCKED', 'BLOCKED REASON', 'TAGS']);
	});

	it('turns empty brackets into null', () => {
		const result = parseRevisionDescription('OWNER changed from [] to [Ada Lovelace]');
		expect(result.structured).toBe(true);
		expect(result.changes[0]).toMatchObject({ from: null, to: 'Ada Lovelace' });
	});

	it('decodes HTML entities in values', () => {
		const result = parseRevisionDescription('NAME changed from [A &amp; B] to [C &amp; D]');
		expect(result.structured).toBe(true);
		expect(result.changes[0]).toMatchObject({ from: 'A & B', to: 'C & D' });
	});

	it('collapses newlines and repeated whitespace', () => {
		const result = parseRevisionDescription('ITERATION changed from [Sprint 91]\n   to [Sprint 92]');
		expect(result.structured).toBe(true);
		expect(result.changes).toHaveLength(1);
	});

	it('strips markup from rich-text values', () => {
		const result = parseRevisionDescription('DESCRIPTION changed from [<p>Old text.</p>] to [<p>New text:</p><ol><li>First</li><li>Second</li></ol>]');
		expect(result.structured).toBe(true);
		expect(result.changes[0].from).toBe('Old text.');
		expect(result.changes[0].to).toBe('New text:\n• First\n• Second');
	});

	it('treats a value that is only markup as empty', () => {
		const result = parseRevisionDescription('NOTES changed from [<p>&nbsp;</p>] to [Something]');
		expect(result.structured).toBe(true);
		expect(result.changes[0].from).toBeNull();
	});

	it('rejects free text', () => {
		expect(parseRevisionDescription('Original story creation').structured).toBe(false);
	});

	it('rejects descriptions carrying raw HTML', () => {
		const result = parseRevisionDescription('DESCRIPTION changed from [<p>old</p>] to [<p>new</p>]<br>and more');
		expect(result.structured).toBe(false);
		expect(result.changes).toEqual([]);
	});

	it('never parses partially — a trailing free-text tail invalidates the whole description', () => {
		const result = parseRevisionDescription('ITERATION changed from [Sprint 91] to [Sprint 92] plus some manual note');
		expect(result.structured).toBe(false);
		expect(result.changes).toEqual([]);
	});

	it('does not mistake lower-case prose for a field name', () => {
		expect(parseRevisionDescription('the field ITERATION changed from [a] to [b]').structured).toBe(false);
	});

	it('handles empty and missing input', () => {
		expect(parseRevisionDescription('')).toEqual({ changes: [], structured: false });
		expect(parseRevisionDescription('   ')).toEqual({ changes: [], structured: false });
		expect(parseRevisionDescription(null)).toEqual({ changes: [], structured: false });
		expect(parseRevisionDescription(undefined)).toEqual({ changes: [], structured: false });
	});

	it('is reusable across calls (global regex state is reset)', () => {
		const text = 'ITERATION changed from [Sprint 91] to [Sprint 92]';
		expect(parseRevisionDescription(text).changes).toEqual(parseRevisionDescription(text).changes);
	});
});

describe('htmlToPlainText', () => {
	it('leaves plain values untouched', () => {
		expect(htmlToPlainText('Sprint 92')).toBe('Sprint 92');
	});

	it('keeps paragraph boundaries as line breaks instead of gluing words together', () => {
		expect(htmlToPlainText('<p>Uno</p><p>Dos</p>')).toBe('Uno\nDos');
	});

	it('bullets list items', () => {
		expect(htmlToPlainText('<ul><li>Uno</li><li>Dos</li></ul>')).toBe('• Uno\n• Dos');
	});

	it('flattens nested lists', () => {
		expect(htmlToPlainText('<ol><li>Uno<ol><li>Uno.a</li></ol></li></ol>')).toBe('• Uno\n• Uno.a');
	});

	it('turns <br> into a line break', () => {
		expect(htmlToPlainText('Uno<br/>Dos')).toBe('Uno\nDos');
	});

	it('drops attributes and inline tags', () => {
		expect(htmlToPlainText('<p class="x">Un <strong>valor</strong> destacat</p>')).toBe('Un valor destacat');
	});

	it('collapses markup-only input to an empty string', () => {
		expect(htmlToPlainText('<p></p><ol></ol>')).toBe('');
	});
});
