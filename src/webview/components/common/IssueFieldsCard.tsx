import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import DOMPurify from 'dompurify';
import { type IssueFieldsItemType, type IssueFieldsResult, type IssueFieldValue } from '../../../types/jira';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { fieldMatchesFilter, normalizeForFilter } from '../../utils/issueFieldsFilter';
import SubTabsBar from './SubTabsBar';
import './CollapsibleCard';

/**
 * Loads the fields of a Jira issue or Rally artifact that Robert does not show elsewhere.
 * `result` is null until the first response arrives.
 */
function useIssueFields(objectId: string, itemType: IssueFieldsItemType): { result: IssueFieldsResult | null; error: string | null } {
	const [state, setState] = useState<{ objectId: string | undefined; result: IssueFieldsResult | null; error: string | null }>({ objectId, result: null, error: null });

	useEffect(() => {
		const vscode = getVsCodeApi();
		if (!objectId || !vscode) {
			return;
		}
		const listener = (event: MessageEvent) => {
			const msg = event.data;
			if (msg?.type === 'issueFieldsLoaded' && msg.objectId === objectId) {
				setState({ objectId, result: msg.result ?? null, error: msg.error ?? null });
			}
		};
		window.addEventListener('message', listener);
		vscode.postMessage({ command: 'loadIssueFields', objectId, itemType });
		return () => window.removeEventListener('message', listener);
	}, [objectId, itemType]);

	// Never show the previous item's fields while the new ones load.
	return state.objectId === objectId ? { result: state.result, error: state.error } : { result: null, error: null };
}

/** Ids of the pinned fields (stored per workspace by the extension), with a toggle that updates optimistically. */
function usePinnedIssueFields(): { pinnedIds: Set<string>; togglePinned: (fieldId: string) => void } {
	const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		const vscode = getVsCodeApi();
		if (!vscode) {
			return;
		}
		const listener = (event: MessageEvent) => {
			const msg = event.data;
			if (msg?.type === 'pinnedIssueFieldsLoaded' && Array.isArray(msg.fieldIds)) {
				setPinnedIds(new Set(msg.fieldIds));
			}
		};
		window.addEventListener('message', listener);
		vscode.postMessage({ command: 'getPinnedIssueFields' });
		return () => window.removeEventListener('message', listener);
	}, []);

	const togglePinned = useCallback((fieldId: string) => {
		setPinnedIds(current => {
			const next = new Set(current);
			if (!next.delete(fieldId)) {
				next.add(fieldId);
			}
			return next;
		});
		getVsCodeApi()?.postMessage({ command: 'togglePinnedIssueField', fieldId });
	}, []);

	return { pinnedIds, togglePinned };
}

const Rows = styled.dl`
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
`;

const PinButton = styled.button<{ $pinned: boolean }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	padding: 0;
	margin-top: -3px;
	border: none;
	border-radius: 3px;
	background-color: transparent;
	color: ${({ $pinned }) => ($pinned ? 'var(--vscode-textLink-foreground)' : 'var(--vscode-descriptionForeground)')};
	cursor: pointer;
	opacity: ${({ $pinned }) => ($pinned ? 0.7 : 0)};
	transition: opacity 0.12s ease;

	&:hover {
		background-color: var(--vscode-toolbar-hoverBackground);
		opacity: 1;
	}

	&:focus-visible {
		opacity: 1;
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
	}

	& .codicon {
		font-size: 14px;
	}
`;

const Row = styled.div`
	display: grid;
	grid-template-columns: minmax(110px, 35%) minmax(0, 1fr) 22px;
	column-gap: 16px;
	align-items: start;

	&:hover ${PinButton} {
		opacity: 1;
	}
`;

const Name = styled.dt`
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
	overflow-wrap: anywhere;
`;

const Value = styled.dd`
	margin: 0;
	font-size: 13px;
	color: var(--vscode-foreground);
	overflow-wrap: anywhere;
	white-space: pre-wrap;

	& p {
		margin: 0 0 6px;
	}

	& p:last-child {
		margin-bottom: 0;
	}

	& a {
		color: var(--vscode-textLink-foreground);
	}
`;

const Message = styled.div`
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
`;

const FilterInput = styled.input`
	width: 180px;
	max-width: 40vw;
	height: 24px;
	box-sizing: border-box;
	padding: 2px 6px;
	font-family: inherit;
	font-size: 12px;
	color: var(--vscode-input-foreground);
	background-color: var(--vscode-input-background);
	border: 1px solid var(--vscode-input-border, transparent);
	border-radius: 2px;
	outline: none;

	&::placeholder {
		color: var(--vscode-input-placeholderForeground);
	}

	&:focus {
		border-color: var(--vscode-focusBorder);
	}
