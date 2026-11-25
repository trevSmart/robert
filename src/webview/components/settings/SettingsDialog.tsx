import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import type { AboutModel, CredentialFieldModel, SettingFieldModel, SettingsResultMessage, SettingsScope, SettingsStateMessage } from '../../../settings/protocol';
import { getVsCodeApi } from '../../utils/vscodeApi';
import Select from '../common/Select';

/**
 * Robert's settings dialog, shared by the VS Code extension and the standalone app.
 *
 * - Opens on the `showSettings` message (robert.openSettings command, app menu).
 * - Every change is saved on its own, like VS Code's Settings UI (checkboxes and
 *   selects immediately, text fields on blur / Enter), so it never overwrites
 *   settings changed elsewhere; the host pushes a fresh state after any change.
 * - In VS Code it edits the User or the Workspace scope (Workspace by default);
 *   the standalone app only has its own settings file.
 * - API credentials are write-only: the value goes to the host, which stores it
 *   in the OS keychain, and never comes back.
 */

type FieldStatus = { state: 'saving' | 'saved' | 'error'; message?: string };

const SCOPE_LABEL: Record<SettingsScope, string> = { user: 'User', workspace: 'Workspace' };

const PROVIDER_KEY = 'robert.provider';
const PROVIDER_LABEL: Record<string, string> = { jira: 'Jira', rally: 'Rally' };
/** Group holding the connection settings (and credential) of each provider. */
const PROVIDER_GROUP: Record<string, string> = { jira: 'Jira Cloud', rally: 'Rally' };

type SectionId = 'provider' | 'general' | 'collaboration' | 'about';

/** Tabs of the dialog and the setting groups each one shows. Groups not listed here fall back to General. */
const SECTIONS: ReadonlyArray<{ id: SectionId; label: string; groups: string[] }> = [
	{ id: 'provider', label: 'Provider', groups: ['Provider', ...Object.values(PROVIDER_GROUP)] },
	{ id: 'general', label: 'General', groups: ['General'] },
	{ id: 'collaboration', label: 'Collaboration', groups: ['Collaboration'] },
	// No settings: version, host and links.
	{ id: 'about', label: 'About', groups: [] }
];

const sectionForGroup = (group: string): SectionId => SECTIONS.find(section => section.groups.includes(group))?.id ?? 'general';
let requestCounter = 0;
const nextRequestId = () => `settings-${Date.now()}-${++requestCounter}`;

const isSet = (value: unknown) => value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');

function formatValue(value: unknown): string {
	if (typeof value === 'boolean') return value ? 'on' : 'off';
	if (value === undefined || value === null || value === '') return '(empty)';
	return String(value);
}

/** What applies in a scope when that scope does not set the setting: lower scopes, then env var, then default. */
function inheritedFor(field: SettingFieldModel, scope: SettingsScope): { value: unknown; source: string } {
	if (scope === 'workspace' && isSet(field.values.user)) return { value: field.values.user, source: 'User settings' };
	if (field.env.isSet) return { value: field.env.value, source: field.env.name };
	return { value: field.defaultValue, source: 'default' };
}

/** Value a field shows in a scope: its own value there, or what it inherits. */
function shownValueFor(field: SettingFieldModel, scope: SettingsScope): unknown {
	const scopeValue = scope === 'workspace' ? field.values.workspace : field.values.user;
	return scopeValue !== undefined ? scopeValue : inheritedFor(field, scope).value;
}

const fadeIn = keyframes`
	from { opacity: 0; }
	to { opacity: 1; }
`;

const popIn = keyframes`
	from { opacity: 0; transform: translateY(6px) scale(0.99); }
	to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Overlay = styled.div`
	position: fixed;
	inset: 0;
	z-index: 10000;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding: 24px 12px;
	background: rgba(0, 0, 0, 0.45);
	animation: ${fadeIn} 0.12s ease-out;
	overflow: hidden;
`;

const Panel = styled.div`
	display: flex;
	flex-direction: column;
	width: min(760px, 100%);
	/* Fixed height so switching tabs (or providers) does not resize the dialog. */
	height: min(720px, 100%);
	background: var(--vscode-editor-background);
	color: var(--vscode-foreground);
	border: 1px solid var(--vscode-widget-border);
	border-radius: 8px;
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
	animation: ${popIn} 0.14s ease-out;
	outline: none;
`;

const Header = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 18px 0;
`;

const Title = styled.h2`
	margin: 0;
	font-size: 16px;
	font-weight: 600;
	flex: 1;
`;

