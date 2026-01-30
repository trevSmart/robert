import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { isLightTheme } from '../../utils/themeColors';

interface MessageAttendee {
	id: string;
	messageId: string;
	userId: string;
	displayName: string;
	rallyUserId: string;
	createdAt: string;
}

interface Message {
	id: string;
	userId: string;
	userStoryId: string;
	content: string;
	status: 'open' | 'resolved' | 'archived';
	createdAt: string;
	updatedAt: string;
	user?: {
		displayName: string;
		rallyUserId: string;
	};
	replies?: MessageReply[];
	attendees?: MessageAttendee[];
}

interface MessageReply {
	id: string;
	messageId: string;
	userId: string;
	content: string;
	createdAt: string;
	user?: {
		displayName: string;
		rallyUserId: string;
	};
}

interface CollaborationViewProps {
	selectedUserStoryId?: string | null;
	onHelpRequestsCountChange?: (count: number) => void;
}

const CollaborationView: FC<CollaborationViewProps> = ({ selectedUserStoryId, onHelpRequestsCountChange }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const [messages, setMessages] = useState<Message[]>([]);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [messagesError, setMessagesError] = useState<string | null>(null);
	const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	const sendMessage = useCallback(
		(message: Record<string, unknown>) => {
			if (!vscode) return;
			vscode.postMessage(message);
		},
		[vscode]
	);

	// Load all messages on mount
	const loadAllMessages = useCallback(() => {
		setMessagesLoading(true);
		setMessagesError(null);
		sendMessage({
			command: 'loadCollaborationMessages'
		});
	}, [sendMessage]);

	// Initial load
	useEffect(() => {
		// Send messages to load data
		sendMessage({
			command: 'loadCollaborationMessages'
		});
		sendMessage({ command: 'getRallyCurrentUser' });
	}, [sendMessage]);

	// Set loading state when component mounts
	useEffect(() => {
		setMessagesLoading(true);
		setMessagesError(null);
	}, []);

	// Handle messages from extension
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;

			switch (message.command) {
				case 'collaborationMessagesLoaded':
					setMessages(message.messages || []);
					setMessagesLoading(false);
					break;

				case 'collaborationMessagesError':
					setMessagesError(message.error);
					setMessagesLoading(false);
					break;

				case 'collaborationMessageCreated':
				case 'supportRequestCreated':
					// Reload all messages when a new one is created
					loadAllMessages();
					break;

				case 'supportRequestError':
					// Handle support request error
					setMessagesError(message.error);
					break;

				case 'collaborationMessageAttended':
					// Update the specific message with new attendee
					setMessages(prev => prev.map(msg => (msg.id === message.messageId ? { ...msg, attendees: [...(msg.attendees || []), message.attendee] } : msg)));
					break;

				case 'collaborationMessageUnattended':
					// Remove attendee from the message
					setMessages(prev => prev.map(msg => (msg.id === message.messageId ? { ...msg, attendees: (msg.attendees || []).filter(a => a.userId !== currentUserId) } : msg)));
					break;

				case 'rallyCurrentUser':
					if (message.user && message.user.ObjectID) {
						setCurrentUserId(message.user.ObjectID);
					}
					break;

				case 'collaborationNewMessage':
					// Real-time message added via websocket
					if (message.message) {
						setMessages(prev => [message.message, ...prev]);
					}
					break;

				case 'collaborationMessageUpdate':
					// Message updated via websocket
					if (message.message) {
						setMessages(prev => prev.map(msg => (msg.id === message.message.id ? message.message : msg)));
					}
					break;
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, [currentUserId, loadAllMessages]);

	// Calculate help requests count and notify parent
	const helpRequestsCount = useMemo(() => {
		return messages.filter(msg => msg.content.includes('🆘') || msg.content.includes('Support Request')).length;
	}, [messages]);

	useEffect(() => {
		if (onHelpRequestsCountChange) {
			onHelpRequestsCountChange(helpRequestsCount);
		}
	}, [helpRequestsCount, onHelpRequestsCountChange]);

	const toggleExpanded = useCallback((messageId: string) => {
		setExpandedMessages(prev => {
			const next = new Set(prev);
			if (next.has(messageId)) {
				next.delete(messageId);
			} else {
				next.add(messageId);
			}
			return next;
		});
	}, []);

	const handleAttend = useCallback(
		(messageId: string) => {
			sendMessage({
				command: 'attendCollaborationMessage',
				messageId
			});
		},
		[sendMessage]
	);

	const handleUnattend = useCallback(
		(messageId: string) => {
			sendMessage({
				command: 'unattendCollaborationMessage',
				messageId
			});
		},
		[sendMessage]
	);

	const isUserAttending = useCallback(
		(message: Message): boolean => {
			if (!currentUserId || !message.attendees) return false;
			return message.attendees.some(a => a.userId === currentUserId);
		},
		[currentUserId]
	);

	const lightTheme = isLightTheme();

	// Extract summary from message content (first line or first 100 chars)
	const getMessageSummary = (content: string): string => {
		const firstLine = content.split('\n')[0];
		if (firstLine.length > 100) {
			return firstLine.substring(0, 100) + '...';
		}
		return firstLine;
	};

	const isHelpRequest = (msg: Message): boolean => {
		return msg.content.includes('🆘') || msg.content.includes('Support Request');
	};

	return (
		<div
			style={{
				padding: '20px',
				height: '100%',
				overflow: 'auto'
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '20px'
				}}
			>
				<h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Sol·licituds de Col·laboració</h2>
				<button
					onClick={loadAllMessages}
					disabled={messagesLoading}
					style={{
						padding: '6px 12px',
						borderRadius: '4px',
						border: 'none',
						backgroundColor: lightTheme ? '#007acc' : 'var(--vscode-button-background)',
						color: lightTheme ? '#fff' : 'var(--vscode-button-foreground)',
						cursor: messagesLoading ? 'not-allowed' : 'pointer',
						fontSize: '12px',
						opacity: messagesLoading ? 0.6 : 1
					}}
				>
					{messagesLoading ? 'Carregant...' : 'Actualitzar'}
				</button>
			</div>

			{messagesLoading && messages.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--vscode-descriptionForeground)' }}>Carregant sol·licituds...</div>}

			{messagesError && (
				<div
					style={{
						padding: '12px',
						backgroundColor: lightTheme ? '#ffebee' : 'var(--vscode-inputValidation-errorBackground)',
						borderRadius: '4px',
						color: lightTheme ? '#c62828' : 'var(--vscode-errorForeground)',
						fontSize: '12px',
						marginBottom: '20px'
					}}
				>
					Error: {messagesError}
				</div>
			)}

			{!messagesLoading && !messagesError && messages.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--vscode-descriptionForeground)' }}>No hi ha sol·licituds de col·laboració.</div>}

			{!messagesLoading && !messagesError && messages.length > 0 && (
				<div style={{ overflow: 'auto' }}>
					<table
						style={{
							width: '100%',
							borderCollapse: 'collapse',
							fontSize: '13px'
						}}
					>
						<thead>
							<tr
								style={{
									backgroundColor: lightTheme ? '#f5f5f5' : 'var(--vscode-editor-background)',
									borderBottom: `2px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`,
									position: 'sticky',
									top: 0,
									zIndex: 1
								}}
							>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '120px' }}>Data</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '100px' }}>User Story</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '200px' }}>Sol·licitud</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '120px' }}>Sol·licitant</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '150px' }}>Qui l&apos;atén</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '100px' }}>Estat</th>
								<th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, minWidth: '100px' }}>Accions</th>
							</tr>
						</thead>
						<tbody>
							{messages.map(message => {
								const isExpanded = expandedMessages.has(message.id);
								const attending = isUserAttending(message);
								const isHelp = isHelpRequest(message);

								return (
									<React.Fragment key={message.id}>
										<tr
											style={{
												backgroundColor: isHelp ? (lightTheme ? 'rgba(255, 152, 0, 0.05)' : 'rgba(255, 152, 0, 0.1)') : 'transparent',
												borderBottom: `1px solid ${lightTheme ? '#eee' : 'var(--vscode-panel-border)'}`
											}}
										>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<div style={{ fontSize: '12px' }}>{new Date(message.createdAt).toLocaleDateString('ca-ES')}</div>
												<div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>{new Date(message.createdAt).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}</div>
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<div style={{ fontWeight: 500 }}>{message.userStoryId}</div>
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												{isHelp && (
													<span
														style={{
															display: 'inline-block',
															padding: '2px 6px',
															borderRadius: '3px',
															backgroundColor: lightTheme ? '#ff9800' : 'rgba(255, 152, 0, 0.2)',
															color: lightTheme ? '#fff' : '#ffb74d',
															fontSize: '10px',
															fontWeight: 600,
															marginRight: '6px'
														}}
													>
														🆘 AJUDA
													</span>
												)}
												<div style={{ marginTop: isHelp ? '4px' : 0 }}>{getMessageSummary(message.content)}</div>
												{message.replies && message.replies.length > 0 && (
													<div
														style={{
															marginTop: '4px',
															fontSize: '11px',
															color: 'var(--vscode-textLink-foreground)',
															cursor: 'pointer'
														}}
														onClick={() => toggleExpanded(message.id)}
													>
														{isExpanded ? '▼' : '▶'} {message.replies.length} resposta{message.replies.length !== 1 ? 's' : ''}
													</div>
												)}
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<div style={{ fontSize: '12px' }}>{message.user?.displayName || 'Unknown'}</div>
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												{message.attendees && message.attendees.length > 0 ? (
													<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
														{message.attendees.map(attendee => (
															<div
																key={attendee.id}
																style={{
																	fontSize: '11px',
																	padding: '2px 6px',
																	backgroundColor: lightTheme ? '#e3f2fd' : 'rgba(100, 149, 237, 0.2)',
																	borderRadius: '3px',
																	display: 'inline-block',
																	maxWidth: 'fit-content'
																}}
															>
																{attendee.displayName}
															</div>
														))}
													</div>
												) : (
													<div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>Ningú</div>
												)}
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<span
													style={{
														padding: '2px 8px',
														borderRadius: '3px',
														backgroundColor: message.status === 'open' ? (lightTheme ? '#e3f2fd' : 'rgba(100, 149, 237, 0.2)') : lightTheme ? '#e8f5e9' : 'rgba(76, 175, 80, 0.2)',
														fontSize: '11px',
														fontWeight: 500,
														textTransform: 'uppercase'
													}}
												>
													{message.status === 'open' ? 'Obert' : message.status === 'resolved' ? 'Resolt' : 'Arxivat'}
												</span>
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'center' }}>
												<button
													onClick={() => (attending ? handleUnattend(message.id) : handleAttend(message.id))}
													style={{
														padding: '4px 10px',
														borderRadius: '3px',
														border: 'none',
														backgroundColor: attending ? (lightTheme ? '#4caf50' : 'rgba(76, 175, 80, 0.3)') : lightTheme ? '#007acc' : 'var(--vscode-button-background)',
														color: attending ? '#fff' : lightTheme ? '#fff' : 'var(--vscode-button-foreground)',
														cursor: 'pointer',
														fontSize: '11px',
														fontWeight: 500
													}}
												>
													{attending ? '✓ Atenent' : 'Atendre'}
												</button>
											</td>
										</tr>
										{isExpanded && (
											<tr>
												<td colSpan={7} style={{ padding: '0', backgroundColor: lightTheme ? '#fafafa' : 'rgba(0, 0, 0, 0.2)' }}>
													<div style={{ padding: '16px', borderLeft: `4px solid ${lightTheme ? '#007acc' : 'var(--vscode-progressBar-background)'}` }}>
														<div style={{ marginBottom: '16px' }}>
															<strong>Missatge complet:</strong>
															<div style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: '12px' }}>{message.content}</div>
														</div>
														{message.replies && message.replies.length > 0 && (
															<div>
																<strong>Respostes:</strong>
																<div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
																	{message.replies.map(reply => (
																		<div
																			key={reply.id}
																			style={{
																				padding: '10px',
																				backgroundColor: lightTheme ? '#fff' : 'var(--vscode-editor-background)',
																				borderRadius: '4px',
																				borderLeft: `3px solid ${lightTheme ? '#4caf50' : 'rgba(76, 175, 80, 0.5)'}`,
																				fontSize: '12px'
																			}}
																		>
																			<div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '11px' }}>
																				{reply.user?.displayName || 'Unknown'} • {new Date(reply.createdAt).toLocaleString('ca-ES')}
																			</div>
																			<div style={{ whiteSpace: 'pre-wrap' }}>{reply.content}</div>
																		</div>
																	))}
																</div>
															</div>
														)}
													</div>
												</td>
											</tr>
										)}
									</React.Fragment>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default CollaborationView;
