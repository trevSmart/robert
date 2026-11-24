import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import type { CredentialFieldModel, SettingFieldModel, SettingsResultMessage, SettingsScope, SettingsStateMessage } from '../../../settings/protocol';
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
	max-height: 100%;
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

const ScopeTabs = styled.div`
	display: flex;
	gap: 4px;
	padding: 10px 18px 0;
	border-bottom: 1px solid var(--vscode-panel-border);
`;

const ScopeTab = styled.button<{ $active: boolean }>`
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

const ScopeHint = styled.p`
	margin: 0;
	padding: 10px 18px;
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
	border-bottom: 1px solid var(--vscode-panel-border);
	word-break: break-word;
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

const GroupTag = styled.span`
	text-transform: none;
	letter-spacing: 0;
	font-weight: 400;
`;

const Row = styled.div`
	padding: 10px 0;
`;

const RowHead = styled.div`
	display: flex;
	align-items: baseline;
	gap: 8px;
	flex-wrap: wrap;
`;

const Label = styled.label`
	font-weight: 600;
	font-size: 13px;
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

const CheckboxLine = styled.label`
	display: flex;
	gap: 8px;
	align-items: flex-start;
	cursor: pointer;
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
	input {
		margin: 2px 0 0;
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

interface SettingRowProps {
	field: SettingFieldModel;
	scope: SettingsScope;
	/** The standalone app has a single scope: no need to name it. */
	singleScope: boolean;
	status?: FieldStatus;
	onSave: (field: SettingFieldModel, value: unknown) => void;
}

function SettingRow({ field, scope, singleScope, status, onSave }: SettingRowProps) {
	const id = useId();
	const scopeValue = scope === 'workspace' ? field.values.workspace : field.values.user;
	const hasScopeValue = scopeValue !== undefined;
	const inherited = inheritedFor(field, scope);
	const shownValue = hasScopeValue ? scopeValue : inherited.value;

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
		control = (
			<CheckboxLine>
				<input id={id} type="checkbox" checked={Boolean(shownValue)} onChange={event => onSave(field, event.target.checked)} />
				<span>{field.description}</span>
			</CheckboxLine>
		);
	} else if (field.enum) {
		const options = field.enum.map((value, index) => ({ value, label: field.enumDescriptions?.[index] ? `${value} — ${field.enumDescriptions[index]}` : value }));
		control = <Select id={id} value={String(shownValue ?? field.enum[0])} options={options} onChange={value => onSave(field, value)} ariaLabel={field.label} />;
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
				<Label htmlFor={id}>{field.label}</Label>
				{hasScopeValue ? <Badge $tone="info">{singleScope ? 'Set' : `Set in ${SCOPE_LABEL[scope]}`}</Badge> : <Badge $tone="muted">{inherited.source === 'default' ? 'Default' : `From ${inherited.source}`}</Badge>}
				<Spacer />
				{hasScopeValue && (
					<LinkButton type="button" onClick={() => onSave(field, null)} title={singleScope ? 'Remove the value (use the environment variable or the default)' : `Remove the value from ${SCOPE_LABEL[scope]} settings`}>
						Reset
					</LinkButton>
				)}
			</RowHead>
			{field.type !== 'boolean' && field.description && <Description>{field.description}</Description>}
			{control}
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
				{sourceBadge}
				<Spacer />
				{credential.stored && (
					<LinkButton type="button" onClick={() => onClear(credential)} title="Remove it from the OS keychain">
						Remove
					</LinkButton>
				)}
			</RowHead>
			<Description>{disabled ? credential.incompleteReason : <>Saved in the OS keychain for {credential.connectionLabel}, never in a settings file. Every workspace that uses this connection shares it.</>}</Description>
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

export function SettingsDialog() {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const [open, setOpen] = useState(false);
	const [state, setState] = useState<SettingsStateMessage | null>(null);
	const [scope, setScope] = useState<SettingsScope | null>(null);
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
					break;
				case 'settingsResult': {
					const result = message as SettingsResultMessage;
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

	const saveSetting = useCallback((field: SettingFieldModel, value: unknown) => send(`${activeScope}:${field.key}`, { command: 'settingsUpdate', key: field.key, scope: activeScope, value }), [send, activeScope]);
	const storeCredential = useCallback((credential: CredentialFieldModel, value: string) => send(`credential:${credential.id}`, { command: 'settingsSetSecret', id: credential.id, value }), [send]);
	const clearCredential = useCallback((credential: CredentialFieldModel) => send(`credential:${credential.id}`, { command: 'settingsClearSecret', id: credential.id }), [send]);

	if (!open) return null;

	const host = state?.host;
	const visibleFields = state?.fields.filter(field => field.scopes.includes(activeScope)) ?? [];
	const userOnlyFields = state?.fields.filter(field => !field.scopes.includes(activeScope)) ?? [];
	const activeProvider = state?.fields.find(field => field.key === 'robert.provider')?.effectiveValue;
	const inactiveGroup = activeProvider === 'rally' ? 'Jira Cloud' : activeProvider === 'jira' ? 'Rally' : undefined;

	let scopeHint: React.ReactNode;
	if (host?.kind === 'standalone') {
		scopeHint = <>Saved in {host.userSettingsLocation ?? 'the app settings file'}. Settings that are not set use their ROBERT_* environment variable, then their default.</>;
	} else if (activeScope === 'workspace') {
		scopeHint = <>Saved in the settings of the workspace “{host?.workspaceName}” (.vscode/settings.json). They override User settings, so each workspace can connect to its own Jira or Rally project.</>;
	} else {
		scopeHint = <>Saved in your VS Code user settings. They apply to every workspace that does not override them.</>;
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
				{host?.kind === 'vscode' ? (
					<ScopeTabs role="tablist" aria-label="Where settings are saved">
						{(['user', 'workspace'] as const).map(tabScope => {
							const disabled = tabScope === 'workspace' && !host.hasWorkspace;
							return (
								<ScopeTab key={tabScope} type="button" role="tab" aria-selected={activeScope === tabScope} $active={activeScope === tabScope} disabled={disabled} title={disabled ? 'Open a folder or workspace to save settings per workspace' : undefined} onClick={() => setScope(tabScope)}>
									{tabScope === 'workspace' && host.workspaceName ? `Workspace (${host.workspaceName})` : SCOPE_LABEL[tabScope]}
								</ScopeTab>
							);
						})}
					</ScopeTabs>
				) : (
					<ScopeTabs />
				)}
				{host && <ScopeHint>{scopeHint}</ScopeHint>}
				<Body>
					{!state ? (
						<Note>Loading settings…</Note>
					) : (
						state.groups.map(group => {
							const fields = visibleFields.filter(field => field.group === group);
							const credentials = state.credentials.filter(credential => credential.group === group);
							if (fields.length === 0 && credentials.length === 0) return null;
							return (
								<section key={group}>
									<GroupTitle>
										{group}
										{group === inactiveGroup && <GroupTag>(not the active provider)</GroupTag>}
									</GroupTitle>
									{fields.map(field => (
										<SettingRow key={`${activeScope}:${field.key}`} field={field} scope={activeScope} singleScope={host?.kind === 'standalone'} status={statuses[`${activeScope}:${field.key}`]} onSave={saveSetting} />
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
								</section>
							);
						})
					)}
					{userOnlyFields.length > 0 && <Note>Only in User settings: {userOnlyFields.map(field => field.label).join(', ')}.</Note>}
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