const IconButton = styled.button`
	border: none;
	background: transparent;
	color: var(--vscode-foreground);
	width: 28px;
	height: 28px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 18px;
	line-height: 1;
	&:hover {
		background: var(--vscode-toolbar-hoverBackground);
	}
	&:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
	}
`;

const SectionTabs = styled.div`
	display: flex;
	gap: 4px;
	padding: 10px 18px 0;
	border-bottom: 1px solid var(--vscode-panel-border);
	overflow-x: auto;
`;

const SectionTab = styled.button<{ $active: boolean }>`
	border: none;
	background: transparent;
	padding: 6px 10px 7px;
	font-size: 12.5px;
	cursor: pointer;
	color: ${p => (p.$active ? 'var(--vscode-tab-activeForeground)' : 'var(--vscode-tab-inactiveForeground)')};
	font-weight: ${p => (p.$active ? 600 : 400)};
	border-bottom: 2px solid ${p => (p.$active ? 'var(--vscode-progressBar-background)' : 'transparent')};
	margin-bottom: -1px;
	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	&:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
	}
`;

const ScopeBar = styled.div`
	display: flex;
	justify-content: center;
	padding: 10px 18px;
	border-bottom: 1px solid var(--vscode-panel-border);
`;

const ScopeLine = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	flex-wrap: wrap;
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
`;

const InfoButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	width: 18px;
	height: 18px;
	padding: 0;
	border: none;
	border-radius: 50%;
	background: transparent;
	color: var(--vscode-descriptionForeground);
	cursor: help;
	&:hover {
		color: var(--vscode-foreground);
	}
	&:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
	}
`;

const InfoTooltip = styled.span`
	position: fixed;
	z-index: 10002;
	width: max-content;
	padding: 6px 9px;
	font-size: 11.5px;
	font-weight: 400;
	line-height: 1.4;
	text-align: left;
	text-transform: none;
	letter-spacing: normal;
	color: var(--vscode-foreground);
	background: var(--vscode-editor-background);
	border: 1px solid var(--vscode-widget-border);
	border-radius: 4px;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
	word-break: break-word;
	white-space: normal;
	pointer-events: none;
`;

const TOOLTIP_MAX_WIDTH = 320;
const TOOLTIP_MARGIN = 8;

/**
 * Info icon that shows `text` as a tooltip on hover or keyboard focus. The tooltip is
 * portalled to <body> with fixed positioning and kept inside the window, so the dialog's
 * scrolling body neither clips it nor scrolls sideways in a narrow sidebar.
 */
function InfoTip({ text, label }: { text: string; label: string }) {
	const tooltipId = useId();
	const [position, setPosition] = useState<React.CSSProperties | null>(null);

	const show = (anchor: HTMLElement) => {
		const rect = anchor.getBoundingClientRect();
		const maxWidth = Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth - 2 * TOOLTIP_MARGIN);
		const center = rect.left + rect.width / 2;
		const left = Math.min(Math.max(center - maxWidth / 2, TOOLTIP_MARGIN), window.innerWidth - maxWidth - TOOLTIP_MARGIN);
		// Below the icon, or above it when it sits near the bottom of the window.
		const vertical = rect.bottom + 120 > window.innerHeight ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 };
		setPosition({ left, maxWidth, ...vertical });
	};
	const hide = useCallback(() => setPosition(null), []);

	useEffect(() => {
		if (!position) return;
		// The icon moves when the dialog scrolls or resizes: hide instead of following it.
		window.addEventListener('scroll', hide, true);
		window.addEventListener('resize', hide);
		return () => {
			window.removeEventListener('scroll', hide, true);
			window.removeEventListener('resize', hide);
		};
	}, [position, hide]);

	return (
		<>
			<InfoButton
				type="button"
				aria-label={label}
				aria-describedby={position ? tooltipId : undefined}
				onMouseEnter={event => show(event.currentTarget)}
				onMouseLeave={hide}
				onFocus={event => show(event.currentTarget)}
				onBlur={hide}
				onKeyDown={event => {
					if (event.key === 'Escape' && position) {
						// Close the tooltip, not the dialog.
						event.stopPropagation();
						hide();
					}
				}}
			>
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="15" height="15" aria-hidden>
					<path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
				</svg>
			</InfoButton>
			{position &&
				createPortal(
					<InfoTooltip id={tooltipId} role="tooltip" style={position}>
						{text}
					</InfoTooltip>,
					document.body
				)}
		</>
	);
}

