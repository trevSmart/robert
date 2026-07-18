/**
 * Utilities to build a state/blocked timeline out of Rally revision descriptions.
 *
 * Rally stores every change as a free-text `Description` on each Revision, e.g.:
 *   "SCHEDULE STATE changed from [Defined] to [In-Progress]"
 *   "BLOCKED changed from [false] to [true], BLOCKED REASON changed to [waiting for API]"
 *
 * These helpers extract Schedule State transitions and Blocked/Unblocked events so
 * the detail view can render them as a timeline without any extra Rally API calls.
 */

export interface RevisionLike {
	revisionNumber: number;
	description: string;
	author: string;
	createdDate: string;
}

export interface StateEvent {
	revisionNumber: number;
	date: string;
	author: string;
	from: string | null;
	to: string;
}

export interface BlockedEvent {
	revisionNumber: number;
	date: string;
	author: string;
	blocked: boolean;
	reason: string | null;
	/** Duration in ms until the matching unblock; null while still blocked. Only set on `blocked: true` events. */
	durationMs: number | null;
}

export interface RevisionTimeline {
	stateEvents: StateEvent[];
	blockedEvents: BlockedEvent[];
	/** True when there is at least one state or blocked event. */
	hasEvents: boolean;
}

const STATE_RE = /(?:SCHEDULE STATE|STATE) changed from \[([^\]]*)\] to \[([^\]]*)\]/i;
const BLOCKED_RE = /BLOCKED changed from \[([^\]]*)\] to \[([^\]]*)\]/i;
const BLOCKED_REASON_RE = /BLOCKED REASON changed to \[([^\]]*)\]/i;

function normalizeValue(raw: string): string {
	return raw.trim();
}

function isTruthyFlag(raw: string): boolean {
	return normalizeValue(raw).toLowerCase() === 'true';
}

/**
 * Parse Rally revisions into a chronological (ascending) timeline of Schedule State
 * transitions and Blocked/Unblocked events.
 */
export function buildRevisionTimeline(revisions: RevisionLike[]): RevisionTimeline {
	const empty: RevisionTimeline = { stateEvents: [], blockedEvents: [], hasEvents: false };
	if (!Array.isArray(revisions) || revisions.length === 0) {
		return empty;
	}

	// Rally returns revisions newest-first; work ascending so "from → to" reads forward in time.
	const ascending = [...revisions].sort((a, b) => (a.revisionNumber ?? 0) - (b.revisionNumber ?? 0));

	const stateEvents: StateEvent[] = [];
	const blockedEvents: BlockedEvent[] = [];

	for (const revision of ascending) {
		const description = typeof revision.description === 'string' ? revision.description : '';
		if (!description) continue;

		const stateMatch = description.match(STATE_RE);
		if (stateMatch) {
			const from = normalizeValue(stateMatch[1]);
			stateEvents.push({
				revisionNumber: revision.revisionNumber,
				date: revision.createdDate,
				author: revision.author,
				from: from.length > 0 ? from : null,
				to: normalizeValue(stateMatch[2])
			});
		}

		const blockedMatch = description.match(BLOCKED_RE);
		if (blockedMatch) {
			const reasonMatch = description.match(BLOCKED_REASON_RE);
			const reason = reasonMatch ? normalizeValue(reasonMatch[1]) : null;
			blockedEvents.push({
				revisionNumber: revision.revisionNumber,
				date: revision.createdDate,
				author: revision.author,
				blocked: isTruthyFlag(blockedMatch[2]),
				reason: reason && reason.length > 0 ? reason : null,
				durationMs: null
			});
		}
	}

	// Pair each "blocked" with the next "unblocked" to compute how long it stayed blocked.
	// Single pass: remember every blocked event still awaiting its unblock, and resolve them
	// all at once when the next "unblocked" event is reached (events are already chronological).
	const pendingBlockedIndices: number[] = [];
	for (let i = 0; i < blockedEvents.length; i++) {
		const event = blockedEvents[i];
		if (event.blocked) {
			pendingBlockedIndices.push(i);
			continue;
		}
		if (pendingBlockedIndices.length === 0) continue;
		const end = new Date(event.date).getTime();
		if (!Number.isNaN(end)) {
			for (const pendingIndex of pendingBlockedIndices) {
				const start = new Date(blockedEvents[pendingIndex].date).getTime();
				if (!Number.isNaN(start) && end >= start) {
					blockedEvents[pendingIndex].durationMs = end - start;
				}
			}
		}
		pendingBlockedIndices.length = 0;
	}

	return {
		stateEvents,
		blockedEvents,
		hasEvents: stateEvents.length > 0 || blockedEvents.length > 0
	};
}

