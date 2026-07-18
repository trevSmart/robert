import { FC, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getScheduleStateColor, themeColors } from '../../utils/themeColors';
import { buildAxisTicks, buildTimelineTracks, buildWeekMarkers, formatDuration, type AxisTick, type IterationLike, type RevisionLike, type SprintMarker, type TimelineSegment, type WeekMarker } from '../../utils/revisionTimeline';

interface RevisionTimelineProps {
	revisions: RevisionLike[];
	loading: boolean;
	loaded: boolean;
	/** Total revisions in Rally; used to warn when only the latest slice is shown. */
	totalCount: number | null;
	/** Story creation date — timeline zero point. */
	creationDate?: string | null;
	/** Current schedule state, for when no transitions were parsed. */
	currentState?: string | null;
	/** Current blocked flag, for when no blocked events were parsed. */
	currentBlocked?: boolean;
	/** Iterations/sprints to mark on the timeline where their start date falls within the span. */
	iterations?: IterationLike[];
}

const BLOCKED_COLOR = 'color(srgb 0.82 0.32 0.32 / 1)';
const UNBLOCKED_COLOR = 'color(srgb 0.28 0.72 0.46 / 1)';
const SPRINT_MARKER_COLOR = 'var(--vscode-textLink-foreground)';
const GRID_LINE_COLOR = 'var(--vscode-panel-border)';

const LABEL_WIDTH = 64;
const AXIS_HEIGHT = 24;
const TICK_COUNT = 5;
const BAR_HEIGHT = 16;
// How far the week/grid/sprint guide lines poke up above the State track's top edge.
const GUIDE_OVERSHOOT = 10;

