import { FC, useEffect, useState } from 'react';
import styled from 'styled-components';
import DOMPurify from 'dompurify';
import { type IssueFieldsResult } from '../../../types/jira';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { useProvider } from '../../utils/providerState';
import SubTabsBar from './SubTabsBar';
import './CollapsibleCard';

/**
 * Loads the fields of a Jira issue that Robert does not show elsewhere.
 * `result` is null until the first response arrives. Does nothing when `objectId` is undefined.
 */
function useIssueFields(objectId: string | undefined): { result: IssueFieldsResult | null; error: string | null } {
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
		vscode.postMessage({ command: 'loadIssueFields', objectId });
		return () => window.removeEventListener('message', listener);
	}, [objectId]);

	// Never show the previous item's fields while the new ones load.
	return state.objectId === objectId ? { result: state.result, error: state.error } : { result: null, error: null };
}

const Rows = styled.dl`
	display: grid;
	grid-template-columns: minmax(110px, 35%) minmax(0, 1fr);
	column-gap: 16px;
	row-gap: 10px;
	margin: 0;
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

/**
 * Jira only: «Fields» card with the issue's other fields (e.g. «Talla»), grouped by
 * the tabs of the issue's Jira screen when the account can read them (Jira admins).
 */
const IssueFieldsCard: FC<{ objectId: string }> = ({ objectId }) => {
	const { isRally } = useProvider();
	const { result, error } = useIssueFields(isRally ? undefined : objectId);
	const [activeTab, setActiveTab] = useState<{ objectId: string; index: number }>({ objectId, index: 0 });

	if (isRally) {
		return null;
	}

	const tabs = result?.tabs ?? [];
	const activeIndex = activeTab.objectId === objectId && activeTab.index < tabs.length ? activeTab.index : 0;
	const fields = tabs[activeIndex]?.fields ?? [];
	const total = tabs.reduce((sum, tab) => sum + tab.fields.length, 0);

	let body;
	if (error) {
		body = <Message>Could not load the fields: {error}</Message>;
	} else if (!result) {
		body = <Message>Loading fields…</Message>;
	} else if (total === 0) {
		body = <Message>No other fields have a value.</Message>;
	} else if (fields.length === 0) {
		body = <Message>No fields with a value in this tab.</Message>;
	} else {
		body = (
			<Rows>
				{fields.map(field => (
					<div key={field.id} style={{ display: 'contents' }}>
						<Name>{field.name}</Name>
						{field.html ? <Value style={{ whiteSpace: 'normal' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(field.html, { FORBID_ATTR: ['style'] }) }} /> : <Value>{field.text}</Value>}
					</div>
				))}
			</Rows>
		);
	}

	return (
		<collapsible-card title={result ? `Fields (${total})` : 'Fields'} style={{ margin: '20px 0' } as React.CSSProperties}>
			<div style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
				{tabs.length > 1 && <SubTabsBar subTabs={tabs.map((tab, index) => ({ id: String(index), label: `${tab.name ?? 'Fields'} (${tab.fields.length})` }))} activeSubTabId={String(activeIndex)} onSubTabChange={id => setActiveTab({ objectId, index: Number(id) })} />}
				{body}
			</div>
		</collapsible-card>
	);
};

export default IssueFieldsCard;