export interface TimelineSegment {
	label: string;
	startMs: number;
	endMs: number;
	durationMs: number;
	/** Share of the total span, 0..1. */
	fraction: number;
	/** Only set on blocked-track segments. */
	blocked?: boolean;
	/** Blocked reason, when the segment is a blocked interval. */
	reason?: string | null;
	/** Rally user who made the change that started this segment; unknown for the initial segment. */
	author?: string;
}

export interface SprintMarker {
	name: string;
	startMs: number;
	/** Position along the timeline span, 0..1. */
	fraction: number;
}

export interface TimelineTracks {
	startMs: number;
	endMs: number;
	totalMs: number;
	stateSegments: TimelineSegment[];
	blockedSegments: TimelineSegment[];
	sprintMarkers: SprintMarker[];
	hasData: boolean;
}

export interface IterationLike {
	name: string;
	startDate: string | null | undefined;
}

export interface BuildTracksOptions {
	/** Story creation date — the timeline zero point. Falls back to the oldest revision. */
	creationDate?: string | null;
	/** "Now" in ms (Date.now()); the timeline end point. */
	now: number;
	/** Current schedule state, used when no transitions were parsed. */
	currentState?: string | null;
	/** Current blocked flag, used when no blocked events were parsed. */
	currentBlocked?: boolean;
	/** Iterations/sprints to mark on the timeline where their start date falls within the span. */
	iterations?: IterationLike[];
}

function toMs(value: string | null | undefined): number | null {
	if (!value) return null;
	const ms = new Date(value).getTime();
	return Number.isNaN(ms) ? null : ms;
}

/** Build segments from ascending boundary times and per-segment labels. */
function segmentsFromBoundaries(boundaries: number[], labels: string[], totalMs: number, extra: (index: number) => Partial<TimelineSegment>): TimelineSegment[] {
	const segments: TimelineSegment[] = [];
	for (let i = 0; i < labels.length; i++) {
		const startMs = boundaries[i];
		const endMs = boundaries[i + 1];
		const durationMs = Math.max(0, endMs - startMs);
		segments.push({
			label: labels[i],
			startMs,
			endMs,
			durationMs,
			fraction: totalMs > 0 ? durationMs / totalMs : 0,
			...extra(i)
		});
	}
	return segments;
}

/**
 * Turn Rally revisions into two proportional tracks (state + blocked) spanning
 * from the story creation until now, so each segment's width reflects the share
 * of total elapsed time spent in that state / blocked interval.
 */