const Segmented = styled.div`
	display: inline-flex;
	flex-wrap: wrap;
	gap: 2px;
	padding: 2px;
	border: 1px solid var(--vscode-widget-border);
	border-radius: 5px;
	background: var(--vscode-input-background);
	max-width: 100%;
`;

const SegmentButton = styled.button<{ $active: boolean }>`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	border: none;
	border-radius: 3px;
	padding: 4px 14px;
	font-size: 12.5px;
	cursor: pointer;
	font-weight: ${p => (p.$active ? 600 : 400)};
	background: ${p => (p.$active ? 'var(--vscode-button-background)' : 'transparent')};
	color: ${p => (p.$active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)')};
	&:hover:not(:disabled) {
		background: ${p => (p.$active ? 'var(--vscode-button-hoverBackground)' : 'var(--vscode-toolbar-hoverBackground)')};
	}
	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	&:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: 1px;
	}
`;

const LinkButton = styled.button`
	border: none;
	background: none;
	padding: 0;
	font: inherit;
	font-size: 12px;
	color: var(--vscode-textLink-foreground);
	cursor: pointer;
	&:hover {
		text-decoration: underline;
	}
	&:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
	}
`;

const Body = styled.div`
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: 4px 18px 18px;
	overscroll-behavior: contain;
`;

const GroupTitle = styled.h3`
	display: flex;
	align-items: baseline;
	gap: 8px;
	margin: 20px 0 4px;
	padding-bottom: 6px;
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--vscode-descriptionForeground);
	border-bottom: 1px solid var(--vscode-panel-border);
`;

/** Settings under a group divider, indented from it. */
const GroupContent = styled.div<{ $indented: boolean }>`
	padding: 0 ${p => (p.$indented ? '14px' : '0')};
`;

const Row = styled.div`
	padding: 10px 0;
`;

const RowHead = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;
`;

const Label = styled.label`
	font-weight: 500;
	font-size: 11px;
`;

const Badge = styled.span<{ $tone?: 'info' | 'warning' | 'muted' }>`
	font-size: 10.5px;
	padding: 1px 6px;
	border-radius: 8px;
	background: ${p => (p.$tone === 'warning' ? 'var(--vscode-inputValidation-warningBackground)' : p.$tone === 'info' ? 'var(--vscode-badge-background)' : 'transparent')};
	color: ${p => (p.$tone === 'info' ? 'var(--vscode-badge-foreground)' : 'var(--vscode-descriptionForeground)')};
	border: 1px solid ${p => (p.$tone === 'warning' ? 'var(--vscode-inputValidation-warningBorder)' : p.$tone === 'muted' ? 'var(--vscode-widget-border)' : 'transparent')};
`;

const Spacer = styled.span`
	flex: 1;
`;

const Description = styled.div`
	color: var(--vscode-descriptionForeground);
	font-size: 12px;
	margin: 2px 0 6px;
`;

const Note = styled.div<{ $tone?: 'error' | 'warning' }>`
	font-size: 11.5px;
	margin-top: 4px;
	color: ${p => (p.$tone === 'error' ? 'var(--vscode-errorForeground)' : 'var(--vscode-descriptionForeground)')};
`;

const Input = styled.input`
	width: 100%;
	box-sizing: border-box;
	padding: 5px 8px;
	font-size: 13px;
	background: var(--vscode-input-background);
	color: var(--vscode-input-foreground);
	border: 1px solid var(--vscode-input-border);
	border-radius: 2px;
	&::placeholder {
		color: var(--vscode-input-placeholderForeground);
	}
	&:focus {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
	}
	&:disabled {
		opacity: 0.6;
	}
`;

const Checkbox = styled.input`
	margin: 0;
	flex: none;
	cursor: pointer;
	&:disabled {
		cursor: default;
	}
`;

const InlineControls = styled.div`
	display: flex;
	gap: 8px;
	align-items: center;
	flex-wrap: wrap;
	& > input {
		flex: 1 1 220px;
		width: auto;
	}
`;

const Button = styled.button<{ $secondary?: boolean }>`
	font-size: 12.5px;
	padding: 5px 12px;
	border: none;
	border-radius: 2px;
	cursor: pointer;
	background: ${p => (p.$secondary ? 'var(--vscode-button-secondaryBackground)' : 'var(--vscode-button-background)')};
	color: ${p => (p.$secondary ? 'var(--vscode-button-secondaryForeground)' : 'var(--vscode-button-foreground)')};
	&:hover:not(:disabled) {
		background: ${p => (p.$secondary ? 'var(--vscode-toolbar-hoverBackground)' : 'var(--vscode-button-hoverBackground)')};
	}
	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
	&:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: 1px;
	}
