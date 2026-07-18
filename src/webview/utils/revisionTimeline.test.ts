import { describe, it, expect } from 'vitest';
import { buildAxisTicks, buildRevisionTimeline, buildTimelineTracks, buildWeekMarkers, formatDuration, type RevisionLike } from './revisionTimeline';

function rev(revisionNumber: number, description: string, createdDate = '2026-01-01T00:00:00.000Z', author = 'Ada'): RevisionLike {
	return { revisionNumber, description, author, createdDate };
}

describe('buildRevisionTimeline', () => {
	it('returns empty timeline for no revisions', () => {
		const result = buildRevisionTimeline([]);
		expect(result.hasEvents).toBe(false);
		expect(result.stateEvents).toEqual([]);
		expect(result.blockedEvents).toEqual([]);
	});

	it('extracts a schedule state transition', () => {
		const result = buildRevisionTimeline([rev(1, 'SCHEDULE STATE changed from [Defined] to [In-Progress]')]);
		expect(result.stateEvents).toHaveLength(1);
		expect(result.stateEvents[0]).toMatchObject({ from: 'Defined', to: 'In-Progress', revisionNumber: 1 });
	});

	it('orders events ascending by revision number even if input is newest-first', () => {
		const result = buildRevisionTimeline([rev(3, 'SCHEDULE STATE changed from [In-Progress] to [Completed]'), rev(2, 'SCHEDULE STATE changed from [Defined] to [In-Progress]')]);
		expect(result.stateEvents.map(e => e.to)).toEqual(['In-Progress', 'Completed']);
	});

	it('treats an empty "from" as null (initial state unknown)', () => {
		const result = buildRevisionTimeline([rev(1, 'SCHEDULE STATE changed from [] to [Defined]')]);
		expect(result.stateEvents[0].from).toBeNull();
		expect(result.stateEvents[0].to).toBe('Defined');
	});

	it('extracts blocked and unblocked events', () => {
		const result = buildRevisionTimeline([rev(1, 'BLOCKED changed from [false] to [true]'), rev(2, 'BLOCKED changed from [true] to [false]')]);
		expect(result.blockedEvents.map(e => e.blocked)).toEqual([true, false]);
	});

	it('captures blocked reason when present', () => {
		const result = buildRevisionTimeline([rev(1, 'BLOCKED changed from [false] to [true], BLOCKED REASON changed to [waiting for API]')]);
		expect(result.blockedEvents[0]).toMatchObject({ blocked: true, reason: 'waiting for API' });
	});

	it('parses state and blocked change in the same revision', () => {
		const result = buildRevisionTimeline([rev(1, 'SCHEDULE STATE changed from [Defined] to [In-Progress], BLOCKED changed from [false] to [true]')]);
		expect(result.stateEvents).toHaveLength(1);
		expect(result.blockedEvents).toHaveLength(1);
	});

	it('computes blocked duration until the matching unblock', () => {
		const result = buildRevisionTimeline([rev(1, 'BLOCKED changed from [false] to [true]', '2026-01-01T00:00:00.000Z'), rev(2, 'BLOCKED changed from [true] to [false]', '2026-01-01T05:00:00.000Z')]);
		expect(result.blockedEvents[0].durationMs).toBe(5 * 3600 * 1000);
		expect(result.blockedEvents[1].durationMs).toBeNull();
	});

	it('leaves duration null while still blocked', () => {
		const result = buildRevisionTimeline([rev(1, 'BLOCKED changed from [false] to [true]')]);
		expect(result.blockedEvents[0].durationMs).toBeNull();
	});

	it('ignores unrelated revisions like Original revision', () => {
		const result = buildRevisionTimeline([rev(0, 'Original revision')]);
		expect(result.hasEvents).toBe(false);
	});
});