export function buildTimelineTracks(revisions: RevisionLike[], options: BuildTracksOptions): TimelineTracks {
	const { stateEvents, blockedEvents } = buildRevisionTimeline(revisions);

	// Zero point: creation date, else the oldest revision, else the earliest event.
	const revisionTimes = (revisions ?? []).map(r => toMs(r.createdDate)).filter((n): n is number => n !== null);
	const eventTimes = [...stateEvents, ...blockedEvents].map(e => toMs(e.date)).filter((n): n is number => n !== null);
	const candidateStarts = [toMs(options.creationDate), ...revisionTimes, ...eventTimes].filter((n): n is number => n !== null);

	const startMs = candidateStarts.length > 0 ? Math.min(...candidateStarts) : options.now;
	const endMs = Math.max(options.now, startMs, ...eventTimes);
	const totalMs = Math.max(endMs - startMs, 1);

	const clamp = (ms: number | null): number => {
		if (ms === null) return startMs;
		return Math.min(Math.max(ms, startMs), endMs);
	};
	// Keep boundaries monotonic even if a truncated history has odd ordering.
	const monotonic = (times: number[]): number[] => {
		const out: number[] = [];
		let prev = startMs;
		for (const t of times) {
			prev = Math.max(prev, t);
			out.push(prev);
		}
		return out;
	};

	// State track.
	let stateSegments: TimelineSegment[];
	if (stateEvents.length > 0) {
		const labels = [stateEvents[0].from ?? 'Unknown', ...stateEvents.map(e => e.to)];
		const inner = monotonic(stateEvents.map(e => clamp(toMs(e.date))));
		const boundaries = [startMs, ...inner, endMs];
		stateSegments = segmentsFromBoundaries(boundaries, labels, totalMs, i => (i > 0 ? { author: stateEvents[i - 1].author } : {}));
	} else {
		stateSegments = segmentsFromBoundaries([startMs, endMs], [options.currentState ?? 'Unknown'], totalMs, () => ({}));
	}

	// Blocked track: assume created unblocked; each event toggles the flag.
	let blockedSegments: TimelineSegment[];
	if (blockedEvents.length > 0) {
		const values = [false, ...blockedEvents.map(e => e.blocked)];
		const reasons = [null as string | null, ...blockedEvents.map(e => e.reason)];
		const inner = monotonic(blockedEvents.map(e => clamp(toMs(e.date))));
		const boundaries = [startMs, ...inner, endMs];
		const placeholderLabels = values.map(() => '');
		blockedSegments = segmentsFromBoundaries(boundaries, placeholderLabels, totalMs, i => ({
			blocked: values[i],
			reason: values[i] ? reasons[i] : null,
			label: values[i] ? 'Blocked' : 'Unblocked',
			author: i > 0 ? blockedEvents[i - 1].author : undefined
		}));
	} else {
		const blocked = options.currentBlocked ?? false;
		blockedSegments = segmentsFromBoundaries([startMs, endMs], [blocked ? 'Blocked' : 'Unblocked'], totalMs, () => ({ blocked }));
	}

	// Sprint start markers: only iterations whose start falls strictly within the span.
	const sprintMarkers: SprintMarker[] = (options.iterations ?? [])
		.map(iteration => ({ name: iteration.name, startMs: toMs(iteration.startDate) }))
		.filter((m): m is { name: string; startMs: number } => m.startMs !== null && m.startMs > startMs && m.startMs < endMs)
		.map(m => ({ name: m.name, startMs: m.startMs, fraction: (m.startMs - startMs) / totalMs }))
		.sort((a, b) => a.startMs - b.startMs);

	const hasData = stateEvents.length > 0 || blockedEvents.length > 0;

	return { startMs, endMs, totalMs, stateSegments, blockedSegments, sprintMarkers, hasData };
}

export interface AxisTick {
	ms: number;
	/** Position along the timeline span, 0..1. */
	fraction: number;
}

/** Evenly spaced tick marks across [startMs, endMs], for a shared x-axis under the timeline tracks. */
export function buildAxisTicks(startMs: number, endMs: number, count = 5): AxisTick[] {
	const span = Math.max(endMs - startMs, 0);
	const n = Math.max(Math.floor(count), 1);
	if (n === 1) return [{ ms: startMs, fraction: 0 }];
	return Array.from({ length: n }, (_, i) => {
		const fraction = i / (n - 1);
		return { ms: startMs + span * fraction, fraction };
	});
}

export interface WeekMarker {
	ms: number;
	/** Position along the timeline span, 0..1. */
	fraction: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Week-start markers (local midnight of each week-start day) strictly within (startMs, endMs).
 * `firstDayOfWeek` follows JS `Date#getDay()` convention: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
 */
export function buildWeekMarkers(startMs: number, endMs: number, firstDayOfWeek: number): WeekMarker[] {
	if (endMs <= startMs) return [];
	const totalMs = endMs - startMs;

	const cursorDate = new Date(startMs);
	cursorDate.setHours(0, 0, 0, 0);
	const diff = (cursorDate.getDay() - firstDayOfWeek + 7) % 7;
	if (diff !== 0) {
		cursorDate.setDate(cursorDate.getDate() + (7 - diff));
	}

	const markers: WeekMarker[] = [];
	let cursor = cursorDate.getTime();
	while (cursor < endMs) {
		if (cursor > startMs) {
			markers.push({ ms: cursor, fraction: (cursor - startMs) / totalMs });
		}
		cursor += 7 * DAY_MS;
	}
	return markers;
}

/** Human-friendly duration such as "3d 4h", "5h", "12m". */
export function formatDuration(durationMs: number | null): string | null {
	if (durationMs === null || Number.isNaN(durationMs) || durationMs < 0) return null;
	const minutes = Math.floor(durationMs / 60000);
	if (minutes < 1) return '<1m';
	const days = Math.floor(minutes / 1440);
	const hours = Math.floor((minutes % 1440) / 60);
	const mins = minutes % 60;
	if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
	if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	return `${mins}m`;
}