// Locale forced to 'en-US' (matching CollaborationView.tsx's convention) so month names stay in
// English regardless of the machine's regional settings — the extension's UI is English-only.
function formatShortDate(ms: number): string {
	const date = new Date(ms);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAxisDate(ms: number): string {
	const date = new Date(ms);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

// Softens a hue for bar fills — the swatch keeps the full color for identification.
function muted(color: string): string {
	return `color-mix(in srgb, ${color} 60%, transparent)`;
}

function blockedLabelColor(label: string): string {
	return label === 'Blocked' ? BLOCKED_COLOR : UNBLOCKED_COLOR;
}

// Regions whose calendars conventionally start the week on Sunday — used only when the
// runtime has no Intl.Locale week-info support to ask the machine's regional setting directly.
const SUNDAY_START_REGIONS = new Set(['US', 'CA', 'MX', 'JP', 'KR', 'BR', 'PH', 'TW', 'HK', 'IL', 'ZA']);

/** First day of the week for the machine's locale, using JS `Date#getDay()` convention (0 = Sunday). */
function detectFirstDayOfWeek(): number {
	const locale = typeof navigator !== 'undefined' ? navigator.language : undefined;
	try {
		// Intl.Locale weekInfo (where supported) reports the region's actual calendar convention.
		// Its firstDay uses ISO weekday numbering (1 = Monday ... 7 = Sunday); `% 7` maps that
		// onto Date#getDay()'s 0 = Sunday convention (7 % 7 === 0).
		const localeInfo = new Intl.Locale(locale ?? 'en') as Intl.Locale & { weekInfo?: { firstDay: number }; getWeekInfo?: () => { firstDay: number } };
		const weekInfo = localeInfo.weekInfo ?? localeInfo.getWeekInfo?.();
		if (weekInfo && typeof weekInfo.firstDay === 'number') {
			return weekInfo.firstDay % 7;
		}
	} catch {
		// Intl.Locale / weekInfo unsupported in this runtime — fall through to the heuristic below.
	}
	const region = locale?.split('-')[1]?.toUpperCase();
	return region && SUNDAY_START_REGIONS.has(region) ? 0 : 1;
}

const trackRowStyle: React.CSSProperties = {
	display: 'flex',
	width: '100%',
	height: `${BAR_HEIGHT}px`,
	borderRadius: '4px',
	overflow: 'hidden',
	border: '1px solid var(--vscode-input-border)'
};

interface TooltipState {
	x: number;
	y: number;
	content: ReactNode;
}

type ShowTooltip = (event: React.MouseEvent, content: ReactNode) => void;

// Same visual language as the AssigneeHoursChart echarts tooltip: blurred panel, hairline border, 11.5px text.
// Rendered via a portal straight into <body>: the Timeline lives inside a <collapsible-card>, whose shadow-DOM
// container has `backdrop-filter` — which establishes a new containing block for `position: fixed` descendants
// (even slotted ones) and its `overflow: hidden` would clip a fixed tooltip positioned relative to the viewport.
const TOOLTIP_MAX_WIDTH = 340;

const HoverTooltip: FC<{ tooltip: TooltipState | null }> = ({ tooltip }) => {
	if (!tooltip) return null;
	const flipX = tooltip.x + TOOLTIP_MAX_WIDTH > window.innerWidth;
	const flipY = tooltip.y + 140 > window.innerHeight;
	return createPortal(
		<div
			style={{
				position: 'fixed',
				left: tooltip.x,
				top: tooltip.y,
				transform: `translate(${flipX ? 'calc(-100% - 14px)' : '14px'}, ${flipY ? 'calc(-100% - 10px)' : '-50%'})`,
				zIndex: 10000,
				width: 'max-content',
				maxWidth: `${TOOLTIP_MAX_WIDTH}px`,
				padding: '8px 10px',
				borderRadius: '6px',
				backgroundColor: `color-mix(in srgb, ${themeColors.background} 85%, transparent)`,
				border: `1px solid ${themeColors.panelBorder}`,
				color: themeColors.foreground,
				fontSize: '11.5px',
				lineHeight: 1.5,
				backdropFilter: 'blur(8px)',
				WebkitBackdropFilter: 'blur(8px)',
				pointerEvents: 'none'
			}}
		>
			{tooltip.content}
		</div>,
		document.body
	);
};

const TooltipRow: FC<{ label: string; value: ReactNode; swatch?: string }> = ({ label, value, swatch }) => (
	<div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
		{swatch && <span style={{ width: '10px', height: '10px', backgroundColor: swatch, borderRadius: '2px', display: 'inline-block', flexShrink: 0, marginTop: '2px' }} />}
		<span style={{ flex: 1, color: themeColors.descriptionForeground, whiteSpace: 'nowrap' }}>{label}</span>
		<span style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{value}</span>
	</div>
);

// "From X to Y" on one line, right-aligned so it sits under the current state — the title row
// above is left-heavy (previous state + arrow) with the current state trailing on the right.
const TooltipDateRange: FC<{ from: string; to: string }> = ({ from, to }) => (
	<div style={{ textAlign: 'right', color: themeColors.descriptionForeground, whiteSpace: 'nowrap' }}>
		From <span style={{ color: themeColors.foreground, fontWeight: 500 }}>{from}</span> to <span style={{ color: themeColors.foreground, fontWeight: 500 }}>{to}</span>
	</div>
);

// "Defined → In-Progress" title with a color swatch in front of each state name. Never wraps —
// the tooltip is sized wide enough (see HoverTooltip) to fit the longest realistic transition.
// The previous state (and the arrow leading to the current one) is dimmed so the eye lands on
// what matters: the current state.
const PREVIOUS_STATE_OPACITY = 0.55;

const TooltipTitle: FC<{ steps: { label: string; color: string }[] }> = ({ steps }) => {
	const previous = steps.length > 1 ? steps[0] : null;
	const current = steps[steps.length - 1];
	return (
		<div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '10px', fontSize: '12.5px', fontWeight: 500, marginBottom: '6px' }}>
			{previous && (
				<>
					<span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', opacity: PREVIOUS_STATE_OPACITY }}>
						<span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: previous.color, display: 'inline-block', flexShrink: 0 }} />
						<span>{previous.label}</span>
					</span>
					<span style={{ color: themeColors.descriptionForeground, fontWeight: 400, opacity: PREVIOUS_STATE_OPACITY }}>→</span>
				</>
			)}
			<span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
				<span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: current.color, display: 'inline-block', flexShrink: 0 }} />
				<span>{current.label}</span>
			</span>
		</div>
	);
};