describe('buildTimelineTracks', () => {
	const HOUR = 3600 * 1000;
	const t0 = Date.parse('2026-01-01T00:00:00.000Z');
	const now = t0 + 10 * HOUR;

	it('produces a single state segment spanning the whole span when there are no transitions', () => {
		const tracks = buildTimelineTracks([], { creationDate: '2026-01-01T00:00:00.000Z', now, currentState: 'Defined' });
		expect(tracks.stateSegments).toHaveLength(1);
		expect(tracks.stateSegments[0]).toMatchObject({ label: 'Defined' });
		expect(tracks.stateSegments[0].fraction).toBeCloseTo(1, 5);
	});

	it('splits state segments proportionally to elapsed time', () => {
		const tracks = buildTimelineTracks([rev(1, 'SCHEDULE STATE changed from [Defined] to [In-Progress]', '2026-01-01T02:00:00.000Z')], { creationDate: '2026-01-01T00:00:00.000Z', now, currentState: 'In-Progress' });
		expect(tracks.stateSegments.map(s => s.label)).toEqual(['Defined', 'In-Progress']);
		// Defined: 2h of 10h = 0.2, In-Progress: 8h of 10h = 0.8
		expect(tracks.stateSegments[0].fraction).toBeCloseTo(0.2, 5);
		expect(tracks.stateSegments[1].fraction).toBeCloseTo(0.8, 5);
	});

	it('attributes each state segment to the author of the revision that started it', () => {
		const tracks = buildTimelineTracks([rev(1, 'SCHEDULE STATE changed from [Defined] to [In-Progress]', '2026-01-01T02:00:00.000Z', 'Bob'), rev(2, 'SCHEDULE STATE changed from [In-Progress] to [Completed]', '2026-01-01T06:00:00.000Z', 'Carol')], { creationDate: '2026-01-01T00:00:00.000Z', now });
		expect(tracks.stateSegments[0].author).toBeUndefined();
		expect(tracks.stateSegments[1].author).toBe('Bob');
		expect(tracks.stateSegments[2].author).toBe('Carol');
	});

	it('attributes each blocked segment to the author of the revision that started it', () => {
		const tracks = buildTimelineTracks([rev(1, 'BLOCKED changed from [false] to [true]', '2026-01-01T02:00:00.000Z', 'Bob'), rev(2, 'BLOCKED changed from [true] to [false]', '2026-01-01T05:00:00.000Z', 'Carol')], { creationDate: '2026-01-01T00:00:00.000Z', now });
		expect(tracks.blockedSegments[0].author).toBeUndefined();
		expect(tracks.blockedSegments[1].author).toBe('Bob');
		expect(tracks.blockedSegments[2].author).toBe('Carol');
	});

	it('uses creation date as the zero point, not the oldest revision', () => {
		const tracks = buildTimelineTracks([rev(5, 'SCHEDULE STATE changed from [In-Progress] to [Completed]', '2026-01-01T08:00:00.000Z')], { creationDate: '2026-01-01T00:00:00.000Z', now });
		expect(tracks.startMs).toBe(t0);
		expect(tracks.stateSegments[0].fraction).toBeCloseTo(0.8, 5);
	});

	it('builds a blocked track with proportional blocked/unblocked intervals', () => {
		const tracks = buildTimelineTracks([rev(1, 'BLOCKED changed from [false] to [true]', '2026-01-01T02:00:00.000Z'), rev(2, 'BLOCKED changed from [true] to [false]', '2026-01-01T05:00:00.000Z')], { creationDate: '2026-01-01T00:00:00.000Z', now });
		expect(tracks.blockedSegments.map(s => s.blocked)).toEqual([false, true, false]);
		// blocked interval 2h..5h = 3h of 10h
		const blockedSeg = tracks.blockedSegments.find(s => s.blocked);
		expect(blockedSeg?.fraction).toBeCloseTo(0.3, 5);
	});

	it('falls back to a single unblocked segment when there are no blocked events', () => {
		const tracks = buildTimelineTracks([], { creationDate: '2026-01-01T00:00:00.000Z', now, currentBlocked: false });
		expect(tracks.blockedSegments).toHaveLength(1);
		expect(tracks.blockedSegments[0].blocked).toBe(false);
	});

	it('marks sprint starts that fall within the timeline span', () => {
		const tracks = buildTimelineTracks([], {
			creationDate: '2026-01-01T00:00:00.000Z',
			now,
			iterations: [
				{ name: 'Sprint 1', startDate: '2026-01-01T03:00:00.000Z' },
				{ name: 'Sprint 2', startDate: '2026-01-01T07:00:00.000Z' }
			]
		});
		expect(tracks.sprintMarkers.map(m => m.name)).toEqual(['Sprint 1', 'Sprint 2']);
		expect(tracks.sprintMarkers[0].fraction).toBeCloseTo(0.3, 5);
		expect(tracks.sprintMarkers[1].fraction).toBeCloseTo(0.7, 5);
	});

	it('excludes sprint starts outside the timeline span', () => {
		const tracks = buildTimelineTracks([], {
			creationDate: '2026-01-01T00:00:00.000Z',
			now,
			iterations: [
				{ name: 'Before creation', startDate: '2025-12-31T00:00:00.000Z' },
				{ name: 'After now', startDate: '2026-01-02T00:00:00.000Z' }
			]
		});
		expect(tracks.sprintMarkers).toEqual([]);
	});

	it('ignores iterations without a start date', () => {
		const tracks = buildTimelineTracks([], {
			creationDate: '2026-01-01T00:00:00.000Z',
			now,
			iterations: [{ name: 'No date', startDate: null }]
		});
		expect(tracks.sprintMarkers).toEqual([]);
	});

	it('returns no sprint markers when no iterations are given', () => {
		const tracks = buildTimelineTracks([], { creationDate: '2026-01-01T00:00:00.000Z', now });
		expect(tracks.sprintMarkers).toEqual([]);
	});

	it('fractions of each track sum to 1', () => {
		const tracks = buildTimelineTracks([rev(1, 'SCHEDULE STATE changed from [Defined] to [In-Progress]', '2026-01-01T02:00:00.000Z'), rev(2, 'SCHEDULE STATE changed from [In-Progress] to [Completed]', '2026-01-01T06:00:00.000Z')], { creationDate: '2026-01-01T00:00:00.000Z', now });
		const sum = tracks.stateSegments.reduce((acc, s) => acc + s.fraction, 0);
		expect(sum).toBeCloseTo(1, 5);
	});
});

