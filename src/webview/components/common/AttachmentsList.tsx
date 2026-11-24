import { FC, useEffect, useState } from 'react';
import styled from 'styled-components';
import { type Attachment } from '../../../types/jira';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { fetchJiraImage } from '../../utils/jiraImageProxy';

/**
 * Loads the attachments of a work item (user story, defect...) from the active
 * provider. `attachments` is null until the first response arrives.
 */
export function useAttachments(objectId: string | undefined): { attachments: Attachment[] | null; error: string | null } {
	const [state, setState] = useState<{ objectId: string | undefined; attachments: Attachment[] | null; error: string | null }>({ objectId, attachments: null, error: null });

	useEffect(() => {
		const vscode = getVsCodeApi();
		if (!objectId || !vscode) {
			return;
		}
		const listener = (event: MessageEvent) => {
			const msg = event.data;
			if (msg?.type === 'attachmentsLoaded' && msg.objectId === objectId) {
				setState({ objectId, attachments: Array.isArray(msg.attachments) ? msg.attachments : [], error: msg.error ?? null });
			}
		};
		window.addEventListener('message', listener);
		vscode.postMessage({ command: 'loadAttachments', objectId });
		return () => window.removeEventListener('message', listener);
	}, [objectId]);

	// Never show the previous item's attachments while the new ones load.
	return state.objectId === objectId ? { attachments: state.attachments, error: state.error } : { attachments: null, error: null };
}

export function formatFileSize(bytes: number): string {
	if (!bytes) {
		return '';
	}
	const units = ['B', 'KB', 'MB', 'GB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${unit === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

const List = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

const Row = styled.button`
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	padding: 10px 12px;
	text-align: left;
	font: inherit;
	color: var(--vscode-foreground);
	background: color-mix(in srgb, var(--vscode-input-background) 60%, var(--vscode-panel-background));
	border: 1px solid var(--vscode-input-border);
	border-radius: 6px;
	cursor: pointer;
	transition: border-color 0.15s ease;

	&:hover,
	&:focus-visible {
		border-color: var(--vscode-textLink-foreground);
		outline: none;
	}
`;

const Preview = styled.div`
	flex: 0 0 auto;
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	border-radius: 4px;
	background: var(--vscode-editor-background);
	color: var(--vscode-descriptionForeground);

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
`;

const Info = styled.div`
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
`;

const FileName = styled.span`
	font-size: 13px;
	font-weight: 500;
	color: var(--vscode-textLink-foreground);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const Meta = styled.span`
	font-size: 11px;
	color: var(--vscode-descriptionForeground);
`;

const Message = styled.div<{ $error?: boolean }>`
	padding: 12px;
	text-align: center;
	color: ${props => (props.$error ? 'var(--vscode-errorForeground)' : 'var(--vscode-descriptionForeground)')};
`;

export const AttachmentIcon = ({ size = '18px' }: { size?: string }) => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: size, height: size }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
	</svg>
);

const FileIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
		<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
	</svg>
);

/** Image preview fetched through the extension (provider images need auth); falls back to the file icon. */
const Thumbnail: FC<{ url: string | null }> = ({ url }) => {
	const [loaded, setLoaded] = useState<{ url: string; dataUrl: string } | null>(null);

	useEffect(() => {
		if (!url) {
			return;
		}
		let cancelled = false;
		fetchJiraImage(url)
			.then(dataUrl => {
				if (!cancelled) {
					setLoaded({ url, dataUrl });
				}
			})
			.catch(() => {
				// Keep the file icon.
			});
		return () => {
			cancelled = true;
		};
	}, [url]);

	const dataUrl = loaded && loaded.url === url ? loaded.dataUrl : null;
	return <Preview>{dataUrl ? <img src={dataUrl} alt="" /> : <FileIcon />}</Preview>;
};

const formatDate = (value: string) => {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

interface AttachmentsListProps {
	attachments: Attachment[] | null;
	error?: string | null;
}

const AttachmentsList: FC<AttachmentsListProps> = ({ attachments, error }) => {
	if (error) {
		return <Message $error>Could not load attachments: {error}</Message>;
	}
	if (attachments === null) {
		return <Message>Loading attachments...</Message>;
	}
	if (attachments.length === 0) {
		return <Message>There are no attachments.</Message>;
	}

	const open = (attachment: Attachment) => getVsCodeApi()?.postMessage({ command: 'openAttachment', url: attachment.url });

	return (
		<List>
			{attachments.map(attachment => (
				<Row key={attachment.objectId} type="button" onClick={() => open(attachment)} title={`Open ${attachment.fileName} in the browser`}>
					<Thumbnail url={attachment.thumbnailUrl} />
					<Info>
						<FileName>{attachment.fileName}</FileName>
						<Meta>{[formatFileSize(attachment.size), attachment.author, formatDate(attachment.createdDate)].filter(Boolean).join(' · ')}</Meta>
					</Info>
				</Row>
			))}
		</List>
	);
};

export default AttachmentsList;