const Segment: FC<{ segment: TimelineSegment; color: string; showLabel: boolean; onShowTooltip: ShowTooltip; onHideTooltip: () => void; tooltipContent: ReactNode }> = ({ segment, color, showLabel, onShowTooltip, onHideTooltip, tooltipContent }) => (
	<div
		onMouseMove={e => onShowTooltip(e, tooltipContent)}
		onMouseLeave={onHideTooltip}
		style={{
			width: `${segment.fraction * 100}%`,
			minWidth: segment.fraction > 0 ? '3px' : '0',
			height: '100%',
			backgroundColor: color,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'flex-start',
			overflow: 'hidden',
			boxSizing: 'border-box',
			padding: '0 6px',
			borderRight: '1px solid color-mix(in srgb, var(--vscode-panel-background) 55%, transparent)'
		}}
	>
		{showLabel && (
			<span
				style={{
					fontSize: '10px',
					fontWeight: 600,
					color: 'var(--vscode-foreground)',
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis'
				}}
			>
				{segment.label}
			</span>
		)}
	</div>
);

// Recessive, hairline gridlines behind the plot — one per axis tick.
const GridLines: FC<{ ticks: AxisTick[] }> = ({ ticks }) => (
	<>
		{ticks.map((t, i) => (
			<div
				key={i}
				style={{
					position: 'absolute',
					left: `${t.fraction * 100}%`,
					top: `-${GUIDE_OVERSHOOT}px`,
					bottom: 0,
					borderLeft: `1px solid ${GRID_LINE_COLOR}`,
					opacity: 0.5,
					pointerEvents: 'none'
				}}
			/>
		))}
	</>
);

// Subtle week-start guides — lighter than the axis gridlines so they read as texture, not data.
// Uses the foreground token (not the panel-border used by the axis gridlines): panel-border is
// too close to the card background in dark themes to read at a low opacity.
const WeekGuides: FC<{ markers: WeekMarker[] }> = ({ markers }) => (
	<>
		{markers.map((m, i) => (
			<div
				key={i}
				style={{
					position: 'absolute',
					left: `${m.fraction * 100}%`,
					top: `-${GUIDE_OVERSHOOT}px`,
					bottom: 0,
					borderLeft: `1px solid ${themeColors.foreground}`,
					opacity: 0.22,
					pointerEvents: 'none'
				}}
			/>
		))}
	</>
);

// Solid, colored annotation lines marking sprint starts — layered above the plain gridlines.
const SprintMarkerLines: FC<{ markers: SprintMarker[]; onShowTooltip: ShowTooltip; onHideTooltip: () => void }> = ({ markers, onShowTooltip, onHideTooltip }) => (
	<>
		{markers.map((m, i) => {
			const content = (
				<>
					<div style={{ fontSize: '12.5px', fontWeight: 500, marginBottom: '6px' }}>{m.name}</div>
					<TooltipRow label="Start" value={formatShortDate(m.startMs)} swatch={SPRINT_MARKER_COLOR} />
				</>
			);
			return (
				<div
					key={i}
					onMouseMove={e => onShowTooltip(e, content)}
					onMouseLeave={onHideTooltip}
					style={{
						position: 'absolute',
						left: `${m.fraction * 100}%`,
						top: `-${GUIDE_OVERSHOOT}px`,
						bottom: 0,
						width: '8px',
						marginLeft: '-4px',
						pointerEvents: 'auto',
						zIndex: 2
					}}
				>
					<div style={{ position: 'absolute', left: '4px', top: 0, bottom: 0, borderLeft: `1px solid ${SPRINT_MARKER_COLOR}`, opacity: 0.4 }} />
				</div>
			);
		})}
	</>
);

const AxisTicks: FC<{ ticks: AxisTick[] }> = ({ ticks }) => (
	<div style={{ position: 'relative', height: '100%', borderTop: `1px solid ${GRID_LINE_COLOR}` }}>
		{ticks.map((t, i) => {
			const isFirst = i === 0;
			const isLast = i === ticks.length - 1;
			return (
				<span
					key={i}
					style={{
						position: 'absolute',
						left: `${t.fraction * 100}%`,
						top: '6px',
						transform: isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
						fontSize: '10px',
						color: 'var(--vscode-descriptionForeground)',
						whiteSpace: 'nowrap'
					}}
				>
					{formatAxisDate(t.ms)}
				</span>
			);
		})}
	</div>
);

