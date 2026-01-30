import React, { FC, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { isLightTheme, themeColors } from '../../utils/themeColors';

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
	isRead?: boolean;
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

// EChart color palette from StateDistributionPie
const ACCENT_COLORS = {
	orange: '#ff8c00',
	yellow: '#ffd700',
	blue: '#0d8bf9',
	green: '#20c997',
	red: '#e74c3c',
	grey: '#6c757d'
};

const CollaborationView: FC<CollaborationViewProps> = ({ selectedUserStoryId: _selectedUserStoryId, onHelpRequestsCountChange }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const [messages, setMessages] = useState<Message[]>([]);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [messagesError, setMessagesError] = useState<string | null>(null);
	const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [showGeneralMessageForm, setShowGeneralMessageForm] = useState(false);
	const [generalMessageContent, setGeneralMessageContent] = useState('');
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const sendMessage = useCallback(
		(message: Record<string, unknown>) => {
			if (!vscode) return;
			vscode.postMessage(message);
		},
		[vscode]
	);

	// Load all messages
	const loadAllMessages = useCallback(() => {
		sendMessage({
			command: 'loadCollaborationMessages'
		});
	}, [sendMessage]);

	// Initial load
	useEffect(() => {
		setMessagesLoading(true);
		setMessagesError(null);

		// Send messages to load data
		sendMessage({
			command: 'loadCollaborationMessages'
		});
		sendMessage({ command: 'getRallyCurrentUser' });
		// eslint-disable-next-line react-hooks/exhaustive-deps
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

				case 'collaborationMessageMarkedAsRead':
					// Update message read status
					setMessages(prev => prev.map(msg => (msg.id === message.messageId ? { ...msg, isRead: true } : msg)));
					break;

				case 'collaborationMessageMarkedAsUnread':
					// Update message read status
					setMessages(prev => prev.map(msg => (msg.id === message.messageId ? { ...msg, isRead: false } : msg)));
					break;
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, [currentUserId, loadAllMessages]);

	// Calculate help requests count and notify parent (only count unread)
	const helpRequestsCount = useMemo(() => {
		return messages.filter(msg => !msg.isRead && (msg.content.includes('🆘') || msg.content.includes('Support Request'))).length;
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

	const handleMarkAsRead = useCallback(
		(messageId: string) => {
			sendMessage({
				command: 'markCollaborationMessageAsRead',
				messageId
			});

			// Optimistically update the UI
			setMessages(prev => prev.map(msg => (msg.id === messageId ? { ...msg, isRead: true } : msg)));
		},
		[sendMessage]
	);

	const handleMarkAsUnread = useCallback(
		(messageId: string) => {
			sendMessage({
				command: 'markCollaborationMessageAsUnread',
				messageId
			});

			// Optimistically update the UI
			setMessages(prev => prev.map(msg => (msg.id === messageId ? { ...msg, isRead: false } : msg)));
		},
		[sendMessage]
	);

	const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const items = event.clipboardData.items;
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.type.indexOf('image') !== -1) {
				event.preventDefault();
				const blob = item.getAsFile();
				if (blob) {
					const reader = new FileReader();
					reader.onload = e => {
						const base64Image = e.target?.result as string;
						const markdown = `![image](${base64Image})`;

						// Use functional update to avoid race condition with async FileReader
						setGeneralMessageContent(prev => {
							const textarea = textareaRef.current;
							const cursorPosition = textarea?.selectionStart ?? prev.length;
							return prev.substring(0, cursorPosition) + '\n' + markdown + '\n' + prev.substring(cursorPosition);
						});
					};
					reader.readAsDataURL(blob);
				}
				break;
			}
		}
	}, []);

	const handleSendGeneralMessage = useCallback(() => {
		if (!generalMessageContent.trim()) return;

		sendMessage({
			command: 'createCollaborationMessage',
			userStoryId: 'GENERAL',
			content: generalMessageContent.trim()
		});

		setGeneralMessageContent('');
		setShowGeneralMessageForm(false);
	}, [generalMessageContent, sendMessage]);

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

	// Render message content with secure image handling
	// This function renders message content with secure image handling.
	// It only renders images from data: URIs to prevent tracking/data exfiltration risks.
	// Remote URLs (https:) are rendered as plain text instead of auto-loading images.
	const renderMessageContentSecure = (content: string): (string | JSX.Element)[] => {
		const parts: (string | JSX.Element)[] = [];
		const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = imageRegex.exec(content)) !== null) {
			// Add text before the image
			if (match.index > lastIndex) {
				parts.push(content.substring(lastIndex, match.index));
			}

			const imageUrl = match[2];
			const trimmedUrl = imageUrl.trim();

			// Only render images for safe URLs (restrict to data: URIs).
			// For other URLs, fall back to rendering the original markdown text
			// to avoid auto-loading remote images in the webview.
			if (trimmedUrl.toLowerCase().startsWith('data:')) {
				parts.push(
					<img
						key={`img-${match.index}`}
						src={trimmedUrl}
						alt={match[1] || 'Image'}
						style={{
							maxWidth: '100%',
							maxHeight: '300px',
							borderRadius: '4px',
							marginTop: '8px',
							marginBottom: '8px',
							display: 'block'
						}}
					/>
				);
			} else {
				// Unsafe image URL: render the original markdown text instead of an <img>.
				parts.push(match[0]);
			}

			lastIndex = match.index + match[0].length;
		}

		// Add remaining text
		if (lastIndex < content.length) {
			parts.push(content.substring(lastIndex));
		}

		return parts.length > 0 ? parts : [content];
	};

	return (
		<div
			style={{
				padding: '20px',
				height: '100%',
				overflow: 'auto',
				backgroundColor: themeColors.background
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
				<h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: themeColors.foreground }}>Collaboration Requests</h2>
				<div style={{ display: 'flex', gap: '8px' }}>
					<button
						onClick={() => setShowGeneralMessageForm(!showGeneralMessageForm)}
						style={{
							padding: '6px 12px',
							borderRadius: '4px',
							border: `1px solid ${themeColors.inputBorder}`,
							backgroundColor: ACCENT_COLORS.blue,
							color: '#fff',
							cursor: 'pointer',
							fontSize: '12px',
							fontWeight: 500
						}}
					>
						{showGeneralMessageForm ? 'Cancel' : '+ New General Message'}
					</button>
					<button
						onClick={loadAllMessages}
						disabled={messagesLoading}
						style={{
							padding: '6px 12px',
							borderRadius: '4px',
							border: `1px solid ${themeColors.inputBorder}`,
							backgroundColor: themeColors.buttonBackground,
							color: themeColors.buttonForeground,
							cursor: messagesLoading ? 'not-allowed' : 'pointer',
							fontSize: '12px',
							opacity: messagesLoading ? 0.6 : 1
						}}
					>
						{messagesLoading ? 'Loading...' : 'Refresh'}
					</button>
				</div>
			</div>

			{/* General Message Form */}
			{showGeneralMessageForm && (
				<div
					style={{
						marginBottom: '20px',
						padding: '16px',
						backgroundColor: themeColors.background,
						border: `1px solid ${themeColors.panelBorder}`,
						borderRadius: '6px'
					}}
				>
					<h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: themeColors.foreground }}>New General Message</h3>
					<textarea
						ref={textareaRef}
						value={generalMessageContent}
						onChange={e => setGeneralMessageContent(e.target.value)}
						onPaste={handlePaste}
						placeholder="Write your message... (you can paste images directly)"
						style={{
							width: '100%',
							minHeight: '100px',
							padding: '8px',
							borderRadius: '4px',
							border: `1px solid ${themeColors.inputBorder}`,
							backgroundColor: themeColors.inputBackground,
							color: themeColors.inputForeground,
							fontSize: '13px',
							fontFamily: 'inherit',
							resize: 'vertical'
						}}
					/>
					<div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
						<button
							onClick={() => {
								setShowGeneralMessageForm(false);
								setGeneralMessageContent('');
							}}
							style={{
								padding: '6px 12px',
								borderRadius: '4px',
								border: `1px solid ${themeColors.inputBorder}`,
								backgroundColor: themeColors.buttonSecondaryBackground,
								color: themeColors.buttonSecondaryForeground,
								cursor: 'pointer',
								fontSize: '12px'
							}}
						>
							Cancel
						</button>
						<button
							onClick={handleSendGeneralMessage}
							disabled={!generalMessageContent.trim()}
							style={{
								padding: '6px 12px',
								borderRadius: '4px',
								border: 'none',
								backgroundColor: ACCENT_COLORS.green,
								color: '#fff',
								cursor: generalMessageContent.trim() ? 'pointer' : 'not-allowed',
								fontSize: '12px',
								fontWeight: 500,
								opacity: generalMessageContent.trim() ? 1 : 0.5
							}}
						>
							Send
						</button>
					</div>
				</div>
			)}

			{messagesLoading && messages.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: themeColors.descriptionForeground }}>Loading requests...</div>}

			{messagesError && (
				<div
					style={{
						padding: '12px',
						backgroundColor: lightTheme ? '#ffebee' : 'rgba(231, 76, 60, 0.15)',
						borderRadius: '4px',
						color: ACCENT_COLORS.red,
						fontSize: '12px',
						marginBottom: '20px',
						border: `1px solid ${ACCENT_COLORS.red}`
					}}
				>
					Error: {messagesError}
				</div>
			)}

			{!messagesLoading && !messagesError && messages.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: themeColors.descriptionForeground }}>No collaboration requests.</div>}

			{!messagesLoading && !messagesError && messages.length > 0 && (
				<div style={{ overflow: 'auto' }}>
					<table
						style={{
							width: '100%',
							borderCollapse: 'collapse',
							fontSize: '13px',
							border: `1px solid ${themeColors.panelBorder}`
						}}
					>
						<thead>
							<tr
								style={{
									backgroundColor: themeColors.background,
									borderBottom: `2px solid ${themeColors.panelBorder}`
								}}
							>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '120px', color: themeColors.foreground }}>Date</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '100px', color: themeColors.foreground }}>User Story</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '200px', color: themeColors.foreground }}>Request</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '120px', color: themeColors.foreground }}>Requester</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '150px', color: themeColors.foreground }}>Qui l&apos;atén</th>
								<th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, minWidth: '100px', color: themeColors.foreground }}>Status</th>
								<th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, minWidth: '140px', color: themeColors.foreground }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{messages.map(message => {
								const isExpanded = expandedMessages.has(message.id);
								const attending = isUserAttending(message);
								const isHelp = isHelpRequest(message);
								const isUnread = !message.isRead;

								return (
									<React.Fragment key={message.id}>
										<tr
											style={{
												backgroundColor: isUnread ? (lightTheme ? 'rgba(13, 139, 249, 0.05)' : 'rgba(13, 139, 249, 0.08)') : isHelp ? (lightTheme ? 'rgba(255, 140, 0, 0.05)' : 'rgba(255, 140, 0, 0.08)') : 'transparent',
												borderBottom: `1px solid ${themeColors.panelBorder}`,
												transition: 'background-color 0.2s'
											}}
										>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<div style={{ fontSize: '12px', color: themeColors.foreground }}>{new Date(message.createdAt).toLocaleDateString('ca-ES')}</div>
												<div style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>{new Date(message.createdAt).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}</div>
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<div style={{ fontWeight: 500, color: themeColors.foreground }}>{message.userStoryId === 'GENERAL' ? '—' : message.userStoryId}</div>
												{message.userStoryId === 'GENERAL' && (
													<span
														style={{
															display: 'inline-block',
															padding: '2px 6px',
															marginTop: '4px',
															borderRadius: '3px',
															backgroundColor: lightTheme ? ACCENT_COLORS.grey : 'rgba(108, 117, 125, 0.3)',
															color: lightTheme ? '#fff' : '#aaa',
															fontSize: '10px',
															fontWeight: 600
														}}
													>
														GENERAL
													</span>
												)}
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
													{isUnread && (
														<span
															style={{
																display: 'inline-block',
																width: '8px',
																height: '8px',
																borderRadius: '50%',
																backgroundColor: ACCENT_COLORS.blue,
																flexShrink: 0
															}}
															title="Nou"
														/>
													)}
													{isHelp && (
														<span
															style={{
																display: 'inline-block',
																padding: '2px 6px',
																borderRadius: '3px',
																backgroundColor: lightTheme ? ACCENT_COLORS.orange : 'rgba(255, 140, 0, 0.3)',
																color: lightTheme ? '#fff' : '#ffb74d',
																fontSize: '10px',
																fontWeight: 600
															}}
														>
															🆘 HELP
														</span>
													)}
												</div>
												<div style={{ marginTop: '4px', color: themeColors.foreground }}>{getMessageSummary(message.content)}</div>
												{message.replies && message.replies.length > 0 && (
													<div
														style={{
															marginTop: '4px',
															fontSize: '11px',
															color: ACCENT_COLORS.blue,
															cursor: 'pointer',
															fontWeight: 500
														}}
														onClick={() => toggleExpanded(message.id)}
													>
														{isExpanded ? '▼' : '▶'} {message.replies.length} reply{message.replies.length !== 1 ? 's' : ''}
													</div>
												)}
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<div style={{ fontSize: '12px', color: themeColors.foreground }}>{message.user?.displayName || 'Unknown'}</div>
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
																	backgroundColor: lightTheme ? 'rgba(32, 201, 151, 0.15)' : 'rgba(32, 201, 151, 0.2)',
																	borderRadius: '3px',
																	display: 'inline-block',
																	maxWidth: 'fit-content',
																	color: lightTheme ? ACCENT_COLORS.green : '#6ae7c0'
																}}
															>
																{attendee.displayName}
															</div>
														))}
													</div>
												) : (
													<div style={{ fontSize: '11px', color: themeColors.descriptionForeground, fontStyle: 'italic' }}>Nobody</div>
												)}
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<span
													style={{
														padding: '2px 8px',
														borderRadius: '3px',
														backgroundColor:
															message.status === 'open'
																? lightTheme
																	? 'rgba(13, 139, 249, 0.15)'
																	: 'rgba(13, 139, 249, 0.2)'
																: message.status === 'resolved'
																	? lightTheme
																		? 'rgba(32, 201, 151, 0.15)'
																		: 'rgba(32, 201, 151, 0.2)'
																	: lightTheme
																		? 'rgba(108, 117, 125, 0.15)'
																		: 'rgba(108, 117, 125, 0.2)',
														color: message.status === 'open' ? ACCENT_COLORS.blue : message.status === 'resolved' ? ACCENT_COLORS.green : ACCENT_COLORS.grey,
														fontSize: '11px',
														fontWeight: 500,
														textTransform: 'uppercase'
													}}
												>
													{message.status === 'open' ? 'Open' : message.status === 'resolved' ? 'Resolved' : 'Archived'}
												</span>
											</td>
											<td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
												<div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
													<button
														onClick={() => (attending ? handleUnattend(message.id) : handleAttend(message.id))}
														style={{
															padding: '4px 10px',
															borderRadius: '3px',
															border: 'none',
															backgroundColor: attending ? (lightTheme ? ACCENT_COLORS.green : 'rgba(32, 201, 151, 0.3)') : lightTheme ? ACCENT_COLORS.blue : 'rgba(13, 139, 249, 0.3)',
															color: '#fff',
															cursor: 'pointer',
															fontSize: '11px',
															fontWeight: 500
														}}
													>
														{attending ? 'Leave' : 'Participate'}
													</button>
													{isUnread ? (
														<button
															onClick={() => handleMarkAsRead(message.id)}
															style={{
																padding: '4px 10px',
																borderRadius: '3px',
																border: `1px solid ${themeColors.inputBorder}`,
																backgroundColor: themeColors.buttonSecondaryBackground,
																color: themeColors.buttonSecondaryForeground,
																cursor: 'pointer',
																fontSize: '11px',
																fontWeight: 500
															}}
															title="Mark this message as read"
														>
															Mark as Read
														</button>
													) : (
														<button
															onClick={() => handleMarkAsUnread(message.id)}
															style={{
																padding: '4px 10px',
																borderRadius: '3px',
																border: `1px solid ${themeColors.inputBorder}`,
																backgroundColor: themeColors.buttonSecondaryBackground,
																color: themeColors.buttonSecondaryForeground,
																cursor: 'pointer',
																fontSize: '11px',
																fontWeight: 500
															}}
															title="Mark this message as unread"
														>
															Mark as Unread
														</button>
													)}
												</div>
											</td>
										</tr>
										{isExpanded && (
											<tr>
												<td colSpan={7} style={{ padding: '0', backgroundColor: themeColors.background }}>
													<div style={{ padding: '16px', borderLeft: `4px solid ${ACCENT_COLORS.blue}` }}>
														<div style={{ marginBottom: '16px' }}>
															<strong style={{ color: themeColors.foreground }}>Full message:</strong>
															<div style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: '12px', color: themeColors.foreground }}>{renderMessageContentSecure(message.content)}</div>
														</div>
														{message.replies && message.replies.length > 0 && (
															<div>
																<strong style={{ color: themeColors.foreground }}>Replies:</strong>
																<div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
																	{message.replies.map(reply => (
																		<div
																			key={reply.id}
																			style={{
																				padding: '10px',
																				backgroundColor: themeColors.inputBackground,
																				borderRadius: '4px',
																				borderLeft: `3px solid ${ACCENT_COLORS.green}`,
																				fontSize: '12px'
																			}}
																		>
																			<div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '11px', color: themeColors.descriptionForeground }}>
																				{reply.user?.displayName || 'Unknown'} • {new Date(reply.createdAt).toLocaleString('en-US')}
																			</div>
																			<div style={{ whiteSpace: 'pre-wrap', color: themeColors.foreground }}>{renderMessageContentSecure(reply.content)}</div>
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