`;

const FieldRows: FC<{ fields: IssueFieldValue[]; pinnedIds: Set<string>; onTogglePinned: (fieldId: string) => void }> = ({ fields, pinnedIds, onTogglePinned }) => (
	<Rows>
		{fields.map(field => {
			const pinned = pinnedIds.has(field.id);
			const label = `${pinned ? 'Unpin' : 'Pin'} «${field.name}»`;
			return (
				<Row key={field.id}>
					<Name>{field.name}</Name>
					{field.html ? <Value style={{ whiteSpace: 'normal' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(field.html, { FORBID_ATTR: ['style'] }) }} /> : <Value>{field.text}</Value>}
					<PinButton type="button" $pinned={pinned} onClick={() => onTogglePinned(field.id)} title={pinned ? 'Unpin field' : 'Pin field (stays visible when the card is collapsed)'} aria-label={label} aria-pressed={pinned}>
						<span className={`codicon codicon-${pinned ? 'pinned' : 'pin'}`} aria-hidden="true" />
					</PinButton>
				</Row>
			);
		})}
	</Rows>
);

/**
 * «Fields» card with the item's other fields (e.g. «Talla»). With Jira they are grouped by the
 * tabs of the issue's screen when the account can read them (Jira admins); with Rally, in
 * «Custom» and «Standard» tabs (Rally does not expose the detail page layout).
 *
 * Collapsed by default. Pinned fields (per workspace, for every issue) stay visible while it is
 * collapsed; expanding it adds a filter and, below the pinned ones, the rest of the fields.
 */
const IssueFieldsCard: FC<{ objectId: string; itemType: IssueFieldsItemType }> = ({ objectId, itemType }) => {
	const { result, error } = useIssueFields(objectId, itemType);
	const { pinnedIds, togglePinned } = usePinnedIssueFields();
	const [activeTab, setActiveTab] = useState<{ objectId: string; index: number }>({ objectId, index: 0 });
	const [expanded, setExpanded] = useState(false);
	const [filter, setFilter] = useState('');
	const cardRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const card = cardRef.current;
		if (!card) {
			return;
		}
		const handleToggle = (event: Event) => {
			// Ignore toggles bubbling up from any card nested inside this one.
			if (event.target !== card) {
				return;
			}
			const collapsed = (event as CustomEvent<{ collapsed: boolean }>).detail?.collapsed;
			setExpanded(collapsed === false);
			if (collapsed) {
				setFilter('');
			}
		};
		card.addEventListener('toggle', handleToggle);
		return () => card.removeEventListener('toggle', handleToggle);
	}, []);

	const tabs = useMemo(() => result?.tabs ?? [], [result]);
	const total = tabs.reduce((sum, tab) => sum + tab.fields.length, 0);
	const normalizedFilter = expanded ? normalizeForFilter(filter.trim()) : '';

	// Pinned fields in screen order; the filter only applies while expanded.
	const pinnedFields = useMemo(() => tabs.flatMap(tab => tab.fields).filter(field => pinnedIds.has(field.id)), [tabs, pinnedIds]);
	const visiblePinned = pinnedFields.filter(field => fieldMatchesFilter(field, normalizedFilter));
	const unpinnedTabs = useMemo(() => tabs.map(tab => ({ name: tab.name, fields: tab.fields.filter(field => !pinnedIds.has(field.id)) })), [tabs, pinnedIds]);
	const filteredTabs = unpinnedTabs.map(tab => ({ name: tab.name, fields: tab.fields.filter(field => fieldMatchesFilter(field, normalizedFilter)) }));

	const activeIndex = activeTab.objectId === objectId && activeTab.index < filteredTabs.length ? activeTab.index : 0;
	const fields = filteredTabs[activeIndex]?.fields ?? [];
	const anyUnpinnedMatch = filteredTabs.some(tab => tab.fields.length > 0);
	const showSummary = !!error || visiblePinned.length > 0;

	let body;
	if (error) {
		body = null;
	} else if (!result) {
		body = <Message>Loading fields…</Message>;
	} else if (total === 0) {
		body = <Message>No other fields have a value.</Message>;
	} else if (normalizedFilter && !anyUnpinnedMatch) {
		body = visiblePinned.length > 0 ? null : <Message>No fields match «{filter.trim()}».</Message>;
	} else if (fields.length === 0) {
		body = <Message>{normalizedFilter ? 'No fields in this tab match the filter.' : pinnedFields.length > 0 ? 'No other fields with a value in this tab.' : 'No fields with a value in this tab.'}</Message>;
	} else {
		body = <FieldRows fields={fields} pinnedIds={pinnedIds} onTogglePinned={togglePinned} />;
	}

	const showPinHint = !!result && total > 0 && pinnedFields.length === 0 && !normalizedFilter;
	const showTabs = tabs.length > 1 && !error && anyUnpinnedMatch;

	return (
		<collapsible-card ref={cardRef} title={result ? `Fields (${total})` : 'Fields'} default-collapsed style={{ margin: '20px 0' } as React.CSSProperties}>
			{expanded && total > 0 && (
				<div slot="header-actions" style={{ display: 'flex', alignItems: 'center', marginLeft: '12px' }}>
					<FilterInput
						type="search"
						value={filter}
						placeholder="Filter fields"
						aria-label="Filter fields by name or value"
						onChange={event => setFilter(event.target.value)}
						onKeyDown={event => {
							if (event.key === 'Escape' && filter) {
								event.stopPropagation();
								setFilter('');
							}
						}}
					/>
				</div>
			)}
			{showSummary && (
				<div slot="summary" style={{ padding: expanded ? '16px 36px 0' : '14px 36px' }}>
					{error ? <Message>Could not load the fields: {error}</Message> : <FieldRows fields={visiblePinned} pinnedIds={pinnedIds} onTogglePinned={togglePinned} />}
				</div>
			)}
			{(showPinHint || showTabs || body) && (
				<div
					style={{
						// Below the pinned fields, a divider separates them from the rest.
						padding: showSummary ? '16px 20px 20px' : '12px 20px 20px',
						borderTop: showSummary ? '1px solid var(--vscode-panel-border)' : undefined,
						display: 'flex',
						flexDirection: 'column',
						gap: '16px'
					}}
				>
					{showPinHint && <Message>Pin a field to keep it visible while this card is collapsed.</Message>}
					{showTabs && <SubTabsBar subTabs={filteredTabs.map((tab, index) => ({ id: String(index), label: `${tab.name ?? 'Fields'} (${tab.fields.length})` }))} activeSubTabId={String(activeIndex)} onSubTabChange={id => setActiveTab({ objectId, index: Number(id) })} />}
					{body}
				</div>
			)}
		</collapsible-card>
	);
};

export default IssueFieldsCard;