describe('buildAxisTicks', () => {
	it('returns 5 evenly spaced ticks by default', () => {
		const ticks = buildAxisTicks(0, 1000);
		expect(ticks.map(t => t.fraction)).toEqual([0, 0.25, 0.5, 0.75, 1]);
		expect(ticks.map(t => t.ms)).toEqual([0, 250, 500, 750, 1000]);
	});

	it('honors a custom tick count', () => {
		const ticks = buildAxisTicks(0, 100, 3);
		expect(ticks.map(t => t.fraction)).toEqual([0, 0.5, 1]);
		expect(ticks.map(t => t.ms)).toEqual([0, 50, 100]);
	});

	it('returns a single tick at start when count is 1', () => {
		const ticks = buildAxisTicks(10, 200, 1);
		expect(ticks).toEqual([{ ms: 10, fraction: 0 }]);
	});

	it('handles a zero-length span without dividing by zero', () => {
		const ticks = buildAxisTicks(500, 500);
		expect(ticks.every(t => t.ms === 500)).toBe(true);
		expect(ticks.map(t => t.fraction)).toEqual([0, 0.25, 0.5, 0.75, 1]);
	});
});

describe('buildWeekMarkers', () => {
	// 2026-01-01 is a Thursday.
	const start = new Date(2026, 0, 1, 0, 0).getTime();
	const end = new Date(2026, 0, 20, 0, 0).getTime();

	it('marks every Monday when the week starts on Monday', () => {
		const markers = buildWeekMarkers(start, end, 1);
		const days = markers.map(m => new Date(m.ms).getDate());
		expect(days).toEqual([5, 12, 19]);
		markers.forEach(m => expect(new Date(m.ms).getDay()).toBe(1));
	});

	it('marks every Sunday when the week starts on Sunday', () => {
		const markers = buildWeekMarkers(start, end, 0);
		const days = markers.map(m => new Date(m.ms).getDate());
		expect(days).toEqual([4, 11, 18]);
		markers.forEach(m => expect(new Date(m.ms).getDay()).toBe(0));
	});

	it('computes fractions relative to the span', () => {
		const markers = buildWeekMarkers(start, end, 1);
		const totalMs = end - start;
		markers.forEach(m => expect(m.fraction).toBeCloseTo((m.ms - start) / totalMs, 10));
	});

	it('excludes a week-start that lands exactly on startMs', () => {
		const mondayMidnight = new Date(2026, 0, 5, 0, 0).getTime(); // a Monday
		const markers = buildWeekMarkers(mondayMidnight, end, 1);
		const days = markers.map(m => new Date(m.ms).getDate());
		expect(days).toEqual([12, 19]);
	});

	it('returns an empty array when the span is empty or inverted', () => {
		expect(buildWeekMarkers(end, start, 1)).toEqual([]);
		expect(buildWeekMarkers(start, start, 1)).toEqual([]);
	});
});

describe('formatDuration', () => {
	it('formats sub-minute as <1m', () => {
		expect(formatDuration(30 * 1000)).toBe('<1m');
	});
	it('formats minutes', () => {
		expect(formatDuration(12 * 60 * 1000)).toBe('12m');
	});
	it('formats hours and minutes', () => {
		expect(formatDuration((2 * 60 + 30) * 60 * 1000)).toBe('2h 30m');
	});
	it('formats days and hours', () => {
		expect(formatDuration((3 * 24 * 60 + 4 * 60) * 60 * 1000)).toBe('3d 4h');
	});
	it('returns null for null input', () => {
		expect(formatDuration(null)).toBeNull();
	});
});
