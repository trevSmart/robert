import { FC, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { parseRevisionDescription, type RevisionChange } from '../../utils/revisionDescription';
import { createHoverState, getScheduleStateColor, isLightTheme } from '../../utils/themeColors';

interface RevisionDescriptionProps {
	/** Raw Rally revision `Description`. */
	description: string;
}

const STATE_FIELDS = new Set(['SCHEDULE STATE', 'STATE', 'FLOW STATE']);
const BLOCKED_FIELD = 'BLOCKED';

/**
 * Accent for a change: green when something was added, red when removed, neutral for edits.
 * Light theme uses darker variants so the text stays legible on the light editor background,
 * mirroring how getScheduleStateColor handles the same problem.
 */
function changeColor(kind: RevisionChange['kind']): string {
	const light = isLightTheme();
	switch (kind) {
		case 'added':
			return light ? '#157347' : '#3fc97e';
		case 'removed':
			return light ? '#b02a37' : '#f2777a';
		default:
			return 'var(--vscode-foreground)';
	}
}

/**
 * Colour dot shown next to a value when the field carries state semantics — Schedule State reuses
 * the palette the rest of the UI paints states with, Blocked reads red/green.
 */
function swatchColor(field: string, value: string | null): string | null {
	if (value === null) return null;
	if (STATE_FIELDS.has(field)) return getScheduleStateColor(value);
	if (field === BLOCKED_FIELD) {
		const light = isLightTheme();
		return value.toLowerCase() === 'true' ? (light ? '#b02a37' : '#f2777a') : light ? '#157347' : '#3fc97e';
	}
	return null;
}

const Swatch: FC<{ color: string; dim?: boolean }> = ({ color, dim }) => (
	<span
		style={{
			width: '8px',
			height: '8px',
			borderRadius: '2px',
			backgroundColor: color,
			opacity: dim ? 0.55 : 1,
			flexShrink: 0
		}}
	/>
);

/**
 * Placeholder for a side of the diff that carries no value — either Rally wrote an empty `[]` or
 * it used the "changed to [X]" form, which it only does when the field had nothing before. Painted
 * as a dashed outline so "was empty" reads as deliberate instead of looking like a missing value.
 */
const EmptyValue: FC = () => (
	<span
		style={{
			display: 'inline-flex',
			alignItems: 'center',
			padding: '1px 6px',
			borderRadius: '4px',
			fontStyle: 'italic',
			color: 'var(--vscode-descriptionForeground)',
			border: `1px dashed ${createHoverState('var(--vscode-foreground)', 0.28)}`,
			opacity: 0.85,
			flexShrink: 0
		}}
	>
		empty
	</span>
);

const Value: FC<{ field: string; value: string | null; accent: string; dim?: boolean }> = ({ field, value, accent, dim }) => {
	if (value === null) {
		return <EmptyValue />;
	}

	const swatch = swatchColor(field, value);
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: '5px',
				padding: '1px 6px',
				borderRadius: '4px',
				fontWeight: dim ? 400 : 500,
				color: dim ? 'var(--vscode-descriptionForeground)' : accent,
				backgroundColor: createHoverState(dim ? 'var(--vscode-foreground)' : accent, dim ? 0.05 : 0.1),
				border: `1px solid ${createHoverState(dim ? 'var(--vscode-foreground)' : accent, dim ? 0.12 : 0.22)}`,
				// Rich-text values arrive as several lines; keep them and cap the height so a long
				// DESCRIPTION edit scrolls inside its chip instead of burying the rest of the revision.
				whiteSpace: 'pre-wrap',
				maxHeight: '180px',
				overflowY: 'auto',
				wordBreak: 'break-word',
				overflowWrap: 'anywhere'
			}}
		>
			{swatch && <Swatch color={swatch} dim={dim} />}
			{value}
		</span>
	);
};

const ChangeRow: FC<{ change: RevisionChange }> = ({ change }) => {
	const accent = changeColor(change.kind);
	// `changed` reads as a transition, added/removed as a single signed value.
	const marker = change.kind === 'added' ? '+' : change.kind === 'removed' ? '−' : '→';

	return (
		<div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
			<span
				style={{
					fontSize: '10.5px',
					fontWeight: 500,
					letterSpacing: '0.4px',
					padding: '2px 7px',
					borderRadius: '8px',
					color: 'var(--vscode-descriptionForeground)',
					backgroundColor: createHoverState('var(--vscode-foreground)', 0.08),
					border: `1px solid ${createHoverState('var(--vscode-foreground)', 0.12)}`,
					whiteSpace: 'nowrap',
					flexShrink: 0
				}}
			>
				{change.field}
			</span>
			<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
				{/* Always render the "before" side of an edit, empty included, so the diff never looks truncated. */}
				{change.kind === 'changed' && <Value field={change.field} value={change.from} accent={accent} dim />}
				<span style={{ color: change.kind === 'changed' ? 'var(--vscode-descriptionForeground)' : accent, flexShrink: 0 }}>{marker}</span>
				<Value field={change.field} value={change.to} accent={accent} />
			</span>
		</div>
	);
};

/**
 * Renders a Rally revision description. Most of them follow the "FIELD changed from [x] to [y]"
 * grammar and get painted as a diff; anything else falls back to the sanitized raw HTML Rally sent,
 * which is what this view always used to show.
 */
const RevisionDescription: FC<RevisionDescriptionProps> = ({ description }) => {
	const parsed = useMemo(() => parseRevisionDescription(description), [description]);

	if (!parsed.structured) {
		return (
			<div
				style={{
					padding: '8px',
					backgroundColor: 'var(--vscode-input-background)',
					borderRadius: '2px',
					color: 'var(--vscode-input-foreground)',
					wordBreak: 'break-word',
					overflowWrap: 'anywhere'
				}}
				dangerouslySetInnerHTML={{
					__html: DOMPurify.sanitize(description || '', { FORBID_ATTR: ['style'] })
				}}
			/>
		);
	}

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '6px',
				padding: '8px',
				backgroundColor: 'var(--vscode-input-background)',
				borderRadius: '2px'
			}}
		>
			{parsed.changes.map((change, index) => (
				<ChangeRow key={`${change.field}-${index}`} change={change} />
			))}
		</div>
	);
};

export default RevisionDescription;