`;

const Footer = styled.div`
	padding: 10px 18px;
	border-top: 1px solid var(--vscode-panel-border);
	font-size: 11.5px;
	color: var(--vscode-descriptionForeground);
`;

function StatusNote({ status }: { status?: FieldStatus }) {
	if (!status) return null;
	if (status.state === 'error') return <Note $tone="error">{status.message}</Note>;
	return <Note>{status.state === 'saving' ? 'Saving…' : 'Saved'}</Note>;
}

interface SegmentOption {
	value: string;
	label: string;
	/** Codicon name shown before the label (e.g. `person`). */
	icon?: string;
	disabled?: boolean;
	title?: string;
}

/** A row of mutually exclusive buttons (radio group), for short choices like the provider or the scope. */
function SegmentedControl({ id, options, value, ariaLabel, onChange }: { id?: string; options: SegmentOption[]; value: string; ariaLabel: string; onChange: (value: string) => void }) {
	const enabled = options.filter(option => !option.disabled);
	return (
		<Segmented
			id={id}
			role="radiogroup"
			aria-label={ariaLabel}
			onKeyDown={event => {
				if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
				const index = enabled.findIndex(option => option.value === value);
				const next = enabled[(index + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
				if (!next || next.value === value) return;
				event.preventDefault();
				const group = event.currentTarget;
				onChange(next.value);
				requestAnimationFrame(() => group.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
			}}
		>
			{options.map(option => {
				const active = option.value === value;
				return (
					<SegmentButton
						key={option.value}
						type="button"
						role="radio"
						aria-checked={active}
						tabIndex={active ? 0 : -1}
						$active={active}
						disabled={option.disabled}
						title={option.title}
						onClick={() => {
							if (!active) onChange(option.value);
						}}
					>
						{option.icon && <i className={`codicon codicon-${option.icon}`} aria-hidden />}
						{option.label}
					</SegmentButton>
				);
			})}
		</Segmented>
	);
}

interface SettingRowProps {
	field: SettingFieldModel;
	scope: SettingsScope;
	/** The standalone app has a single scope: no need to name it. */
	singleScope: boolean;
	status?: FieldStatus;
	/** Value to show instead of the stored one while a change is being saved. */
	pendingValue?: unknown;
	onSave: (field: SettingFieldModel, value: unknown) => void;
	/**
	 * Set when the setting cannot be written to the selected scope (User-only settings
	 * while Workspace is selected): the row shows the value in effect, read-only.
	 */
	onSwitchToUser?: () => void;
}

function SettingRow({ field, scope, singleScope, status, pendingValue, onSave, onSwitchToUser }: SettingRowProps) {
	const id = useId();
	const readOnly = onSwitchToUser !== undefined;
	const scopeValue = scope === 'workspace' ? field.values.workspace : field.values.user;
	const hasScopeValue = scopeValue !== undefined;
	const inherited = inheritedFor(field, scope);
	const shownValue = pendingValue !== undefined ? pendingValue : hasScopeValue ? scopeValue : inherited.value;

	// Text / number fields keep a local draft while focused and save on blur / Enter.
	// `baseline` is the stored value when editing started, to notice changes made elsewhere meanwhile.
	const [draft, setDraft] = useState<{ text: string; baseline: unknown } | null>(null);
	const editing = draft !== null;
	const changedElsewhere = draft !== null && JSON.stringify(draft.baseline) !== JSON.stringify(scopeValue);

	const commitDraft = () => {
		if (draft === null) return;
		const asText = (value: unknown) => (value === undefined || value === null ? '' : String(value)).trim();
		const text = draft.text.trim();
		setDraft(null);
		// Only save what the user changed: compare with the value when editing started, so an
		// untouched field never writes an old value over a change made elsewhere meanwhile.
		if (text === asText(draft.baseline) || text === asText(scopeValue)) return;
		onSave(field, text === '' ? null : draft.text);
	};

	const overriddenBy = scope === 'user' && isSet(field.values.workspace) ? field.values.workspace : scope === 'user' && isSet(field.values.workspaceFolder) ? field.values.workspaceFolder : undefined;

	let control: React.ReactNode;
	if (field.type === 'boolean') {
		// Rendered in the row head, next to its label.
		control = null;
	} else if (field.key === PROVIDER_KEY && field.enum) {
		const options = field.enum.map(value => ({ value, label: PROVIDER_LABEL[value] ?? value, disabled: readOnly }));
		control = <SegmentedControl id={id} options={options} value={String(shownValue ?? field.enum[0])} onChange={value => onSave(field, value)} ariaLabel={field.label} />;
	} else if (field.enum) {
		const options = field.enum.map((value, index) => ({ value, label: field.enumDescriptions?.[index] ? `${value} — ${field.enumDescriptions[index]}` : value }));
		control = <Select id={id} value={String(shownValue ?? field.enum[0])} options={options} onChange={value => onSave(field, value)} ariaLabel={field.label} disabled={readOnly} />;
	} else {
		const isNumber = field.type === 'number' || field.type === 'integer';
		control = (
			<Input
				id={id}
				type={isNumber ? 'number' : 'text'}
				min={field.minimum}
				max={field.maximum}
				spellCheck={false}
				autoComplete="off"
				disabled={readOnly}
				value={draft !== null ? draft.text : hasScopeValue ? String(scopeValue ?? '') : ''}
				placeholder={isSet(inherited.value) ? `${formatValue(inherited.value)} (${inherited.source})` : 'Not set'}
				onFocus={() => setDraft({ text: hasScopeValue ? String(scopeValue ?? '') : '', baseline: scopeValue })}
				onChange={event => {
					const text = event.target.value;
					setDraft(prev => ({ text, baseline: prev ? prev.baseline : scopeValue }));
				}}
				onBlur={commitDraft}
				onKeyDown={event => {
					if (event.key === 'Enter') {
						event.currentTarget.blur();
					} else if (event.key === 'Escape' && editing) {
						// Revert the field instead of closing the dialog.
						event.stopPropagation();
						setDraft(null);
						requestAnimationFrame(() => (event.target as HTMLInputElement).blur());
					}
				}}
			/>
		);
	}

	return (
		<Row>
			<RowHead>
				{field.type === 'boolean' && <Checkbox id={id} type="checkbox" checked={Boolean(shownValue)} disabled={readOnly} onChange={event => onSave(field, event.target.checked)} />}
				{field.key === PROVIDER_KEY ? <Label as="span">{field.label}</Label> : <Label htmlFor={id}>{field.label}</Label>}
				{field.description && <InfoTip label={`About ${field.label}`} text={field.description} />}
				<Spacer />
				{readOnly ? (
					<LinkButton type="button" onClick={onSwitchToUser} title="Show User settings, where this setting can be changed">
						Edit in User
					</LinkButton>
				) : (
					hasScopeValue && (
						<LinkButton type="button" onClick={() => onSave(field, null)} title={singleScope ? 'Remove the value (use the environment variable or the default)' : `Remove the value from ${SCOPE_LABEL[scope]} settings`}>
							Reset
						</LinkButton>
					)
				)}
			</RowHead>
			{control}
			{readOnly && <Note>Only in User settings: it applies to every workspace. Showing the value in effect.</Note>}
			{overriddenBy !== undefined && <Note $tone="warning">This workspace overrides it with: {formatValue(overriddenBy)}</Note>}
			{changedElsewhere && <Note $tone="warning">Changed outside this dialog while you were editing (now: {formatValue(scopeValue)}). Saving keeps your text.</Note>}
			<StatusNote status={status} />
		</Row>
	);
}

interface CredentialRowProps {
	credential: CredentialFieldModel;
	status?: FieldStatus;
	onStore: (credential: CredentialFieldModel, value: string) => void;
	onClear: (credential: CredentialFieldModel) => void;
}

function CredentialRow({ credential, status, onStore, onClear }: CredentialRowProps) {
	const id = useId();
	const [value, setValue] = useState('');
	const disabled = !credential.connectionComplete;

	const sourceBadge =
		credential.source === 'keychain' ? (
			<Badge $tone="info">Stored in the OS keychain</Badge>
		) : credential.source === 'env' ? (
			<Badge $tone="muted">From {credential.envVar}</Badge>
		) : credential.source === 'legacySetting' ? (
			<Badge $tone="warning">In settings.json (plain text)</Badge>
		) : (
			<Badge $tone="muted">Not set</Badge>
		);

	const submit = () => {
		if (!value.trim() || disabled || status?.state === 'saving') return;
		onStore(credential, value);
		// Never keep a typed credential around once it was sent.
		setValue('');
	};

	return (
		<Row>
			<RowHead>
				<Label htmlFor={id}>{credential.label}</Label>
				<InfoTip label={`About ${credential.label}`} text={`Saved in the OS keychain for ${credential.connectionLabel}, never in a settings file. Every workspace that uses this connection shares it.`} />
				{sourceBadge}
				<Spacer />
				{credential.stored && (
					<LinkButton type="button" onClick={() => onClear(credential)} title="Remove it from the OS keychain">
						Remove
					</LinkButton>
				)}
			</RowHead>
			{disabled && <Description>{credential.incompleteReason}</Description>}
			<InlineControls>
				<Input
					id={id}
					type="password"
					autoComplete="off"
					spellCheck={false}
					disabled={disabled}
					value={value}
					placeholder={credential.stored ? '•••••••• (stored — type a new one to replace it)' : 'Paste the value'}
					onChange={event => setValue(event.target.value)}
					onKeyDown={event => {
						if (event.key === 'Enter') submit();
					}}
				/>
				<Button type="button" disabled={disabled || !value.trim() || status?.state === 'saving'} onClick={submit}>
					{credential.stored ? 'Replace' : 'Save'}
				</Button>
			</InlineControls>
			{credential.source === 'legacySetting' && <Note $tone="warning">Robert found this credential in plain text in settings.json. Save it here to move it to the OS keychain.</Note>}
			{credential.source === 'env' && <Note>Using {credential.envVar} from the environment. A value saved here takes precedence.</Note>}
			<StatusNote status={status} />
		</Row>
	);
}

const AboutHead = styled.div`
	display: flex;
	align-items: center;
	gap: 14px;
	margin: 18px 0 16px;