// Vertical hairline that follows the pointer, with a small date chip so the reader can tell which date they're over.
const Crosshair: FC<{ fraction: number; dateLabel: string }> = ({ fraction, dateLabel }) => {
	const isNearStart = fraction < 0.15;
	const isNearEnd = fraction > 0.85;
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left: `${fraction * 100}%`,
					top: 0,
					bottom: 0,
					borderLeft: `1px solid ${themeColors.foreground}`,
					opacity: 0.4,
					pointerEvents: 'none'
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: `${fraction * 100}%`,
					bottom: '-22px',
					transform: isNearStart ? 'translateX(0)' : isNearEnd ? 'translateX(-100%)' : 'translateX(-50%)',
					fontSize: '10px',
					color: themeColors.foreground,
					backgroundColor: `color-mix(in srgb, ${themeColors.background} 92%, transparent)`,
					border: `1px solid ${themeColors.panelBorder}`,
					borderRadius: '4px',
					padding: '1px 6px',
					whiteSpace: 'nowrap',
					pointerEvents: 'none'
				}}
			>
				{dateLabel}
			</div>
		</>
	);
};

const COLUMN_GAP = 10;

const RevisionTimeline: FC<RevisionTimelineProps> = ({ revisions, loading, loaded, totalCount, creationDate, currentState, currentBlocked, iterations }) => {
	const tracks = useMemo(() => buildTimelineTracks(revisions, { creationDate, now: new Date().getTime(), currentState, currentBlocked, iterations }), [revisions, creationDate, currentState, currentBlocked, iterations]);
	const axisTicks = useMemo(() => buildAxisTicks(tracks.startMs, tracks.endMs, TICK_COUNT), [tracks.startMs, tracks.endMs]);
	const firstDayOfWeek = useMemo(() => detectFirstDayOfWeek(), []);
	const weekMarkers = useMemo(() => buildWeekMarkers(tracks.startMs, tracks.endMs, firstDayOfWeek), [tracks.startMs, tracks.endMs, firstDayOfWeek]);

	const [tooltip, setTooltip] = useState<TooltipState | null>(null);
	const showTooltip = useCallback<ShowTooltip>((event, content) => {
		setTooltip({ x: event.clientX, y: event.clientY, content });
	}, []);
	const hideTooltip = useCallback(() => setTooltip(null), []);

	const chartRef = useRef<HTMLDivElement | null>(null);
	const [crosshairFraction, setCrosshairFraction] = useState<number | null>(null);
	const handleChartMouseMove = useCallback((event: React.MouseEvent) => {
		const el = chartRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const plotLeft = rect.left + LABEL_WIDTH + COLUMN_GAP;
		const plotWidth = rect.width - LABEL_WIDTH - COLUMN_GAP;
		if (plotWidth <= 0) return;
		setCrosshairFraction(Math.min(1, Math.max(0, (event.clientX - plotLeft) / plotWidth)));
	}, []);
	const handleChartMouseLeave = useCallback(() => setCrosshairFraction(null), []);

	if (loading) {
		return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>Loading history...</div>;
	}

	if (!loaded) {
		return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>Loading history...</div>;
	}

	if (!tracks.hasData) {
		return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>No state or blocked changes recorded.</div>;
	}

	const truncated = totalCount !== null && revisions.length > 0 && totalCount > revisions.length;
	const totalLabel = formatDuration(tracks.totalMs);

	// Show a segment's inline label only if it's wide enough to fit readable text.
	const wideEnough = (fraction: number) => fraction >= 0.12;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
			<div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
				From creation ({formatShortDate(tracks.startMs)}) to now{totalLabel ? ` · ${totalLabel}` : ''}
				{truncated && (
					<span style={{ fontStyle: 'italic' }}>
						{' '}
						· showing the latest {revisions.length} of {totalCount} revisions
					</span>
				)}
			</div>

			{/* Shared chart: state + blocked rows over a common x-axis with date labels */}
			<div
				ref={chartRef}
				onMouseMove={handleChartMouseMove}
				onMouseLeave={handleChartMouseLeave}
				style={{
					display: 'grid',
					gridTemplateColumns: `${LABEL_WIDTH}px 1fr`,
					gridTemplateRows: `${BAR_HEIGHT}px ${BAR_HEIGHT}px ${AXIS_HEIGHT}px`,
					columnGap: `${COLUMN_GAP}px`,
					rowGap: '18px',
					alignItems: 'center'
				}}
			>
				{/* Week guides + gridlines + sprint markers, spanning exactly the two bar rows.
				    alignSelf: 'stretch' is required — the grid's `align-items: center` would otherwise
				    shrink this div to its content height (0, since all its children are position:absolute
				    and don't contribute to intrinsic height), collapsing every top:0/bottom:0 line inside it. */}
				<div style={{ gridColumn: 2, gridRow: '1 / 3', position: 'relative', alignSelf: 'stretch', pointerEvents: 'none' }}>
					<WeekGuides markers={weekMarkers} />
					<GridLines ticks={axisTicks} />
					<SprintMarkerLines markers={tracks.sprintMarkers} onShowTooltip={showTooltip} onHideTooltip={hideTooltip} />
				</div>

				<div style={{ gridColumn: 1, gridRow: 1, fontSize: '12px', fontWeight: 500, color: 'var(--vscode-foreground)' }}>State</div>
				<div style={{ gridColumn: 2, gridRow: 1, ...trackRowStyle }}>
					{tracks.stateSegments.map((seg, i) => {
						const color = getScheduleStateColor(seg.label);
						const previousLabel = tracks.stateSegments[i - 1]?.label;
						const steps = previousLabel
							? [
									{ label: previousLabel, color: getScheduleStateColor(previousLabel) },
									{ label: seg.label, color }
								]
							: [{ label: seg.label, color }];
						const content = (
							<>
								<TooltipTitle steps={steps} />
								{seg.author && <TooltipRow label="Changed by" value={seg.author} />}
								<TooltipDateRange from={formatShortDate(seg.startMs)} to={formatShortDate(seg.endMs)} />
							</>
						);
						return <Segment key={`state-${i}`} segment={seg} color={muted(color)} showLabel={wideEnough(seg.fraction)} onShowTooltip={showTooltip} onHideTooltip={hideTooltip} tooltipContent={content} />;
					})}
				</div>

				<div style={{ gridColumn: 1, gridRow: 2, fontSize: '12px', fontWeight: 500, color: 'var(--vscode-foreground)' }}>Blocked</div>
				<div style={{ gridColumn: 2, gridRow: 2, ...trackRowStyle }}>
					{tracks.blockedSegments.map((seg, i) => {
						const color = seg.blocked ? muted(BLOCKED_COLOR) : muted(UNBLOCKED_COLOR);
						const previousLabel = tracks.blockedSegments[i - 1]?.label;
						const steps = previousLabel
							? [
									{ label: previousLabel, color: blockedLabelColor(previousLabel) },
									{ label: seg.label, color: blockedLabelColor(seg.label) }
								]
							: [{ label: seg.label, color: blockedLabelColor(seg.label) }];
						const content = (
							<>
								<TooltipTitle steps={steps} />
								{seg.author && <TooltipRow label="Changed by" value={seg.author} />}
								<TooltipDateRange from={formatShortDate(seg.startMs)} to={formatShortDate(seg.endMs)} />
								{seg.blocked && seg.reason && <TooltipRow label="Reason" value={seg.reason} />}
							</>
						);
						return <Segment key={`blocked-${i}`} segment={seg} color={color} showLabel={Boolean(seg.blocked) && wideEnough(seg.fraction)} onShowTooltip={showTooltip} onHideTooltip={hideTooltip} tooltipContent={content} />;
					})}
				</div>

				<div style={{ gridColumn: 2, gridRow: 3 }}>
					<AxisTicks ticks={axisTicks} />
				</div>

				{/* Crosshair, spanning bar rows + axis so the reader can align the pointer with a date */}
				<div style={{ gridColumn: 2, gridRow: '1 / 4', position: 'relative', alignSelf: 'stretch', pointerEvents: 'none' }}>{crosshairFraction !== null && <Crosshair fraction={crosshairFraction} dateLabel={formatShortDate(tracks.startMs + crosshairFraction * tracks.totalMs)} />}</div>
			</div>

			<HoverTooltip tooltip={tooltip} />
		</div>
	);
};

export default RevisionTimeline;
