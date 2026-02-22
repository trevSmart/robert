import React from 'react';
import styled from 'styled-components';
import { Discussion } from '../../../types/rally';

const ChatContainer = styled.div<{ embedded?: boolean }>`
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-top: ${props => (props.embedded ? '0' : '10px')};
	padding: ${props => (props.embedded ? '0' : '16px')};
	background: ${props => (props.embedded ? 'transparent' : 'var(--vscode-editor-background)')};
	border: ${props => (props.embedded ? 'none' : '1px solid var(--vscode-panel-border)')};
	border-radius: ${props => (props.embedded ? '0' : '6px')};
	max-height: 500px;
	overflow-y: auto;
`;

const MessageBubble = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 12px 16px;
	background: color-mix(in srgb, var(--vscode-panel-background) 80%, var(--vscode-editor-background));
	border-radius: 12px;
	border: 1px solid var(--vscode-panel-border);
	max-width: 100%;
`;

const MessageHeader = styled.div`
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
`;

const AuthorName = styled.span`
	font-size: 13px;
	font-weight: 600;
	color: var(--vscode-textLink-foreground);
`;

const MessageDate = styled.span`
	font-size: 11px;
	color: var(--vscode-descriptionForeground);
`;

const MessageText = styled.div`
	font-size: 13px;
	color: var(--vscode-foreground);
	line-height: 1.5;
	white-space: pre-wrap;
	word-break: break-word;
`;

const LoadingContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 200px;
	gap: 12px;
`;

const Spinner = styled.div`
	border: 2px solid var(--vscode-panel-border);
	border-top: 2px solid var(--vscode-progressBar-background);
	border-radius: 50%;
	width: 24px;
	height: 24px;
	animation: spin 1s linear infinite;

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
`;

const EmptyState = styled.div`
	color: var(--vscode-descriptionForeground);
	padding: 40px 20px;
	text-align: center;
	font-size: 13px;
`;

const ErrorState = styled.div`
	color: var(--vscode-errorForeground);
	padding: 20px;
	text-align: center;
	font-size: 13px;
`;

interface DiscussionsTableProps {
	discussions: Discussion[];
	loading?: boolean;
	error?: string | null;
	embedded?: boolean;
}

const DiscussionsTable: React.FC<DiscussionsTableProps> = ({ discussions, loading, error, embedded = false }) => {
	if (loading) {
		return (
			<LoadingContainer>
				<Spinner />
				<p style={{ color: 'var(--vscode-foreground)', margin: 0 }}>Loading discussions...</p>
			</LoadingContainer>
		);
	}

	if (error) {
		return <ErrorState>{error}</ErrorState>;
	}

	if (!discussions.length) {
		return <EmptyState>There are no discussions.</EmptyState>;
	}

	const formatDate = (dateString: string) => {
		if (!dateString) return '';
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

			// Format time
			const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

			// Show relative date for recent messages
			if (diffDays === 0) {
				return `Today at ${timeStr}`;
			} else if (diffDays === 1) {
				return `Yesterday at ${timeStr}`;
			} else if (diffDays < 7) {
				return `${diffDays} days ago at ${timeStr}`;
			} else {
				return date.toLocaleDateString() + ' ' + timeStr;
			}
		} catch {
			return dateString;
		}
	};

	// Sort discussions by date (oldest first, like a chat)
	const sortedDiscussions = [...discussions].sort((a, b) => {
		const dateA = new Date(a.createdDate).getTime();
		const dateB = new Date(b.createdDate).getTime();
		return dateA - dateB;
	});

	return (
		<ChatContainer embedded={embedded}>
			{sortedDiscussions.map(discussion => (
				<MessageBubble key={discussion.objectId}>
					<MessageHeader>
						<AuthorName>{discussion.author || 'Unknown'}</AuthorName>
						<MessageDate>{formatDate(discussion.createdDate)}</MessageDate>
					</MessageHeader>
					<MessageText>{discussion.text}</MessageText>
				</MessageBubble>
			))}
		</ChatContainer>
	);
};

export default DiscussionsTable;