`;

const AboutLogo = styled.img`
	width: 48px;
	height: 48px;
	border-radius: 10px;
	flex: none;
`;

const AboutName = styled.div`
	font-size: 15px;
	font-weight: 600;
`;

const AboutList = styled.dl`
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: 6px 16px;
	margin: 0 0 16px;
	font-size: 12px;
	dt {
		color: var(--vscode-descriptionForeground);
	}
	dd {
		margin: 0;
		word-break: break-word;
	}
`;

const AboutLinks = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 6px 18px;
	font-size: 12px;
	a {
		color: var(--vscode-textLink-foreground);
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
`;

function AboutSection({ about, onShowLogs }: { about: AboutModel; onShowLogs: () => void }) {
	const logo = typeof window !== 'undefined' ? window.rebusLogoUri : undefined;
	return (
		<section>
			<AboutHead>
				{logo && !logo.startsWith('__') && <AboutLogo src={logo} alt="" />}
				<div>
					<AboutName>{about.name}</AboutName>
					{about.description && <Description>{about.description}</Description>}
				</div>
			</AboutHead>
			<AboutList>
				<dt>Version</dt>
				<dd>{about.version || 'unknown'}</dd>
				<dt>Running in</dt>
				<dd>{about.host}</dd>
			</AboutList>
			<AboutLinks>
				{about.links.map(link => (
					<a key={link.url} href={link.url} target="_blank" rel="noreferrer">
						{link.label}
					</a>
				))}
				<LinkButton type="button" onClick={onShowLogs}>
					Show logs
				</LinkButton>
			</AboutLinks>
		</section>
	);
}

export function SettingsDialog() {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const [open, setOpen] = useState(false);
	const [state, setState] = useState<SettingsStateMessage | null>(null);
	const [scope, setScope] = useState<SettingsScope | null>(null);
	const [section, setSection] = useState<SectionId>('provider');
	// Provider picked with the toggle, shown until the host confirms it with a fresh state.
	const [providerChoice, setProviderChoice] = useState<string | null>(null);
	const [statuses, setStatuses] = useState<Record<string, FieldStatus>>({});
	const pendingRef = useRef(new Map<string, string>());
	const panelRef = useRef<HTMLDivElement>(null);
	const restoreFocusRef = useRef<HTMLElement | null>(null);
	const titleId = useId();

	const post = useCallback((message: Record<string, unknown>) => vscode?.postMessage(message), [vscode]);

	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			const message = event.data;
			switch (message?.command) {
				case 'showSettings':
					restoreFocusRef.current = document.activeElement as HTMLElement | null;
					setOpen(true);
					setStatuses({});
					post({ command: 'settingsLoad' });
					break;
				case 'settingsState':
					setState(message as SettingsStateMessage);
					setProviderChoice(null);
					break;
				case 'settingsResult': {
					const result = message as SettingsResultMessage;
					if (!result.ok) setProviderChoice(null);
					const fieldKey = pendingRef.current.get(result.requestId);
					if (!fieldKey) break;
					pendingRef.current.delete(result.requestId);
					setStatuses(prev => ({ ...prev, [fieldKey]: result.ok ? { state: 'saved' } : { state: 'error', message: result.error } }));
					break;
				}
			}
		};
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	}, [post]);

	const close = useCallback(() => {
		setOpen(false);
		restoreFocusRef.current?.focus?.();
	}, []);

	useEffect(() => {
		if (open) panelRef.current?.focus();
	}, [open]);

	const send = useCallback(
		(statusKey: string, message: Record<string, unknown>) => {
			const requestId = nextRequestId();
			pendingRef.current.set(requestId, statusKey);
			setStatuses(prev => ({ ...prev, [statusKey]: { state: 'saving' } }));
			post({ ...message, requestId });
		},
		[post]
	);

	// The host's default scope until the user picks one; User when no workspace is open (any more).
	const activeScope: SettingsScope = scope !== null && (scope === 'user' || state?.host.hasWorkspace) ? scope : (state?.host.defaultScope ?? 'user');

	const saveSetting = useCallback(
		(field: SettingFieldModel, value: unknown) => {
			if (field.key === PROVIDER_KEY) setProviderChoice(value === null ? null : String(value));
			send(`${activeScope}:${field.key}`, { command: 'settingsUpdate', key: field.key, scope: activeScope, value });
		},
		[send, activeScope]
	);
	const storeCredential = useCallback((credential: CredentialFieldModel, value: string) => send(`credential:${credential.id}`, { command: 'settingsSetSecret', id: credential.id, value }), [send]);
	const clearCredential = useCallback((credential: CredentialFieldModel) => send(`credential:${credential.id}`, { command: 'settingsClearSecret', id: credential.id }), [send]);

	if (!open) return null;

	const host = state?.host;
	const singleScope = host?.kind === 'standalone';
	const providerField = state?.fields.find(field => field.key === PROVIDER_KEY);
	// The Provider tab only shows the connection settings of the provider selected in the toggle.
	const selectedProvider = String(providerChoice ?? (providerField ? shownValueFor(providerField, activeScope) : undefined) ?? 'jira');
	const hiddenProviderGroups = Object.entries(PROVIDER_GROUP)
		.filter(([provider]) => provider !== selectedProvider)
		.map(([, group]) => group);
	const sectionGroups = (state?.groups ?? []).filter(group => sectionForGroup(group) === section && !hiddenProviderGroups.includes(group));
	const sectionFields = state?.fields.filter(field => sectionGroups.includes(field.group)) ?? [];
	// Every field is listed in every scope; those that cannot be written to the selected scope are read-only.
	const visibleFields = sectionFields;
	const switchToUser = () => {
		setScope('user');
		setProviderChoice(null);
	};
	const sectionLabel = SECTIONS.find(entry => entry.id === section)?.label;
	// `Collaboration › Server Url` reads as `Server Url` inside the Collaboration tab.
	const withSectionLabel = (field: SettingFieldModel): SettingFieldModel => (sectionLabel && field.label.startsWith(`${sectionLabel} › `) ? { ...field, label: field.label.slice(sectionLabel.length + 3) } : field);
	const tabId = (id: SectionId) => `${titleId}-tab-${id}`;
	const panelId = `${titleId}-panel`;

	let scopeHint: string;
	if (host?.kind === 'standalone') {
		scopeHint = `Saved in ${host.userSettingsLocation ?? 'the app settings file'}. Settings that are not set use their ROBERT_* environment variable, then their default.`;
	} else if (activeScope === 'workspace') {
		scopeHint = `Saved in the settings of the workspace “${host?.workspaceName ?? ''}” (.vscode/settings.json). They override User settings, so each workspace can connect to its own Jira or Rally project.`;
	} else {
		scopeHint = 'Saved in your VS Code user settings. They apply to every workspace that does not override them.';
	}

	const dialog = (
		<Overlay
			onMouseDown={event => {
				if (event.target === event.currentTarget) close();
			}}
		>
			<Panel
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				onKeyDown={event => {
					if (event.key === 'Escape') {
						event.stopPropagation();
						close();
					} else if (event.key === 'Tab' && panelRef.current) {
						// Keep keyboard focus inside the dialog.
						const focusable = panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
						const first = focusable[0];
						const last = focusable[focusable.length - 1];
						if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
							event.preventDefault();
							last?.focus();
						} else if (!event.shiftKey && document.activeElement === last) {
							event.preventDefault();
							first?.focus();
						}
					}
				}}
			>
				<Header>
					<Title id={titleId}>Settings</Title>
					<IconButton type="button" aria-label="Close settings" title="Close (Esc)" onClick={close}>
						×
					</IconButton>
				</Header>
				{host && (
					<ScopeBar>
						{host.kind === 'vscode' ? (
							<ScopeLine>
								<span>Save to</span>
								<SegmentedControl
									ariaLabel="Where settings are saved"
									value={activeScope}
									options={(['user', 'workspace'] as const).map(optionScope => {
										const disabled = optionScope === 'workspace' && !host.hasWorkspace;
										return {
											value: optionScope,
											icon: optionScope === 'user' ? 'person' : 'folder',
											label: optionScope === 'workspace' && host.workspaceName ? `Workspace (${host.workspaceName})` : SCOPE_LABEL[optionScope],
											disabled,
											title: disabled ? 'Open a folder or workspace to save settings per workspace' : undefined
										};
									})}
									onChange={value => {
										setScope(value as SettingsScope);
										setProviderChoice(null);
									}}
								/>
								<InfoTip label="Where settings are saved" text={scopeHint} />
							</ScopeLine>
						) : (
							<ScopeLine>
								<span>Saved in the app settings file</span>
								<InfoTip label="Where settings are saved" text={scopeHint} />
							</ScopeLine>
						)}
					</ScopeBar>
				)}
				<SectionTabs
					role="tablist"
					aria-label="Settings sections"
					onKeyDown={event => {
						if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
						event.preventDefault();
						const index = SECTIONS.findIndex(entry => entry.id === section);
						const next = SECTIONS[(index + (event.key === 'ArrowRight' ? 1 : -1) + SECTIONS.length) % SECTIONS.length];
						setSection(next.id);
						document.getElementById(tabId(next.id))?.focus();
					}}
				>
					{SECTIONS.map(entry => (
						<SectionTab key={entry.id} id={tabId(entry.id)} type="button" role="tab" aria-selected={section === entry.id} aria-controls={panelId} tabIndex={section === entry.id ? 0 : -1} $active={section === entry.id} onClick={() => setSection(entry.id)}>
							{entry.label}
						</SectionTab>
					))}
				</SectionTabs>
				<Body id={panelId} role="tabpanel" aria-labelledby={tabId(section)}>
					{!state ? (
						<Note>Loading settings…</Note>
					) : section === 'about' ? (
						state.about ? (
							<AboutSection about={state.about} onShowLogs={() => post({ command: 'settingsShowLogs' })} />
						) : (
							<Note>No information available.</Note>
						)
					) : (
						sectionGroups.map(group => {
							const fields = visibleFields.filter(field => field.group === group);
							const credentials = state.credentials.filter(credential => credential.group === group);
							if (fields.length === 0 && credentials.length === 0) return null;
							return (
								<section key={group}>
									{/* A group named like its tab needs no title of its own. */}
									{group !== sectionLabel && <GroupTitle>{group}</GroupTitle>}
									<GroupContent $indented={group !== sectionLabel}>
										{fields.map(field => (
											<SettingRow
												key={`${activeScope}:${field.key}`}
												field={withSectionLabel(field)}
												scope={activeScope}
												singleScope={singleScope}
												status={statuses[`${activeScope}:${field.key}`]}
												pendingValue={field.key === PROVIDER_KEY && providerChoice !== null ? providerChoice : undefined}
												onSave={saveSetting}
												onSwitchToUser={field.scopes.includes(activeScope) ? undefined : switchToUser}
											/>
										))}
										{credentials.map(credential => (
											<CredentialRow
												// Keyed by connection too: a value typed for one connection must not be saved for another.
												key={`${credential.id}:${credential.connectionLabel}`}
												credential={credential}
												status={statuses[`credential:${credential.id}`]}
												onStore={storeCredential}
												onClear={clearCredential}
											/>
										))}
									</GroupContent>
								</section>
							);
						})
					)}
				</Body>
				{host?.canOpenNativeSettings && (
					<Footer>
						<LinkButton type="button" onClick={() => post({ command: 'settingsOpenNative', scope: activeScope })}>
							Open in VS Code Settings
						</LinkButton>
					</Footer>
				)}
			</Panel>
		</Overlay>
	);

	return createPortal(dialog, document.body);
}

export default SettingsDialog;
